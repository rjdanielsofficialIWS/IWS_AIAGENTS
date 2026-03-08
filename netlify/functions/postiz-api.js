// netlify/functions/postiz-api.js
//
// Proxies Postiz Public API calls server-side to avoid CORS.
// Supports both user tokens (OAuth) and the org API key.

const POSTIZ_BACKEND_URL = 'https://postiz.infinitewealthsolutionsai.com/api';
const POSTIZ_API_KEY     = '55d30501b8cd0af1946a2f1f335205afd5a499a3cc60047f102044b67cb6d9ff';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let path, method, token, body;
  try {
    const parsed = JSON.parse(event.body || '{}');
    path   = parsed.path;
    method = parsed.method || 'GET';
    token  = parsed.token;
    body   = parsed.body;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!path) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing path' }) };
  }

  // Use provided token, or fall back to the org API key
  const authHeader = token || POSTIZ_API_KEY;

  try {
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${POSTIZ_BACKEND_URL}${path}`, fetchOptions);

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('postiz-api proxy error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || 'Proxy request failed' }),
    };
  }
};