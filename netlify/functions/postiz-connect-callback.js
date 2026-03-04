// netlify/functions/postiz-connect-callback.js
//
// Step 2 of the "Connect a social channel" flow.
//
// After the user approves on e.g. Instagram, the platform redirects them back
// to your site with ?code=...&state=... in the URL.
//
// The browser extracts those params and POSTs them here:
//   {
//     provider:  "instagram",
//     code:      "the_oauth_code",
//     state:     "the_state_value",
//     token:     "<postiz_access_token>"
//   }
//
// This function calls Postiz's internal connect endpoint which:
//   - Exchanges the code for platform tokens
//   - Creates the integration in your Postiz account
//   - Returns the new integration object
//
// Postiz endpoint used:
//   POST https://api.postiz.com/integrations/social/:provider/connect

const POSTIZ_API = 'https://api.postiz.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let provider, code, state, token;
  try {
    const body = JSON.parse(event.body || '{}');
    provider = body.provider;
    code     = body.code;
    state    = body.state;
    token    = body.token;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!provider || !code || !state || !token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: provider, code, state, token' }),
    };
  }

  try {
    const url = `${POSTIZ_API}/integrations/social/${encodeURIComponent(provider)}/connect`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code, state }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error(`Postiz connect-callback error (${resp.status}):`, data);

      // Postiz returns specific error codes we can surface to the user
      const message =
        data?.message ||
        data?.error ||
        (resp.status === 412
          ? 'This account is already connected to a different Postiz organization.'
          : `Postiz error ${resp.status}`);

      return { statusCode: resp.status, body: JSON.stringify({ error: message }) };
    }

    // data is the newly created Integration object
    // Some platforms (Facebook, LinkedIn Pages) require a second step —
    // Postiz sets inBetweenSteps=true on the integration in that case.
    // For now we return the full integration so the frontend can detect this.
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