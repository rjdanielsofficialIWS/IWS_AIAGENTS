import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"];

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { data: sub } = await supabase.from("subscriptions").select("stripe_subscription_id,stripe_customer_id,cancel_at_period_end,current_period_end").eq("supabase_user_id", user.id).maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "No subscription found." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (sub.stripe_customer_id?.startsWith("promo_")) {
      return new Response(JSON.stringify({ error: "Promo accounts cannot be cancelled here." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (sub.cancel_at_period_end) {
      return new Response(JSON.stringify({ already_canceling: true, current_period_end: sub.current_period_end }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await supabase.from("subscriptions").update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq("supabase_user_id", user.id);

    return new Response(JSON.stringify({ canceled: true, current_period_end: sub.current_period_end }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("cancel-subscription error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": CORS_ORIGINS[0], "Content-Type": "application/json" } });
  }
});
