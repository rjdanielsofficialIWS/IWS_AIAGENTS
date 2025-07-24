import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface BlandAICallRequest {
  phone_number: string
  task: string
  voice_id?: string
  reduce_latency?: boolean
  webhook?: string
  model?: string
  language?: string
  max_duration?: number
  answered_by_enabled?: boolean
  wait_for_greeting?: boolean
  record?: boolean
  amd?: boolean
  interruption_threshold?: number
  voicemail_message?: string
  temperature?: number
  keywords?: string[]
  pronunciation_guide?: Array<{ word: string; pronunciation: string }>
  start_time?: string
  request_data?: Record<string, any>
  tools?: Array<any>
  dynamic_data?: Array<any>
  analysis_preset?: string
  analysis_schema?: Record<string, any>
  metadata?: Record<string, any>
  pathway_id?: string
}

interface BlandAIWebhook {
  call_id: string
  to: string
  from: string
  call_length: number
  call_status: string
  transcripts: Array<{
    text: string
    user: string
    timestamp: number
  }>
  recording_url?: string
  summary?: string
  answered_by?: string
  created_at: string
  variables?: Record<string, any>
  metadata?: Record<string, any>
  analysis?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname

    // Route: POST /bland-ai/call - Initiate outbound call
    if (path === '/bland-ai/call' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify user authentication
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const callRequest: BlandAICallRequest = await req.json()

      // Set webhook URL to receive call updates
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/bland-ai/webhook`
      callRequest.webhook = webhookUrl

      // Make request to Bland AI
      const blandResponse = await fetch('https://api.bland.ai/v1/calls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('BLAND_AI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callRequest),
      })

      if (!blandResponse.ok) {
        const errorText = await blandResponse.text()
        console.error('Bland AI API error:', errorText)
        return new Response(
          JSON.stringify({ error: 'Failed to initiate call', details: errorText }),
          { status: blandResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const blandData = await blandResponse.json()

      // Store call record in database
      const { error: dbError } = await supabaseClient
        .from('ai_agent_calls')
        .insert({
          user_id: user.id,
          call_id: blandData.call_id,
          phone_number: callRequest.phone_number,
          task: callRequest.task,
          status: 'initiated',
          created_at: new Date().toISOString(),
          metadata: callRequest.metadata || {}
        })

      if (dbError) {
        console.error('Database error:', dbError)
      }

      return new Response(
        JSON.stringify(blandData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route: POST /bland-ai/webhook - Handle Bland AI webhooks
    if (path === '/bland-ai/webhook' && req.method === 'POST') {
      const webhookData: BlandAIWebhook = await req.json()

      // Update call record in database
      const { error: updateError } = await supabaseClient
        .from('ai_agent_calls')
        .update({
          status: webhookData.call_status,
          call_length: webhookData.call_length,
          transcripts: webhookData.transcripts,
          recording_url: webhookData.recording_url,
          summary: webhookData.summary,
          answered_by: webhookData.answered_by,
          analysis: webhookData.analysis,
          updated_at: new Date().toISOString()
        })
        .eq('call_id', webhookData.call_id)

      if (updateError) {
        console.error('Database update error:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update call record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route: GET /bland-ai/calls - Get user's call history
    if (path === '/bland-ai/calls' && req.method === 'GET') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: calls, error: callsError } = await supabaseClient
        .from('ai_agent_calls')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (callsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch calls' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ calls }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route: GET /bland-ai/call/:id - Get specific call details
    if (path.startsWith('/bland-ai/call/') && req.method === 'GET') {
      const callId = path.split('/').pop()
      
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch from Bland AI API for real-time data
      const blandResponse = await fetch(`https://api.bland.ai/v1/calls/${callId}`, {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('BLAND_AI_API_KEY')}`,
        },
      })

      if (!blandResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Call not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const callData = await blandResponse.json()

      return new Response(
        JSON.stringify(callData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route: POST /bland-ai/agents - Create/update AI agent configuration
    if (path === '/bland-ai/agents' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const agentConfig = await req.json()

      const { data, error } = await supabaseClient
        .from('ai_agents')
        .upsert({
          user_id: user.id,
          ...agentConfig,
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to save agent configuration' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ agent: data[0] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route: GET /bland-ai/agents - Get user's AI agents
    if (path === '/bland-ai/agents' && req.method === 'GET') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: agents, error: agentsError } = await supabaseClient
        .from('ai_agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (agentsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch agents' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ agents }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route: GET /bland-ai/phone-numbers - Get available phone numbers from Bland AI
    if (path === '/bland-ai/phone-numbers' && req.method === 'GET') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      try {
        // Fetch available phone numbers from Bland AI
        const blandResponse = await fetch('https://api.bland.ai/v1/phone-numbers', {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('BLAND_AI_API_KEY')}`,
          },
        })

        if (!blandResponse.ok) {
          const errorText = await blandResponse.text()
          console.error('Bland AI phone numbers API error:', errorText)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch phone numbers', details: errorText }),
            { status: blandResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const phoneNumbersData = await blandResponse.json()

        return new Response(
          JSON.stringify(phoneNumbersData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('Error fetching phone numbers:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch phone numbers', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})