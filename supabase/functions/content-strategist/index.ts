/**
 * Content Strategist Edge Function
 *
 * Modes:
 *  - full_strategy: Generates 30-day calendar, hook library, platform strategy from a business brief
 *  - repurpose_from_video: Extracts content ideas from a video transcript
 *
 * Requires: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Plans: viral or agency only
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"];
const corsFor = (req: Request) => {
  const o = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(o) ? o : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const CURRENT_DATE = new Date().toISOString().slice(0, 10);

function buildToneDirective(tone: string): string {
  const raw = (tone || "").trim();
  const t = raw.toLowerCase();
  if (t.includes("alex hormozi")) return `Primary tone profile: Alex Hormozi-inspired. High conviction. Short punchy sentences. Specific. ROI-focused. No fluff. User tone instruction to honor strongly: ${raw}`;
  if (t.includes("gary vee")) return `Primary tone profile: Gary Vee-inspired. Fast, energetic, conversational, raw, direct. No emojis. User tone instruction to honor strongly: ${raw}`;
  if (t.includes("luxury")) return `Primary tone profile: luxury. Calm confidence. Premium restraint. Elegant language. No hype. User tone instruction to honor strongly: ${raw}`;
  if (t.includes("casual")) return `Primary tone profile: casual. Warm, natural, conversational, easy to say out loud. User tone instruction to honor strongly: ${raw}`;
  if (t.includes("professional")) return `Primary tone profile: professional. Clear, credible, polished, intelligent, concise. User tone instruction to honor strongly: ${raw}`;
  if (t.includes("funny")) return `Primary tone profile: funny. Dry wit. Human timing. Clever, not cheesy. User tone instruction to honor strongly: ${raw}`;
  return raw
    ? `Treat this tone instruction as a top-priority creative constraint. Let it strongly shape vocabulary, rhythm, confidence level, pacing, and attitude: ${raw}`
    : `Natural, sharp, contemporary, highly human, and non-robotic.`;
}

function strategistSystem(role: string): string {
  return `You are a high-level ${role}. You think like a senior strategist with elite taste, sharp audience instincts, and strong editorial judgment.

Current date context:
- Today is ${CURRENT_DATE}
- Your outputs should feel current, relevant, and aligned with how people think and publish right now

Universal writing rules:
- Sound human, specific, current, and strategically sharp
- No em-dashes
- No emojis
- No markdown fences
- No generic filler
- No robotic or AI-sounding phrasing
- Prefer concrete observations over vague abstractions
- Make every line earn its place

Tone handling:
- The user's tone instruction is a top-priority creative constraint
- Let the requested tone strongly shape diction, pacing, emotional temperature, and point of view

Role guardrails:
- Stay inside the requested role
- If the task is strategy, return strategy, not captions or tweets
- If the task is ideation, return ideas and angles, not finished platform copy unless explicitly requested
- Keep outputs tailored to the requested artifact

Output rules:
- Return ONLY valid JSON
- Never include commentary outside the JSON`;
}

async function callClaude(system: string, user: string, maxTokens = 4000): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error("Claude error: " + await r.text());
  const d = await r.json();
  return (d.content?.[0]?.text || "{}").replace(/```json|```/g, "").replace(/—/g, "-").trim();
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

/** Recursively strip <cite ...>...</cite> tags (and self-closing variants) from all strings in an object. */
function stripCites(val: any): any {
  if (typeof val === "string") return val.replace(/<cite[^>]*>(.*?)<\/cite>/gs, "$1").replace(/<cite[^>]*\/>/g, "").trim();
  if (Array.isArray(val)) return val.map(stripCites);
  if (val && typeof val === "object") {
    const out: any = {};
    for (const k of Object.keys(val)) out[k] = stripCites(val[k]);
    return out;
  }
  return val;
}

/** Recursively replace em-dashes (—) and en-dashes (–) with hyphens in all strings in an object. */
function stripDashes(val: any): any {
  if (typeof val === "string") return val.replace(/\u2014/g, "-").replace(/\u2013/g, "-");
  if (Array.isArray(val)) return val.map(stripDashes);
  if (val && typeof val === "object") {
    const out: any = {};
    for (const k of Object.keys(val)) out[k] = stripDashes(val[k]);
    return out;
  }
  return val;
}

/** Parse JSON, and if it fails due to truncation attempt to close open structures. */
function safeParse(raw: string): any {
  const s = stripFences(raw);
  try {
    return JSON.parse(s);
  } catch {
    // Try to close any unclosed braces/brackets
    let depth = 0;
    const closers: string[] = [];
    for (const ch of s) {
      if (ch === '{') { depth++; closers.push('}'); }
      else if (ch === '[') { depth++; closers.push(']'); }
      else if (ch === '}' || ch === ']') { depth--; closers.pop(); }
    }
    // Strip trailing incomplete value (last comma or partial string)
    let fixed = s.replace(/,\s*$/, "").replace(/:\s*"[^"]*$/, ': ""');
    fixed += closers.reverse().join("");
    try {
      return JSON.parse(fixed);
    } catch {
      throw new Error("Response was truncated and could not be recovered. Try again.");
    }
  }
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

  // Auth
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", "").trim());
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  // Plan check
  const { data: sub } = await supabase.from("subscriptions").select("plan,status,stripe_customer_id,current_period_end").eq("supabase_user_id", user.id).maybeSingle();
  const isPromo = sub?.stripe_customer_id?.startsWith("promo_");
  const isTrialing = sub?.status === "trialing" && !!sub?.current_period_end && new Date(sub.current_period_end as string) > new Date();
  const isActive = ((sub?.status === "active" || isPromo) || isTrialing) && !!sub?.plan;
  const plan = isActive ? sub!.plan.toLowerCase() : "free";

  const PLAN_FEATURES: Record<string, { repurpose: boolean; strategist: boolean; trends: boolean; talking_points: boolean; strategies_per_month: number }> = {
    free:    { repurpose: false, strategist: false, trends: false, talking_points: false, strategies_per_month: 0 },
    starter: { repurpose: false, strategist: false, trends: false, talking_points: false, strategies_per_month: 0 },
    viral:   { repurpose: true,  strategist: true,  trends: true,  talking_points: true,  strategies_per_month: 4 },
    agency:  { repurpose: true,  strategist: true,  trends: true,  talking_points: true,  strategies_per_month: -1 },
  };
  const pf = PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;

  if (!ANTHROPIC_KEY) return json({ error: "Server configuration error" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { mode } = body;

  // Mode-level plan gate
  if ((mode === "repurpose_from_video" || mode === "repurpose_from_description") && !pf.repurpose)
    return json({ error: "upgrade_required", message: "Content repurposing is available on the Viral and Agency plans.", plan }, 403);
  if ((mode === "trends_research") && !pf.trends)
    return json({ error: "upgrade_required", message: "Trend intelligence is available on the Viral and Agency plans.", plan }, 403);
  if ((mode === "talking_points") && !pf.talking_points)
    return json({ error: "upgrade_required", message: "AI talking points are available on the Viral and Agency plans.", plan }, 403);
  if ((mode === "full_strategy") && !pf.strategist)
    return json({ error: "upgrade_required", message: "AI Content Strategist is available on the Viral and Agency plans.", plan }, 403);

  try {
    if (mode === "full_strategy") {
      // Strategy monthly limit check
      if (pf.strategies_per_month !== -1) {
        const period = getPeriod();
        let strategiesUsed = 0;
        try {
          const { data: su } = await supabase.from("usage_tracking").select("strategies_used").eq("supabase_user_id", user.id).eq("period", period).maybeSingle();
          strategiesUsed = su?.strategies_used ?? 0;
        } catch { /* column not yet migrated — skip limit */ }
        if (strategiesUsed >= pf.strategies_per_month)
          return json({ error: "limit_reached", feature: "strategies", used: strategiesUsed, limit: pf.strategies_per_month, plan, message: `You've used all ${pf.strategies_per_month} content strategies this month.` }, 429);
      }
      const { niche, offer, audience, platforms = [], frequency = "5x/week", tone = "", goals = [], currentStage = "growing" } = body;
      if (!niche || !audience) return json({ error: "niche and audience are required" }, 400);

      const platformList = (platforms as string[]).join(", ") || "Instagram, LinkedIn";
      const goalList = (goals as string[]).join(", ") || "grow audience, generate leads";
      const toneDesc = buildToneDirective(tone || "");
      const offerDesc = offer || "their core offer";

      const SYS = strategistSystem("social media strategist and content systems architect");

      const BRIEF = `BUSINESS BRIEF:
- Niche: ${niche}
- Core Offer: ${offerDesc}
- Target Audience: ${audience}
- Active Platforms: ${platformList}
- Posting Frequency: ${frequency}
- Brand Tone Directive: ${toneDesc}
- Goals: ${goalList}
- Current Stage: ${currentStage}`;

      // Split into 3 parallel calls to avoid token limit truncation
      const [calendarRaw, hooksRaw, strategyRaw] = await Promise.all([

        callClaude(SYS, `${BRIEF}

Generate a 7-day content calendar. Return ONLY this JSON with NO extra fields:
{"content_pillars":[{"name":"str","description":"str"},{"name":"str","description":"str"},{"name":"str","description":"str"}],"week1_priority":{"day":1,"reason":"str"},"calendar":[{"day":1,"pillar":"Reach","content_type":"Reel","platform":"instagram","topic":"str","hook":"str","goal":"str","best_time":"9am"}],"evergreen_posts":[{"topic":"str","hook":"str"}]}
REQUIREMENTS: exactly 7 calendar entries (days 1-7), exactly 3 content_pillars, exactly 2 evergreen_posts. Keep all string values concise (under 15 words each). Every topic specific to "${niche}".`, 2000),

        callClaude(SYS, `${BRIEF}

Generate 10 scroll-stopping hooks. Return ONLY this JSON:
{"hooks":[{"hook_text":"str","formula":"Curiosity Gap","scroll_stop_score":8,"best_platform":"instagram"}],"top_2_recommended":[{"index":0,"reason":"str"}]}
REQUIREMENTS: exactly 10 hooks, 2 top_2_recommended. Vary formulas: AIDA, Curiosity Gap, Pain+Solution, Social Proof, Contrarian, Story, Listicle. Keep hook_text under 20 words. Specific to "${niche}".`, 1500),

        callClaude(SYS, `${BRIEF}

Generate quick wins. Return ONLY this JSON:
{"quick_wins":["str","str","str","str","str"],"content_pillars_ratio":{"reach":40,"trust":35,"sales":25}}
REQUIREMENTS: exactly 5 quick_wins, each under 20 words, specific and actionable for "${niche}".`, 600),

      ]);

      const calendarData = safeParse(calendarRaw);
      const hooksData    = safeParse(hooksRaw);
      const strategyData = safeParse(strategyRaw);

      // Increment strategies_used counter (graceful — column may not exist yet)
      try {
        const period = getPeriod();
        await supabase.from("usage_tracking").upsert(
          { supabase_user_id: user.id, period, ai_analyses_used: 0, posts_scheduled: 0, video_seconds_used: 0, video_seconds_bonus: 0, caption_credits_bonus: 0, strategies_used: 0 },
          { onConflict: "supabase_user_id,period", ignoreDuplicates: true }
        );
        await supabase.rpc("increment_usage", { p_user_id: user.id, p_period: period, p_field: "strategies_used" });
      } catch { /* column not yet migrated — silent */ }

      return json(stripDashes({
        calendar: calendarData,
        hooks:    hooksData,
        strategy: strategyData,
      }));

    } else if (mode === "repurpose_from_video" || mode === "repurpose_from_description") {
      const source: string = (mode === "repurpose_from_video" ? body.transcript : body.description) || "";
      const { tone = "" } = body;
      if (!source.trim()) return json({ error: mode === "repurpose_from_video" ? "transcript is required" : "description is required" }, 400);

      const toneDesc = buildToneDirective(tone || "");

      const systemPrompt = strategistSystem("content repurposing strategist");

      const sourceLabel = mode === "repurpose_from_video" ? "video transcript" : "content description";
      const userPrompt = `Analyze this ${sourceLabel} and extract a complete content repurposing strategy:

CONTENT:
"""
${source.trim().slice(0, 8000)}
"""

TONE DIRECTIVE: ${toneDesc}

Return a single JSON object with exactly this structure:

{
  "short_clips": [
    {
      "title": "Title for this clip",
      "angle": "The specific angle or argument from this clip",
      "platform": "tiktok|instagram|youtube|x",
      "hook": "Opening hook that makes people stop scrolling"
    }
  ],
  "blog_angles": [
    {
      "headline": "SEO-optimized blog headline",
      "angle": "The specific angle or argument to expand on"
    }
  ],
  "social_hooks": [
    "Ready-to-post hook that teases the best insight from this video"
  ],
  "series_ideas": [
    {
      "series_name": "Name for the content series",
      "concept": "What each episode would cover, how many parts"
    }
  ],
  "text_posts": {
    "twitter": [
      "Ready-to-post tweet under 270 chars with strong hook"
    ],
    "linkedin": [
      "Ready-to-post LinkedIn post with hook, body, and CTA (150-300 words)"
    ]
  },
  "other_formats": [
    {
      "format": "Email Newsletter|Podcast Episode|Infographic|Carousel|Quote Card|Thread",
      "concept": "How to adapt this content for the format"
    }
  ]
}

REQUIREMENTS:
- Generate 6 short_clips covering the best moments in the video
- Generate 4 blog_angles with strong SEO potential
- Generate 8 social_hooks — each a standalone viral hook
- Generate 3 series_ideas that could become a recurring content series
- Generate 8 tweets (twitter) and 4 linkedin posts - all ready to post, not templates
- Generate 5 other_formats
- Make everything specific to THIS transcript's content — no generic filler
- Twitter posts under 270 characters
- LinkedIn posts 150-300 words with clear hook, value, and CTA
- Make the strategic angles and hooks feel current to ${CURRENT_DATE}, not stale or generic`;

      const raw = await callClaude(systemPrompt, userPrompt, 8192);
      const ideas = stripDashes(safeParse(raw));
      return json({ ideas });

    } else if (mode === "trends_research") {
      const { niche, audience = "", platforms = [], goals = [], offer = "" } = body;
      if (!niche || !niche.trim()) return json({ error: "niche is required" }, 400);

      const platformList = (platforms as string[]).join(", ") || "Instagram, TikTok, LinkedIn";
      const goalList = (goals as string[]).join(", ") || "grow audience, generate leads";

      // Use Claude with web search to research real-time trends
      const webSearchBody = {
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        system: strategistSystem("trend researcher and content strategist") + `\nYou use web search to find real, current signals and convert them into strategic intelligence.`,
        messages: [
          {
            role: "user",
            content: `Research the current trends for this niche and return structured intelligence:

NICHE: ${niche.trim()}
TARGET AUDIENCE: ${audience || "general audience interested in this niche"}
ACTIVE PLATFORMS: ${platformList}
GOALS: ${goalList}
${offer ? `OFFER: ${offer}` : ""}

Search for:
1. What topics are trending right now in "${niche}" on social media
2. What content formats are going viral in this space
3. Rising keywords, hashtags, and search terms
4. Platform-specific algorithm trends and what's getting pushed
5. Content gaps — what competitors are NOT covering that the audience wants

After your research, return ONLY this JSON structure:

{
  "niche_overview": "2-3 sentence synthesis of the current landscape and opportunity in this niche",
  "trending_topics": [
    {
      "topic": "Specific trending topic title",
      "why": "Why this is trending right now and why the audience cares",
      "content_angle": "The exact angle to take to own this topic"
    }
  ],
  "viral_formats": [
    {
      "format": "Format name (e.g. 'POV story', 'Hot take thread', 'Before/After')",
      "description": "Why this format is working in this niche right now",
      "example": "Specific example title/concept to use"
    }
  ],
  "rising_keywords": ["keyword1", "keyword2", "keyword3"],
  "platform_trends": [
    {
      "platform": "instagram",
      "trend": "What the algorithm is rewarding / what's working",
      "tip": "Specific tactical tip to capitalize on this"
    }
  ],
  "competitor_gaps": [
    "Specific underserved topic or angle that this audience wants but nobody is delivering well"
  ],
  "researched_at": "${new Date().toISOString()}"
}

REQUIREMENTS:
- trending_topics: exactly 6 entries, all based on real current trends you found
- viral_formats: exactly 5 entries specific to this niche
- rising_keywords: exactly 10 keywords/phrases
- platform_trends: one entry per platform in [${platformList}]
- competitor_gaps: exactly 5 specific gaps
- All content must be specific to "${niche}" — no generic advice
- Return ONLY the JSON object, nothing else`,
          },
        ],
      };

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY!,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",
        },
        body: JSON.stringify(webSearchBody),
      });
      if (!r.ok) throw new Error("Claude web search error: " + await r.text());
      const d = await r.json();

      // Extract the final text block (last text content block after tool use)
      const textBlock = (d.content as any[])?.filter((b: any) => b.type === "text").pop();
      if (!textBlock?.text) throw new Error("No text response from Claude");

      const result = stripDashes(stripCites(safeParse(textBlock.text)));
      if (!result.researched_at) result.researched_at = new Date().toISOString();
      return json(result);

    } else if (mode === "talking_points") {
      const { idea, niche = "", audience = "" } = body;
      if (!idea || !idea.trim()) return json({ error: "idea is required" }, 400);

      const raw = await callClaude(
        strategistSystem("viral social media strategist and on-camera coach"),
        `Generate 5 viral talking points for this content idea:

IDEA: ${idea.trim()}${niche ? `\nNICHE: ${niche}` : ""}${audience ? `\nTARGET AUDIENCE: ${audience}` : ""}

Return ONLY this JSON:
{"talking_points":["point1","point2","point3","point4","point5"]}

REQUIREMENTS:
- Exactly 5 talking points
- Each point is a specific, bold, compelling statement or question (1-2 sentences max)
- Written as actual on-camera spoken lines — not notes or bullet fragments
- Vary structure: open with a hook, build tension, include a contrarian take, use social proof or stats if relevant, close with a strong CTA or call to reflection
- Every point must feel urgent, authentic, and impossible to scroll past
- NO generic filler — every word earns its place
- No emojis
- No em-dashes`,
        800
      );
      const data = stripDashes(safeParse(raw));
      return json(data);

    } else {
      return json({ error: "Invalid mode. Use full_strategy, repurpose_from_video, repurpose_from_description, trends_research, or talking_points." }, 400);
    }
  } catch (e: any) {
    console.error("content-strategist error:", e);
    return json({ error: e?.message || String(e) || "Generation failed. Please try again." }, 500);
  }
});
