// upload-media — handles all media upload paths for InfiniteMedia
// Calling convention (from MediaDistributionPage.uploadViaNativeXHR):
//
//  1. Direct upload  (<4 MB)  : POST with raw file body, headers: x-file-path, content-type
//  2. Init           (>4 MB)  : POST JSON { action:'init', filePath, contentType, fileSize }
//  3. Chunk                   : POST binary body, headers: x-action:chunk, x-file-path,
//                               x-provider, x-upload-id, x-part-number, content-type
//  4. Complete (CF Stream)    : POST JSON { action:'complete', filePath, uploadId, parts }
//  5. Abort                   : POST JSON { action:'abort', filePath, uploadId }
//
// For videos:
//   - Direct (<4 MB) : upload to Supabase storage → CF Stream copy-from-URL → AWAIT readyToStream → return CF Stream URL
//   - Large  (>4 MB) : CF Stream TUS init → chunk PATCHes → complete + AWAIT readyToStream → return CF Stream URL
// For images (any size):
//   - Supabase storage TUS → return public URL immediately

const CORS_ORIGINS = [
  "https://infinitewealthsolutionsai.com",
  "https://www.infinitewealthsolutionsai.com",
];
const BUCKET      = "media";
const CHUNK_SIZE  = 5 * 1024 * 1024; // must match frontend CHUNK_SIZE
const POLL_MS     = 5_000;            // how often to check readyToStream
const POLL_MAX_MS = 240_000;          // 4-minute wall-clock limit for transcoding

// ---------------------------------------------------------------------------
// Poll CF Stream until the video is fully transcoded, then return the
// download URL (ends in .mp4 so isVideoUrl() in ayrshare-post matches it).
// ---------------------------------------------------------------------------
async function awaitCFStream(accountId: string, token: string, uid: string): Promise<string> {
  const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`;
  const deadline = Date.now() + POLL_MAX_MS;

  while (Date.now() < deadline) {
    const r = await fetch(apiBase, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`CF Stream status ${r.status}`);
    const d = await r.json();
    const v = d.result;
    if (v?.state === "error") throw new Error("CF Stream transcoding failed");

    if (v?.readyToStream) {
      // Enable MP4 download (idempotent — safe to call even if already enabled).
      await fetch(`${apiBase}/downloads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {/* best-effort */});

      // Derive the customer-specific CDN subdomain from the HLS URL so the
      // returned URL has an explicit .mp4 extension that isVideoUrl() matches.
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
// Deno.serve entry point
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(origin)
      ? origin
      : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, " +
      "x-file-path, x-action, x-provider, x-upload-id, x-part-number",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });

  const ok  = (body: unknown)  => new Response(JSON.stringify(body),        { headers: { ...cors, "Content-Type": "application/json" } });
  const err = (msg: string, s = 500) => new Response(JSON.stringify({ error: msg }), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const svcKey      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const accountId   = Deno.env.get("CF_ACCOUNT_ID") ?? "";
  const cfToken     = Deno.env.get("CF_STREAM_TOKEN") ?? "";
  const hasCF       = !!(accountId && cfToken);

  // ------------------------------------------------------------------
  // Route: CHUNK  (binary body, action in header)
  // ------------------------------------------------------------------
  const xAction = req.headers.get("x-action");
  if (xAction === "chunk") {
    const provider  = req.headers.get("x-provider") ?? "supabase";
    const uploadId  = req.headers.get("x-upload-id") ?? "";
    const filePath  = req.headers.get("x-file-path") ?? "";
    const partNo    = parseInt(req.headers.get("x-part-number") ?? "1", 10);
    const offset    = (partNo - 1) * CHUNK_SIZE;
    const bytes     = await req.arrayBuffer();

    if (provider === "cfstream" && uploadId) {
      // Forward PATCH to CF Stream TUS endpoint
      const pr = await fetch(uploadId, {
        method: "PATCH",
        headers: {
          "Tus-Resumable":   "1.0.0",
          "Upload-Offset":   String(offset),
          "Content-Type":    "application/offset+octet-stream",
          "Content-Length":  String(bytes.byteLength),
        },
        body: bytes,
      });
      if (!pr.ok) {
        const t = await pr.text();
        return err(`CF Stream chunk ${partNo} failed (${pr.status}): ${t.slice(0, 200)}`);
      }
      return ok({ etag: pr.headers.get("ETag") ?? "" });
    }

    if (provider === "supabase" && uploadId) {
      // Forward PATCH to Supabase Storage TUS endpoint
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
      // URL is predictable from filePath; return it on every chunk so the
      // frontend's `if (provider === 'supabase') return chunkData.url` works.
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`;
      return ok({ url: publicUrl, offset: pr.headers.get("Upload-Offset") });
    }

    // Fallback: no uploadId → direct single-chunk upload to Supabase storage
    const ct = req.headers.get("content-type") ?? "application/octet-stream";
    const ur = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${filePath}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${svcKey}`, apikey: svcKey, "Content-Type": ct, "x-upsert": "true" },
      body: bytes,
    });
    if (!ur.ok) {
      const t = await ur.text();
      return err(`Storage upload failed (${ur.status}): ${t.slice(0, 200)}`);
    }
    return ok({ url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}` });
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

      if (isVideo && hasCF) {
        // Create a CF Stream TUS upload session
        const ir = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
          {
            method: "POST",
            headers: {
              Authorization:     `Bearer ${cfToken}`,
              "Tus-Resumable":   "1.0.0",
              "Upload-Length":   String(fileSize),
              "Upload-Metadata": `name ${btoa(filePath)}`,
            },
          }
        );
        if (!ir.ok) {
          const t = await ir.text();
          return err(`CF Stream TUS init failed (${ir.status}): ${t.slice(0, 200)}`);
        }
        const tusUrl = ir.headers.get("Location") ?? "";
        if (!tusUrl) return err("CF Stream returned no TUS Location");
        return ok({ provider: "cfstream", uploadId: tusUrl });
      }

      // Image (or video without CF configured): Supabase Storage TUS
      const tr = await fetch(`${supabaseUrl}/storage/v1/upload/resumable`, {
        method: "POST",
        headers: {
          Authorization:    `Bearer ${svcKey}`,
          apikey:            svcKey,
          "Content-Type":   "application/json",
          "x-upsert":       "true",
          "Tus-Resumable":  "1.0.0",
          "Upload-Length":  String(fileSize),
          "Upload-Metadata": [
            `bucketName ${btoa(BUCKET)}`,
            `objectName ${btoa(filePath)}`,
            `contentType ${btoa(contentType ?? "application/octet-stream")}`,
            `cacheControl ${btoa("3600")}`,
          ].join(","),
        },
      });
      if (!tr.ok) {
        const t = await tr.text();
        return err(`Supabase TUS init failed (${tr.status}): ${t.slice(0, 200)}`);
      }
      const tusUrl = tr.headers.get("Location") ?? "";
      return ok({ provider: "supabase", uploadId: tusUrl });
    }

    // ---- COMPLETE ---------------------------------------------------
    if (action === "complete") {
      const uploadId = body.uploadId as string;
      if (!uploadId) return err("uploadId required", 400);

      // Extract video UID from the CF Stream TUS URL.
      // CF Stream TUS URLs look like: https://upload.videodelivery.net/tus/{uid}
      const uid = uploadId.split("/").pop();
      if (!uid) return err("Cannot extract video UID from uploadId", 400);

      if (!hasCF) return err("CF Stream not configured (CF_ACCOUNT_ID / CF_STREAM_TOKEN missing)", 500);

      try {
        const url = await awaitCFStream(accountId, cfToken, uid);
        return ok({ url });
      } catch (e) {
        return err((e as Error).message);
      }
    }

    // ---- ABORT ------------------------------------------------------
    if (action === "abort") {
      const uploadId = body.uploadId as string;
      if (uploadId) {
        // Attempt TUS DELETE; ignore errors (best-effort cleanup)
        await fetch(uploadId, {
          method: "DELETE",
          headers: { "Tus-Resumable": "1.0.0" },
        }).catch(() => {});
      }
      return ok({ ok: true });
    }

    return err(`Unknown action: ${action}`, 400);
  }

  // ------------------------------------------------------------------
  // Route: DIRECT file upload  (<4 MB, raw body)
  // ------------------------------------------------------------------
  const filePath    = req.headers.get("x-file-path") ?? `uploads/${Date.now()}.bin`;
  const contentType2 = req.headers.get("content-type") ?? "application/octet-stream";
  const isVideo     = contentType2.startsWith("video/");
  const bytes       = await req.arrayBuffer();

  // 1. Store in Supabase storage (source of truth / fallback URL)
  const ur = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${filePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${svcKey}`,
      apikey:         svcKey,
      "Content-Type": contentType2,
      "x-upsert":     "true",
    },
    body: bytes,
  });
  if (!ur.ok) {
    const t = await ur.text();
    return err(`Storage upload failed (${ur.status}): ${t.slice(0, 200)}`);
  }

  const supabasePublicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`;

  // 2. For images, or when CF Stream is not configured, return Supabase URL directly.
  if (!isVideo || !hasCF) return ok({ url: supabasePublicUrl });

  // 3. Trigger CF Stream copy-from-URL and AWAIT transcoding synchronously.
  const cr = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
    {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${cfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: supabasePublicUrl, meta: { name: filePath } }),
    }
  );
  if (!cr.ok) {
    // CF Stream copy failed — fall back to Supabase URL so the upload still succeeds.
    console.error("CF Stream copy failed:", cr.status, await cr.text().catch(() => ""));
    return ok({ url: supabasePublicUrl });
  }

  const cData = await cr.json();
  const uid   = cData.result?.uid as string | undefined;
  if (!uid) return ok({ url: supabasePublicUrl });

  try {
    const cfUrl = await awaitCFStream(accountId, cfToken, uid);
    return ok({ url: cfUrl });
  } catch (e) {
    // Transcoding timed out — return Supabase URL as fallback so the UI unblocks.
    console.error("CF Stream await failed:", (e as Error).message);
    return ok({ url: supabasePublicUrl });
  }
});
