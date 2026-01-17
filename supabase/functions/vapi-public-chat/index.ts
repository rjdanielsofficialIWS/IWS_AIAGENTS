import { corsHeaders } from '../_shared/cors.ts';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!VAPI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing VAPI_API_KEY in Supabase function secrets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const assistantId = body?.assistantId;
    const input = body?.input;
    const previousChatId = body?.previousChatId;

    if (!assistantId || !input) {
      return new Response(JSON.stringify({ error: 'assistantId and input are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapiRes = await fetch('https://api.vapi.ai/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId,
        input,
        ...(previousChatId ? { previousChatId } : {}),
      }),
    });

    const json = await vapiRes.json().catch(() => ({}));

    if (!vapiRes.ok) {
      return new Response(JSON.stringify({ error: json?.error || 'Vapi chat failed', details: json }), {
        status: vapiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseText = json?.output?.[0]?.content ?? json?.response ?? '';
    const chatId = json?.id ?? json?.chatId ?? null;

    return new Response(JSON.stringify({ response: responseText, chatId, raw: json }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});