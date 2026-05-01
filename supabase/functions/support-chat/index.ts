import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS_ORIGINS = [
  "https://infinitewealthsolutionsai.com",
  "https://www.infinitewealthsolutionsai.com",
  "https://iws-aiagents.vercel.app",
];

const PLAN_LIMITS: Record<string, { video_seconds: number; ai_captions: number; posts: number }> = {
  starter: { video_seconds: 60,  ai_captions: 15,  posts: 30  },
  viral:   { video_seconds: 120, ai_captions: 100, posts: 100 },
  agency:  { video_seconds: 240, ai_captions: -1,  posts: -1  },
  free:    { video_seconds: 0,   ai_captions: 0,   posts: 0   },
};

function getPeriod() {
  const d = new Date();
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function sendTelegram(token: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error("Telegram send failed:", e);
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401, cors);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: ae } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (ae || !user) return json({ error: "Unauthorized" }, 401, cors);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan,status,stripe_customer_id,current_period_end")
      .eq("supabase_user_id", user.id)
      .maybeSingle();

    const isPromo = sub?.stripe_customer_id?.startsWith("promo_");
    const isTrialing = sub?.status === "trialing" && !!sub?.current_period_end && new Date(sub.current_period_end) > new Date();
    const isActive = ((sub?.status === "active" || isPromo) || isTrialing) && !!sub?.plan;
    if (!isActive) return json({ error: "Support chat requires an active subscription." }, 403, cors);

    const plan = sub!.plan.toLowerCase();
    const body = await req.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];
    if (!messages.length) return json({ error: "messages required" }, 400, cors);

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";

    const tools = [
      {
        name: "get_account_info",
        description: "Get the user's subscription plan, status, and billing details",
        input_schema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "get_usage_stats",
        description: "Get the user's current month usage vs their plan limits for posts, AI captions, and video seconds",
        input_schema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "get_recent_posts",
        description: "Get the user's most recent scheduled posts, their publish status, platforms, and any error messages",
        input_schema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "How many posts to fetch (default 10, max 20)" },
          },
          required: [],
        },
      },
      {
        name: "get_connected_integrations",
        description: "Get which social media accounts and workspaces the user has connected",
        input_schema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "escalate_to_support",
        description: "Escalate to the human support team via Telegram. Use when: the issue requires a refund, manual plan change, or server-side fix you cannot perform; you have tried to resolve it and failed; or the user is clearly frustrated and needs a human.",
        input_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Clear description of the issue and what was already attempted" },
            urgency: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["summary", "urgency"],
        },
      },
    ];

    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
    const systemPrompt = `You are a concise, expert support agent for Infinite Media (also called Media Machine) — a social media scheduling and AI content platform.

User account:
- Email: ${user.email}
- Plan: ${planLabel}

Platform features:
- Schedule media posts (images/video) and text posts across 19+ platforms
- AI caption generation
- AI Video Studio (Kling v3 Pro)
- Content Repurposing Engine (Viral/Agency plans)
- Content Planner and Calendar
- Client Workspaces (Agency plan — 3 included)
- Autopilot auto-posting (Viral/Agency)

Plan video limits per workspace/month: Creator=60s, Viral=120s, Agency=240s.

Approach:
1. Use your tools to pull real account data before answering — never guess.
2. Give specific, actionable answers referencing actual numbers and errors.
3. For simple issues: diagnose and fix or explain clearly.
4. For complex issues (refunds, manual plan overrides, bugs you cannot fix): use escalate_to_support immediately.
5. Be direct. No filler. Get to the answer fast.`;

    let claudeMessages: any[] = messages.map(m => ({ role: m.role, content: m.content }));
    let escalated = false;
    let finalReply = "";

    for (let round = 0; round < 6; round++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages: claudeMessages,
          tools,
        }),
      });

      if (!res.ok) throw new Error("Claude API error: " + await res.text());
      const data = await res.json();

      if (data.stop_reason === "end_turn") {
        finalReply = data.content.find((b: any) => b.type === "text")?.text ?? "";
        break;
      }

      if (data.stop_reason === "tool_use") {
        claudeMessages.push({ role: "assistant", content: data.content });
        const toolResults: any[] = [];

        for (const block of data.content) {
          if (block.type !== "tool_use") continue;
          let result: unknown;

          if (block.name === "get_account_info") {
            result = {
              plan,
              status: sub?.status,
              isTrialing,
              isPromo,
              trialEndsAt: sub?.current_period_end ?? null,
              email: user.email,
            };
          } else if (block.name === "get_usage_stats") {
            const period = getPeriod();
            const { data: u } = await supabase
              .from("usage_tracking")
              .select("ai_analyses_used,posts_scheduled,text_posts_scheduled,video_seconds_used,video_seconds_bonus,caption_credits_bonus,strategies_used")
              .eq("supabase_user_id", user.id)
              .eq("period", period)
              .maybeSingle();

            const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
            result = {
              period,
              usage: {
                ai_captions_used: u?.ai_analyses_used ?? 0,
                posts_scheduled: u?.posts_scheduled ?? 0,
                text_posts_scheduled: u?.text_posts_scheduled ?? 0,
                video_seconds_used: u?.video_seconds_used ?? 0,
                video_seconds_bonus: u?.video_seconds_bonus ?? 0,
                strategies_used: u?.strategies_used ?? 0,
              },
              limits: {
                ai_captions: limits.ai_captions === -1 ? "unlimited" : limits.ai_captions + (u?.caption_credits_bonus ?? 0),
                posts: limits.posts === -1 ? "unlimited" : limits.posts,
                video_seconds: limits.video_seconds + (u?.video_seconds_bonus ?? 0),
              },
            };
          } else if (block.name === "get_recent_posts") {
            const limit = Math.min(Number(block.input?.limit) || 10, 20);
            const { data: posts } = await supabase
              .from("scheduled_posts")
              .select("id,created_at,platforms,status,error,ayrshare_post_id")
              .eq("supabase_user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(limit);
            result = posts ?? [];
          } else if (block.name === "get_connected_integrations") {
            const { data: profiles } = await supabase
              .from("ayrshare_profiles")
              .select("profile_key,cached_channels")
              .eq("supabase_user_id", user.id);
            const { data: workspaces } = await supabase
              .from("workspaces")
              .select("id,profile_key,cached_channels,assigned_channel_ids")
              .eq("owner_user_id", user.id);
            result = { personal_profile: profiles?.[0] ?? null, workspaces: workspaces ?? [] };
          } else if (block.name === "escalate_to_support") {
            escalated = true;
            if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
              const convo = messages
                .map(m => `${m.role === "user" ? "👤 User" : "🤖 Bot"}: ${m.content}`)
                .join("\n\n");
              const msg =
                `🆘 SUPPORT ESCALATION — Infinite Media\n\n` +
                `👤 ${user.email}\n` +
                `📋 Plan: ${planLabel}\n` +
                `🚨 Urgency: ${(block.input.urgency as string).toUpperCase()}\n\n` +
                `📝 Issue:\n${block.input.summary}\n\n` +
                `💬 Conversation:\n${convo}\n\n` +
                `⏰ ${new Date().toLocaleString()}`;
              await sendTelegram(TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, msg);
            }
            result = { escalated: true };
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }

        claudeMessages.push({ role: "user", content: toolResults });
      }
    }

    return json({ reply: finalReply, escalated }, 200, cors);
  } catch (e: any) {
    console.error("support-chat error:", e);
    return json({ error: e?.message ?? "Internal server error" }, 500, cors);
  }
});
