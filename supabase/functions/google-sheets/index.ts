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
      case 'list-spreadsheets':
        // Note: This requires Google Drive API to list files
        apiUrl = 'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"'
        break
      
      case 'get-spreadsheet':
        if (!params.spreadsheetId) {
          throw new Error('Spreadsheet ID is required')
        }
        apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}`
        break
      
      case 'get-values':
        if (!params.spreadsheetId || !params.range) {
          throw new Error('Spreadsheet ID and range are required')
        }
        apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values/${encodeURIComponent(params.range)}`
        break
      
      case 'update-values':
        if (!params.spreadsheetId || !params.range || !params.values) {
          throw new Error('Spreadsheet ID, range, and values are required')
        }
        apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values/${encodeURIComponent(params.range)}?valueInputOption=RAW`
        method = 'PUT'
        body = JSON.stringify({
          values: params.values
        })
        break
      
      case 'append-values':
        if (!params.spreadsheetId || !params.range || !params.values) {
          throw new Error('Spreadsheet ID, range, and values are required')
        }
        apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values/${encodeURIComponent(params.range)}:append?valueInputOption=RAW`
        method = 'POST'
        body = JSON.stringify({
          values: params.values
        })
        break
      
      case 'create-spreadsheet':
        apiUrl = 'https://sheets.googleapis.com/v4/spreadsheets'
        method = 'POST'
        body = JSON.stringify({
          properties: {
            title: params.title || 'New Spreadsheet'
          }
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
      console.error('Google Sheets API error:', errorData)
      throw new Error(`Google Sheets API error: ${response.status}`)
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
    console.error('Error in google-sheets function:', error)
    
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