/*
  # Vapi AI Integration Edge Function

  This Edge Function provides a secure proxy to the Vapi AI API, ensuring API keys are never exposed to the client.
  
  ## Features
  - Complete Vapi AI API integration
  - Secure API key management
  - User authentication and authorization
  - Request/response logging for debugging
  
  ## Environment Variables Required
  - VAPI_API_KEY: Your Vapi AI API key from the dashboard
  
  ## Supported Endpoints
  - GET/POST /assistants - Manage AI assistants
  - GET/POST /phone-numbers - Manage phone numbers
  - GET/POST /calls - Manage calls
  - GET/POST /webhooks - Manage webhooks
  - GET/POST /squads - Manage squads
  - GET /voices - Get available voices
  - GET /models - Get available models
  - GET /analytics - Get analytics data
*/

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!VAPI_API_KEY) {
  throw new Error('VAPI_API_KEY environment variable is required');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase environment variables are required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse URL and extract endpoint
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const endpoint = pathSegments.slice(3).join('/'); // Remove /functions/v1/vapi-ai

    // Prepare Vapi AI request
    const vapiUrl = `https://api.vapi.ai/${endpoint}${url.search}`;
    const vapiHeaders = {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    };

    let body = null;
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      body = await req.text();
    }

    // Make request to Vapi AI
    const vapiResponse = await fetch(vapiUrl, {
      method: req.method,
      headers: vapiHeaders,
      body: body,
    });

    const responseData = await vapiResponse.text();
    let jsonData;
    
    try {
      jsonData = JSON.parse(responseData);
    } catch {
      jsonData = { message: responseData };
    }

    // Log the request for debugging (optional)
    console.log(`Vapi AI ${req.method} ${endpoint}:`, {
      status: vapiResponse.status,
      user_id: user.id,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify(jsonData),
      {
        status: vapiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Vapi AI proxy error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});