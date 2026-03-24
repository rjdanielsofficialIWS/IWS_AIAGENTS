// upload-media — handles all media upload paths for InfiniteMedia
//
// Calling convention (from MediaDistributionPage.uploadViaNativeXHR):
//   1. Direct upload (<4 MB)  : POST raw file body, headers: x-file-path, content-type
//   2. Init          (≥4 MB)  : POST JSON { action:'init', filePath, contentType, fileSize }
//   3. Chunk                  : POST binary, headers: x-action:chunk, x-file-path,
//                               x-provider, x-upload-id, x-part-number, content-type
//   4. Complete               : POST JSON { action:'complete', uploadId }
//   5. Abort                  : POST JSON { action:'abort', uploadId }
//
// Upload paths:
//   Video (≥4 MB):  CF Stream TUS → all chunks PATCHed → complete → awaitCFStream → CF Stream URL
//   Video (<4 MB):  Supabase storage → CF Stream copy-from-URL → awaitCFStream → CF Stream URL
//   Image (any):    Supabase TUS → return Supabase public URL after last chunk

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
// ---------------------------------------------------------------------------
async function awaitCFStream(accountId: string, token: string, uid: string): Promise<string> {
  const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`;
  const deadline = Date.now() + POLL_MAX_MS;

  while (Date.now() < deadline) {
    const r = await fetch(apiBase, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`CF Stream status check failed (${r.status})`);
    const { result } = await r.json();
    if (result?.state === "error") throw new Error("CF Stream transcoding failed");

    if (result?.readyToStream) {
      // Enable MP4 download so the URL has an explicit .mp4 extension.
      await fetch(`${apiBase}/downloads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});

      const hls: string = result.playback?.hls ?? "";
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
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase TUS init failed (${r.status}): ${t.slice(0, 200)}`);
  }
  const tusUrl = r.headers.get("Location") ?? "";
  if (!tusUrl) throw new Error("Supabase TUS returned no Location header");
  return tusUrl;
}

// ---------------------------------------------------------------------------
// Upload to Supabase, copy to CF Stream, await transcoding, return CF URL.
// Falls back to Supabase URL on any CF error so the upload never hard-fails.
// ---------------------------------------------------------------------------
async function uploadThenStream(
  supabaseUrl: string,
  svcKey: string,
  accountId: string,
  token: string,
  filePath: string,
  contentType: string,
  bytes: ArrayBuffer,
): Promise<string> {
  // 1. Store in Supabase (source for CF Stream copy-from-URL).
  const ur = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${filePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${svcKey}`,
      apikey: svcKey,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!ur.ok) {
    const t = await ur.text();
    throw new Error(`Storage upload failed (${ur.status}): ${t.slice(0, 200)}`);
  }
  const supabasePublicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`;

  // 2. Copy from Supabase URL into CF Stream.
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

  // 3. Await transcoding.
  try {
    return await awaitCFStream(accountId, token, uid);
  } catch (e) {
    console.error("CF Stream await failed:", (e as Error).message);
    return supabasePublicUrl;
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

    // CF Stream TUS: proxy PATCH to CF Stream (account-level TUS requires auth).
    if (provider === "cfstream") {
      const pr = await fetch(uploadId, {
        method: "PATCH",
        headers: {
          Authorization:    `Bearer ${cfToken}`,
          "Tus-Resumable":  "1.0.0",
          "Upload-Offset":  String(offset),
          "Content-Type":   "application/offset+octet-stream",
          "Content-Length": String(bytes.byteLength),
        },
        body: bytes,
      });
      if (!pr.ok) {
        const t = await pr.text();
        return err(`CF Stream chunk ${partNo} failed (${pr.status}): ${t.slice(0, 200)}`);
      }
      return ok({ offset: pr.headers.get("Upload-Offset") });
    }

    // Supabase TUS: proxy PATCH to Supabase Storage (images).
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
    // Return the public URL; frontend exits the loop after the last chunk.
    return ok({
      url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`,
      offset: pr.headers.get("Upload-Offset"),
    });
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

      // Videos: CF Stream TUS (no size limit, transcodes to correct format).
      if (isVideo && hasCF) {
        const ir = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
          {
            method: "POST",
            headers: {
              Authorization:     `Bearer ${cfToken}`,
              "Tus-Resumable":   "1.0.0",
              "Upload-Length":   String(fileSize),
              "Upload-Metadata": `name ${btoa(filePath)}`,
            },
          },
        );
        if (!ir.ok) {
          const t = await ir.text();
          return err(`CF Stream init failed (${ir.status}): ${t.slice(0, 200)}`);
        }
        const tusUrl = ir.headers.get("Location") ?? "";
        if (!tusUrl) return err("CF Stream returned no TUS upload URL");
        return ok({ provider: "cfstream", uploadId: tusUrl });
      }

      // Images (or video without CF configured): Supabase Storage TUS.
      try {
        const tusUrl = await createSupabaseTUS(supabaseUrl, svcKey, filePath, contentType, fileSize);
        return ok({ provider: "supabase", uploadId: tusUrl });
      } catch (e) {
        return err((e as Error).message);
      }
    }

    // ---- COMPLETE ---------------------------------------------------
    if (action === "complete") {
      const uploadId = body.uploadId as string;
      if (!uploadId) return err("uploadId required", 400);

      // CF Stream TUS URL — extract the video UID and await transcoding.
      // CF Stream TUS URLs: https://upload.videodelivery.net/tus/{uid}
      const uid = uploadId.split("/").pop();
      if (!uid) return err("Cannot extract video UID from uploadId", 400);
      if (!hasCF) return err("CF Stream not configured", 500);

      try {
        return ok({ url: await awaitCFStream(accountId, cfToken, uid) });
      } catch (e) {
        return err((e as Error).message);
      }
    }

    // ---- ABORT ------------------------------------------------------
    if (action === "abort") {
      const uploadId = body.uploadId as string;
      if (uploadId) {
        const isSupabase = uploadId.includes("supabase.co");
        await fetch(uploadId, {
          method: "DELETE",
          headers: {
            "Tus-Resumable": "1.0.0",
            ...(isSupabase ? { Authorization: `Bearer ${svcKey}`, apikey: svcKey } : {}),
          },
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
  const contentType = req.headers.get("content-type") ?? "application/octet-stream";
  const isVideo     = contentType.startsWith("video/");
  const bytes       = await req.arrayBuffer();

  if (isVideo && hasCF) {
    // Upload to Supabase, copy to CF Stream, await transcoding.
    try {
      const url = await uploadThenStream(supabaseUrl, svcKey, accountId, cfToken, filePath, contentType, bytes);
      return ok({ url });
    } catch (e) {
      return err((e as Error).message);
    }
  }

  // Image (or video without CF): upload directly to Supabase.
  const ur = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${filePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${svcKey}`,
      apikey: svcKey,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!ur.ok) {
    const t = await ur.text();
    return err(`Storage upload failed (${ur.status}): ${t.slice(0, 200)}`);
  }
  return ok({ url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}` });
});
