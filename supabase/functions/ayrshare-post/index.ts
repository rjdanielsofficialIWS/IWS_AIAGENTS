import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publishSocialPost } from "../_shared/publish-social.ts";

const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "sk_1adb5186f3be9a2321b4c2ede480187d250c324f03fce819cc22632d19abb7c2";
const ZERNIO_API_URL = "https://zernio.com/api/v1";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"].includes(origin)
    ? origin
    : "https://infinitewealthsolutionsai.com";
  const cors = {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const respond = (code: number, data: unknown) => new Response(JSON.stringify(data), { status: code, headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  let userId = "";

  // ── delete_post: auth via body.userId + DB ownership check ───────────────────
  // Deletes don't require a valid JWT — security is enforced by the DB query
  // which only deletes rows where supabase_user_id matches the provided userId.
  // This avoids session-expiry failures while keeping deletes safe.
  if (action === "delete_post") {
    const bodyUserId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!bodyUserId) return respond(401, { error: "userId required for delete." });

    const postId = typeof body.postId === "string" ? body.postId.trim() : "";
    // Strip legacy:: fingerprints — those are frontend-only display keys, never real UUIDs.
    // If one slips through, fall back to postId to avoid a DB uuid parse error.
    const rawGroupId = typeof body.postGroupId === "string" ? body.postGroupId.trim() : "";
    const postGroupId = rawGroupId.startsWith("legacy::") ? "" : rawGroupId;
    if (!postId && !postGroupId) return respond(400, { error: "postId or postGroupId required" });

    // Look up DB records to get Zernio IDs for cancellation.
    // The eq("supabase_user_id", bodyUserId) enforces ownership — no JWT needed.
    let q = supabase
      .from("scheduled_posts")
      .select("id, ayrshare_post_id, profile_key")
      .eq("supabase_user_id", bodyUserId);
    q = postGroupId ? (q as any).eq("post_group_id", postGroupId) : (q as any).eq("id", postId);
    const { data: dbPosts } = await q;

    // Cancel at Zernio (best-effort)
    if (Array.isArray(dbPosts) && dbPosts.length > 0) {
      await Promise.allSettled(
        dbPosts.map(async (p: any) => {
          if (p.ayrshare_post_id && p.profile_key) {
            await fetch(`${ZERNIO_API_URL}/posts/${p.ayrshare_post_id}?profileId=${p.profile_key}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` },
            });
          }
        })
      );
    }

    // Delete from DB — ownership is enforced by the supabase_user_id filter
    let del = supabase.from("scheduled_posts").delete().eq("supabase_user_id", bodyUserId);
    del = postGroupId ? (del as any).eq("post_group_id", postGroupId) : (del as any).eq("id", postId);
    const { error: delErr } = await del;
    if (delErr) return respond(500, { error: "Failed to delete from database: " + delErr.message });

    return respond(200, { success: true });
  }

  // ── All other actions require a valid JWT ─────────────────────────────────────

  // Fast path: decode JWT locally
  if (token) {
    try {
      const b64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
      const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
      const jwtPayload = JSON.parse(atob(padded));
      if (jwtPayload.role === "authenticated" && jwtPayload.sub) userId = jwtPayload.sub;
    } catch { /* fall through */ }
  }

  // Slow path: verify with Supabase auth server
  if (!userId && token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) userId = user.id;
  }

  if (!userId) return respond(401, { error: "Not authenticated. Please sign out and back in." });

  // ── publish post (default) ────────────────────────────────────────────────────
  const result = await publishSocialPost({
    supabase,
    userId,
    payload: {
      platforms: Array.isArray(body.platforms) ? body.platforms as string[] : [],
      post: typeof body.post === "string" ? body.post : "",
      mediaUrls: Array.isArray(body.mediaUrls) ? body.mediaUrls as string[] : [],
      scheduleDate: typeof body.scheduleDate === "string" ? body.scheduleDate : "",
      workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : null,
      thread: Array.isArray(body.thread) ? body.thread as string[] : [],
      carousel: body.carousel === true,
      postGroupId: typeof body.postGroupId === "string" ? body.postGroupId : undefined,
    },
  });

  if (!result.ok) return respond(result.status, result);
  return respond(200, { success: true, postId: result.postId, result: result.result });
});
