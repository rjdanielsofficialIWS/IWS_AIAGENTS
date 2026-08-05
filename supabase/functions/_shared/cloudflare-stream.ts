// ─────────────────────────────────────────────────────────────────────────────
// Canonical Cloudflare Stream helper.
//
// This is the SINGLE source of truth for resolving a Cloudflare Stream UID into
// a downloadable MP4 URL. Every function that touches CF Stream must use this
// module rather than reimplementing the calls, because the failure semantics
// here are subtle and getting them wrong silently destroys users' scheduled
// posts.
//
// DESIGN RULE — fail open, not closed:
//   Cloudflare returns 400 from POST /downloads while a video is still
//   encoding. Treating that as a hard failure is what caused scheduled posts to
//   be marked "error" seconds after upload. So the default for ANY unrecognised
//   condition is DEFER (retry later), never fail.
//
//   Only three conditions are terminal, and each throws CfPermanentError:
//     1. The video does not exist (404 on the stream object).
//     2. Cloudflare reports the video's encoding state as "error".
//     3. Cloudflare reports the MP4 download state as "error".
//
//   Everything else — auth failures, rate limits, 5xx, timeouts, unknown
//   states, missing config — returns { ready: false } so the caller leaves the
//   work queued. Jobs that genuinely never resolve are aged out by the 24h
//   expiry sweep in media-publish-recovery, which is the only place a
//   time-based give-up should happen.
// ─────────────────────────────────────────────────────────────────────────────

export class CfPermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CfPermanentError";
  }
}

export type CfMediaResult =
  | { ready: true; url: string; state: "ready" }
  | { ready: false; url?: undefined; state: string };

const POLL_DELAYS_MS = [750, 1_500, 3_000, 5_000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(response: Response, fallback: number) {
  const raw = response.headers.get("retry-after");
  if (!raw) return fallback;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1_000, fallback), 10_000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.min(Math.max(date - Date.now(), fallback), 10_000) : fallback;
}

function cfConfig() {
  return {
    accountId: Deno.env.get("CF_ACCOUNT_ID") ?? "",
    token: Deno.env.get("CF_STREAM_TOKEN") ?? "",
  };
}

/** Extract a Cloudflare Stream UID from a videodelivery.net URL. */
export function getCloudflareUidFromUrl(url: string): string {
  return url.match(/videodelivery\.net\/([^/?]+)/i)?.[1]?.trim() ?? "";
}

/**
 * Resolve a Cloudflare Stream UID to a downloadable MP4 URL.
 *
 * Returns { ready: true, url } when the MP4 is downloadable.
 * Returns { ready: false, state } when the caller should try again later.
 * Throws CfPermanentError only when the video can never succeed.
 */
export async function resolveCloudflareMp4(cfUid: string): Promise<CfMediaResult> {
  const { accountId, token } = cfConfig();
  if (!cfUid) return { ready: false, state: "missing_uid" };
  if (!accountId || !token) {
    // Server misconfiguration. Defer rather than fail: this is an ops problem,
    // and destroying users' queued posts over it would make it far worse.
    console.error("[cloudflare-stream] CF_ACCOUNT_ID / CF_STREAM_TOKEN not configured — deferring.");
    return { ready: false, state: "not_configured" };
  }

  const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cfUid}`;
  const headers = { Authorization: `Bearer ${token}` };

  // ── Step 1: Is the video finished encoding? ────────────────────────────────
  // Asking for an MP4 before this is true is exactly what produces the 400 from
  // POST /downloads, so we check here and defer instead of provoking it.
  const streamRes = await fetch(apiBase, { headers }).catch(() => null);
  if (!streamRes) return { ready: false, state: "network_error" };

  if (streamRes.status === 404) {
    throw new CfPermanentError("The uploaded video no longer exists on Cloudflare Stream.");
  }
  if (!streamRes.ok) {
    // 401/403 (token), 429, 5xx — all recoverable from our side. Defer.
    console.warn(`[cloudflare-stream] stream lookup ${streamRes.status} for ${cfUid} — deferring.`);
    return { ready: false, state: `stream_http_${streamRes.status}` };
  }

  const streamData = await streamRes.json().catch(() => ({}));
  const encodingState = String(streamData?.result?.status?.state ?? "");
  if (encodingState === "error") {
    const reason = streamData?.result?.status?.errorReasonText;
    throw new CfPermanentError(
      reason ? `Cloudflare could not process this video: ${reason}` : "Cloudflare could not process this video.",
    );
  }
  if (streamData?.result?.readyToStream !== true) {
    return { ready: false, state: encodingState || "encoding" };
  }

  // ── Step 2: Request the MP4 render (idempotent, best-effort) ───────────────
  // A non-OK response here is never fatal: either the render already exists, or
  // Step 3's poll will report the real state.
  await fetch(`${apiBase}/downloads`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}",
  }).catch(() => null);

  // ── Step 3: Poll until the MP4 render is downloadable ─────────────────────
  for (let attempt = 0; attempt <= POLL_DELAYS_MS.length; attempt += 1) {
    const res = await fetch(`${apiBase}/downloads`, { headers }).catch(() => null);

    if (!res) {
      if (attempt === POLL_DELAYS_MS.length) return { ready: false, state: "network_error" };
      await sleep(POLL_DELAYS_MS[attempt]);
      continue;
    }

    if (!res.ok) {
      if (attempt === POLL_DELAYS_MS.length) return { ready: false, state: `downloads_http_${res.status}` };
      await sleep(retryAfterMs(res, POLL_DELAYS_MS[attempt]));
      continue;
    }

    const data = await res.json().catch(() => ({}));
    const state = String(data?.result?.default?.status ?? "preparing_download");
    const url = data?.result?.default?.url;

    if (state === "ready" && typeof url === "string" && url.length > 0) {
      return { ready: true, url, state: "ready" };
    }
    if (state === "error") {
      throw new CfPermanentError("Cloudflare failed to generate a downloadable version of this video.");
    }
    // "inprogress" / "preparing_download" / anything unknown — come back later.
    return { ready: false, state };
  }

  return { ready: false, state: "preparing_download" };
}

/**
 * Swap an HLS manifest URL for a direct MP4 URL, when one is available.
 * Non-Cloudflare URLs pass through untouched. Returns null when the MP4 is not
 * ready yet, so callers can decide whether to wait or defer.
 */
export async function resolveCloudflareVideoUrl(url: string): Promise<string | null> {
  if (!url.includes("videodelivery.net/") || !url.includes(".m3u8")) return url;
  const cfUid = getCloudflareUidFromUrl(url);
  if (!cfUid) return url;
  const result = await resolveCloudflareMp4(cfUid);
  return result.ready ? result.url : null;
}
