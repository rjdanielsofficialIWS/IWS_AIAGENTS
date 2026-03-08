// netlify/functions/postiz-auth.js
// Returns a Postiz JWT by logging in with admin credentials.
// This allows users to connect social accounts without ever seeing Postiz's UI.

const POSTIZ_URL = 'https://postiz.infinitewealthsolutionsai.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const email    = process.env.POSTIZ_ADMIN_EMAIL;
  const password = process.env.POSTIZ_ADMIN_PASSWORD;

  if (!email || !password) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Postiz credentials not configured' }) };
  }

  try {
    const res = await fetch(`${POSTIZ_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data?.message || 'Login failed' }) };
    }

    // Postiz returns access_token or token
    const token = data.access_token || data.token || data.jwt;
    if (!token) {
      return { statusCode: 502, body: JSON.stringify({ error: 'No token in response', data }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};