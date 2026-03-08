// netlify/functions/tiktok-callback.js
// Receives the TikTok OAuth code and forwards it to Postiz to complete
// the token exchange and register the integration.

const POSTIZ_URL = 'https://postiz.infinitewealthsolutionsai.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let code, state;
  try {
    const body = JSON.parse(event.body || '{}');
    code  = body.code;
    state = body.state;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing code' }) };
  }

  const email    = process.env.POSTIZ_ADMIN_EMAIL;
  const password = process.env.POSTIZ_ADMIN_PASSWORD;

  if (!email || !password) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Postiz credentials not configured' }) };
  }

  try {
    // Step 1 — Get a Postiz JWT via admin login
    const loginRes = await fetch(`${POSTIZ_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const loginText = await loginRes.text();
    let loginData;
    try { loginData = JSON.parse(loginText); } catch { loginData = {}; }

    if (!loginRes.ok) {
      console.error('Postiz login failed:', loginRes.status, loginText);
      return { statusCode: 502, body: JSON.stringify({ error: `Postiz login failed: ${loginData?.message || loginRes.status}` }) };
    }

    const token = loginData.access_token || loginData.token || loginData.jwt || loginData.accessToken;
    if (!token) {
      return { statusCode: 502, body: JSON.stringify({ error: 'No token from Postiz login' }) };
    }

    // Step 2 — Send the TikTok code to Postiz's integration callback endpoint
    const callbackRes = await fetch(
      `${POSTIZ_URL}/api/integrations/social/tiktok?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cookie': `auth=${token}`,
        },
      }
    );

    const callbackText = await callbackRes.text();
    console.log('Postiz TikTok callback response:', callbackRes.status, callbackText);

    // Whether it succeeds or not, return the status so frontend can handle it
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: callbackRes.ok,
        status: callbackRes.status,
        message: callbackText,
      }),
    };
  } catch (err) {
    console.error('tiktok-callback error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};