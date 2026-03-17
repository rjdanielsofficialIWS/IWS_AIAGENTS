import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"];
const TRIAL_PLANS  = ["starter", "viral"];
const TRIAL_DAYS   = 7;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin":  CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", "").trim());
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  let plan: string;
  try {
    const body = await req.json();
    plan = (body.plan ?? "").toLowerCase();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!TRIAL_PLANS.includes(plan)) {
    return json({ error: "invalid_plan", message: "Free trial is available for Creator and Viral plans." }, 400);
  }

  // Check for existing subscription row
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status, trial_expires_at")
    .eq("supabase_user_id", user.id)
    .maybeSingle();

  if (existing?.status === "active") {
    return json({ error: "already_subscribed", message: "You already have an active subscription." }, 409);
  }

  if (existing?.trial_expires_at) {
    return json({ error: "trial_already_used", message: "You have already used your free trial." }, 409);
  }

  const trialExpiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const row = { supabase_user_id: user.id, plan, status: "trialing", trial_expires_at: trialExpiresAt };

  let dbErr;
  if (existing) {
    // Row exists — update it
    const { error } = await supabase
      .from("subscriptions")
      .update({ plan, status: "trialing", trial_expires_at: trialExpiresAt })
      .eq("supabase_user_id", user.id);
    dbErr = error;
  } else {
    // No row yet — insert
    const { error } = await supabase.from("subscriptions").insert(row);
    dbErr = error;
  }

  if (dbErr) {
    return json({ error: "Failed to start trial: " + dbErr.message }, 500);
  }

  return json({ success: true, plan, trial_expires_at: trialExpiresAt });
});
