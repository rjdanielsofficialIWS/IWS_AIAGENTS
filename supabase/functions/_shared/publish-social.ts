import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCloudflareVideoUrl } from "./cloudflare-stream.ts";

const LATE_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const LATE_API_URL = "https://zernio.com/api/v1";
const MEDIA_REQUIRED = new Set(["youtube", "tiktok", "instagram"]);
const VIDEO_ONLY = new Set(["youtube", "tiktok"]);
const PLAN_LIMITS = {
  starter: { posts: 30,  textPosts: 60,  platforms: 3  },
  viral:   { posts: 100, textPosts: 200, platforms: -1 },
  agency:  { posts: -1,  textPosts: -1,  platforms: -1 },
};

// Threads video OAuthException code 2 is flagged as transient by Meta.
const THREADS_RETRY_DELAY_MS = 45 * 60 * 1000;
const MAX_THREADS_RETRIES = 3;

function getPeriod() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function normalizePlatformId(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) return "";
  return normalized === "twitter" ? "x" : normalized;
}

function toApiName(platform: string): string {
  return platform === "x" ? "twitter" : platform;
}

function extractAccountId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return extractAccountId(record.accountId ?? record._id ?? record.id);
  }
  return "";
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i.test(url) || url.includes("videodelivery.net/");
}

function sanitizeForYoutube(s: string): string {
  return s.replace(/[<>]/g, "").trim();
}

function isDuplicateContentError(msg: unknown): boolean {
  return /already (scheduled|publishing|posted)|within the last 24 hours/i.test(String(msg ?? ""));
}

function isThreadsTransientError(msg: unknown): boolean {
  return /Threads.*OAuthException|OAuthException.*is_transient.*true|Threads.*publish failed.*code.*2/i.test(String(msg ?? ""));
}

function getYoutubeTitle(content: string): string {
  const firstLine = sanitizeForYoutube(content.split("\n")[0] || "");
  return firstLine.slice(0, 100) || "Video";
}

async function fetchLiveAccountsForProfile(profileId: string) {
  const response = await fetch(`${LATE_API_URL}/accounts?profileId=${encodeURIComponent(profileId)}`, {
    headers: { Authorization: `Bearer ${LATE_API_KEY}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch connected accounts (${response.status})`);
  const data = await response.json().catch(() => ({}));
  return Array.isArray(data?.accounts) ? data.accounts as Array<Record<string, unknown>> : [];
}

function buildLiveAccountsByPlatform(accounts: Array<Record<string, unknown>>) {
  const byPlatform = new Map<string, Array<Record<string, unknown>>>();
  for (const account of accounts) {
    const platform = normalizePlatformId(account.platform);
    const accountId = extractAccountId(account);
    if (!platform || !accountId) continue;
    if (account.isActive === false) continue;
    if (!byPlatform.has(platform)) byPlatform.set(platform, []);
    byPlatform.get(platform)!.push(account);
  }
  return byPlatform;
}

function pickLiveAccountIdForPlatform(
  platform: string,
  liveAccountsByPlatform: Map<string, Array<Record<string, unknown>>>,
  candidateIds: string[],
): string {
  const liveAccounts = liveAccountsByPlatform.get(normalizePlatformId(platform)) ?? [];
  if (liveAccounts.length === 0) return "";
  const liveIds = new Set(liveAccounts.map((account) => extractAccountId(account)).filter(Boolean));
  const verifiedCandidate = candidateIds.find((id) => liveIds.has(id));
  if (verifiedCandidate) return verifiedCandidate;
  const defaultAccount = liveAccounts.find((account) => account.isDefault === true);
  if (defaultAccount) {
    const defaultId = extractAccountId(defaultAccount);
    if (defaultId) return defaultId;
  }
  if (liveAccounts.length === 1) return extractAccountId(liveAccounts[0]);
  return "";
}

export type PublishPayload = {
  platforms?: string[];
  platformTargets?: Array<{ platform?: string; accountId?: string }>;
  post?: string;
  mediaUrls?: string[];
  scheduleDate?: string;
  workspaceId?: string | null;
  thread?: string[];
  carousel?: boolean;
  postGroupId?: string;
  skipDuplicateCheck?: boolean;
  platformAccountIds?: Record<string, string>;
  // Internal: current retry attempt count (set by threads-retry cron, not callers)
  _retryCount?: number;
  // Internal: media jobs own the durable scheduled_posts lifecycle.
  _skipPersistence?: boolean;
};

export async function publishSocialPost({
  supabase,
  userId,
  payload,
}: {
  supabase: any;
  userId: string;
  payload: PublishPayload;
}) {
  if (!LATE_API_KEY) return { ok: false as const, status: 500, error: "Social publishing provider is not configured." };
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan,status,stripe_customer_id,current_period_end")
    .eq("supabase_user_id", userId)
    .maybeSingle();

  const isPromo = sub?.stripe_customer_id?.startsWith("promo_");
  const isTrialing = sub?.status === "trialing" && !!sub?.current_period_end && new Date(sub.current_period_end) > new Date();
  const isActive = (sub?.status === "active" || isPromo || isTrialing) && !!sub?.plan;
  const plan = isActive ? String(sub!.plan).toLowerCase() : "free";
  if (plan === "free") return { ok: false as const, status: 403, error: "upgrade_required", message: "You need an active subscription to post.", plan };

  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? { posts: 0, textPosts: 0, platforms: 0 };
  const period = getPeriod();
  const hasMediaPayload = Array.isArray(payload.mediaUrls) && payload.mediaUrls.length > 0;
  const postBucket = hasMediaPayload ? "posts_scheduled" : "text_posts_scheduled";
  const postBucketLimit = hasMediaPayload ? limits.posts : limits.textPosts;
  const postBucketLabel = hasMediaPayload ? "media posts" : "text posts";

  if (postBucketLimit !== -1) {
    const { data: usage } = await supabase
      .from("usage_tracking")
      .select(postBucket)
      .eq("supabase_user_id", userId)
      .eq("period", period)
      .maybeSingle();
    const used = (usage as any)?.[postBucket] ?? 0;
    if (used >= postBucketLimit) {
      return { ok: false as const, status: 429, error: "limit_reached", feature: "posts", message: `You have scheduled ${used} of ${postBucketLimit} ${postBucketLabel} this month.`, used, limit: postBucketLimit, plan };
    }
  }

  const rawPlatforms = Array.isArray(payload.platforms)
    ? payload.platforms.map(normalizePlatformId).filter(Boolean)
    : [];
  const explicitTargets = Array.isArray(payload.platformTargets)
    ? payload.platformTargets
      .map((target) => ({ raw: normalizePlatformId(target?.platform), accountId: extractAccountId(target?.accountId) }))
      .filter((target) => !!target.raw)
    : [];
  const selectedTargets = explicitTargets.length > 0
    ? explicitTargets
    : rawPlatforms.map((raw) => ({ raw, accountId: "" }));
  const cleanPlatforms = selectedTargets.map((target) => toApiName(target.raw));
  const post = typeof payload.post === "string" ? payload.post : "";
  const mediaUrls = Array.isArray(payload.mediaUrls) ? payload.mediaUrls.filter((u): u is string => typeof u === "string" && u.length > 0) : [];

  // Resolve any Cloudflare HLS URLs to direct MP4s via the canonical helper.
  // null means "still rendering" — report it as a retryable 503 rather than a
  // hard failure, so callers and the user are told to wait, not that it broke.
  const resolvedMediaUrls: string[] = [];
  for (const url of mediaUrls) {
    try {
      const resolved = await resolveCloudflareVideoUrl(url);
      if (resolved === null) {
        return {
          ok: false as const,
          status: 503,
          error: "media_processing_incomplete",
          message: "Your video is still being processed. Please try again in a moment.",
        };
      }
      resolvedMediaUrls.push(resolved);
    } catch (error) {
      // CfPermanentError — the video can never be published.
      return {
        ok: false as const,
        status: 400,
        error: "media_unavailable",
        message: error instanceof Error ? error.message : "Video could not be processed.",
      };
    }
  }

  const scheduleDate = typeof payload.scheduleDate === "string" ? payload.scheduleDate : "";
  const threadPosts = Array.isArray(payload.thread) ? payload.thread.filter((t): t is string => typeof t === "string" && t.trim().length > 0) : [];
  const isCarousel = payload.carousel === true;
  const currentRetryCount = typeof payload._retryCount === "number" ? payload._retryCount : 0;

  if (limits.platforms !== -1 && cleanPlatforms.length > limits.platforms) {
    return { ok: false as const, status: 403, error: "platform_limit", feature: "platforms", message: `Your ${plan} plan supports up to ${limits.platforms} platform(s) per post.`, plan };
  }
  if (!cleanPlatforms.length || !post) return { ok: false as const, status: 400, error: "platforms and post required" };
  if (post.length > 50000) return { ok: false as const, status: 400, error: "Post content exceeds maximum length" };

  // X/Twitter 280-character pre-flight check
  if (cleanPlatforms.includes("twitter") && post.length > 280) {
    return {
      ok: false as const,
      status: 400,
      error: `Tweet text is too long (${post.length} characters). Twitter's limit is 280 characters. Note: URLs count as 23 characters. Please shorten your text.`,
      platform: "x",
      characterCount: post.length,
      characterLimit: 280,
    };
  }

  if (resolvedMediaUrls.length > 10) return { ok: false as const, status: 400, error: "Too many media URLs" };
  const invalidMedia = resolvedMediaUrls.find((u) => typeof u !== "string" || u.length > 2000);
  if (invalidMedia !== undefined) return { ok: false as const, status: 400, error: "Invalid media URL" };
  const needsMedia = cleanPlatforms.filter((p) => MEDIA_REQUIRED.has(p));
  if (needsMedia.length > 0 && resolvedMediaUrls.length === 0) {
    return { ok: false as const, status: 400, error: `${needsMedia.map((p) => p[0].toUpperCase() + p.slice(1)).join(", ")} require media.` };
  }
  const hasVideo = resolvedMediaUrls.some(isVideoUrl);
  const videoOnlyPlatforms = cleanPlatforms.filter((p) => VIDEO_ONLY.has(p));
  if (videoOnlyPlatforms.length > 0 && resolvedMediaUrls.length > 0 && !hasVideo) {
    return { ok: false as const, status: 400, error: `${videoOnlyPlatforms.map((p) => p[0].toUpperCase() + p.slice(1)).join(", ")} only accept video files.` };
  }

  // ── Publishing scope ───────────────────────────────────────────────────────
  // A workspace is an isolation boundary. When workspaceId is supplied, that
  // workspace's provider profile is the ONLY profile that may be published to,
  // and there is deliberately no path back to the owner's personal profile.
  //
  // This previously read "use the workspace profile if it has one", then fell
  // through to the personal profile when it didn't. A workspace has no profile
  // until its first account is connected, so posting from a fresh workspace
  // published to the owner's personal accounts — one brand posting under
  // another brand's name. Failing here is strictly better than publishing to
  // the wrong account, because a wrong publish cannot be taken back.
  const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : "";
  let profileKey = "";
  let cachedChannels: Array<{ id?: string; profile?: string; platform?: string; accountId?: string }> = [];

  if (workspaceId) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("profile_key,cached_channels,name")
      .eq("id", workspaceId)
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (!ws) return { ok: false as const, status: 404, error: "Workspace not found." };
    if (!ws.profile_key) {
      const label = ws.name ? `the "${ws.name}" workspace` : "this workspace";
      return {
        ok: false as const,
        status: 400,
        error: `No social accounts are connected to ${label}.`,
        hint: "Connect an account to this workspace before posting. Accounts connected to your personal profile or another workspace are deliberately not used here.",
      };
    }
    profileKey = String(ws.profile_key);
    cachedChannels = Array.isArray(ws.cached_channels) ? ws.cached_channels : [];
  } else {
    const { data: profile } = await supabase
      .from("ayrshare_profiles")
      .select("profile_key,cached_channels")
      .eq("supabase_user_id", userId)
      .maybeSingle();
    if (!profile?.profile_key) return { ok: false as const, status: 400, error: "No connected accounts found." };
    profileKey = String(profile.profile_key);
    cachedChannels = Array.isArray(profile.cached_channels) ? profile.cached_channels : [];
  }

  const callerAccountIds = payload.platformAccountIds ?? {};
  async function publishWithScope(scopeProfileKey: string, scopeCachedChannels: Array<{ id?: string; profile?: string; platform?: string; accountId?: string }>) {
    const liveAccounts = scopeProfileKey ? await fetchLiveAccountsForProfile(scopeProfileKey).catch((error) => {
      console.warn("[publish-social] live account fetch failed", error instanceof Error ? error.message : error);
      return [] as Array<Record<string, unknown>>;
    }) : [];
    const liveAccountsByPlatform = buildLiveAccountsByPlatform(liveAccounts);
    const mappedPlatforms = selectedTargets.map(({ raw, accountId: explicitAccountId }) => {
      const api = toApiName(raw);
      const channel = scopeCachedChannels.find((ch) =>
        normalizePlatformId(ch.id) === raw || normalizePlatformId(ch.profile) === raw ||
        normalizePlatformId(ch.platform) === raw || normalizePlatformId(ch.id) === api ||
        normalizePlatformId(ch.profile) === api || normalizePlatformId(ch.platform) === api
      );
      const candidateIds = [
        extractAccountId(explicitAccountId),
        extractAccountId(callerAccountIds[raw]),
        extractAccountId(callerAccountIds[api]),
        extractAccountId(channel?.accountId),
        extractAccountId(channel?.id),
      ].filter((id): id is string => !!id);
      const accountId = pickLiveAccountIdForPlatform(api, liveAccountsByPlatform, candidateIds);
      const entry: Record<string, unknown> = { platform: api };
      if (accountId) entry.accountId = accountId;
      if (api === "youtube") {
        entry.platformSpecificData = { title: getYoutubeTitle(post), description: sanitizeForYoutube(post) };
      }
      return entry;
    }).filter(Boolean);

    if (mappedPlatforms.length === 0) return { ok: false as const, status: 400, error: "No connected accounts for selected platforms." };
    const missingAccountPlatforms = mappedPlatforms.filter((p) => !p.accountId).map((p) => String(p.platform || ""));
    if (missingAccountPlatforms.length > 0) {
      const missingLabels = missingAccountPlatforms.map((p) => p === "twitter" ? "X/Twitter" : p).join(", ");
      return {
        ok: false as const,
        status: 400,
        error: `No active connected account for: ${missingLabels}.`,
        hint: workspaceId
          ? "Connect the affected social account to this workspace, then refresh the page and try again."
          : "Reconnect the affected social account, then refresh the page and try again.",
      };
    }

    let requestBody: Record<string, unknown>;
    if (threadPosts.length > 0) {
      const firstItem: Record<string, unknown> = { content: post };
      if (resolvedMediaUrls.length > 0) firstItem.mediaItems = resolvedMediaUrls.map((url) => ({ type: isVideoUrl(url) ? "video" : "image", url }));
      const threadItems = [firstItem, ...threadPosts.map((content) => ({ content }))];
      requestBody = { content: post, platforms: mappedPlatforms.map((platform: any) => ({ ...platform, platformSpecificData: { threadItems } })) };
    } else {
      requestBody = { content: post, platforms: mappedPlatforms };
      if (resolvedMediaUrls.length > 0) {
        requestBody.mediaItems = resolvedMediaUrls.map((url) => ({ type: isCarousel ? "image" : (isVideoUrl(url) ? "video" : "image"), url }));
      }
    }
    if (scheduleDate) requestBody.scheduledFor = new Date(scheduleDate).toISOString();
    else requestBody.publishNow = true;

    const lateRes = await fetch(`${LATE_API_URL}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LATE_API_KEY}` },
      body: JSON.stringify(requestBody),
      redirect: "follow",
    });
    const result = await lateRes.json().catch(() => ({}));
    const isError = !lateRes.ok;
    const errorMsg = isError ? (result.message || result.error || `API error ${lateRes.status}`) : null;
    return { ok: !isError, status: lateRes.status, result, errorMsg, requestBody, mappedPlatforms, profileKey: scopeProfileKey };
  }

  if (scheduleDate && !payload.skipDuplicateCheck) {
    const windowStart = new Date(new Date(scheduleDate).getTime() - 60_000).toISOString();
    const windowEnd   = new Date(new Date(scheduleDate).getTime() + 60_000).toISOString();
    let dedupQ = supabase.from("scheduled_posts").select("id")
      .eq("supabase_user_id", userId).eq("content", post)
      .in("status", ["scheduled", "published"])
      .gte("scheduled_at", windowStart).lte("scheduled_at", windowEnd);
    dedupQ = workspaceId ? (dedupQ as any).eq("workspace_id", workspaceId) : (dedupQ as any).is("workspace_id", null);
    dedupQ = (dedupQ as any).overlaps("platforms", selectedTargets.map((t) => t.raw));
    const { data: existing } = await (dedupQ as any).maybeSingle();
    if (existing) return { ok: true as const, status: 200, result: {}, postId: null, profileKey, duplicate: true };
  }

  // Publish within the resolved scope only. There is deliberately NO
  // cross-profile retry here. A retry against the personal profile could only
  // ever fire for a workspace post, and its only possible effect was to send
  // that workspace's content out on the owner's personal accounts.
  const attempt = await publishWithScope(profileKey, cachedChannels);

  if (!attempt.ok && !("result" in attempt)) return attempt;

  const { result, errorMsg, requestBody } = attempt;
  const isError = !attempt.ok;

  if (isError && isDuplicateContentError(errorMsg)) {
    return { ok: true as const, status: 200, result: {}, postId: null, profileKey: attempt.profileKey || profileKey, duplicate: true };
  }

  // ── Threads transient error: queue for auto-retry instead of surfacing as error ──
  const isThreadsOnly = cleanPlatforms.length === 1 && cleanPlatforms[0] === "threads";
  const isTransient = isError && isThreadsTransientError(errorMsg);
  const retriesExhausted = currentRetryCount >= MAX_THREADS_RETRIES;

  if (isTransient && isThreadsOnly && !retriesExhausted) {
    const retryAt = new Date(Date.now() + THREADS_RETRY_DELAY_MS).toISOString();
    const nextRetryCount = currentRetryCount + 1;
    console.log(`[publish-social] Threads transient error — queuing retry #${nextRetryCount} at ${retryAt}`);
    try {
      if (!payload._skipPersistence && currentRetryCount === 0) {
        await supabase.from("scheduled_posts").insert({
          supabase_user_id: userId,
          profile_key: attempt.profileKey || profileKey,
          ayrshare_post_id: null,
          platforms: selectedTargets.map((t) => t.raw),
          content: post,
          media_urls: resolvedMediaUrls,
          scheduled_at: scheduleDate ? new Date(scheduleDate).toISOString() : new Date().toISOString(),
          status: "pending_retry",
          error: `Threads transient error (attempt ${nextRetryCount}/${MAX_THREADS_RETRIES}) — will retry automatically at ${retryAt}`,
          workspace_id: workspaceId || null,
          post_group_id: payload.postGroupId || null,
          retry_count: nextRetryCount,
          retry_after: retryAt,
        });
      }
      return { ok: true as const, status: 200, result: {}, postId: null, profileKey: attempt.profileKey || profileKey, pendingRetry: true, retryAt };
    } catch (e) {
      console.error("[publish-social] Failed to insert pending_retry row:", e);
    }
  }

  if (!payload._skipPersistence) try {
    const { error: insertError } = await supabase.from("scheduled_posts").insert({
      supabase_user_id: userId,
      profile_key: attempt.profileKey || profileKey,
      ayrshare_post_id: result.post?._id ?? result._id ?? result.id ?? null,
      platforms: selectedTargets.map((t) => t.raw),
      content: post,
      media_urls: resolvedMediaUrls,
      scheduled_at: scheduleDate ? new Date(scheduleDate).toISOString() : new Date().toISOString(),
      status: isError ? "error" : (scheduleDate ? "scheduled" : "published"),
      error: errorMsg ?? null,
      workspace_id: workspaceId || null,
      post_group_id: payload.postGroupId || null,
    });
    if (insertError) throw insertError;
  } catch (e) {
    console.error("DB insert failed:", e);
  }

  if (isError) {
    console.error("API error:", JSON.stringify(result), "sent:", JSON.stringify(requestBody));
    return { ok: false as const, status: attempt.status || 500, error: errorMsg || "Failed to publish post", detail: result };
  }

  try {
    await supabase.rpc("increment_usage", { p_user_id: userId, p_period: period, p_field: postBucket });
  } catch (e) {
    console.error("Usage increment failed:", e);
  }

  return { ok: true as const, status: 200, result, postId: result._id || result.id || result.post?._id || null, profileKey: attempt.profileKey || profileKey };
}
