import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publishSocialPost } from "./publish-social.ts";
import { CfPermanentError, resolveCloudflareMp4, type CfMediaResult } from "./cloudflare-stream.ts";

// The project does not ship generated Database types, so keep the service client
// intentionally untyped at this boundary instead of inferring an unusable `never` schema.
type SupabaseClient = any;
type MediaJob = Record<string, any> & {
  id: string;
  supabase_user_id: string;
  workspace_id?: string | null;
  cf_uid: string;
  stream_url: string;
  post_payload: Record<string, unknown>;
  post_group_id?: string | null;
  scheduled_post_id?: string | null;
  attempts?: number | null;
};

const MAX_JOB_ATTEMPTS = 4;
const DISPATCH_CONCURRENCY = 3;

export { CfPermanentError };

export function isTransientPublishError(value: unknown) {
  return /\b(408|409|425|429|500|502|503|504)\b|rate.?limit|temporar|timeout|timed out|fetch failed|network|media_processing_incomplete/i.test(String(value ?? ""));
}

/**
 * Resolve a Cloudflare UID to a downloadable MP4.
 * Delegates to the canonical helper in cloudflare-stream.ts so that every
 * caller shares identical retry/defer/fail semantics.
 */
export async function getCloudflareMp4Url(cfUid: string): Promise<CfMediaResult> {
  return await resolveCloudflareMp4(cfUid);
}

function payloadPlatforms(payload: Record<string, unknown>) {
  if (Array.isArray(payload.platforms)) return payload.platforms.map(String).filter(Boolean);
  if (Array.isArray(payload.platformTargets)) {
    return payload.platformTargets.map((item: any) => String(item?.platform ?? "")).filter(Boolean);
  }
  return [];
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * The provider profile a job's durable post record belongs to.
 *
 * A workspace-scoped job resolves ONLY against that workspace. It must never
 * fall back to the owner's personal profile: the value recorded here is the
 * profile a later delete/cancel is issued against, so borrowing the personal
 * key would point those operations at the wrong account.
 */
async function profileKeyForJob(supabase: SupabaseClient, job: MediaJob) {
  if (job.workspace_id) {
    const { data } = await supabase.from("workspaces").select("profile_key").eq("id", job.workspace_id).maybeSingle();
    return data?.profile_key ? String(data.profile_key) : null;
  }
  const { data } = await supabase.from("ayrshare_profiles").select("profile_key").eq("supabase_user_id", job.supabase_user_id).maybeSingle();
  return data?.profile_key ? String(data.profile_key) : null;
}

export async function ensureScheduledPostForJob(
  supabase: SupabaseClient,
  job: MediaJob,
  outcome: { status: string; error?: string | null; providerPostId?: string | null; profileKey?: string | null; mediaUrls?: string[]; retryAfter?: string | null },
) {
  const payload = job.post_payload && typeof job.post_payload === "object" ? job.post_payload : {};
  const platforms = payloadPlatforms(payload);
  if (platforms.length === 0) return null;

  let existing: any = null;
  if (job.scheduled_post_id) {
    const { data } = await supabase.from("scheduled_posts").select("id,status").eq("id", job.scheduled_post_id).maybeSingle();
    existing = data;
  }
  if (!existing && validUuid(job.post_group_id)) {
    const { data } = await supabase.from("scheduled_posts")
      .select("id,status")
      .eq("supabase_user_id", job.supabase_user_id)
      .eq("post_group_id", job.post_group_id)
      .overlaps("platforms", [platforms[0]])
      .maybeSingle();
    existing = data;
  }

  const terminalSuccess = existing && ["scheduled", "published"].includes(String(existing.status));
  if (terminalSuccess && outcome.status === "error") return existing.id;

  const row: Record<string, unknown> = {
    supabase_user_id: job.supabase_user_id,
    profile_key: outcome.profileKey ?? await profileKeyForJob(supabase, job),
    ayrshare_post_id: outcome.providerPostId ?? null,
    platforms,
    content: typeof payload.post === "string" ? payload.post : "",
    media_urls: outcome.mediaUrls ?? (Array.isArray(payload.mediaUrls) ? payload.mediaUrls : []),
    scheduled_at: typeof payload.scheduleDate === "string" && payload.scheduleDate ? new Date(payload.scheduleDate).toISOString() : new Date().toISOString(),
    status: outcome.status,
    error: outcome.error ?? null,
    workspace_id: job.workspace_id ?? null,
    post_group_id: validUuid(job.post_group_id) ? job.post_group_id : null,
    retry_after: outcome.retryAfter ?? null,
  };

  let scheduledPostId = existing?.id ?? null;
  if (scheduledPostId) {
    const { error } = await supabase.from("scheduled_posts").update(row).eq("id", scheduledPostId);
    if (error) throw new Error(`Failed to update durable post record: ${error.message}`);
  } else {
    const { data, error } = await supabase.from("scheduled_posts").insert(row).select("id").single();
    if (error) {
      if (error.code === "23505" && validUuid(job.post_group_id)) {
        const { data: raced } = await supabase.from("scheduled_posts").select("id")
          .eq("post_group_id", job.post_group_id).overlaps("platforms", [platforms[0]]).maybeSingle();
        scheduledPostId = raced?.id ?? null;
      } else {
        throw new Error(`Failed to create durable post record: ${error.message}`);
      }
    } else {
      scheduledPostId = data?.id ?? null;
    }
  }

  if (scheduledPostId && scheduledPostId !== job.scheduled_post_id) {
    await supabase.from("media_publish_jobs").update({ scheduled_post_id: scheduledPostId }).eq("id", job.id);
    job.scheduled_post_id = scheduledPostId;
  }
  return scheduledPostId;
}

async function processJob(supabase: SupabaseClient, job: MediaJob, resolvedVideoUrl: string) {
  const nextAttempt = Number(job.attempts ?? 0) + 1;
  const { data: claimed } = await supabase.from("media_publish_jobs")
    .update({ status: "processing", attempts: nextAttempt, next_attempt_at: null, error: null })
    .eq("id", job.id).eq("status", "pending_media").select("*").maybeSingle();
  if (!claimed) return { dispatched: 0, failed: 0, deferred: 0 };
  const activeJob = claimed as MediaJob;

  const payload = activeJob.post_payload && typeof activeJob.post_payload === "object" ? structuredClone(activeJob.post_payload) : {};
  const originalMedia = Array.isArray((payload as any).mediaUrls) ? (payload as any).mediaUrls.filter((u: unknown) => typeof u === "string" && u.length > 0) : [];
  const nextMediaUrls = originalMedia.some((url: string) => url.includes("videodelivery.net/"))
    ? originalMedia.map((url: string) => url.includes("videodelivery.net/") ? resolvedVideoUrl : url)
    : [...originalMedia, resolvedVideoUrl];

  await ensureScheduledPostForJob(supabase, activeJob, { status: "processing", mediaUrls: nextMediaUrls });

  try {
    // The job's own workspace is authoritative. Pass it explicitly so the
    // publish scope is resolved from the workspace, never inherited.
    const result: any = await publishSocialPost({
      supabase,
      userId: activeJob.supabase_user_id,
      payload: {
        ...(payload as Record<string, unknown>),
        workspaceId: activeJob.workspace_id ?? (payload as any).workspaceId ?? null,
        mediaUrls: nextMediaUrls,
        _skipPersistence: true,
      },
    });
    if (!result.ok) {
      const message = result.message || result.error || "Failed to publish";
      if (nextAttempt < MAX_JOB_ATTEMPTS && (result.status === 429 || isTransientPublishError(message))) {
        const retryAt = new Date(Date.now() + Math.min(30_000 * 2 ** (nextAttempt - 1), 10 * 60_000)).toISOString();
        await supabase.from("media_publish_jobs").update({ status: "pending_media", error: message, next_attempt_at: retryAt }).eq("id", activeJob.id);
        await ensureScheduledPostForJob(supabase, activeJob, { status: "pending_retry", error: `Temporary publishing issue; retry ${nextAttempt}/${MAX_JOB_ATTEMPTS} is scheduled.`, retryAfter: retryAt, mediaUrls: nextMediaUrls });
        return { dispatched: 0, failed: 0, deferred: 1 };
      }
      await ensureScheduledPostForJob(supabase, activeJob, { status: "error", error: message, mediaUrls: nextMediaUrls });
      await supabase.from("media_publish_jobs").update({ status: "error", error: message, completed_at: new Date().toISOString() }).eq("id", activeJob.id);
      return { dispatched: 0, failed: 1, deferred: 0 };
    }

    const postStatus = result.pendingRetry ? "pending_retry" : ((payload as any).scheduleDate ? "scheduled" : "published");
    await ensureScheduledPostForJob(supabase, activeJob, {
      status: postStatus,
      error: result.pendingRetry ? `Temporary provider issue; automatic retry scheduled for ${result.retryAt}.` : null,
      providerPostId: result.postId ?? null,
      profileKey: result.profileKey ?? null,
      retryAfter: result.retryAt ?? null,
      mediaUrls: nextMediaUrls,
    });
    await supabase.from("media_publish_jobs").update({ status: "dispatched", error: null, completed_at: new Date().toISOString() }).eq("id", activeJob.id);
    return { dispatched: 1, failed: 0, deferred: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected publishing error";
    if (nextAttempt < MAX_JOB_ATTEMPTS && isTransientPublishError(message)) {
      const retryAt = new Date(Date.now() + Math.min(30_000 * 2 ** (nextAttempt - 1), 10 * 60_000)).toISOString();
      await supabase.from("media_publish_jobs").update({ status: "pending_media", error: message, next_attempt_at: retryAt }).eq("id", activeJob.id);
      await ensureScheduledPostForJob(supabase, activeJob, { status: "pending_retry", error: "Temporary publishing issue; an automatic retry is scheduled.", retryAfter: retryAt, mediaUrls: nextMediaUrls });
      return { dispatched: 0, failed: 0, deferred: 1 };
    }
    await ensureScheduledPostForJob(supabase, activeJob, { status: "error", error: message, mediaUrls: nextMediaUrls });
    await supabase.from("media_publish_jobs").update({ status: "error", error: message, completed_at: new Date().toISOString() }).eq("id", activeJob.id);
    return { dispatched: 0, failed: 1, deferred: 0 };
  }
}

export async function dispatchPendingJobsForUid(supabase: SupabaseClient, cfUid: string, resolvedVideoUrl: string) {
  const { data: jobs, error } = await supabase.from("media_publish_jobs").select("*")
    .eq("cf_uid", cfUid).eq("status", "pending_media").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const dueJobs = (jobs ?? []).filter((job: any) => !job.next_attempt_at || new Date(job.next_attempt_at) <= new Date());
  let cursor = 0;
  const totals = { dispatched: 0, failed: 0, deferred: 0 };
  async function worker() {
    while (cursor < dueJobs.length) {
      const job = dueJobs[cursor++] as MediaJob;
      const result = await processJob(supabase, job, resolvedVideoUrl);
      totals.dispatched += result.dispatched;
      totals.failed += result.failed;
      totals.deferred += result.deferred;
    }
  }
  await Promise.all(Array.from({ length: Math.min(DISPATCH_CONCURRENCY, dueJobs.length) }, () => worker()));
  return { ...totals, total: dueJobs.length };
}

/**
 * Mark every outstanding job for a UID as permanently failed.
 *
 * Call this ONLY when the media can never succeed — i.e. after catching a
 * CfPermanentError. Calling it for transient conditions destroys users'
 * scheduled posts and is the failure mode this module exists to prevent.
 */
export async function markUidMediaFailure(supabase: SupabaseClient, cfUid: string, message: string) {
  const { data: jobs } = await supabase.from("media_publish_jobs").select("*").eq("cf_uid", cfUid).in("status", ["pending_media", "processing"]);
  for (const job of (jobs ?? []) as MediaJob[]) {
    await ensureScheduledPostForJob(supabase, job, { status: "error", error: message });
    await supabase.from("media_publish_jobs").update({ status: "error", error: message, completed_at: new Date().toISOString() }).eq("id", job.id);
  }
}
