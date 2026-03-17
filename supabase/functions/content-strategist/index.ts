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

async function callClaude(system: string, user: string, maxTokens = 4000): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error("Claude error: " + await r.text());
  const d = await r.json();
  return (d.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim();
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
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

  // Plan check temporarily disabled

  if (!ANTHROPIC_KEY) return json({ error: "Server configuration error" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { mode } = body;

  try {
    if (mode === "full_strategy") {
      const { niche, offer, audience, platforms = [], frequency = "5x/week", tone = "", goals = [], currentStage = "growing" } = body;
      if (!niche || !offer || !audience) return json({ error: "niche, offer, and audience are required" }, 400);

      const platformList = platforms.join(", ") || "Instagram, LinkedIn";
      const goalList = goals.join(", ") || "grow audience, generate leads";
      const toneDesc = tone || "confident and authentic";

      const systemPrompt = `You are an elite social media strategist and content architect with 15+ years experience building 7-figure personal brands. You specialize in converting followers into paying clients through strategic content systems. You always return ONLY valid JSON — no markdown, no commentary.`;

      const userPrompt = `Create a comprehensive 30-day content strategy for this business:

BUSINESS BRIEF:
- Niche: ${niche}
- Core Offer: ${offer}
- Target Audience: ${audience}
- Active Platforms: ${platformList}
- Posting Frequency: ${frequency}
- Brand Tone: ${toneDesc}
- Goals: ${goalList}
- Current Stage: ${currentStage}

Return a single JSON object with exactly this structure:

{
  "calendar": {
    "week1_priority": { "day": 1, "reason": "Why this is the most important post to start with" },
    "calendar": [
      {
        "day": 1,
        "pillar": "Reach|Trust|Sales",
        "content_type": "Carousel|Reel|Story|Thread|Short|Long-form",
        "platform": "instagram|linkedin|tiktok|youtube|x|facebook",
        "topic": "Specific compelling post topic",
        "hook": "Irresistible opening hook for this post",
        "goal": "Specific outcome this post achieves",
        "best_time": "9am|12pm|6pm|8pm"
      }
    ],
    "evergreen_posts": [
      {
        "topic": "Timeless post that can be reused every 90 days",
        "hook": "Hook that never gets old",
        "why_evergreen": "Why this content stays relevant"
      }
    ]
  },
  "hooks": {
    "hooks": [
      {
        "hook_text": "The actual hook text ready to use",
        "formula": "AIDA|Curiosity Gap|Pain+Solution|Social Proof|Contrarian|Story|Listicle",
        "psychological_trigger": "What makes this impossible to scroll past",
        "scroll_stop_score": 8,
        "best_platform": "instagram|linkedin|tiktok|x"
      }
    ],
    "top_2_recommended": [
      { "index": 0, "reason": "Why this hook is best for current stage and goals" }
    ]
  },
  "strategy": {
    "quick_wins": [
      "Specific action to take THIS WEEK that will have immediate impact"
    ],
    "platform_strategies": [
      {
        "platform": "instagram",
        "primary_format": "Reels",
        "posting_cadence": "5x/week",
        "content_mix": "40% educational, 30% entertainment, 30% promotional",
        "growth_tactic": "Specific tactic to grow on this platform",
        "cta_strategy": "What CTA to use and when"
      }
    ],
    "content_pillars_ratio": {
      "reach": 40,
      "trust": 35,
      "sales": 25
    }
  }
}

REQUIREMENTS:
- Generate exactly 30 calendar entries (days 1-30)
- Generate exactly 20 hooks covering all formulas
- Generate exactly 2 top_2_recommended entries (indices into hooks array)
- Generate 5 quick_wins that are specific and actionable
- Generate platform strategies for each platform in: ${platformList}
- Generate 5 evergreen posts
- Make all hooks specific to "${niche}" — no generic placeholder text
- Every topic must be highly specific and relevant to "${offer}" and "${audience}"
- Vary content types and pillars throughout the 30 days in a logical progression`;

      const raw = await callClaude(systemPrompt, userPrompt, 8192);
      const result = safeParse(raw);
      return json(result);

    } else if (mode === "repurpose_from_video") {
      const { transcript, tone = "" } = body;
      if (!transcript || !transcript.trim()) return json({ error: "transcript is required" }, 400);

      const toneDesc = tone || "authentic and engaging";

      const systemPrompt = `You are an expert content repurposing strategist. You extract maximum value from video content by identifying every possible content angle, format, and platform opportunity. You always return ONLY valid JSON — no markdown, no commentary.`;

      const userPrompt = `Analyze this video transcript and extract a complete content repurposing strategy:

TRANSCRIPT:
"""
${transcript.trim().slice(0, 8000)}
"""

TONE: ${toneDesc}

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
- Generate 8 tweets (twitter) and 4 linkedin posts — all ready to post, not templates
- Generate 5 other_formats
- Make everything specific to THIS transcript's content — no generic filler
- Twitter posts under 270 characters
- LinkedIn posts 150-300 words with clear hook, value, and CTA`;

      const raw = await callClaude(systemPrompt, userPrompt, 8192);
      const ideas = safeParse(raw);
      return json({ ideas });

    } else if (mode === "trends_research") {
      const { niche, audience = "", platforms = [], goals = [], offer = "" } = body;
      if (!niche || !niche.trim()) return json({ error: "niche is required" }, 400);

      const platformList = (platforms as string[]).join(", ") || "Instagram, TikTok, LinkedIn";
      const goalList = (goals as string[]).join(", ") || "grow audience, generate leads";

      // Use Claude with web search to research real-time trends
      const webSearchBody = {
        model: "claude-opus-4-5",
        max_tokens: 8192,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        system: `You are an elite social media trend researcher and content strategist. Your job is to deeply research what is trending RIGHT NOW in a given niche across social media platforms and search engines. You use web search to find real, current data. After research, you return ONLY a single valid JSON object — no markdown, no commentary, no explanation outside the JSON.`,
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

      const result = safeParse(textBlock.text);
      // Ensure researched_at is set
      if (!result.researched_at) result.researched_at = new Date().toISOString();
      return json(result);

    } else {
      return json({ error: "Invalid mode. Use full_strategy, repurpose_from_video, or trends_research." }, 400);
    }
  } catch (e) {
    console.error("content-strategist error:", e);
    return json({ error: "Generation failed. Please try again." }, 500);
  }
});
