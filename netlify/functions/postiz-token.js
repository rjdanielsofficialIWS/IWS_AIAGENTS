exports.handler = async function (event) {
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

  const clientId     = process.env.POSTIZ_CLIENT_ID;
  const clientSecret = process.env.POSTIZ_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Postiz credentials not configured on server' }),
    };
  }

  try {
    const response = await fetch('https://api.postiz.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type:    'authorization_code',
        code,
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Postiz token exchange failed:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data.error || data.message || 'Token exchange failed',
        }),
      };
    }

    if (!data.access_token) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No access_token returned from Postiz' }),
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
      body: JSON.stringify({ error: 'Internal server error during token exchange' }),
    };
  }
};