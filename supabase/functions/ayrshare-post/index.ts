import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publishSocialPost } from "../_shared/publish-social.ts";

const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
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

  if (token) {
    try {
      const b64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
      const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
      const jwtPayload = JSON.parse(atob(padded));
      if (jwtPayload.role === "authenticated" && jwtPayload.sub) userId = jwtPayload.sub;
    } catch { /* fall through */ }
  }
  if (!userId && token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) userId = user.id;
  }

  // ── delete_post ─────────────────────────────────────────────────────────
  if (action === "delete_post") {
    if (!userId) return respond(401, { error: "Not authenticated." });
    const postId = typeof body.postId === "string" ? body.postId.trim() : "";
    const rawGroupId = typeof body.postGroupId === "string" ? body.postGroupId.trim() : "";
    const postGroupId = rawGroupId.startsWith("legacy::") ? "" : rawGroupId;
    if (!postId && !postGroupId) return respond(400, { error: "postId or postGroupId required" });

    let q = supabase.from("scheduled_posts").select("id, ayrshare_post_id, profile_key").eq("supabase_user_id", userId);
    q = postGroupId ? (q as any).eq("post_group_id", postGroupId) : (q as any).eq("id", postId);
    const { data: dbPosts } = await q;

    if (Array.isArray(dbPosts) && dbPosts.length > 0) {
      await Promise.allSettled(dbPosts.map(async (p: any) => {
        if (p.ayrshare_post_id && p.profile_key) {
          await fetch(`${ZERNIO_API_URL}/posts/${p.ayrshare_post_id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` },
          });
        }
      }));
    }

    let del = supabase.from("scheduled_posts").delete().eq("supabase_user_id", userId);
    del = postGroupId ? (del as any).eq("post_group_id", postGroupId) : (del as any).eq("id", postId);
    const { error: delErr } = await del;
    if (delErr) return respond(500, { error: "Failed to delete from database: " + delErr.message });
    return respond(200, { success: true });
  }

  // ── JWT auth ──────────────────────────────────────────────────────────
  if (!userId) return respond(401, { error: "Not authenticated. Please sign out and back in." });

  // ── Pre-flight: X/Twitter 280-character limit ───────────────────────────────
  const postContent = typeof body.post === "string" ? body.post : "";
  const selectedPlatforms = Array.isArray(body.platforms)
    ? (body.platforms as string[]).map((p) => String(p).trim().toLowerCase())
    : [];
  const selectedTargetPlatforms = Array.isArray(body.platformTargets)
    ? (body.platformTargets as any[]).map((t) => String(t?.platform ?? "").trim().toLowerCase())
    : [];
  const allPlatforms = [...selectedPlatforms, ...selectedTargetPlatforms];
  const isPostingToX = allPlatforms.some((p) => p === "x" || p === "twitter");
  if (isPostingToX && postContent.length > 280) {
    return respond(400, {
      error: `Tweet text is too long (${postContent.length} characters). Twitter's limit is 280 characters. Note: URLs count as 23 characters. Please shorten your text.`,
      platform: "x",
      characterCount: postContent.length,
      characterLimit: 280,
    });
  }

  // ── Publish ────────────────────────────────────────────────────────────
  const result = await publishSocialPost({
    supabase,
    userId,
    payload: {
      platforms: Array.isArray(body.platforms) ? body.platforms as string[] : [],
      post: postContent,
      mediaUrls: Array.isArray(body.mediaUrls) ? body.mediaUrls as string[] : [],
      scheduleDate: typeof body.scheduleDate === "string" ? body.scheduleDate : "",
      workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : null,
      thread: Array.isArray(body.thread) ? body.thread as string[] : [],
      carousel: body.carousel === true,
      postGroupId: typeof body.postGroupId === "string" ? body.postGroupId : undefined,
      platformTargets: Array.isArray(body.platformTargets)
        ? body.platformTargets
          .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
          .map((t) => ({ platform: typeof t.platform === "string" ? t.platform : "", accountId: typeof t.accountId === "string" ? t.accountId : undefined }))
        : undefined,
      platformAccountIds: body.platformAccountIds && typeof body.platformAccountIds === "object" && !Array.isArray(body.platformAccountIds)
        ? body.platformAccountIds as Record<string, string>
        : undefined,
    },
  });

  if (!result.ok) return respond(result.status, result);
  return respond(200, { success: true, postId: result.postId, result: result.result });
});
