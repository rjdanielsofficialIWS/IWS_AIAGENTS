import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractAssistantText(vapiJson: any): string {
  // Vapi /chat commonly returns: { output: [{ role:"assistant", content:"..." }] }
  const out = vapiJson?.output?.[0]?.content;
  if (typeof out === "string" && out.trim()) return out;

  // OpenAI-compatible route sometimes returns content as array of parts: [{type:"text", text:"..."}]
  const outParts = vapiJson?.output?.[0]?.content;
  if (Array.isArray(outParts)) {
    const text = outParts
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
    if (text) return text;
  }

  // Fallbacks for other shapes
  const c1 = vapiJson?.choices?.[0]?.message?.content;
  if (typeof c1 === "string" && c1.trim()) return c1;

  const c2 = vapiJson?.response;
  if (typeof c2 === "string" && c2.trim()) return c2;

  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => ({}));
    const assistantId = body?.assistantId;
    const input = body?.input;
    const previousChatId = body?.previousChatId; // optional (for multi-turn)

    if (!assistantId || !input) {
      return jsonResponse({ error: "Missing assistantId or input" }, 400);
    }

    const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY");
    if (!VAPI_API_KEY) {
      return jsonResponse(
        { error: "Missing VAPI_API_KEY in Supabase secrets" },
        500
      );
    }

    // ✅ Correct Vapi /chat request shape: assistantId + input (+ previousChatId optional)
    const vapiRes = await fetch("https://api.vapi.ai/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId,
        input,
        ...(previousChatId ? { previousChatId } : {}),
      }),
    });

    const vapiJson = await vapiRes.json().catch(() => ({}));

    if (!vapiRes.ok) {
      // Return the real status + details so debugging is easy
      return jsonResponse(
        {
          error: "Vapi chat failed",
          status: vapiRes.status,
          details: vapiJson,
        },
        500
      );
    }

    const response = extractAssistantText(vapiJson);

    return jsonResponse({
      response: response || "…",
      previousChatId: vapiJson?.id || null,
    });
  } catch (err) {
    return jsonResponse(
      { error: "Internal error", details: String(err) },
      500
    );
  }
});