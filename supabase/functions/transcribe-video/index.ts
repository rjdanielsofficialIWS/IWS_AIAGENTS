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

// ─── Minimal MP4/MOV Audio Extractor ─────────────────────────────────────────
// Extracts the raw AAC audio track from an MP4/MOV container and wraps it in
// ADTS frames so Whisper can decode it.  For a 110 MB talking-head video the
// AAC track is typically 3–6 MB — well under Whisper's 25 MB limit.

function u32(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}
function u16(b: Uint8Array, o: number): number { return (b[o] << 8 | b[o + 1]) >>> 0; }
function tag(b: Uint8Array, o: number): string {
  return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
}

function* walkBoxes(b: Uint8Array, from: number, to: number) {
  let p = from;
  while (p + 8 <= to) {
    let sz = u32(b, p), hs = 8;
    if (sz === 1) {
      if (p + 16 > to) break;
      sz = u32(b, p + 8) * 0x100000000 + u32(b, p + 12);
      hs = 16;
    } else if (sz === 0) {
      sz = to - p;
    }
    if (sz < hs || p + sz > to) break;
    yield { type: tag(b, p + 4), s: p, e: p + sz, d: p + hs };
    p += sz;
  }
}

function findBox(b: Uint8Array, from: number, to: number, t: string) {
  for (const bx of walkBoxes(b, from, to)) if (bx.type === t) return bx;
  return null;
}

const SR_IDX: Record<number, number> = {
  96000: 0, 88200: 1, 64000: 2, 48000: 3, 44100: 4,
  32000: 5, 24000: 6, 22050: 7, 16000: 8, 12000: 9, 11025: 10, 8000: 11, 7350: 12,
};

function extractADTS(buf: Uint8Array): Uint8Array | null {
  try {
    const moov = findBox(buf, 0, buf.length, "moov");
    if (!moov) return null;

    // Walk all trak boxes to find the audio track
    for (const trak of walkBoxes(buf, moov.d, moov.e)) {
      if (trak.type !== "trak") continue;
      const mdia = findBox(buf, trak.d, trak.e, "mdia"); if (!mdia) continue;
      const hdlr = findBox(buf, mdia.d, mdia.e, "hdlr"); if (!hdlr) continue;
      // hdlr: version(1)+flags(3)+pre_defined(4)+handler_type(4)
      if (hdlr.d + 12 > buf.length) continue;
      if (tag(buf, hdlr.d + 4) !== "soun") continue;

      const minf = findBox(buf, mdia.d, mdia.e, "minf"); if (!minf) continue;
      const stbl = findBox(buf, minf.d, minf.e, "stbl"); if (!stbl) continue;

      // Channel count and sample rate from AudioSampleEntry inside stsd
      let ch = 2, sr = 44100;
      const stsd = findBox(buf, stbl.d, stbl.e, "stsd");
      if (stsd && stsd.d + 8 + 16 + 14 <= buf.length) {
        // stsd: version(1)+flags(3)+entry_count(4)=8 bytes, then box header(8) + 6 reserved + 2 data_ref_idx = 16 bytes
        const ae = stsd.d + 8 + 16; // start of AudioSampleEntry fields
        if (ae + 14 <= buf.length) {
          ch = u16(buf, ae + 8);         // channelcount
          sr = u32(buf, ae + 12) >> 16;  // upper 16 bits of 16.16 fixed-point samplerate
          if (!ch || ch > 8) ch = 2;
          if (!sr) sr = 44100;
        }
      }

      // Chunk offsets: stco (32-bit) or co64 (64-bit)
      const offs: number[] = [];
      const stco = findBox(buf, stbl.d, stbl.e, "stco");
      const co64 = findBox(buf, stbl.d, stbl.e, "co64");
      if (stco && stco.d + 8 <= buf.length) {
        const n = u32(buf, stco.d + 4);
        for (let i = 0; i < n && stco.d + 8 + i * 4 + 4 <= buf.length; i++)
          offs.push(u32(buf, stco.d + 8 + i * 4));
      } else if (co64 && co64.d + 8 <= buf.length) {
        const n = u32(buf, co64.d + 4);
        for (let i = 0; i < n && co64.d + 8 + i * 8 + 8 <= buf.length; i++)
          offs.push(u32(buf, co64.d + 8 + i * 8) * 0x100000000 + u32(buf, co64.d + 8 + i * 8 + 4));
      }
      if (!offs.length) continue;

      // Sample sizes (stsz): defaultSampleSize or per-sample array
      let defSz = 0, smpCount = 0;
      const smSizes: number[] = [];
      const stsz = findBox(buf, stbl.d, stbl.e, "stsz");
      if (stsz && stsz.d + 12 <= buf.length) {
        defSz = u32(buf, stsz.d + 4);
        smpCount = u32(buf, stsz.d + 8);
        if (!defSz) {
          for (let i = 0; i < smpCount && stsz.d + 12 + i * 4 + 4 <= buf.length; i++)
            smSizes.push(u32(buf, stsz.d + 12 + i * 4));
        }
      }
      if (!smpCount) continue;

      // Samples-per-chunk rules (stsc)
      const stscRules: Array<{ fc: number; spc: number }> = [];
      const stsc = findBox(buf, stbl.d, stbl.e, "stsc");
      if (stsc && stsc.d + 8 <= buf.length) {
        const n = u32(buf, stsc.d + 4);
        for (let i = 0; i < n && stsc.d + 8 + i * 12 + 12 <= buf.length; i++)
          stscRules.push({ fc: u32(buf, stsc.d + 8 + i * 12), spc: u32(buf, stsc.d + 8 + i * 12 + 4) });
      }
      if (!stscRules.length) continue;

      // Collect raw AAC samples
      const samples: Uint8Array[] = [];
      let si = 0;
      for (let ci = 0; ci < offs.length && si < smpCount; ci++) {
        let spc = stscRules[0].spc;
        for (const r of stscRules) { if (ci + 1 >= r.fc) spc = r.spc; }
        let bo = offs[ci];
        for (let s = 0; s < spc && si < smpCount; s++, si++) {
          const sz = defSz || smSizes[si];
          if (sz && bo + sz <= buf.length) samples.push(buf.slice(bo, bo + sz));
          bo += sz;
        }
      }
      if (!samples.length) continue;

      // Wrap each raw AAC frame in an ADTS header
      const srIdx = SR_IDX[sr] ?? 4; // default 44100
      const H = 7;
      let total = 0;
      for (const s of samples) total += s.length + H;
      const out = new Uint8Array(total);
      let off = 0;
      for (const s of samples) {
        const fl = s.length + H;
        out[off]     = 0xFF;
        out[off + 1] = 0xF1; // MPEG-4 AAC, no CRC
        out[off + 2] = ((2 - 1) << 6) | (srIdx << 2) | (ch >> 2); // profile=2 (AAC-LC)
        out[off + 3] = ((ch & 3) << 6) | ((fl >> 11) & 3);
        out[off + 4] = (fl >> 3) & 0xFF;
        out[off + 5] = ((fl & 7) << 5) | 0x1F;
        out[off + 6] = 0xFC;
        out.set(s, off + H);
        off += fl;
      }
      return out;
    }
    return null;
  } catch { return null; }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

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
    let filename = "audio.aac";

    if (contentType.includes("multipart/form-data") || contentType.includes("application/octet-stream")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return json({ error: "No file provided" }, 400);

      if (file.size > 25 * 1024 * 1024) {
        // Large file: extract audio track from MP4/MOV container
        const buf = new Uint8Array(await file.arrayBuffer());
        const adts = extractADTS(buf);
        if (!adts) return json({ error: "Could not extract audio from this video. Please ensure it is a valid MP4 or MOV file." }, 400);
        audioBlob = new Blob([adts], { type: "audio/aac" });
        filename = "audio.aac";
      } else {
        audioBlob = file;
        filename = file.name || filename;
      }
    } else {
      // JSON path: videoUrl from Supabase Storage or other HTTPS source
      const body = await req.json().catch(() => ({})) as { videoUrl?: string };
      if (!body.videoUrl) return json({ error: "Provide a file or videoUrl" }, 400);

      let parsed: URL;
      try { parsed = new URL(body.videoUrl); } catch { return json({ error: "Invalid videoUrl" }, 400); }
      if (parsed.protocol !== "https:") return json({ error: "videoUrl must use HTTPS" }, 400);

      const resp = await fetch(body.videoUrl);
      if (!resp.ok) return json({ error: "Failed to fetch video" }, 400);
      const videoData = new Uint8Array(await resp.arrayBuffer());

      if (videoData.length > 25 * 1024 * 1024) {
        // Large file from URL: extract audio track
        const adts = extractADTS(videoData);
        if (!adts) return json({ error: "Could not extract audio from this video. Please ensure it is a valid MP4 or MOV file." }, 400);
        audioBlob = new Blob([adts], { type: "audio/aac" });
        filename = "audio.aac";
      } else {
        audioBlob = new Blob([videoData]);
      }
    }

    const whisperForm = new FormData();
    whisperForm.append("file", audioBlob, filename);
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "text");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: whisperForm,
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
