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

    const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id,status,plan,current_period_end").eq("supabase_user_id", user.id).maybeSingle();

    if (sub?.stripe_customer_id?.startsWith("promo_")) {
      return new Response(JSON.stringify({ promo: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (!sub?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "No billing account found." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : "https://infinitewealthsolutionsai.com/InfiniteMedia";

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: returnUrl,
    });

    // Offer a retention discount if they've been active for 30+ days and haven't had one recently
    let offerEligible = false;
    if (sub.status === "active" && sub.current_period_end) {
      const periodEnd = new Date(sub.current_period_end);
      const now = new Date();
      const daysLeft = (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      // Offer if more than 15 days remain (not close to renewal, unlikely they already paid for next month)
      // Check if they've already received a retention discount
      const { data: existingDiscount } = await supabase.from("retention_discounts").select("id").eq("supabase_user_id", user.id).maybeSingle().catch(() => ({ data: null }));
      offerEligible = daysLeft > 5 && !existingDiscount;
    }

    return new Response(JSON.stringify({ url: session.url, offerEligible }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("stripe-portal error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": CORS_ORIGINS[0], "Content-Type": "application/json" } });
  }
});
