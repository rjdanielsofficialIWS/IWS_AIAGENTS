import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, service, userId } = await req.json()

    if (!code) {
      throw new Error('Authorization code is required')
    }

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: Deno.env.get('GOOGLE_REDIRECT_URI') || 'http://localhost:5173/auth/callback',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }

    const tokens = await tokenResponse.json()

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000))

    // Store tokens in database
    const { error: dbError } = await supabase
      .from('user_google_tokens')
      .upsert({
        user_id: userId,
        service: service,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,service'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error(`Failed to store tokens: ${dbError.message}`)
    }

    console.log(`Successfully stored ${service} tokens for user ${userId}`)

    return new Response(
      JSON.stringify({
        success: true,
        service: service,
        message: `Successfully connected to ${service}`,
        // Don't return actual tokens to frontend for security
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in google-oauth function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})