import { corsHeaders } from '../_shared/cors.ts';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');

if (!VAPI_API_KEY) {
  throw new Error('VAPI_API_KEY environment variable is required');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { assistantId, input, previousChatId } = await req.json().catch(() => ({}));

    if (!assistantId || !input) {
      return new Response(JSON.stringify({ error: 'assistantId and input are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapiRes = await fetch('https://api.vapi.ai/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
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

    // Normalize response so the client doesn’t care about Vapi’s exact shape
    const responseText = json?.output?.[0]?.content ?? '';
    const chatId = json?.id;

    return new Response(JSON.stringify({ chatId, response: responseText, raw: json }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});