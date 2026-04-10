import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publishSocialPost } from "../_shared/publish-social.ts";

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

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
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
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) userId = user.id;
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
