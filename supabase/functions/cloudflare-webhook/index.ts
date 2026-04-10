import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publishSocialPost } from "../_shared/publish-social.ts";

function parseSignatureHeader(header: string | null): { time: string; sig1: string } | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, value] = part.split("=");
        return [key, value];
      }),
  );
  if (!parts.time || !parts.sig1) return null;
  return { time: parts.time, sig1: parts.sig1 };
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) return new Uint8Array();
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function verifyWebhookSignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${parsed.time}.${rawBody}`));
  const expectedBytes = new Uint8Array(signature);
  const receivedBytes = hexToBytes(parsed.sig1);
  if (expectedBytes.byteLength !== receivedBytes.byteLength) return false;
  return crypto.subtle.timingSafeEqual(expectedBytes, receivedBytes);
}

function extractUid(body: Record<string, unknown>): string {
  const candidates = [
    body.uid,
    (body.result as Record<string, unknown> | undefined)?.uid,
    (body.video as Record<string, unknown> | undefined)?.uid,
    (body.data as Record<string, unknown> | undefined)?.uid,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function extractStatus(body: Record<string, unknown>): string {
  const candidates = [
    body.status,
    (body.result as Record<string, unknown> | undefined)?.status,
    (body.video as Record<string, unknown> | undefined)?.status,
    (body.data as Record<string, unknown> | undefined)?.status,
    body.event,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  }
  if (body.readyToStream === true || (body.result as any)?.readyToStream === true) return "ready";
  return "";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const expectedSecret = Deno.env.get("CF_WEBHOOK_SECRET")?.trim() ?? "";
  const rawBody = await req.text();
  if (expectedSecret) {
    const isValid = await verifyWebhookSignature(rawBody, req.headers.get("Webhook-Signature"), expectedSecret);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const cfUid = extractUid(body);
  const status = extractStatus(body);
  if (!cfUid) {
    return new Response(JSON.stringify({ ignored: true, reason: "missing_uid" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (!["ready", "readytostream", "ready_to_stream"].includes(status)) {
    return new Response(JSON.stringify({ ignored: true, reason: `status:${status || "unknown"}` }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: jobs, error } = await supabase
    .from("media_publish_jobs")
    .select("*")
    .eq("cf_uid", cfUid)
    .eq("status", "pending_media")
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message || "Failed to load jobs" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ ok: true, dispatched: 0, reason: "no_pending_jobs" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  let dispatched = 0;
  for (const job of jobs) {
    await supabase
      .from("media_publish_jobs")
      .update({ status: "processing", attempts: (job.attempts ?? 0) + 1, last_event: body })
      .eq("id", job.id);

    const payload = typeof job.post_payload === "object" && job.post_payload
      ? structuredClone(job.post_payload)
      : {};
    const mediaUrls = Array.isArray((payload as any).mediaUrls)
      ? (payload as any).mediaUrls.filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
      : [];
    const videoUrl = job.stream_url || `https://videodelivery.net/${cfUid}/manifest/video.m3u8`;
    const nextMediaUrls = mediaUrls.some((url) => url.includes("videodelivery.net/"))
      ? mediaUrls.map((url) => url.includes("videodelivery.net/") ? videoUrl : url)
      : [...mediaUrls, videoUrl];

    const result = await publishSocialPost({
      supabase,
      userId: job.supabase_user_id,
      payload: { ...(payload as Record<string, unknown>), mediaUrls: nextMediaUrls },
    });

    if (!result.ok) {
      await supabase
        .from("media_publish_jobs")
        .update({ status: "error", error: result.message || result.error || "Failed to publish", last_event: body })
        .eq("id", job.id);
      continue;
    }

    await supabase
      .from("media_publish_jobs")
      .update({ status: "dispatched", error: null, last_event: body })
      .eq("id", job.id);
    dispatched += 1;
  }

  return new Response(JSON.stringify({ ok: true, dispatched }), { status: 200, headers: { "Content-Type": "application/json" } });
});
