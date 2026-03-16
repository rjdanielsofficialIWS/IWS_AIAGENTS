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

import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
const ALLOWED_PATH_PREFIXES = ['/assistants', '/phone-numbers', '/calls', '/webhooks'];

if (!VAPI_API_KEY) {
  throw new Error('Missing VAPI_API_KEY environment variable');
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/vapi-ai', '');

    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing Vapi endpoint path' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const isAllowed = ALLOWED_PATH_PREFIXES.some(p => path === p || path.startsWith(p + '/'));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Endpoint not allowed' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const vapiResponse = await fetch(`https://api.vapi.ai${path}`, {
      method: req.method,
      headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
      body: req.method !== 'GET' ? await req.text() : undefined,
    });

    const text = await vapiResponse.text();
    return new Response(text, {
      status: vapiResponse.status,
      headers: { ...cors, 'Content-Type': vapiResponse.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    console.error('Vapi proxy error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
