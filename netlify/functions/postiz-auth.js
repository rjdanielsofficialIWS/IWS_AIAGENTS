// netlify/functions/postiz-auth.js
// Returns a Postiz JWT by logging in with admin credentials.
// Used to get a token for connecting/disconnecting social accounts.

const POSTIZ_URL = 'https://postiz.infinitewealthsolutionsai.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const email    = process.env.POSTIZ_ADMIN_EMAIL;
  const password = process.env.POSTIZ_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Missing POSTIZ_ADMIN_EMAIL or POSTIZ_ADMIN_PASSWORD env vars');
    return { statusCode: 500, body: JSON.stringify({ error: 'Postiz credentials not configured' }) };
  }

  try {
    const res = await fetch(`${POSTIZ_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }

    if (!res.ok) {
      console.error('Postiz login failed:', res.status, text);
      return { statusCode: res.status, body: JSON.stringify({ error: data?.message || `Login failed (${res.status})` }) };
    }

    const token = data.access_token || data.token || data.jwt || data.accessToken;
    if (!token) {
      console.error('No token in Postiz response:', text);
      return { statusCode: 502, body: JSON.stringify({ error: 'No token in Postiz response' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    };
  } catch (err) {
    console.error('postiz-auth error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};