import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"];

const TRIAL_CODES: Record<string, { plan: string; days: number }> = {
  QUEENCEE: { plan: "agency", days: 7 },
};

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

  let code: string;
  try {
    const body = await req.json();
    code = (body.code ?? "").trim().toUpperCase();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const entry = TRIAL_CODES[code];
  if (!entry) {
    return json({ error: "Invalid promo code" }, 400);
  }

  const { plan, days } = entry;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end")
    .eq("supabase_user_id", user.id)
    .maybeSingle();

  if (existing?.status === "active") {
    return json({ error: "already_subscribed" }, 409);
  }

  if (existing?.status === "trialing") {
    return json({ error: "trial_already_used", message: "This trial code has already been used." }, 409);
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const row = {
    supabase_user_id:     user.id,
    plan,
    status:               "trialing",
    current_period_start: now.toISOString(),
    current_period_end:   trialEnd.toISOString(),
  };

  let dbErr;
  if (existing) {
    const { error } = await supabase
      .from("subscriptions")
      .update({ plan, status: "trialing", current_period_start: row.current_period_start, current_period_end: row.current_period_end })
      .eq("supabase_user_id", user.id);
    dbErr = error;
  } else {
    const { error } = await supabase.from("subscriptions").insert(row);
    dbErr = error;
  }

  if (dbErr) {
    return json({ error: "db_error", message: dbErr.message }, 500);
  }

  return json({ success: true, plan, trial_expires_at: trialEnd.toISOString() });
});
