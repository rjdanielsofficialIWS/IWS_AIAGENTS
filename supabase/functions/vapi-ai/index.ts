/**
 * Vapi AI Integration Edge Function
 *
 * Secure proxy for Vapi AI API requests.
 * Keeps VAPI_API_KEY off the client.
 *
 * Supported routes:
 *  - /assistants
 *  - /phone-numbers
 *  - /calls
 *  - /webhooks
 */

import { corsHeaders } from '../_shared/cors.ts';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');

if (!VAPI_API_KEY) {
  throw new Error('Missing VAPI_API_KEY environment variable');
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/vapi-ai', '');

    if (!path) {
      return new Response(
        JSON.stringify({ error: 'Missing Vapi endpoint path' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const vapiUrl = `https://api.vapi.ai${path}`;

    const headers: HeadersInit = {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // Forward request to Vapi
    const vapiResponse = await fetch(vapiUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? await req.text() : undefined,
    });

    const text = await vapiResponse.text();

    return new Response(text, {
      status: vapiResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': vapiResponse.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
    console.error('Vapi proxy error:', err);

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