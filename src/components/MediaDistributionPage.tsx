/**
 * Content AI Edge Function (Persona-Aware + Platform-Specific)
 *
 * Env vars required:
 * - OPENAI_API_KEY
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PlatformKey =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "twitterVideo"
  | "linkedin"
  | "twitterPosts";

type RequestBody =
  | {
      // Default: content generation from audio transcript
      action?: "content";
      audioUrl: string;
      tone?: string;
      tweetCount?: number; // max 20
    }
  | {
      // Scheduling generation (no audio required)
      action: "schedule";
      instructions: string;
      timezone?: string; // default America/New_York
      scheduleMode?: "same" | "different";
      platforms?: PlatformKey[];
      tweetCount?: number; // for twitterPosts schedules
    };

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : fallback;
  return Math.max(min, Math.min(max, v));
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

/* ---------------------------------------------
   Persona Style Map (tone expansion)
--------------------------------------------- */
function expandTone(toneRaw: string | undefined): string {
  if (!toneRaw) return "confident, punchy, value-first";

  const tone = toneRaw.toLowerCase().trim();

  const personas: Record<string, string> = {
    "alex hormozi": `
Alex Hormozi style.
Rules:
- Short, blunt sentences
- Extremely ROI-focused
- No fluff, no motivation talk
- Direct and slightly confrontational hooks
- Clear, practical value
- Strong CTA
- No emojis
    `.trim(),

    "gary vee": `
Gary Vee style.
Rules:
- High energy and urgency
- Conversational and motivational
- Punchy hooks
- Relatable language
- Some emojis allowed
- Encouraging CTA
    `.trim(),

    "mrbeast": `
MrBeast style.
Rules:
- Big bold hooks
- Curiosity-driven
- Simple language
- High excitement
- Short punchy lines
- Clear payoff
    `.trim(),

    "naval": `
Naval Ravikant style.
Rules:
- Calm, thoughtful, philosophical
- Short aphorisms
- High signal, low noise
- No hype
- Minimalist language
    `.trim(),

    "professional": `
Professional corporate tone.
Rules:
- Clear and authoritative
- Polished language
- No slang or emojis
- Value-focused and credible
    `.trim(),

    "casual": `
Casual friendly tone.
Rules:
- Conversational
- Approachable
- Light humor allowed
- Simple language
    `.trim(),

    "luxury": `
Luxury / high-ticket tone.
Rules:
- Calm confidence
- Exclusivity
- Premium language
- No hype or emojis
- Authority and sophistication
    `.trim(),
  };

  for (const key in personas) {
    if (tone.includes(key)) return personas[key];
  }

  return toneRaw;
}

/* ---------------------------------------------
   Utilities
--------------------------------------------- */
function stripCodeFences(input: string) {
  const match = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return match?.[1]?.trim() || input.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as RequestBody;

    // ----------------------------
    // Action: schedule generation
    // ----------------------------
    if (body && (body as any).action === "schedule") {
      const timezone = (body.timezone || "America/New_York").trim() || "America/New_York";
      const instructions = String((body as any).instructions || "").trim();
      const scheduleMode = (body as any).scheduleMode || "same";
      const platforms = Array.isArray((body as any).platforms) ? (body as any).platforms : [];
      const tweetCount = clampInt((body as any).tweetCount, 0, 20, 0);

      if (!instructions) {
        return new Response(
          JSON.stringify({ error: "instructions is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nowIso = new Date().toISOString();

      const schedulePrompt = `
Return ONLY valid JSON. No markdown. No commentary. No code fences.

You are a scheduling assistant.

CONTEXT:
- Current UTC time: ${nowIso}
- Scheduling timezone to output in: ${timezone}
- Platforms selected: ${platforms.length ? platforms.join(", ") : "(none provided)"}
- Platform schedule mode: ${scheduleMode}
- Twitter/X standalone post count (twitterPosts): ${tweetCount}

USER INSTRUCTIONS:
"""
${instructions}
"""

RULES:
- Output times must be in the FUTURE relative to the current time.
- Output dates as YYYY-MM-DD and times as HH:MM (24h).
- If user doesn't specify a start date, start at the next reasonable slot.
- Avoid overnight posting (12:00am–5:59am) unless the user explicitly asks for it.
- Spread posts to avoid clustering unless explicitly requested.
- If constraints conflict or are ambiguous, make a reasonable best interpretation and keep it consistent.

OUTPUT JSON SHAPE:
{
  "common": { "date": "YYYY-MM-DD", "time": "HH:MM" } | null,
  "perPlatform": { [platformKey]: { "date": "YYYY-MM-DD", "time": "HH:MM" } } | null,
  "tweets": { "date": "YYYY-MM-DD", "time": "HH:MM" }[]
}

GUIDANCE:
- If scheduleMode is "same": prefer filling "common" (and leave perPlatform null).
- If scheduleMode is "different": fill perPlatform for the provided platforms (excluding twitterPosts is fine) and set common to null.
- Always return "tweets" with length EXACTLY equal to the tweetCount (0 allowed).
`;

      const genRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You output strictly valid JSON only, no markdown." },
            { role: "user", content: schedulePrompt },
          ],
          temperature: 0.5,
        }),
      });

      if (!genRes.ok) {
        const errText = await genRes.text().catch(() => "");
        return new Response(
          JSON.stringify({ error: "Schedule generation failed", details: errText.slice(0, 1200) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const genJson = await genRes.json();
      const raw = genJson?.choices?.[0]?.message?.content || "";
      const cleaned = stripCodeFences(raw);
      const parsed = JSON.parse(cleaned);

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------
    // Action: content generation
    // ----------------------------
    if (!(body as any).audioUrl) {
      return new Response(
        JSON.stringify({ error: "audioUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expandedTone = expandTone((body as any).tone);
    const tweetCount = clampInt((body as any).tweetCount, 8, 20, 10);

    // 1) Fetch audio
    const audioRes = await fetch((body as any).audioUrl);
    if (!audioRes.ok) {
      const t = await audioRes.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "Failed to fetch audio", details: `status=${audioRes.status} ${t.slice(0, 200)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await audioRes.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });

    // 2) Transcribe
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.mp3");
    formData.append("model", "whisper-1");

    const transcriptRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!transcriptRes.ok) {
      const errText = await transcriptRes.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "Transcription failed", details: errText.slice(0, 800) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transcriptJson = await transcriptRes.json();
    const transcript: string = transcriptJson?.text || "";

    // 3) Generate content (platform-specific rules + tone)
    const prompt = `
Return ONLY valid JSON. No markdown. No commentary. No code fences.

GLOBAL TONE RULES:
${expandedTone}

IMPORTANT:
- The tone rules above must be HEAVILY reflected in every output.
- Do not drift into a generic voice.
- If the tone implies constraints (no emojis, blunt, etc.), follow them strictly.

PLATFORM RULES (follow strictly):

TWITTER / X (tweets):
- 200–280 chars max when possible
- Strong hook in first 6–10 words
- 0–1 hashtags max
- Prefer punchy formatting: short lines, occasional bullets
- End with either: a question OR a clear CTA ("Reply 'X' and I’ll send…")

VARIETY REQUIREMENT (Twitter/X):
- Each tweet must use a DIFFERENT viral angle based on the same transcript.
- Avoid rephrases. No two tweets should feel like the same template.
- Mix these angles across the set (use as many as possible):
  1) contrarian take / unpopular opinion
  2) myth-bust
  3) "here’s the mistake" callout
  4) simple framework (e.g., 3 steps)
  5) mini story / micro case study
  6) quick win / tactical tip
  7) checklist / bullets
  8) strong question hook
  9) bold claim + proof tease
  10) before/after transformation
  11) "if you only remember one thing" takeaway
  12) challenge / dare
  13) "stop doing this" pattern interrupt
  14) numbers-based insight (if supported)
  15) analogy/metaphor (if it fits)
- Keep them clean, punchy, and HIGHLY distinct.

INSTAGRAM (captions):
- First line must be a scroll-stopper hook
- Use line breaks (readable on mobile)
- Add 3–6 short “micro-bullets” or steps
- Emojis allowed (not spammy)
- End with an engagement CTA (comment/save/share)
- 0–8 relevant hashtags max (optional), avoid hashtag stuffing

FACEBOOK (captions):
- More conversational + story-friendly
- Slightly longer is fine if it reads naturally
- Use 1–2 short paragraphs
- Include a relatable scenario + quick takeaway
- Ask a direct question near the end to spark comments
- Avoid heavy hashtags (0–2 max)

TIKTOK (captions):
- Very short, punchy, creator-style
- “Spoken” tone; can include slang lightly
- 1–2 lines max, strong hook
- Use 3–6 relevant hashtags max (TikTok likes tags)
- CTA like “follow for part 2” / “watch till the end”

YOUTUBE SHORTS (titles):
- 40–60 characters target
- Curiosity + clarity
- Use numbers/brackets sparingly if helpful (e.g., “3 Mistakes…”, “[Do This]”)
- Avoid clickbait that doesn’t match transcript

INPUT TRANSCRIPT:
"""
${transcript}
"""

OUTPUT REQUIREMENTS:
Generate:
1) ${tweetCount} tweet ideas (Twitter/X rules)
2) 5 Instagram captions (IG rules)
3) 5 Facebook captions (FB rules)
4) 5 TikTok captions (TikTok rules)
5) 8 YouTube Shorts title ideas (YT rules)

Return JSON exactly in this structure:
{
  "tweets": string[],
  "captions": {
    "instagram": string[],
    "facebook": string[],
    "tiktok": string[]
  },
  "youtubeTitles": string[],
  "best": {
    "instagram": string,
    "facebook": string,
    "tiktok": string,
    "youtubeTitle": string
  }
}
`;

    const genRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You output strictly valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!genRes.ok) {
      const errText = await genRes.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "Generation failed", details: errText.slice(0, 1200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const genJson = await genRes.json();
    const raw = genJson?.choices?.[0]?.message?.content || "";
    const cleaned = stripCodeFences(raw);
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Unhandled error",
        details: (err as any)?.message || String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});