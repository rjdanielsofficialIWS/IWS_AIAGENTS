exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let code;
  try {
    const body = JSON.parse(event.body || '{}');
    code = body.code;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing authorization code' }) };
  }

  const CLIENT_ID     = process.env.POSTIZ_CLIENT_ID;
  const CLIENT_SECRET = process.env.POSTIZ_CLIENT_SECRET;
  const REDIRECT_URL  = process.env.POSTIZ_REDIRECT_URL;

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URL) {
    console.error('Missing Postiz environment variables');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  try {
    const response = await fetch('https://api.postiz.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URL,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Postiz token exchange failed:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data?.error || 'Token exchange failed' }),
      };
    }

    if (!data.access_token) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No access_token returned' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: data.access_token }),
    };
  } catch (err) {
    console.error('Postiz function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
    };
  }
};