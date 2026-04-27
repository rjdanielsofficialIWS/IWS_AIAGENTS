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
      const statusUrl = body.statusUrl || `https://queue.fal.run/requests/${body.requestId}/status`;
      // Generic result URL
      const genericResultUrl = `https://queue.fal.run/requests/${body.requestId}`;
      // Model-specific response URL returned by fal-generate-video
      const modelResultUrl: string | undefined = body.responseUrl;

      let statusData: any;
      try {
        const sr = await fetch(`${statusUrl}?logs=0`, { headers: falAuth });
        statusData = await sr.json();
      } catch (e) {
        console.error("fal status fetch error:", e);
        return reply({ status: "processing" });
      }

      const st = statusData?.status ?? statusData?.state ?? "";
      console.log("fal status:", st, "requestId:", body.requestId, "statusData:", JSON.stringify(statusData).slice(0, 400));

      if (st === "COMPLETED") {
        // fal.ai returns errors as COMPLETED with an error field
        if (statusData?.error) {
          return reply({ status: "failed", error: statusData.error });
        }

        // Extract video URL from any supported response structure.
        // Fallback: regex scan for any .mp4 or .webm URL in the entire JSON.
        const extractVideoUrl = (r: any): string | undefined => {
          if (!r || typeof r !== "object") return undefined;
          // Direct fields
          if (r.video?.url) return r.video.url;
          if (typeof r.video_url === "string") return r.video_url;
          // Nested in output
          if (r.output?.video?.url) return r.output.video.url;
          if (typeof r.output?.video_url === "string") return r.output.video_url;
          if (r.output?.videos?.[0]?.url) return r.output.videos[0].url;
          if (typeof r.output?.url === "string") return r.output.url;
          // Array formats
          if (r.videos?.[0]?.url) return r.videos[0].url;
          if (Array.isArray(r) && r[0]?.url) return r[0].url;
          // Other wrappers
          if (typeof r.url === "string") return r.url;
          if (r.data?.video?.url) return r.data.video.url;
          if (r.result?.video?.url) return r.result.video.url;
          if (r.response?.video?.url) return r.response.video.url;
          // Last resort: scan JSON string for any video URL
          const json = JSON.stringify(r);
          const mp4 = json.match(/"(https?:\/\/[^"]+\.(mp4|webm|mov)[^"]*)"/i);
          if (mp4) return mp4[1].replace(/\\u0026/g, "&");
          return undefined;
        };

        // 1. Some models embed output inline in the status response
        const inlineUrl = extractVideoUrl(statusData);
        if (inlineUrl) {
          console.log("fal: found inline URL:", inlineUrl);
          return reply({ status: "succeed", videoUrl: inlineUrl });
        }

        // 2. Build result URL list: model-specific (with and without /response suffix) + generic
        const responseUrlNoSuffix = modelResultUrl?.endsWith("/response")
          ? modelResultUrl.slice(0, -9)
          : undefined;
        const urlsToTry = [
          modelResultUrl,
          responseUrlNoSuffix,
          genericResultUrl,
        ].filter(Boolean) as string[];

        const debugResults: Record<string, string> = {};

        for (const fetchUrl of urlsToTry) {
          let result: any;
          let rawText = "";
          try {
            const rr = await fetch(fetchUrl, { headers: falAuth });
            rawText = await rr.text();
            debugResults[fetchUrl] = `HTTP ${rr.status}: ${rawText.slice(0, 300)}`;
            if (!rr.ok) {
              console.error("fal result non-OK:", rr.status, fetchUrl, rawText.slice(0, 200));
              continue;
            }
            try { result = JSON.parse(rawText); } catch { continue; }
          } catch (e) {
            console.error("fal result fetch error:", fetchUrl, e);
            debugResults[fetchUrl] = `fetch error: ${e}`;
            continue;
          }
          console.log("fal result [" + fetchUrl + "]:", JSON.stringify(result).slice(0, 500));

          // Check for fal.ai error embedded in result
          if (result?.detail && !result?.video) {
            const detail = typeof result.detail === "string" ? result.detail : JSON.stringify(result.detail);
            console.error("fal result error detail:", detail);
            return reply({ status: "failed", error: detail });
          }

          const videoUrl = extractVideoUrl(result);
          if (videoUrl) {
            console.log("fal: found URL at", fetchUrl, "->", videoUrl);
            return reply({ status: "succeed", videoUrl });
          }
        }

        console.error("No video URL found. statusData:", JSON.stringify(statusData).slice(0, 500), "debugResults:", JSON.stringify(debugResults).slice(0, 1000));
        return reply({
          status: "failed",
          error: "Video generation failed to produce output. Please try again.",
          _debug: {
            st,
            statusData: JSON.stringify(statusData).slice(0, 800),
            results: debugResults,
          },
        });
      }

      // Check for explicit failure status
      if (st === "FAILED" || st === "ERROR") {
        const errMsg = statusData?.error ?? statusData?.detail ?? statusData?.message ?? "Generation failed";
        return reply({ status: "failed", error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg) });
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
   return reply({ error: e?.message ?? "Internal server error" }, 500);
  }
});
Endpoint or taskId+type" }, 400);

  } catch (e: any) {
    console.error("fal-poll unhandled error:", e?.message, e?.stack);
    return reply({ error: e?.message ?? "Internal server error" }, 500);
  }
});
