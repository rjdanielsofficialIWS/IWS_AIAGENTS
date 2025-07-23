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
      case 'list-calendars':
        apiUrl = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'
        break
      
      case 'list-events':
        const calendarId = params.calendarId || 'primary'
        const timeMin = params.timeMin || new Date().toISOString()
        const timeMax = params.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`
        break
      
      case 'create-event':
        const createCalendarId = params.calendarId || 'primary'
        apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(createCalendarId)}/events`
        method = 'POST'
        body = JSON.stringify({
          summary: params.summary,
          description: params.description,
          start: params.start,
          end: params.end,
          attendees: params.attendees,
        })
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
      console.error('Google Calendar API error:', errorData)
      throw new Error(`Google Calendar API error: ${response.status}`)
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
    console.error('Error in google-calendar function:', error)
    
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