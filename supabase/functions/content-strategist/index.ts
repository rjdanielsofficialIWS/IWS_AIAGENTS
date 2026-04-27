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
const TAVILY_KEY = Deno.env.get("TAVILY_API_KEY");
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
- Never fabricate personal anecdotes, first-person stories, or claims on behalf of the user. No "Here's how I...", "When I started...", "I used to struggle with...", "I remember when..." — you are a strategist advising them, not pretending to be them. Write angles and frameworks they can use, not invented personal experiences.

Output rules:
- Return ONLY valid JSON
- Never include commentary outside the JSON`;
}

async function tavilySearch(query: string, maxResults = 5): Promise<string> {
  if (!TAVILY_KEY) throw new Error("TAVILY_API_KEY not configured");
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query,
      search_depth: "advanced",
      max_results: maxResults,
      include_answer: true,
    }),
  });
  if (!r.ok) throw new Error("Tavily error: " + await r.text());
  const d = await r.json();
  const answer = d.answer ? `Summary: ${d.answer}\n\n` : "";
  const results = (d.results ?? []).map((item: any, i: number) =>
    `[${i + 1}] ${item.title}\n${item.content?.slice(0, 400) ?? ""}`
  ).join("\n\n");
  return (answer + results).trim();
}

async function fetchTrendIntel(niche: string, platformList: string): Promise<string> {
  const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const [topicsRes, formatsRes, platformRes] = await Promise.allSettled([
    tavilySearch(`trending ${niche} content social media ${month}`, 5),
    tavilySearch(`${niche} viral content formats creators ${month}`, 4),
    tavilySearch(`${niche} ${platformList} algorithm trends audience ${new Date().getFullYear()}`, 4),
  ]);
  const sections: string[] = [];
  if (topicsRes.status === "fulfilled" && topicsRes.value) sections.push(`TRENDING TOPICS RESEARCH:\n${topicsRes.value}`);
  if (formatsRes.status === "fulfilled" && formatsRes.value) sections.push(`VIRAL FORMATS RESEARCH:\n${formatsRes.value}`);
  if (platformRes.status === "fulfilled" && platformRes.value) sections.push(`PLATFORM & ALGORITHM RESEARCH:\n${platformRes.value}`);
  if (sections.length === 0) throw new Error("All Tavily searches failed");
  return sections.join("\n\n---\n\n");
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

function getPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

  // Auth
  const auth = req.headers.get("Authorization") ?? "";
  console.log("[auth] header present:", !!auth, "| starts with Bearer:", auth.startsWith("Bearer "), "| length:", auth.length);
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const token = auth.replace("Bearer ", "").trim();
  console.log("[auth] token length:", token.length, "| token prefix:", token.slice(0, 20));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  console.log("[auth] getUser result - user:", user?.id ?? "null", "| error:", authErr?.message ?? "none");
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

      // Phase 1: Tavily research — run first so all 3 Claude calls get real intel
      let strategyIntel = "";
      try {
        const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
        const [performingRes, audienceRes] = await Promise.allSettled([
          tavilySearch(`${niche} content creators what is working social media ${month}`, 5),
          tavilySearch(`${niche} audience biggest pain points questions frustrations ${new Date().getFullYear()}`, 4),
        ]);
        const sections: string[] = [];
        if (performingRes.status === "fulfilled" && performingRes.value)
          sections.push(`WHAT IS CURRENTLY WORKING IN THIS NICHE:\n${performingRes.value}`);
        if (audienceRes.status === "fulfilled" && audienceRes.value)
          sections.push(`AUDIENCE PAIN POINTS & PSYCHOLOGY:\n${audienceRes.value}`);
        if (sections.length > 0) strategyIntel = sections.join("\n\n---\n\n");
      } catch { /* fall through to Claude-only */ }

      const researchBlock = strategyIntel
        ? `\nLIVE MARKET RESEARCH (gathered right now — use specific tool names, creator names, platform features, data points, and stats from this research directly in your outputs. Name actual tools and platforms — never write "AI tools" or "social media" when a specific name is available. Generic references when specifics exist are not acceptable):\n${strategyIntel}\n`
        : "";

      // Phase 2: 3 parallel Claude calls, all fed with real-world research
      const [calendarRaw, hooksRaw, strategyRaw] = await Promise.all([

        callClaude(SYS, `${BRIEF}
${researchBlock}
Generate a 7-day content calendar grounded in the research above. Return ONLY this JSON:
{"content_pillars":[{"name":"str","description":"str"},{"name":"str","description":"str"},{"name":"str","description":"str"}],"week1_priority":{"day":1,"reason":"str"},"calendar":[{"day":1,"pillar":"Reach","content_type":"Reel","platform":"instagram","topic":"str","hook":"str","goal":"str","best_time":"9am"}],"evergreen_posts":[{"topic":"str","hook":"str"}]}
REQUIREMENTS: exactly 7 calendar entries (days 1-7), exactly 3 content_pillars, exactly 2 evergreen_posts. Topics must be specific, current, and tied to real audience pain points from the research. Keep all string values under 15 words. Every topic specific to "${niche}".`, 2000),

        callClaude(SYS, `${BRIEF}
${researchBlock}
Generate 10 scroll-stopping hooks grounded in the research above. Return ONLY this JSON:
{"hooks":[{"hook_text":"str","formula":"Curiosity Gap","scroll_stop_score":8,"best_platform":"instagram"}],"top_2_recommended":[{"index":0,"reason":"str"}]}
REQUIREMENTS: exactly 10 hooks, 2 top_2_recommended. Hooks must exploit REAL pain points and desires from the audience research above — not generic niche commentary. Vary formulas: AIDA, Curiosity Gap, Pain+Solution, Social Proof, Contrarian, Story, Listicle. hook_text under 20 words. Specific to "${niche}".`, 1500),

        callClaude(SYS, `${BRIEF}
${researchBlock}
Generate a conversion strategy grounded in the research above. Return ONLY this JSON:
{"quick_wins":["str","str","str","str","str"],"content_pillars_ratio":{"reach":40,"trust":35,"sales":25},"conversion_system":{"post_types_that_generate_dms":["str","str","str"],"dm_opener":"str","cta_language":["str","str","str"],"warming_sequence":[{"post":1,"type":"str","angle":"str","goal":"str"}]}}
REQUIREMENTS:
- quick_wins: exactly 5, each a specific tactical action for "${niche}" this week (under 20 words each)
- content_pillars_ratio: percentages that add to 100, tuned for ${goalList}
- conversion_system.post_types_that_generate_dms: exactly 3 specific post types that make ${audience} reach out
- conversion_system.dm_opener: one natural, non-salesy opener to use when someone engages
- conversion_system.cta_language: exactly 3 CTAs that feel native to ${platformList} (under 15 words each)
- conversion_system.warming_sequence: exactly 5 posts — a sequence that moves someone from stranger to buyer
All outputs must be grounded in the research above and specific to "${niche}".`, 2000),

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

      // Step 1: fetch live search intel via Tavily (3 parallel searches)
      let searchIntel = "";
      try {
        searchIntel = await fetchTrendIntel(niche.trim(), platformList);
      } catch (tavilyErr) {
        console.warn("Tavily unavailable, proceeding with Claude knowledge only:", tavilyErr);
      }

      const jsonSchema = `{
  "niche_overview": "2 sentence synthesis of the current landscape and opportunity in this niche",
  "trending_topics": [{"topic":"str","why":"str","content_angle":"str"}],
  "viral_formats": [{"format":"str","description":"str","example":"str"}],
  "rising_keywords": ["keyword1","keyword2","keyword3"],
  "platform_trends": [{"platform":"str","trend":"str","tip":"str"}],
  "competitor_gaps": ["gap1","gap2","gap3"],
  "researched_at": "${new Date().toISOString()}"
}`;

      const requirements = `REQUIREMENTS:
- trending_topics: exactly 4 entries
- viral_formats: exactly 3 entries specific to this niche and these platforms
- rising_keywords: exactly 8 keywords or phrases (each under 5 words)
- platform_trends: one entry per platform in [${platformList}]
- competitor_gaps: exactly 3 specific gaps (each under 20 words)
- niche_overview: 2 sentences max
- ALL string values under 25 words - sharp and specific, not generic
- Every insight specific to "${niche.trim()}" - zero generic advice
- Output MUST start with { and end with } - nothing outside the JSON`;

      const trendPrompt = searchIntel
        ? `You are synthesizing LIVE web research data into structured trend intelligence. Your job is to extract the sharpest signals from the real-world data below.

NICHE: ${niche.trim()}
TARGET AUDIENCE: ${audience || "general audience interested in this niche"}
ACTIVE PLATFORMS: ${platformList}
GOALS: ${goalList}
${offer ? `OFFER: ${offer}` : ""}
TODAY: ${CURRENT_DATE}

LIVE RESEARCH (gathered from the web right now — use specific tool names, platform names, creator names, stats, and data points from this research directly in your output. Name actual tools and platforms. "AI tools" or "social media platforms" are not acceptable when specific names are in the research):
${searchIntel}

Synthesize the above into ONLY this JSON - no preamble, no explanation:
${jsonSchema}

${requirements}`
        : `You are a senior trend researcher. Use your knowledge of social media, content marketing, and audience behavior to generate strategic intelligence for this niche.

NICHE: ${niche.trim()}
TARGET AUDIENCE: ${audience || "general audience interested in this niche"}
ACTIVE PLATFORMS: ${platformList}
GOALS: ${goalList}
${offer ? `OFFER: ${offer}` : ""}
TODAY: ${CURRENT_DATE}

Return ONLY this JSON - no preamble, no explanation:
${jsonSchema}

${requirements}`;

      // Step 2: Claude synthesizes search intel into clean JSON
      const raw = await callClaude(
        strategistSystem("trend researcher and content strategist"),
        trendPrompt,
        4000,
      );

      const result = stripDashes(stripCites(safeParse(raw)));
      if (!result.researched_at) result.researched_at = new Date().toISOString();
      return json(result);

    } else if (mode === "talking_points") {
      const { idea, niche = "", audience = "", platforms = [], tone = "" } = body;
      if (!idea || !idea.trim()) return json({ error: "idea is required" }, 400);

      const platformList = Array.isArray(platforms) && platforms.length > 0
        ? platforms.join(", ")
        : "instagram, x (twitter)";
      const toneDirective = buildToneDirective(tone);
      const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

      // Tavily: what angles are resonating + audience pain points
      let tpResearch = "";
      if (TAVILY_KEY && niche) {
        try {
          const [viralRes, audienceRes] = await Promise.allSettled([
            tavilySearch(`${niche} ${idea.trim().slice(0, 60)} viral content ${month}`, 4),
            tavilySearch(`${niche} audience pain points questions ${audience ? audience.slice(0, 40) : ""} ${new Date().getFullYear()}`, 4),
          ]);
          const sections: string[] = [];
          if (viralRes.status === "fulfilled" && viralRes.value) sections.push(`WHAT IS WORKING IN THIS NICHE RIGHT NOW:\n${viralRes.value}`);
          if (audienceRes.status === "fulfilled" && audienceRes.value) sections.push(`AUDIENCE PAIN POINTS AND QUESTIONS:\n${audienceRes.value}`);
          tpResearch = sections.join("\n\n---\n\n");
        } catch { /* proceed without research */ }
      }

      const researchBlock = tpResearch
        ? `\nLIVE RESEARCH (use the specific tool names, product names, data points, and stats from this research directly in your talking points — name actual tools and platforms, cite real numbers. "AI tools are changing X" is not acceptable when the research names the actual tools):\n${tpResearch}\n`
        : "";

      const raw = await callClaude(
        strategistSystem("viral social media strategist and on-camera coach"),
        `Generate 5 viral talking points for this content idea. Each point is a ready-to-say on-camera line.

IDEA: ${idea.trim()}${niche ? `\nNICHE: ${niche}` : ""}${audience ? `\nTARGET AUDIENCE: ${audience}` : ""}
PLATFORMS: ${platformList}
TONE DIRECTIVE: ${toneDirective}${researchBlock}

Return ONLY this JSON:
{"talking_points":["point1","point2","point3","point4","point5"]}

STRUCTURE — use these 5 formulas in order:
1. Pattern Interrupt — a surprising stat, counterintuitive claim, or bold declaration that forces the viewer to rethink something they assumed was true. Stops the scroll.
2. Stakes Amplifier — make the cost of NOT knowing this feel real and immediate. Specific consequence tied to the audience's actual situation. No vague warnings.
3. Contrarian Take — the thing people believe that is wrong, and why. Short, specific, slightly uncomfortable. The most shareable point.
4. Credibility Anchor — a specific insight, observable pattern, or data point that proves the creator knows what they are talking about. Grounded in the live research above where possible.
5. Action Close — a direct challenge, provocative question, or call to action that triggers a comment, share, or DM. Feels like a dare, not a sales pitch.

REQUIREMENTS:
- Every line written as actual spoken words, conversational and direct, no bullet fragments
- Grounded in the live research above where available, specific always beats generic
- Tone must match the TONE DIRECTIVE exactly in vocabulary, rhythm, and energy
- Under 40 words per point
- No emojis, no em-dashes, no robotic phrasing
- If a point could be copy-pasted into any other niche unchanged, rewrite it`,
        1400
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
