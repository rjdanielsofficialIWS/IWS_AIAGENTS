import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Canonical provider config. This function had drifted onto the retired
// getlate.dev host with an inlined API key; both are corrected here so it
// matches sync-post-status and publish-social.
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const ZERNIO_API_URL = "https://zernio.com/api/v1";

const CORS_ORIGINS = [
  "https://infinitewealthsolutionsai.com",
  "https://www.infinitewealthsolutionsai.com",
];

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const respond = (code: number, data: unknown) =>
    new Response(JSON.stringify(data), { status: code, headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  let userId = "";
  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) userId = user.id;
  }

  const url = new URL(req.url);
  if (!userId) userId = url.searchParams.get("userId") ?? "";
  if (!userId) return respond(401, { error: "Not authenticated." });

  const start = url.searchParams.get("start") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end   = url.searchParams.get("end")   ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const workspaceId = url.searchParams.get("workspaceId") ?? "";

  // ── Durable post records ────────────────────────────────────────────────────
  // scheduled_posts is the single source of truth for anything the user can
  // open, retry, or delete. Every id returned in `posts` is a scheduled_posts.id.
  let query = supabase
    .from("scheduled_posts")
    .select("id, content, platforms, scheduled_at, status, error, media_urls, ayrshare_post_id, profile_key, post_group_id")
    .eq("supabase_user_id", userId)
    .gte("scheduled_at", start)
    .lte("scheduled_at", end)
    .order("scheduled_at", { ascending: false })
    .limit(200);
  query = workspaceId ? (query as any).eq("workspace_id", workspaceId) : (query as any).is("workspace_id", null);

  const { data: posts, error: dbError } = await query;
  if (dbError) return respond(500, { error: "DB error" });

  // ── In-flight media jobs ───────────────────────────────────────────────────
  // CRITICAL: only surface a job that does NOT yet have a durable
  // scheduled_posts row.
  //
  // Once media-publish-jobs calls ensureScheduledPostForJob, the job and the
  // post describe the SAME thing — but they carry different primary keys.
  // Emitting both made one logical failure render twice, and the duplicate was
  // keyed by media_publish_jobs.id. Opening it looked up that id against the
  // posts collection, matched nothing, and the row silently vanished from the
  // UI. Filtering on scheduled_post_id keeps genuinely orphaned uploads (a job
  // that failed before any post row existed) visible, while never emitting a
  // second entry for a post the user can already see and act on.
  let jobQuery = supabase
    .from("media_publish_jobs")
    .select("id, post_payload, scheduled_at, status, error, stream_url, post_group_id, created_at, updated_at, scheduled_post_id")
    .eq("supabase_user_id", userId)
    .in("status", ["pending_media", "processing", "error"])
    .is("scheduled_post_id", null)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false })
    .limit(100);
  jobQuery = workspaceId ? (jobQuery as any).eq("workspace_id", workspaceId) : (jobQuery as any).is("workspace_id", null);

  const { data: mediaJobs, error: jobError } = await jobQuery;
  if (jobError) return respond(500, { error: "Job DB error" });

  // Belt-and-braces: if a job predates scheduled_post_id backfill, it can still
  // be a duplicate of a post in this same response. Drop any job whose
  // post_group_id already appears in `posts`.
  const knownGroupIds = new Set(
    (posts ?? []).map((p: any) => (p.post_group_id ? String(p.post_group_id) : "")).filter(Boolean),
  );
  const orphanJobs = (mediaJobs ?? []).filter(
    (job: any) => !job.post_group_id || !knownGroupIds.has(String(job.post_group_id)),
  );

  // ── Lazy reconciliation for past-due posts ─────────────────────────────────
  // Only ever promotes scheduled → published/error on a definitive provider
  // answer. Anything else (network failure, non-OK, unknown state) is left
  // alone for the sync-post-status cron rather than guessed at here.
  const now = new Date();
  const toReconcile = (posts ?? []).filter((p: any) =>
    p.status === "scheduled" && p.ayrshare_post_id && new Date(p.scheduled_at) < now
  );

  if (toReconcile.length > 0 && ZERNIO_API_KEY) {
    await Promise.allSettled(toReconcile.map(async (p: any) => {
      try {
        const res = await fetch(`${ZERNIO_API_URL}/posts/${p.ayrshare_post_id}`, {
          headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` },
        });
        if (!res.ok) return;

        const data = await res.json().catch(() => ({}));
        const providerPost = data.post ?? data;

        // Our DB stores "x"; the provider uses "twitter".
        const dbPlatform = (Array.isArray(p.platforms) ? p.platforms[0] ?? "" : "").toLowerCase();
        const apiPlatform = dbPlatform === "x" ? "twitter" : dbPlatform;
        const platResult = (providerPost.platforms ?? []).find(
          (pl: any) => (pl.platform ?? "").toLowerCase() === apiPlatform,
        );

        const rawStatus = String(platResult?.status ?? providerPost.status ?? "").toLowerCase();
        let newStatus: string | null = null;
        let errorMsg: string | null = null;
        if (rawStatus === "published") {
          newStatus = "published";
        } else if (rawStatus === "failed" || rawStatus === "error") {
          newStatus = "error";
          errorMsg = platResult?.errorMessage ?? platResult?.error ?? providerPost?.error ?? "Failed to publish";
        }
        if (!newStatus) return;

        await supabase.from("scheduled_posts").update({ status: newStatus, error: errorMsg }).eq("id", p.id);
        p.status = newStatus;
        p.error = errorMsg;
      } catch (e) {
        console.error("[ayrshare-scheduled] reconcile failed for post", p.id, e);
      }
    }));
  }

  return respond(200, {
    posts: (posts ?? []).map((p: any) => ({
      id:          p.id,
      content:     p.content,
      platforms:   p.platforms,
      scheduledAt: p.scheduled_at,
      status:      p.status,
      error:       p.error ?? null,
      mediaUrls:   Array.isArray(p.media_urls) ? p.media_urls : [],
      postGroupId: p.post_group_id ?? null,
      // Additive: lets the client route an entry to the right lookup/action
      // instead of assuming every id is a scheduled_posts id.
      source:      "post",
    })),
    queue: orphanJobs.map((job: any) => {
      const payload = typeof job.post_payload === "object" && job.post_payload ? job.post_payload : {};
      const mediaUrls = Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [];
      return {
        id:          job.id,
        content:     typeof payload.post === "string" ? payload.post : "",
        platforms:   Array.isArray(payload.platforms) ? payload.platforms : [],
        scheduledAt: job.scheduled_at ?? job.created_at,
        status:      job.status,
        error:       job.error ?? null,
        mediaUrls:   mediaUrls.some((u: unknown) => typeof u === "string" && u.length > 0)
          ? mediaUrls
          : (job.stream_url ? [job.stream_url] : []),
        postGroupId: job.post_group_id ?? null,
        createdAt:   job.created_at,
        updatedAt:   job.updated_at,
        source:      "job",
      };
    }),
  });
});
