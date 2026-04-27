import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LATE_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "sk_1adb5186f3be9a2321b4c2ede480187d250c324f03fce819cc22632d19abb7c2";
const LATE_API_URL = "https://zernio.com/api/v1";
const MEDIA_REQUIRED = new Set(["youtube", "tiktok", "instagram"]);
const VIDEO_ONLY = new Set(["youtube", "tiktok"]);
// posts = media posts limit, textPosts = text/autopilot posts limit (tracked separately)
const PLAN_LIMITS = {
  starter: { posts: 30,  textPosts: 60,  platforms: 3  },
  viral:   { posts: 100, textPosts: 200, platforms: -1 },
  agency:  { posts: -1,  textPosts: -1,  platforms: -1 },
};
const CF_STREAM_POLL_MS = 4_000;
const CF_MP4_POLL_MAX_MS = 80_000;

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

// Zernio account IDs are MongoDB ObjectIds — 24 hex chars.
// Platform names ("x", "twitter", etc.) are not valid account IDs.
function isValidAccountId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i.test(url) || url.includes("videodelivery.net/");
}

function getCloudflareUidFromUrl(url: string): string {
  const match = url.match(/videodelivery\.net\/([^/?]+)/i);
  return match?.[1]?.trim() ?? "";
}

async function resolveCloudflareVideoUrl(url: string): Promise<string> {
  if (!url.includes("videodelivery.net/") || !url.includes(".m3u8")) return url;

  const cfUid = getCloudflareUidFromUrl(url);
  const accountId = Deno.env.get("CF_ACCOUNT_ID") ?? "";
  const token = Deno.env.get("CF_STREAM_TOKEN") ?? "";
  if (!cfUid || !accountId || !token) return url;

  const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cfUid}`;
  await fetch(`${apiBase}/downloads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  }).catch(() => {});

  const deadline = Date.now() + CF_MP4_POLL_MAX_MS;
  while (Date.now() < deadline) {
    const response = await fetch(`${apiBase}/downloads`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Cloudflare download check failed (${response.status})`);
    }

    const data = await response.json().catch(() => ({}));
    const status = data?.result?.default?.status;
    const downloadUrl = data?.result?.default?.url;
    if (status === "ready" && typeof downloadUrl === "string" && downloadUrl.length > 0) {
      return downloadUrl;
    }
    if (status === "error") {
      throw new Error("Cloudflare MP4 generation failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, CF_STREAM_POLL_MS));
  }

  throw new Error("Cloudflare video is not ready for download yet.");
}

function sanitizeForYoutube(s: string): string {
  return s.replace(/[<>]/g, "").trim();
}

function getYoutubeTitle(content: string): string {
  const firstLine = sanitizeForYoutube(content.split("\n")[0] || "");
  return firstLine.slice(0, 100) || "Video";
}

export type PublishPayload = {
  platforms?: string[];
  post?: string;
  mediaUrls?: string[];
  scheduleDate?: string;
  workspaceId?: string | null;
  thread?: string[];
  carousel?: boolean;
  postGroupId?: string;
  // When true, skip the cross-post idempotency guard. Autopilot posts must set
  // this so they are completely decoupled from manually scheduled posts.
  skipDuplicateCheck?: boolean;
  // Optional: caller-supplied map of normalised platform id → Zernio account id.
  // When present, bypasses the cachedChannels DB lookup for that platform so the
  // correct accountId is always sent even when cached_channels is stale or empty.
  platformAccountIds?: Record<string, string>;
};

export async function publishSocialPost({
  supabase,
  userId,
  payload,
}: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  payload: PublishPayload;
}) {
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
  // Determine which bucket this post belongs to based on whether it has media.
  // Media posts (images/video) count against posts_scheduled (limit = posts).
  // Text-only posts — including all autopilot posts — count against text_posts_scheduled (limit = textPosts).
  // We can't check payload.mediaUrls here because URLs aren't resolved yet; we use the raw payload array.
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
  const cleanPlatforms = rawPlatforms.map(toApiName);
  const post = typeof payload.post === "string" ? payload.post : "";
  const mediaUrls = Array.isArray(payload.mediaUrls) ? payload.mediaUrls.filter((u): u is string => typeof u === "string" && u.length > 0) : [];
  let resolvedMediaUrls: string[];
  try {
    resolvedMediaUrls = await Promise.all(mediaUrls.map((url) => resolveCloudflareVideoUrl(url)));
  } catch (error) {
    return {
      ok: false as const,
      status: 500,
      error: "media_processing_incomplete",
      message: error instanceof Error ? error.message : "Media processing is not complete yet.",
    };
  }
  const scheduleDate = typeof payload.scheduleDate === "string" ? payload.scheduleDate : "";
  const threadPosts = Array.isArray(payload.thread) ? payload.thread.filter((t): t is string => typeof t === "string" && t.trim().length > 0) : [];
  const isCarousel = payload.carousel === true;

  if (limits.platforms !== -1 && cleanPlatforms.length > limits.platforms) {
    return { ok: false as const, status: 403, error: "platform_limit", feature: "platforms", message: `Your ${plan} plan supports up to ${limits.platforms} platform(s) per post.`, plan };
  }
  if (!cleanPlatforms.length || !post) return { ok: false as const, status: 400, error: "platforms and post required" };
  if (post.length > 50000) return { ok: false as const, status: 400, error: "Post content exceeds maximum length" };
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

  const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : "";
  let profileKey = "";
  let cachedChannels: Array<{ id?: string; profile?: string; platform?: string; accountId?: string }> = [];
  let workspaceChannelsSet = false;
  if (workspaceId) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("profile_key,cached_channels")
      .eq("id", workspaceId)
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (ws) {
      // Use the workspace's profile key when it has one.
      if (ws.profile_key) profileKey = ws.profile_key;
      // ALWAYS use the workspace's own cached_channels for account selection,
      // even when the workspace shares a profile key with the global profile.
      // This is what enforces per-workspace isolation — posts can only go to
      // accounts explicitly connected within this workspace.
      cachedChannels = Array.isArray(ws.cached_channels) ? ws.cached_channels : [];
      workspaceChannelsSet = true;
    }
  }
  if (!profileKey) {
    const { data: profile } = await supabase
      .from("ayrshare_profiles")
      .select("profile_key,cached_channels")
      .eq("supabase_user_id", userId)
      .maybeSingle();
    if (!profile?.profile_key) return { ok: false as const, status: 400, error: "No connected accounts found." };
    profileKey = profile.profile_key;
    // Only fall back to global channels when the workspace didn't set its own.
    // Never let the global channel list bleed into a workspace-scoped post.
    if (!workspaceChannelsSet) {
      cachedChannels = Array.isArray(profile.cached_channels) ? profile.cached_channels : [];
    }
  }

  const callerAccountIds = payload.platformAccountIds ?? {};
  const mappedPlatforms = rawPlatforms.map((raw) => {
    const api = toApiName(raw);
    // Prefer caller-supplied accountId (direct from frontend integration list) so
    // we never depend on cached_channels being fresh or correctly formatted.
    const callerAccountId = callerAccountIds[raw] || callerAccountIds[api] || "";
    const channel = callerAccountId ? undefined : cachedChannels.find((ch) =>
      normalizePlatformId(ch.id) === raw ||
      normalizePlatformId(ch.profile) === raw ||
      normalizePlatformId(ch.platform) === raw ||
      normalizePlatformId(ch.id) === api ||
      normalizePlatformId(ch.profile) === api ||
      normalizePlatformId(ch.platform) === api
    );
    const resolvedId = callerAccountId || channel?.accountId || channel?.id || "";
    const accountId = isValidAccountId(resolvedId) ? resolvedId : "";
    console.log(`[publish-social] platform=${raw} api=${api} resolvedId=${resolvedId} validAccountId=${accountId}`);
    const entry: Record<string, unknown> = { platform: api };
    if (accountId) entry.accountId = accountId;
    if (api === "youtube") {
      entry.platformSpecificData = {
        title: getYoutubeTitle(post),
        description: sanitizeForYoutube(post),
      };
    }
    return entry;
  }).filter(Boolean);

  if (mappedPlatforms.length === 0) {
    return { ok: false as const, status: 400, error: "No connected accounts for selected platforms." };
  }

  // Idempotency guard: if identical content is already scheduled/published for this user
  // within the same time window, skip the Zernio call silently. This prevents duplicate
  // posts caused by double-clicks or re-submissions while the first request is in-flight.
  // Autopilot posts bypass this check entirely — they must never be blocked by or
  // confused with manually scheduled posts (or posts from other workspaces).
  if (scheduleDate && !payload.skipDuplicateCheck) {
    const windowStart = new Date(new Date(scheduleDate).getTime() - 60_000).toISOString();
    const windowEnd   = new Date(new Date(scheduleDate).getTime() + 60_000).toISOString();
    let dedupQ = supabase
      .from("scheduled_posts")
      .select("id")
      .eq("supabase_user_id", userId)
      .eq("content", post)
      .in("status", ["scheduled", "published"])
      .gte("scheduled_at", windowStart)
      .lte("scheduled_at", windowEnd);
    // Scope dedup to the same workspace so posts in different workspaces with the
    // same content at the same time don't accidentally suppress each other.
    if (workspaceId) {
      dedupQ = (dedupQ as any).eq("workspace_id", workspaceId);
    } else {
      dedupQ = (dedupQ as any).is("workspace_id", null);
    }
    const { data: existing } = await (dedupQ as any).maybeSingle();
    if (existing) {
      return { ok: true as const, status: 200, result: {}, postId: null, profileKey, duplicate: true };
    }
  }

  let requestBody: Record<string, unknown>;
  if (threadPosts.length > 0) {
    const firstItem: Record<string, unknown> = { content: post };
    if (resolvedMediaUrls.length > 0) {
      firstItem.mediaItems = resolvedMediaUrls.map((url) => ({ type: isVideoUrl(url) ? "video" : "image", url }));
    }
    const threadItems = [firstItem, ...threadPosts.map((content) => ({ content }))];
    requestBody = {
      content: post,
      platforms: mappedPlatforms.map((platform: any) => ({
        ...platform,
        platformSpecificData: { threadItems },
      })),
    };
  } else {
    requestBody = { content: post, platforms: mappedPlatforms };
    if (resolvedMediaUrls.length > 0) {
      requestBody.mediaItems = resolvedMediaUrls.map((url) => ({
        type: isCarousel ? "image" : (isVideoUrl(url) ? "video" : "image"),
        url,
      }));
    }
  }

  if (scheduleDate) requestBody.scheduledFor = new Date(scheduleDate).toISOString();
  else requestBody.publishNow = true;

  const lateRes = await fetch(`${LATE_API_URL}/posts?profileId=${profileKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LATE_API_KEY}` },
    body: JSON.stringify(requestBody),
    redirect: "follow",
  });
  const result = await lateRes.json().catch(() => ({}));
  const isError = !lateRes.ok;
  const errorMsg = isError ? (result.message || result.error || `API error ${lateRes.status}`) : null;

  try {
    await supabase.from("scheduled_posts").insert({
      supabase_user_id: userId,
      profile_key: profileKey,
      ayrshare_post_id: result.post?._id ?? result._id ?? result.id ?? null,
      platforms: rawPlatforms,
      content: post,
      media_urls: resolvedMediaUrls,
      scheduled_at: scheduleDate ? new Date(scheduleDate).toISOString() : new Date().toISOString(),
      status: isError ? "error" : (scheduleDate ? "scheduled" : "published"),
      error: errorMsg ?? null,
      workspace_id: workspaceId || null,
      post_group_id: payload.postGroupId || null,
    });
  } catch (e) {
    console.error("DB insert failed:", e);
  }

  if (isError) {
    console.error("API error:", lateRes.status, JSON.stringify(result), "sent:", JSON.stringify(requestBody));
    return { ok: false as const, status: 500, error: errorMsg || "Failed to publish post", detail: result };
  }

  try {
    await supabase.rpc("increment_usage", { p_user_id: userId, p_period: period, p_field: postBucket });
  } catch (e) {
    console.error("Usage increment failed:", e);
  }

  return {
    ok: true as const,
    status: 200,
    result,
    postId: result._id || result.id || result.post?._id || null,
    profileKey,
  };
}
