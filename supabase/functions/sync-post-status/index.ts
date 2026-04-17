import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "sk_1adb5186f3be9a2321b4c2ede480187d250c324f03fce819cc22632d19abb7c2";
const ZERNIO_API_URL = "https://zernio.com/api/v1";

// How many minutes after scheduled_at before we start polling.
// Gives Zernio time to actually fire the post before we check.
const GRACE_MINUTES = 5;

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Only check posts whose scheduled_at is at least GRACE_MINUTES ago.
  // Posts scheduled in the future or very recently are left alone.
  const graceDeadline = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();

  const { data: stalePosts, error } = await supabase
    .from("scheduled_posts")
    .select("id, ayrshare_post_id, profile_key, platforms")
    .eq("status", "scheduled")
    .lt("scheduled_at", graceDeadline)
    .not("ayrshare_post_id", "is", null)
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  }

  if (!stalePosts || stalePosts.length === 0) {
    return new Response(JSON.stringify({ synced: 0, message: "Nothing to sync" }), { headers: cors });
  }

  let published = 0;
  let failed = 0;
  let skipped = 0;

  await Promise.allSettled(stalePosts.map(async (post: any) => {
    try {
      const res = await fetch(
        `${ZERNIO_API_URL}/posts/${post.ayrshare_post_id}?profileId=${post.profile_key}`,
        { headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` } },
      );

      if (!res.ok) {
        // 404 = Zernio has no record of this post — mark as error
        if (res.status === 404) {
          await supabase
            .from("scheduled_posts")
            .update({ status: "error", error: "Post not found on Zernio" })
            .eq("id", post.id);
          failed++;
        } else {
          // Transient API error — leave it, will retry next run
          skipped++;
        }
        return;
      }

      const data = await res.json();
      const latePost = data.post ?? data;

      // Match the platform-specific result. Our DB stores "x"; Zernio uses "twitter".
      const dbPlatform = (Array.isArray(post.platforms) ? post.platforms[0] ?? "" : "").toLowerCase();
      const apiPlatform = dbPlatform === "x" ? "twitter" : dbPlatform;

      const platResult = (latePost.platforms ?? []).find(
        (pl: any) => (pl.platform ?? "").toLowerCase() === apiPlatform,
      );

      // Prefer per-platform status; fall back to the top-level post status
      const rawStatus = ((platResult?.status ?? latePost.status ?? "") as string).toLowerCase();

      let newStatus: string | null = null;
      let errorMsg: string | null = null;

      if (rawStatus === "published") {
        newStatus = "published";
      } else if (rawStatus === "failed" || rawStatus === "error") {
        newStatus = "error";
        errorMsg =
          platResult?.errorMessage ??
          platResult?.error ??
          latePost?.error ??
          "Failed to publish";
      }
      // Any other status (e.g. "pending", "processing") — leave as scheduled, retry next run

      if (newStatus) {
        await supabase
          .from("scheduled_posts")
          .update({ status: newStatus, error: errorMsg ?? null })
          .eq("id", post.id);
        if (newStatus === "published") published++;
        else failed++;
      } else {
        skipped++;
      }
    } catch {
      // Network error — leave it, will retry next run
      skipped++;
    }
  }));

  return new Response(
    JSON.stringify({ published, failed, skipped, total: stalePosts.length }),
    { headers: cors },
  );
});
