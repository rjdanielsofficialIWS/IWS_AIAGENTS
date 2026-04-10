import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publishSocialPost } from "../_shared/publish-social.ts";

const CORS_ORIGINS = [
  "https://infinitewealthsolutionsai.com",
  "https://www.infinitewealthsolutionsai.com",
];

async function dispatchPendingJobsForUid(supabase: ReturnType<typeof createClient>, cfUid: string) {
  const { data: jobs, error } = await supabase
    .from("media_publish_jobs")
    .select("*")
    .eq("cf_uid", cfUid)
    .eq("status", "pending_media")
    .order("created_at", { ascending: true });

  if (error || !jobs || jobs.length === 0) return { dispatched: 0 };

  let dispatched = 0;
  for (const job of jobs) {
    await supabase
      .from("media_publish_jobs")
      .update({ status: "processing", attempts: (job.attempts ?? 0) + 1 })
      .eq("id", job.id);

    const payload = typeof job.post_payload === "object" && job.post_payload
      ? structuredClone(job.post_payload)
      : {};
    const mediaUrls = Array.isArray((payload as any).mediaUrls)
      ? (payload as any).mediaUrls.filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
      : [];
    const nextMediaUrls = mediaUrls.some((url) => url.includes("videodelivery.net/"))
      ? mediaUrls.map((url) => url.includes("videodelivery.net/") ? job.stream_url : url)
      : [...mediaUrls, job.stream_url];

    const result = await publishSocialPost({
      supabase,
      userId: job.supabase_user_id,
      payload: { ...(payload as Record<string, unknown>), mediaUrls: nextMediaUrls },
    });

    if (!result.ok) {
      await supabase
        .from("media_publish_jobs")
        .update({ status: "error", error: result.message || result.error || "Failed to publish" })
        .eq("id", job.id);
      continue;
    }

    await supabase
      .from("media_publish_jobs")
      .update({ status: "dispatched", error: null })
      .eq("id", job.id);
    dispatched += 1;
  }

  return { dispatched };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const respond = (code: number, data: unknown) => new Response(JSON.stringify(data), { status: code, headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // GET ?jobId=xxx — poll publish job status
  if (req.method === "GET") {
    const jobId = new URL(req.url).searchParams.get("jobId");
    if (!jobId) return respond(400, { error: "jobId required" });
    const { data: job, error: jobErr } = await supabase
      .from("media_publish_jobs")
      .select("status, error")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr || !job) return respond(404, { error: "Job not found" });
    return respond(200, { status: job.status, error: job.error ?? null });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  let userId = "";
  if (token) {
    try {
      const b64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
      const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
      const payload = JSON.parse(atob(padded));
      if (payload.role === "authenticated" && payload.sub) userId = payload.sub;
    } catch {
      // fall through to getUser
    }
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) userId = user.id;
    }
  }
  const bodyUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId && bodyUserId) {
    const { data: userRow, error: userLookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", bodyUserId)
      .maybeSingle();
    if (!userLookupError && userRow?.id) userId = userRow.id;
  }
  if (!userId) return respond(401, { error: "Not authenticated." });

  const cfUid = typeof body.cfUid === "string" ? body.cfUid.trim() : "";
  const streamUrl = typeof body.streamUrl === "string" ? body.streamUrl.trim() : "";
  const postPayload = typeof body.payload === "object" && body.payload ? body.payload as Record<string, unknown> : null;
  if (!cfUid || !streamUrl || !postPayload) {
    return respond(400, { error: "cfUid, streamUrl, and payload are required." });
  }

  const { data: inserted, error } = await supabase
    .from("media_publish_jobs")
    .insert({
      supabase_user_id: userId,
      workspace_id: typeof postPayload.workspaceId === "string" ? postPayload.workspaceId : null,
      cf_uid: cfUid,
      stream_url: streamUrl,
      post_payload: postPayload,
      scheduled_at: typeof postPayload.scheduleDate === "string" && postPayload.scheduleDate
        ? new Date(postPayload.scheduleDate).toISOString()
        : null,
      post_group_id: typeof postPayload.postGroupId === "string" ? postPayload.postGroupId : null,
      last_event: { source: "intent" },
    })
    .select("id")
    .single();

  if (error) return respond(500, { error: error.message || "Failed to queue media publish job." });

  const streamAlreadyReady = body.streamReady === true;
  if (streamAlreadyReady) {
    const dispatch = await dispatchPendingJobsForUid(supabase, cfUid);
    return respond(200, { queued: true, jobId: inserted.id, dispatched: dispatch.dispatched });
  }

  return respond(200, { queued: true, jobId: inserted.id, dispatched: 0 });
});
