import * as fal from "@fal-ai/client";
import https from "https";
import http from "http";
import fs from "fs";

// ElevenLabs lip sync — on standby, not active.
// To re-enable: add ELEVENLABS_API_KEY + wire fal-ai lip sync model after audio generation.

/**
 * Generate a short B-roll video clip using Fal.ai Seedance 2.0.
 * The prompt is written by Claude to match the video's content exactly.
 *
 * @param prompt   Cinematic scene description derived from transcript
 * @param destPath Absolute path where the .mp4 will be saved
 * @param onLog    Optional progress callback
 */
export async function generateBroll(
  prompt: string,
  destPath: string,
  onLog?: (msg: string) => void
): Promise<boolean> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.warn("[fal] FAL_KEY not set — skipping AI B-roll generation");
    return false;
  }

  fal.config({ credentials: falKey });

  const log = (msg: string) => {
    console.log(`[fal] ${msg}`);
    onLog?.(msg);
  };

  log(`Generating B-roll: "${prompt.slice(0, 80)}..."`);

  try {
    // Seedance 2.0 — ByteDance model via Fal, native 9:16 portrait, 5s clip
    const result = await fal.subscribe("fal-ai/bytedance/seedance-2.0/text-to-video", {
      input: {
        prompt: prompt,
        negative_prompt:
          "text, watermark, logo, blurry, low quality, distorted faces, ugly, bad anatomy, worst quality, low resolution, duplicate, extra limbs, mutated",
        duration: 5,
        aspect_ratio: "9:16",
        resolution: "720p",
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          const msgs = update.logs?.map((l) => l.message).filter(Boolean) ?? [];
          if (msgs.length) log(msgs[msgs.length - 1]);
        } else {
          log(`Queue status: ${update.status}`);
        }
      },
    });

    const videoUrl = (result.data as { video?: { url?: string } })?.video?.url;
    if (!videoUrl) {
      console.error("[fal] No video URL in response:", JSON.stringify(result.data).slice(0, 300));
      return false;
    }

    log(`Downloading generated B-roll from Fal CDN...`);
    await downloadFile(videoUrl, destPath);
    log(`B-roll saved → ${destPath}`);
    return true;
  } catch (err) {
    console.error("[fal] Generation failed:", err);
    return false;
  }
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fetch = (u: string) => {
      const mod = u.startsWith("https") ? https : http;
      mod
        .get(u, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            fetch(res.headers.location!);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} downloading B-roll`));
            return;
          }
          const out = fs.createWriteStream(destPath);
          res.pipe(out);
          out.on("finish", () => out.close(() => resolve()));
          out.on("error", (e) => {
            fs.unlink(destPath, () => {});
            reject(e);
          });
        })
        .on("error", (e) => {
          fs.unlink(destPath, () => {});
          reject(e);
        });
    };
    fetch(url);
  });
}
