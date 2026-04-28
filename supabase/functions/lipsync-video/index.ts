import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = [
  "https://infinitewealthsolutionsai.com",
  "https://www.infinitewealthsolutionsai.com",
  "https://iws-aiagents.vercel.app",
];
const corsFor = (req: Request) => {
  const o = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(o) ? o : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const FAL_KEY = Deno.env.get("FAL_API_KEY");
const ELEVENLABS_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";
const MEDIA_BUCKET = "media";

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const token = auth.replace("Bearer ", "").trim();

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan,status,stripe_customer_id,current_period_end")
    .eq("supabase_user_id", user.id)
    .maybeSingle();
  const isPromo = sub?.stripe_customer_id?.startsWith("promo_");
  const isTrialing = sub?.status === "trialing" && !!sub?.current_period_end && new Date(sub.current_period_end) > new Date();
  const isActive = ((sub?.status === "active" || isPromo) || isTrialing) && !!sub?.plan;
  const plan = isActive ? sub!.plan.toLowerCase() : "free";

  if (plan === "free" || plan === "starter") {
    return json({ error: "upgrade_required", message: "AI lip sync is available on the Viral and Agency plans.", plan }, 403);
  }

  if (!FAL_KEY) return json({ error: "FAL_API_KEY not configured" }, 500);
  if (!ELEVENLABS_KEY) return json({ error: "ELEVENLABS_API_KEY not configured" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { videoUrl, script, voiceId = DEFAULT_VOICE_ID } = body;
  if (!videoUrl) return json({ error: "videoUrl is required" }, 400);
  if (!script || !script.trim()) return json({ error: "script is required" }, 400);

  try {
    // Step 1: ElevenLabs TTS → audio bytes
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: script.trim(),
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
      }),
    });
    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      throw new Error(`ElevenLabs TTS failed (${ttsRes.status}): ${err.slice(0, 300)}`);
    }
    const audioBuffer = await ttsRes.arrayBuffer();

    // Step 2: Store generated audio in Supabase Storage and pass fal a normal HTTPS URL.
    // sync-lipsync rejects MP3 data URIs as corrupt/unsupported, but accepts public file URLs.
    const audioPath = `ai-video-lipsync/${user.id}/${crypto.randomUUID()}.mp3`;
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${audioPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "audio/mpeg",
        "x-upsert": "true",
      },
      body: audioBuffer,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Audio storage upload failed (${uploadRes.status}): ${err.slice(0, 300)}`);
    }
    const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${audioPath}`;

    // Step 3: Submit sync-lipsync job and return immediately — client polls via fal-poll
    const queueRes = await fetch("https://queue.fal.run/fal-ai/sync-lipsync", {
      method: "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl, audio_url: audioUrl, sync_mode: "cut_off" }),
    });
    const queueText = await queueRes.text();
    let queueData: any;
    try { queueData = JSON.parse(queueText); } catch {
      throw new Error(`fal non-JSON (${queueRes.status}): ${queueText.slice(0, 300)}`);
    }
    if (!queueRes.ok) {
      throw new Error(`sync-lipsync queue failed (${queueRes.status}): ${JSON.stringify(queueData).slice(0, 300)}`);
    }

    const { request_id, status_url, response_url } = queueData;
    if (!request_id) throw new Error("No request_id from fal.ai sync-lipsync");

    return json({ requestId: request_id, statusUrl: status_url, responseUrl: response_url });

  } catch (e: any) {
    console.error("lipsync-video error:", e);
    return json({ error: e?.message || "Lip sync submission failed. Please try again." }, 500);
  }
});
