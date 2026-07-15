import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const LATE_API_KEY = "sk_1adb5186f3be9a2321b4c2ede480187d250c324f03fce819cc22632d19abb7c2";
const LATE_API_URL = "https://getlate.dev/api/v1";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"].includes(origin) ? origin : "https://infinitewealthsolutionsai.com";
  const cors = { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const respond = (code: number, data: unknown) => new Response(JSON.stringify(data), { status: code, headers: cors });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  let userId = "";
  if (token) { const { data: { user }, error } = await supabase.auth.getUser(token); if (!error && user) userId = user.id; }

  const url = new URL(req.url);
  if (!userId) userId = url.searchParams.get("userId") ?? "";
  if (!userId) return respond(401, { error: "Not authenticated." });

  const start = url.searchParams.get("start") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end   = url.searchParams.get("end")   ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const workspaceId = url.searchParams.get("workspaceId") ?? "";

  let query = supabase
    .from("scheduled_posts")
    .select("id, content, platforms, scheduled_at, status, error, media_urls, ayrshare_post_id, profile_key, post_group_id")
    .eq("supabase_user_id", userId)
    .gte("scheduled_at", start)
    .lte("scheduled_at", end)
    .order("scheduled_at", { ascending: false })
    .limit(200);

  if (workspaceId) query = (query as any).eq("workspace_id", workspaceId);
  else query = (query as any).is("workspace_id", null);

  const { data: posts, error: dbError } = await query;
  if (dbError) return respond(500, { error: "DB error" });

  let jobQuery = supabase
    .from("media_publish_jobs")
    .select("id, post_payload, scheduled_at, status, error, stream_url, post_group_id, created_at, updated_at")
    .eq("supabase_user_id", userId)
    .in("status", ["pending_media", "processing", "error"])
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false })
    .limit(100);

  if (workspaceId) jobQuery = (jobQuery as any).eq("workspace_id", workspaceId);
  else jobQuery = (jobQuery as any).is("workspace_id", null);

  const { data: mediaJobs, error: jobError } = await jobQuery;
  if (jobError) return respond(500, { error: "Job DB error" });

  const now = new Date();

  // Lazy reconciliation: for past-due posts that have a GetLate ID, fetch real status
  const toReconcile = (posts ?? []).filter((p: any) =>
    p.status === "scheduled" && p.ayrshare_post_id && new Date(p.scheduled_at) < now
  );

  if (toReconcile.length > 0) {
    await Promise.all(toReconcile.map(async (p: any) => {
      try {
        const res = await fetch(`${LATE_API_URL}/posts/${p.ayrshare_post_id}?profileId=${p.profile_key}`, {
          headers: { "Authorization": `Bearer ${LATE_API_KEY}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const latePost = data.post ?? data;

        // Match the platform (our DB stores "x", GetLate uses "twitter")
        const dbPlatform = (p.platforms[0] ?? "").toLowerCase();
        const apiPlatform = dbPlatform === "x" ? "twitter" : dbPlatform;
        const platResult = (latePost.platforms ?? []).find((pl: any) =>
          (pl.platform ?? "").toLowerCase() === apiPlatform
        );

        const rawStatus: string = platResult?.status ?? latePost.status ?? "";
        const newStatus = rawStatus === "published" ? "published" : rawStatus === "failed" ? "error" : null;
        if (!newStatus) return;

        const errorMsg: string | null = platResult?.errorMessage ?? null;
        await supabase.from("scheduled_posts").update({ status: newStatus, error: errorMsg }).eq("id", p.id);
        p.status = newStatus;
        p.error = errorMsg;
      } catch (e) {
        console.error("Reconcile failed for post", p.id, e);
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
    })),
    queue: (mediaJobs ?? []).map((job: any) => {
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
      };
    }),
  });
});
