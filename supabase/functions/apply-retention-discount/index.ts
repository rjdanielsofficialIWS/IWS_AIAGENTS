import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"];
// 20% off for one month — create this coupon in Stripe dashboard if it doesn't exist
const RETENTION_COUPON_ID = Deno.env.get("STRIPE_RETENTION_COUPON_ID") ?? "";

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

    const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id,stripe_subscription_id,status").eq("supabase_user_id", user.id).maybeSingle();

    if (!sub?.stripe_subscription_id || sub.status !== "active") {
      return new Response(JSON.stringify({ error: "No active subscription found." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (sub.stripe_customer_id?.startsWith("promo_")) {
      return new Response(JSON.stringify({ error: "Promo accounts are not eligible." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Guard: only apply once per user
    const { data: existing } = await supabase.from("retention_discounts").select("id").eq("supabase_user_id", user.id).maybeSingle().catch(() => ({ data: null }));
    if (existing) {
      return new Response(JSON.stringify({ error: "Retention discount already applied." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (!RETENTION_COUPON_ID) {
      return new Response(JSON.stringify({ error: "Retention coupon not configured." }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      coupon: RETENTION_COUPON_ID,
    });

    // Record so we don't apply twice
    await supabase.from("retention_discounts").insert({ supabase_user_id: user.id, applied_at: new Date().toISOString() }).catch(() => {});

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("apply-retention-discount error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": CORS_ORIGINS[0], "Content-Type": "application/json" } });
  }
});
