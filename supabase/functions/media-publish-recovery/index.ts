import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dispatchPendingJobsForUid, ensureScheduledPostForJob, getCloudflareMp4Url, markUidMediaFailure } from "../_shared/media-publish-jobs.ts";
import { CfPermanentError } from "../_shared/cloudflare-stream.ts";

Deno.serve(async (req) => {
  const expected = Deno.env.get("MEDIA_RECOVERY_SECRET") ?? "";
  if (!expected || req.headers.get("x-recovery-secret") !== expected) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
  const staleBefore = new Date(Date.now() - 5 * 60_000).toISOString();
  const expiredBefore = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  // Reclaim jobs abandoned mid-flight by an interrupted worker.
  await supabase.from("media_publish_jobs").update({ status: "pending_media", error: "Recovered after an interrupted worker." })
    .eq("status", "processing").lt("updated_at", staleBefore);

  // Age-out sweep. This is the ONLY place a job is failed for taking too long.
  // Because getCloudflareMp4Url defers on anything non-terminal, a job that is
  // stuck for a full day is genuinely stuck and is safe to surface as an error.
  const { data: expiredJobs } = await supabase.from("media_publish_jobs").select("*")
    .eq("status", "pending_media").lt("created_at", expiredBefore).limit(200);
  for (const job of expiredJobs ?? []) {
    const message = "Publishing request expired after remaining unprocessed for 24 hours.";
    await ensureScheduledPostForJob(supabase, job, { status: "error", error: message });
    await supabase.from("media_publish_jobs").update({ status: "error", error: message, completed_at: new Date().toISOString() }).eq("id", job.id);
  }

  const { data: jobs, error } = await supabase.from("media_publish_jobs").select("cf_uid,next_attempt_at")
    .eq("status", "pending_media").gte("created_at", expiredBefore).order("created_at", { ascending: true }).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const now = new Date();
  const uids = [...new Set((jobs ?? []).filter((job: any) => !job.next_attempt_at || new Date(job.next_attempt_at) <= now).map((job: any) => String(job.cf_uid)).filter(Boolean))].slice(0, 10);
  const totals = { batches: uids.length, expired: expiredJobs?.length ?? 0, dispatched: 0, failed: 0, deferred: 0 };

  for (const cfUid of uids) {
    try {
      const media = await getCloudflareMp4Url(cfUid);
      if (!media.ready || !media.url) {
        // Still encoding / rendering / transient upstream issue. Leave queued.
        totals.deferred += 1;
        continue;
      }
      const result = await dispatchPendingJobsForUid(supabase, cfUid, media.url);
      totals.dispatched += result.dispatched;
      totals.failed += result.failed;
      totals.deferred += result.deferred;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Media recovery failed.";
      // Only a definitive terminal signal from Cloudflare fails the jobs.
      // Everything else stays queued for the next sweep.
      if (error instanceof CfPermanentError) {
        await markUidMediaFailure(supabase, cfUid, message);
        totals.failed += 1;
        console.error(`[media-publish-recovery] permanent failure for ${cfUid}:`, message);
      } else {
        totals.deferred += 1;
        console.warn(`[media-publish-recovery] deferring ${cfUid}:`, message);
      }
    }
  }
  return Response.json({ ok: true, ...totals });
});
