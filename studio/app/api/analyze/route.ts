import { NextRequest, NextResponse } from "next/server";
import { access, unlink } from "fs/promises";
import path from "path";
import { jobStore } from "@/lib/jobs";
import { extractFrames, extractAudio, detectScenes, detectSilences } from "@/lib/ffmpeg";
import { transcribeAudio } from "@/lib/transcribe";
import { analyzeVideo } from "@/lib/claude";
import { generateBroll } from "@/lib/falai";
import { PUBLIC_DIR } from "@/lib/remotion";

export const runtime = "nodejs";

/**
 * POST /api/analyze
 *
 * Pipeline (inspired by MoviePy + LosslessCut techniques):
 * 1. Scene detection  — FFmpeg scdet finds visual shot boundaries
 * 2. Silence detection — FFmpeg silencedetect finds speech pauses (ideal cut points)
 * 3. Whisper transcription — word-level timestamps for karaoke captions
 * 4. Frame extraction — visual samples for Claude scene analysis
 * 5. Claude analysis — precision edit config using all of the above
 */
export async function POST(req: NextRequest) {
  let audioPath: string | null = null;

  try {
    const { jobId } = await req.json() as { jobId: string };
    const job = jobStore.get(jobId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // ── 1. Scene detection (LosslessCut scdet technique) ────────────────────
    // threshold is on FFmpeg's 0-100 scale; 8 catches major shot changes
    let sceneCuts: Awaited<ReturnType<typeof detectScenes>> = [];
    try {
      sceneCuts = detectScenes(job.uploadedPath, 8);
      console.log(`[analyze] Detected ${sceneCuts.length} scene changes`);
    } catch (e) {
      console.warn("[analyze] Scene detection failed:", e);
    }

    // ── 2. Silence detection (LosslessCut silencedetect technique) ──────────
    let silences: Awaited<ReturnType<typeof detectSilences>> = [];
    try {
      silences = detectSilences(job.uploadedPath, -35, 0.2);
      console.log(`[analyze] Detected ${silences.length} silence windows`);
    } catch (e) {
      console.warn("[analyze] Silence detection failed:", e);
    }

    // ── 3. Whisper transcription ─────────────────────────────────────────────
    let transcript: Awaited<ReturnType<typeof transcribeAudio>> = [];
    try {
      audioPath = extractAudio(job.uploadedPath);
      transcript = await transcribeAudio(audioPath);
      console.log(`[analyze] Transcribed ${transcript.length} words`);
    } catch (e) {
      console.warn("[analyze] Transcription failed:", e);
    }

    // ── 4. Frame extraction for visual analysis ──────────────────────────────
    const frames = extractFrames(job.uploadedPath, 12);
    console.log(`[analyze] Extracted ${frames.length} frames`);

    // ── 5. Claude precision edit ─────────────────────────────────────────────
    console.log(`[analyze] Sending to Claude: ${transcript.length} words, ${sceneCuts.length} scene cuts, ${silences.length} silences, ${frames.length} frames`);
    const { config, summary } = await analyzeVideo(
      frames,
      { durationSeconds: job.durationSeconds, fps: job.fps, width: job.width, height: job.height },
      job.originalFilename,
      transcript,
      sceneCuts,
      silences
    );

    // ── 6. AI B-roll generation via Fal.ai Seedance 2.0 ─────────────────────
    const brollPath = path.join(PUBLIC_DIR, "broll.mp4");
    if (config.brollPrompt && config.broll.durationSeconds > 0) {
      try {
        console.log(`[analyze] Generating AI B-roll: "${config.brollPrompt.slice(0, 80)}..."`);
        const generated = await generateBroll(config.brollPrompt, brollPath);
        if (!generated) {
          console.warn("[analyze] Fal.ai B-roll generation failed — disabling broll");
          config.broll.startSeconds = 0;
          config.broll.durationSeconds = 0;
        }
      } catch (e) {
        console.warn("[analyze] Fal.ai error:", e);
        config.broll.startSeconds = 0;
        config.broll.durationSeconds = 0;
      }
    } else {
      // No broll prompt or zero duration — check if a manual broll.mp4 was uploaded
      try {
        await access(brollPath);
        console.log("[analyze] Using manually uploaded broll.mp4");
      } catch {
        config.broll.startSeconds = 0;
        config.broll.durationSeconds = 0;
      }
    }

    // Clear other optional assets that don't exist
    const optionalAssets = ["bgmusic.mp3", "sfx-whoosh.wav", "sfx-punch.wav", "sfx-ding.wav", "sfx-swoosh.wav"];
    for (const asset of optionalAssets) {
      try { await access(path.join(PUBLIC_DIR, asset)); }
      catch {
        if (asset === "bgmusic.mp3") config.music.src = "";
      }
    }

    console.log(`[analyze] Claude complete: ${summary}`);
    console.log(`[analyze] Clips: ${config.clips.map(c => `${c.trimInSeconds.toFixed(1)}s-${c.trimOutSeconds.toFixed(1)}s`).join(", ")}`);
    jobStore.update(jobId, { config });
    return NextResponse.json({ jobId, config, summary });

  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  } finally {
    if (audioPath) { try { await unlink(audioPath); } catch { /* ignore */ } }
  }
}
