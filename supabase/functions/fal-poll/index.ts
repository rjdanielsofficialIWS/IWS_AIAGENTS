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

  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    // Auth
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return reply({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: ae } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (ae || !user) return reply({ error: "Unauthorized" }, 401);

    const FAL = Deno.env.get("FAL_API_KEY");
    if (!FAL) return reply({ error: "FAL_API_KEY not configured" }, 500);
    const falAuth = { "Authorization": `Key ${FAL}` };

    const body = await req.json();

    // ── New path: Seedance 2.0 (requestId + modelEndpoint) ──
    if (body.requestId && body.modelEndpoint) {
      const base = `https://queue.fal.run/${body.modelEndpoint}/requests/${body.requestId}`;
      const statusUrl = body.statusUrl || `${base}/status`;
      // Use the canonical result URL (base), not body.responseUrl — fal.ai sometimes
      // returns a /response-suffixed URL that 404s on certain models including Seedance 2.0
      const responseUrl = base;

      let statusData: any;
      try {
        const sr = await fetch(`${statusUrl}?logs=0`, { headers: falAuth });
        statusData = await sr.json();
      } catch (e) {
        console.error("fal status fetch error:", e);
        return reply({ status: "processing" });
      }

      const st = statusData?.status ?? statusData?.state ?? "";
      console.log("fal status:", st, JSON.stringify(statusData).slice(0, 200));

      if (st === "COMPLETED") {
        // fal.ai returns errors as COMPLETED with an error field
        if (statusData?.error) {
          return reply({ status: "failed", error: statusData.error });
        }
        let result: any;
        try {
          const rr = await fetch(responseUrl, { headers: falAuth });
          result = await rr.json();
        } catch (e) {
          console.error("fal result fetch error:", e);
          return reply({ status: "processing" });
        }
        const videoUrl: string =
          result?.video?.url ??
          result?.video_url ??
          result?.output?.video?.url ??
          result?.videos?.[0]?.url ??
          result?.url ??
          result?.data?.video?.url ??
          result?.[0]?.url;
        if (!videoUrl) {
          console.error("No video URL in result:", JSON.stringify(result).slice(0, 500));
          return reply({ status: "failed", error: "Video generation failed to produce output. Please try again." });
        }
        return reply({ status: "succeed", videoUrl });
      }

      // IN_QUEUE, IN_PROGRESS, or unknown — keep polling
      return reply({ status: "processing" });
    }

    // ── Old path: taskId + type (kling-generate-image, kling-generate-audio) ──
    if (body.taskId && body.type) {
      const { taskId, type } = body;

      let statusData: any;
      try {
        const sr = await fetch(`https://queue.fal.run/requests/${taskId}/status?logs=0`, { headers: falAuth });
        statusData = await sr.json();
      } catch (e) {
        console.error("fal task status fetch error:", e);
        return reply({ status: "processing" });
      }

      const st = statusData?.status ?? statusData?.state ?? "";

      if (st === "COMPLETED") {
        let result: any;
        try {
          const rr = await fetch(`https://queue.fal.run/requests/${taskId}`, { headers: falAuth });
          result = await rr.json();
        } catch (e) {
          return reply({ status: "processing" });
        }

        if (type === "image") {
          const imageUrl: string =
            result?.images?.[0]?.url ?? result?.image?.url ?? result?.output?.[0]?.url;
          if (!imageUrl) return reply({ status: "failed", error: "No image URL in result" });
          return reply({ status: "succeed", imageUrl });
        }

        const videoUrl: string =
          result?.video?.url ?? result?.video_url ?? result?.output?.video?.url;
        if (!videoUrl) return reply({ status: "failed", error: "No video URL in result" });
        return reply({ status: "succeed", videoUrl });
      }

      if (st === "FAILED" || st === "ERROR") {
        const errMsg = statusData?.error ?? statusData?.detail ?? "Generation failed";
        return reply({ status: "failed", error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg) });
      }

      return reply({ status: "processing" });
    }

    return reply({ error: "Missing required fields: requestId+modelEndpoint or taskId+type" }, 400);

  } catch (e: any) {
    console.error("fal-poll unhandled error:", e?.message, e?.stack);
    return reply({ error: e?.message ?? "Internal server error" }, 500);
  }
});
