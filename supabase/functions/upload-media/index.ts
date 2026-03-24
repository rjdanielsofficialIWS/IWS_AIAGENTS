// upload-media — handles all media upload paths for InfiniteMedia
// Calling convention (from MediaDistributionPage.uploadViaNativeXHR):
//
//  1. Direct upload (<4 MB)  : POST raw file body, headers: x-file-path, content-type
//  2. Init          (>4 MB)  : POST JSON { action:'init', filePath, contentType, fileSize }
//  3. Chunk                  : POST binary, headers: x-action:chunk, x-file-path,
//                              x-provider, x-upload-id, x-part-number, content-type
//  4. Complete               : POST JSON { action:'complete', filePath, uploadId, parts }
//  5. Abort                  : POST JSON { action:'abort', filePath, uploadId }
//
// Upload paths:
//   Video direct  (<4 MB): Supabase storage → CF Stream copy-from-URL → AWAIT readyToStream
//   Video large   (>4 MB): Supabase TUS (provider='supabase-video') → all chunks sent
//                           → complete: CF Stream copy-from-URL → AWAIT readyToStream
//   Image (any size):       Supabase TUS (provider='supabase') → return URL from first chunk

const CORS_ORIGINS = [
  "https://infinitewealthsolutionsai.com",
  "https://www.infinitewealthsolutionsai.com",
];
const BUCKET     = "media";
const CHUNK_SIZE = 5 * 1024 * 1024; // must match frontend CHUNK_SIZE
const POLL_MS    = 5_000;
const POLL_MAX_MS = 240_000; // 4-minute transcoding timeout

// ---------------------------------------------------------------------------
// Poll CF Stream until readyToStream, enable MP4 download, return the URL.
// The returned URL ends in /downloads/default.mp4 so isVideoUrl() matches it.
// ---------------------------------------------------------------------------
async function awaitCFStream(accountId: string, token: string, uid: string): Promise<string> {
  const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`;
  const deadline = Date.now() + POLL_MAX_MS;

  while (Date.now() < deadline) {
    const r = await fetch(apiBase, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`CF Stream status check failed (${r.status})`);
    const d = await r.json();
    const v = d.result;
    if (v?.state === "error") throw new Error("CF Stream transcoding failed");

    if (v?.readyToStream) {
      // Enable MP4 download — idempotent, safe to call repeatedly.
      await fetch(`${apiBase}/downloads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});

      // Extract customer CDN subdomain from the HLS URL for the .mp4 download URL.
      const hls: string = v.playback?.hls ?? "";
      const m = hls.match(/https:\/\/(customer-[^.]+\.cloudflarestream\.com)\//);
      const host = m ? m[1] : "videodelivery.net";
      return `https://${host}/${uid}/downloads/default.mp4`;
    }

    await new Promise<void>((res) => setTimeout(res, POLL_MS));
  }
  throw new Error("CF Stream transcoding timed out (>4 min)");
}

// ---------------------------------------------------------------------------
// Create a Supabase Storage TUS session and return the upload URL.
// ---------------------------------------------------------------------------
async function createSupabaseTUS(
  supabaseUrl: string,
  svcKey: string,
  filePath: string,
  contentType: string,
  fileSize: number,
): Promise<string> {
  const MAX_ATTEMPTS = 3;
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const r = await fetch(`${supabaseUrl}/storage/v1/upload/resumable`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${svcKey}`,
        apikey: svcKey,
        "x-upsert": "true",
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(fileSize),
        "Upload-Metadata": [
          `bucketName ${btoa(BUCKET)}`,
          `objectName ${btoa(filePath)}`,
          `contentType ${btoa(contentType ?? "application/octet-stream")}`,
          `cacheControl ${btoa("3600")}`,
        ].join(","),
      },
    });
    if (r.ok) {
      const tusUrl = r.headers.get("Location") ?? "";
      if (!tusUrl) throw new Error("Supabase TUS returned no Location header");
      return tusUrl;
    }
    const t = await r.text();
    lastError = `Supabase TUS init failed (${r.status}): ${t.slice(0, 200)}`;
    console.error(`TUS init attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError);
    if (attempt < MAX_ATTEMPTS) {
      await new Promise<void>((res) => setTimeout(res, 1000 * attempt));
    }
  }
  throw new Error(lastError);
}

// ---------------------------------------------------------------------------
// Copy a Supabase-storage URL into CF Stream, await transcoding, return URL.
// Falls back to supabasePublicUrl on any CF Stream error.
// ---------------------------------------------------------------------------
async function copyToStream(
  accountId: string,
  token: string,
  supabasePublicUrl: string,
  filePath: string,
): Promise<string> {
  const cr = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: supabasePublicUrl, meta: { name: filePath } }),
    },
  );
  if (!cr.ok) {
    console.error("CF Stream copy failed:", cr.status, await cr.text().catch(() => ""));
    return supabasePublicUrl;
  }
  const uid = (await cr.json()).result?.uid as string | undefined;
  if (!uid) return supabasePublicUrl;

  try {
    return await awaitCFStream(accountId, token, uid);
  } catch (e) {
    console.error("CF Stream await failed:", (e as Error).message);
    return supabasePublicUrl; // fallback so the UI always unblocks
  }
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, " +
      "x-file-path, x-action, x-provider, x-upload-id, x-part-number",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });

  const ok  = (body: unknown) =>
    new Response(JSON.stringify(body), { headers: { ...cors, "Content-Type": "application/json" } });
  const err = (msg: string, s = 500) =>
    new Response(JSON.stringify({ error: msg }), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const svcKey      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const accountId   = Deno.env.get("CF_ACCOUNT_ID") ?? "";
  const cfToken     = Deno.env.get("CF_STREAM_TOKEN") ?? "";
  const hasCF       = !!(accountId && cfToken);

  // ------------------------------------------------------------------
  // Route: CHUNK  (binary body, x-action header)
  // ------------------------------------------------------------------
  if (req.headers.get("x-action") === "chunk") {
    const provider = req.headers.get("x-provider") ?? "supabase";
    const uploadId = req.headers.get("x-upload-id") ?? "";
    const filePath = req.headers.get("x-file-path") ?? "";
    const partNo   = parseInt(req.headers.get("x-part-number") ?? "1", 10);
    const offset   = (partNo - 1) * CHUNK_SIZE;
    const bytes    = await req.arrayBuffer();

    if (!uploadId) {
      // No TUS session — direct single upload (fallback for very small files).
      const ct = req.headers.get("content-type") ?? "application/octet-stream";
      const ur = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${filePath}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${svcKey}`, apikey: svcKey, "Content-Type": ct, "x-upsert": "true" },
        body: bytes,
      });
      if (!ur.ok) return err(`Storage upload failed (${ur.status})`);
      return ok({ url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}` });
    }

    // Proxy the PATCH to Supabase Storage TUS (used for both 'supabase' and 'supabase-video').
    const pr = await fetch(uploadId, {
      method: "PATCH",
      headers: {
        Authorization:    `Bearer ${svcKey}`,
        apikey:            svcKey,
        "Tus-Resumable":  "1.0.0",
        "Upload-Offset":  String(offset),
        "Content-Type":   "application/offset+octet-stream",
        "Content-Length": String(bytes.byteLength),
      },
      body: bytes,
    });
    if (!pr.ok) {
      const t = await pr.text();
      return err(`Supabase chunk ${partNo} failed (${pr.status}): ${t.slice(0, 200)}`);
    }

    if (provider === "supabase") {
      // Images: return the predictable public URL so the frontend exits the chunk loop.
      return ok({
        url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`,
        offset: pr.headers.get("Upload-Offset"),
      });
    }

    // provider === 'supabase-video': return no URL — frontend keeps sending chunks.
    return ok({ etag: "", offset: pr.headers.get("Upload-Offset") });
  }

  // ------------------------------------------------------------------
  // Route: JSON actions  (init / complete / abort)
  // ------------------------------------------------------------------
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return err("Invalid JSON", 400); }
    const action = body.action as string;

    // ---- INIT -------------------------------------------------------
    if (action === "init") {
      const filePath    = body.filePath    as string;
      const contentType = body.contentType as string;
      const fileSize    = body.fileSize    as number;
      const isVideo     = contentType?.startsWith("video/");

      try {
        const tusUrl = await createSupabaseTUS(supabaseUrl, svcKey, filePath, contentType, fileSize);
        // Videos use provider 'supabase-video' so the frontend sends ALL chunks
        // then calls the 'complete' action (where CF Stream copy + await happens).
        // Images use provider 'supabase' so the frontend exits after the first chunk.
        return ok({ provider: isVideo ? "supabase-video" : "supabase", uploadId: tusUrl });
      } catch (e) {
        return err((e as Error).message);
      }
    }

    // ---- COMPLETE ---------------------------------------------------
    if (action === "complete") {
      const filePath = body.filePath as string;
      if (!filePath) return err("filePath required", 400);

      const supabasePublicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`;

      if (!hasCF) {
        // CF Stream not configured — just return the Supabase URL.
        return ok({ url: supabasePublicUrl });
      }

      const url = await copyToStream(accountId, cfToken, supabasePublicUrl, filePath);
      return ok({ url });
    }

    // ---- ABORT ------------------------------------------------------
    if (action === "abort") {
      const uploadId = body.uploadId as string;
      if (uploadId) {
        await fetch(uploadId, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${svcKey}`, apikey: svcKey, "Tus-Resumable": "1.0.0" },
        }).catch(() => {});
      }
      return ok({ ok: true });
    }

    return err(`Unknown action: ${action}`, 400);
  }

  // ------------------------------------------------------------------
  // Route: DIRECT file upload  (<4 MB, raw body)
  // ------------------------------------------------------------------
  const filePath2    = req.headers.get("x-file-path") ?? `uploads/${Date.now()}.bin`;
  const contentType2 = req.headers.get("content-type") ?? "application/octet-stream";
  const isVideo2     = contentType2.startsWith("video/");
  const bytes2       = await req.arrayBuffer();

  const ur2 = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${filePath2}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${svcKey}`,
      apikey:         svcKey,
      "Content-Type": contentType2,
      "x-upsert":     "true",
    },
    body: bytes2,
  });
  if (!ur2.ok) {
    const t = await ur2.text();
    return err(`Storage upload failed (${ur2.status}): ${t.slice(0, 200)}`);
  }

  const supabasePublicUrl2 = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath2}`;

  if (!isVideo2 || !hasCF) return ok({ url: supabasePublicUrl2 });

  const url = await copyToStream(accountId, cfToken, supabasePublicUrl2, filePath2);
  return ok({ url });
});
