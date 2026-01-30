/**
 * Content AI Edge Function (Persona-Aware Tone Expansion)
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

type RequestBody = {
  audioUrl: string;
  tone?: string;
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

/* ---------------------------------------------
   Persona Style Map
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
    if (tone.includes(key)) {
      return personas[key];
    }
  }

  // Fallback: use user input directly
  return toneRaw;
}

/* ---------------------------------------------
   Utility
--------------------------------------------- */
function stripCodeFences(input: string) {
  const match = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return match?.[1]?.trim() || input.trim();
}

/* ---------------------------------------------
   Server
--------------------------------------------- */
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
    if (!body.audioUrl) {
      return new Response(
        JSON.stringify({ error: "audioUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expandedTone = expandTone(body.tone);

    /* -----------------------------
       Fetch Audio
    ----------------------------- */
    const audioRes = await fetch(body.audioUrl);
    if (!audioRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch audio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await audioRes.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });

    /* -----------------------------
       Transcribe
    ----------------------------- */
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.mp3");
    formData.append("model", "whisper-1");

    const transcriptRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    const transcriptJson = await transcriptRes.json();
    const transcript = transcriptJson?.text || "";

    /* -----------------------------
       Generate Content
    ----------------------------- */
    const prompt = `
Return ONLY valid JSON. No markdown. No commentary.

Tone rules:
${expandedTone}

Transcript:
"""
${transcript}
"""

Generate:
1. 10 tweet ideas
2. 5 Instagram captions
3. 5 Facebook captions
4. 5 TikTok captions
5. 5 YouTube Shorts titles

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
          { role: "system", content: "You output strictly valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    const genJson = await genRes.json();
    const raw = genJson?.choices?.[0]?.message?.content || "";
    const cleaned = stripCodeFences(raw);
    const parsed = JSON.parse(cleaned);

    return new Response(
      JSON.stringify({
        transcript,
        transcriptSummary: transcript.slice(0, 500) + "...",
        ...parsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Unhandled error",
        details: (err as any)?.message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});