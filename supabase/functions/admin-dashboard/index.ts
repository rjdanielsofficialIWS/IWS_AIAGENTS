import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com", "http://localhost:5173"];
const PLAN_MRR: Record<string, number> = { agency: 297, viral: 97, starter: 29, free: 0 };

function getPeriod() {
  const d = new Date();
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const period = getPeriod();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const sevenDaysAgo  = new Date(now.getTime() -  7 * 86400000).toISOString();

    // All auth users (paginated — fetch up to 1000)
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    // All subscriptions
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("supabase_user_id,plan,status,stripe_customer_id,current_period_end");

    const subMap = new Map((subs ?? []).map((s: any) => [s.supabase_user_id, s]));

    // Usage this month (for aggregate AI + posts counts)
    const { data: usageRows } = await supabase
      .from("usage_tracking")
      .select("supabase_user_id,ai_analyses_used,posts_scheduled")
      .eq("period", period);

    const totalAiCalls = (usageRows ?? []).reduce((acc: number, r: any) => acc + (r.ai_analyses_used ?? 0), 0);
    const totalPostsThisMonth = (usageRows ?? []).reduce((acc: number, r: any) => acc + (r.posts_scheduled ?? 0), 0);

    // Post counts by status
    const { data: allPosts } = await supabase
      .from("scheduled_posts")
      .select("status,created_at");

    const posts = (allPosts ?? []) as Array<{ status: string; created_at: string }>;
    const postStats = {
      total: posts.length,
      published: posts.filter(p => p.status === "published").length,
      scheduled: posts.filter(p => p.status === "scheduled").length,
      failed: posts.filter(p => p.status === "error").length,
      last30Days: posts.filter(p => p.created_at >= thirtyDaysAgo).length,
    };

    // Connected social accounts (distinct users with ayrshare profile)
    const { data: profiles } = await supabase
      .from("ayrshare_profiles")
      .select("supabase_user_id");
    const connectedUserIds = new Set((profiles ?? []).map((p: any) => p.supabase_user_id));

    // Build user list
    const adminUsers = (authUsers ?? []).map((u: any) => {
      const sub = subMap.get(u.id) as any;
      const isPromo = sub?.stripe_customer_id?.startsWith("promo_") ?? false;
      const isTrialing = sub?.status === "trialing" && sub?.current_period_end && new Date(sub.current_period_end) > now;
      const isActive = sub?.plan && (sub?.status === "active" || isPromo || isTrialing);
      const plan: string = isActive ? (sub!.plan as string).toLowerCase() : "free";
      const status: string = isTrialing ? "trialing" : (sub?.status ?? "none");
      const trialExpired = sub?.status === "trialing" && sub?.current_period_end ? new Date(sub.current_period_end) <= now : false;
      const mrr = isActive && !isTrialing ? (PLAN_MRR[plan] ?? 0) : 0;
      return {
        id: u.id,
        email: u.email ?? "",
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        plan,
        status,
        trialEnd: sub?.current_period_end ?? null,
        trialExpired,
        isPromo,
        stripeId: sub?.stripe_customer_id ?? null,
        mrr,
      };
    });

    // Aggregate stats
    const planBreakdown: Record<string, number> = { agency: 0, viral: 0, starter: 0, free: 0 };
    let activeUsers = 0, trialingUsers = 0, expiredTrials = 0, mrr = 0;
    for (const u of adminUsers) {
      planBreakdown[u.plan] = (planBreakdown[u.plan] ?? 0) + 1;
      if (u.status === "active") activeUsers++;
      if (u.status === "trialing" && !u.trialExpired) trialingUsers++;
      if (u.trialExpired) expiredTrials++;
      mrr += u.mrr;
    }

    const newSignups7d  = (authUsers ?? []).filter((u: any) => u.created_at >= sevenDaysAgo).length;
    const newSignups30d = (authUsers ?? []).filter((u: any) => u.created_at >= thirtyDaysAgo).length;

    // Signups by day (last 14 days)
    const signupsByDay: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      signupsByDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const u of (authUsers ?? []) as any[]) {
      const day = (u.created_at as string).slice(0, 10);
      if (day in signupsByDay) signupsByDay[day]++;
    }

    return json({
      stats: {
        totalUsers: adminUsers.length,
        activeUsers,
        trialingUsers,
        expiredTrials,
        newSignups7d,
        newSignups30d,
        connectedUsers: connectedUserIds.size,
        mrr,
        arr: mrr * 12,
        planBreakdown,
        posts: postStats,
        usage: { aiCallsThisMonth: totalAiCalls, postsScheduledThisMonth: totalPostsThisMonth },
        signupsByDay,
      },
      users: adminUsers,
    });
  } catch (e: any) {
    console.error("admin-dashboard error:", e);
    return json({ error: e.message ?? "Internal error" }, 500);
  }
});
