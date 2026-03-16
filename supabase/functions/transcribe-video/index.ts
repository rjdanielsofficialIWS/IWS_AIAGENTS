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

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

  // Auth check
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", "").trim());
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_KEY) return json({ error: "Server configuration error" }, 500);

  try {
    const contentType = req.headers.get("Content-Type") ?? "";
    let audioBlob: Blob;
    let filename = "audio.mp3";

    if (contentType.includes("multipart/form-data") || contentType.includes("application/octet-stream")) {
      // FormData path: file uploaded directly
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return json({ error: "No file provided" }, 400);
      if (file.size > 25 * 1024 * 1024) return json({ error: "File too large (max 25MB)" }, 400);
      audioBlob = file;
      filename = file.name || filename;
    } else {
      // JSON path: videoUrl provided (after uploading large file)
      const body = await req.json().catch(() => ({})) as { videoUrl?: string };
      if (!body.videoUrl) return json({ error: "Provide a file or videoUrl" }, 400);

      let parsed: URL;
      try { parsed = new URL(body.videoUrl); } catch { return json({ error: "Invalid videoUrl" }, 400); }
      if (parsed.protocol !== "https:") return json({ error: "videoUrl must use HTTPS" }, 400);

      const resp = await fetch(body.videoUrl);
      if (!resp.ok) return json({ error: "Failed to fetch video" }, 400);
      audioBlob = await resp.blob();
    }

    const form = new FormData();
    form.append("file", audioBlob, filename);
    form.append("model", "whisper-1");
    form.append("response_format", "text");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text().catch(() => "");
      console.error("Whisper error:", whisperRes.status, err.slice(0, 300));
      return json({ error: "Transcription failed. Please try again." }, 500);
    }

    const transcript = await whisperRes.text();
    return json({ transcript: transcript.trim() });
  } catch (e) {
    console.error("transcribe-video error:", e);
    return json({ error: "Transcription failed. Please try again." }, 500);
  }
});
