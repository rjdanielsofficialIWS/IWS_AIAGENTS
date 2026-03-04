// netlify/functions/postiz-token.js
//
// This function handles the server-side OAuth token exchange with Postiz.
// It keeps your client_secret out of the frontend bundle entirely.
//
// Required Netlify environment variables (set in Site Settings > Environment Variables):
//   POSTIZ_CLIENT_ID     — your app's client ID (starts with pca_)
//   POSTIZ_CLIENT_SECRET — your app's client secret (starts with pcs_)
//   POSTIZ_REDIRECT_URL  — must exactly match what's registered in the Postiz dashboard
//                          e.g. https://infinitewealthsolutionsai.com/mediamachine

const POSTIZ_BACKEND_URL = 'https://api.postiz.com';

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let code;
  try {
    const body = JSON.parse(event.body || '{}');
    code = body.code;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing authorization code' }),
    };
  }

  // Validate that env vars are set so we get a clear error instead of a cryptic one
  const clientId = process.env.POSTIZ_CLIENT_ID;
  const clientSecret = process.env.POSTIZ_CLIENT_SECRET;
  const redirectUrl = process.env.POSTIZ_REDIRECT_URL;

  if (!clientId || !clientSecret || !redirectUrl) {
    console.error('Missing required environment variables: POSTIZ_CLIENT_ID, POSTIZ_CLIENT_SECRET, POSTIZ_REDIRECT_URL');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration — missing environment variables' }),
    };
  }

  try {
    const response = await fetch(`${POSTIZ_BACKEND_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',  // Required by Postiz OAuth spec
        code,                              // The short-lived code from the frontend
        client_id: clientId,              // From env — never hardcoded in frontend
        client_secret: clientSecret,      // From env — never hardcoded in frontend
        redirect_uri: redirectUrl,        // Must exactly match the registered redirect URI
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Postiz token exchange failed:', response.status, data);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data?.error || 'Token exchange failed',
          error_description: data?.error_description || '',
        }),
      };
    }

    if (!data.access_token) {
      console.error('Postiz returned no access_token:', data);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'No access_token in Postiz response' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: data.access_token }),
    };
  } catch (err) {
    console.error('postiz-token function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};