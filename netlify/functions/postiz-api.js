// netlify/functions/postiz-api.js
//
// This function proxies all Postiz Public API calls server-side,
// bypassing the CORS restriction that blocks direct browser requests.
//
// Usage from frontend:
//   fetch('/.netlify/functions/postiz-api', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       path: '/public/v1/integrations',
//       method: 'GET',
//       token: accessToken,
//     })
//   })

const POSTIZ_BACKEND_URL = 'https://postiz.infinitewealthsolutionsai.com/api';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let path, method, token, body;
  try {
    const parsed = JSON.parse(event.body || '{}');
    path   = parsed.path;
    method = parsed.method || 'GET';
    token  = parsed.token;
    body   = parsed.body;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  if (!path) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing path' }),
    };
  }

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Missing token' }),
    };
  }

  try {
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${POSTIZ_BACKEND_URL}${path}`, fetchOptions);
    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
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