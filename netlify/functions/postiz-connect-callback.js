// netlify/functions/postiz-connect-callback.js
//
// Called after a user returns from Postiz having connected a social platform.
//
// Because Postiz handles the entire OAuth flow internally (we just redirected
// the user to their integrations page), there is no code/state to exchange.
// The channel is already registered in Postiz by the time the user lands back
// on your site.
//
// This function simply fetches the updated integrations list so the frontend
// can show the newly connected channel immediately.

const POSTIZ_API = 'https://api.postiz.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let token;
  try {
    const body = JSON.parse(event.body || '{}');
    token = body.token;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing token' }) };
  }

  try {
    // Fetch the latest integrations list — the new channel will be in here
    const resp = await fetch(`${POSTIZ_API}/public/v1/integrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: data?.message || `Postiz error ${resp.status}` }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('postiz-connect-callback error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Internal error' }) };
  }
};