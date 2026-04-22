import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"];

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: ae } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (ae || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const FAL = Deno.env.get("FAL_API_KEY");
    if (!FAL) throw new Error("FAL_API_KEY not configured");
    const falAuth = { "Authorization": `Key ${FAL}` };

    // ── New path: Seedance 2.0 / queue.fal.run (requestId + statusUrl + responseUrl) ──
    if (body.requestId && body.statusUrl && body.responseUrl) {
      const statusRes = await fetch(`${body.statusUrl}?logs=0`, { headers: falAuth });
      if (!statusRes.ok) throw new Error(`fal status check failed (${statusRes.status})`);
      const statusData = await statusRes.json();
      const st: string = statusData.status;

      if (st === "COMPLETED") {
        const resultRes = await fetch(body.responseUrl, { headers: falAuth });
        if (!resultRes.ok) throw new Error(`fal result fetch failed (${resultRes.status})`);
        const result = await resultRes.json();
        const videoUrl: string = result.video?.url ?? result.video_url ?? result.output?.video?.url;
        if (!videoUrl) throw new Error("No video URL in fal result: " + JSON.stringify(result).slice(0, 200));
        return json({ status: "succeed", videoUrl });
      }

      if (st === "FAILED") {
        const errMsg = statusData.error ?? statusData.detail ?? "Generation failed";
        return json({ status: "failed", error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg) });
      }

      // IN_QUEUE or IN_PROGRESS
      return json({ status: "processing" });
    }

    // ── Old path: taskId + type (kling-generate-image, kling-generate-audio) ──
    if (body.taskId && body.type) {
      const { taskId, type } = body;

      // fal.ai supports model-agnostic request lookup by request ID
      const statusRes = await fetch(`https://queue.fal.run/requests/${taskId}/status?logs=0`, { headers: falAuth });
      if (!statusRes.ok) throw new Error(`fal task status failed (${statusRes.status})`);
      const statusData = await statusRes.json();
      const st: string = statusData.status;

      if (st === "COMPLETED") {
        const resultRes = await fetch(`https://queue.fal.run/requests/${taskId}`, { headers: falAuth });
        if (!resultRes.ok) throw new Error(`fal task result failed (${resultRes.status})`);
        const result = await resultRes.json();

        if (type === "image") {
          const imageUrl: string =
            result.images?.[0]?.url ?? result.image?.url ?? result.output?.[0]?.url;
          if (!imageUrl) throw new Error("No image URL in result: " + JSON.stringify(result).slice(0, 200));
          return json({ status: "succeed", imageUrl });
        }

        // video or audio
        const videoUrl: string =
          result.video?.url ?? result.video_url ?? result.output?.video?.url;
        if (!videoUrl) throw new Error("No video URL in result: " + JSON.stringify(result).slice(0, 200));
        return json({ status: "succeed", videoUrl });
      }

      if (st === "FAILED") {
        const errMsg = statusData.error ?? statusData.detail ?? "Generation failed";
        return json({ status: "failed", error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg) });
      }

      return json({ status: "processing" });
    }

    return json({ error: "Missing required fields: requestId+statusUrl+responseUrl or taskId+type" }, 400);

  } catch (e: any) {
    console.error("fal-poll error:", e);
    return json({ error: e?.message ?? "Internal server error" }, 500);
  }
});
