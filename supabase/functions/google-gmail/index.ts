import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, accessToken, ...params } = await req.json()

    if (!accessToken) {
      throw new Error('Access token is required')
    }

    let apiUrl = ''
    let method = 'GET'
    let body = null

    switch (action) {
      case 'list-messages':
        const query = params.query || ''
        const maxResults = params.maxResults || 10
        apiUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
        break
      
      case 'get-message':
        if (!params.messageId) {
          throw new Error('Message ID is required')
        }
        apiUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.messageId}`
        break
      
      case 'send-message':
        apiUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
        method = 'POST'
        
        // Create email message
        const emailContent = [
          `To: ${params.to}`,
          `Subject: ${params.subject}`,
          '',
          params.body
        ].join('\n')
        
        const encodedMessage = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        
        body = JSON.stringify({
          raw: encodedMessage
        })
        break
      
      case 'get-profile':
        apiUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/profile'
        break
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body,
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gmail API error:', errorData)
      throw new Error(`Gmail API error: ${response.status}`)
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in google-gmail function:', error)
    
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