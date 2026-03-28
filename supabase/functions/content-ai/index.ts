/**
 * Content AI Edge Function (Persona-Aware + Platform-Specific)
 *
 * Env vars required:
 * - OPENAI_API_KEY
 */

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"];
const getCors = (origin: string | null) => {
  const o = origin ?? '';
  return {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(o) ? o : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

type RequestBody = {
  audioUrl: string;
  tone?: string;
};

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
  const corsHeaders = getCors(req.headers.get("Origin"));
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
    if (!body.audioUrl) {
      return new Response(
        JSON.stringify({ error: "audioUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expandedTone = expandTone(body.tone);

    // Validate audioUrl before fetching (SSRF protection)
    let parsedAudioUrl: URL;
    try {
      parsedAudioUrl = new URL(body.audioUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid audioUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (parsedAudioUrl.protocol !== "https:") {
      return new Response(
        JSON.stringify({ error: "audioUrl must use HTTPS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const blockedHostPattern = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/;
    if (blockedHostPattern.test(parsedAudioUrl.hostname)) {
      return new Response(
        JSON.stringify({ error: "Invalid audioUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) Fetch audio
    const audioRes = await fetch(body.audioUrl);
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

PLATFORM RULES (follow strictly):

TWITTER / X (tweets):
- Strictly under 280 characters — hard limit, never exceed
- Strong hook in first 6–10 words
- 0–1 hashtags max
- Prefer punchy formatting: short lines, occasional bullets
- End with either: a question OR a clear CTA ("Reply 'X' and I’ll send…")

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
1) 10 tweet ideas (Twitter/X rules)
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
          { role: "system", content: "You output strictly valid JSON only, no markdown. Never use em-dashes (—) in any output." },
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
    const cleaned = stripCodeFences(raw).replace(/—/g, "-");
    const parsed = JSON.parse(cleaned);

    // NOTE: We intentionally do NOT return the transcript (user doesn't need to see it)
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("content-ai unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});