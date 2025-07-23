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
      case 'create-meeting':
        // Google Meet meetings are created through Calendar events with conferenceData
        const calendarId = params.calendarId || 'primary'
        apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`
        method = 'POST'
        body = JSON.stringify({
          summary: params.summary || 'Google Meet Meeting',
          description: params.description,
          start: params.start,
          end: params.end,
          attendees: params.attendees,
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          }
        })
        break
      
      case 'list-meetings':
        // List calendar events that have Google Meet links
        const listCalendarId = params.calendarId || 'primary'
        const timeMin = params.timeMin || new Date().toISOString()
        const timeMax = params.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(listCalendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`
        break
      
      case 'get-meeting':
        if (!params.eventId) {
          throw new Error('Event ID is required')
        }
        const getMeetingCalendarId = params.calendarId || 'primary'
        apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(getMeetingCalendarId)}/events/${params.eventId}`
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
      console.error('Google Meet API error:', errorData)
      throw new Error(`Google Meet API error: ${response.status}`)
    }

    const data = await response.json()

    // For list-meetings, filter events that have Google Meet links
    if (action === 'list-meetings') {
      const meetingEvents = data.items?.filter((event: any) => 
        event.conferenceData?.entryPoints?.some((entry: any) => entry.entryPointType === 'video')
      ) || []
      
      return new Response(
        JSON.stringify({
          success: true,
          data: { items: meetingEvents },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

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
    console.error('Error in google-meet function:', error)
    
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