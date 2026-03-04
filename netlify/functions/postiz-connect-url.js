// netlify/functions/postiz-connect-url.js
//
// Step 1 of the "Connect a social channel" flow.
//
// The browser POSTs:
//   { provider: "instagram", token: "<postiz_access_token>", redirectUrl: "https://yoursite.com/mediamachine" }
//
// This function calls Postiz's internal integration API to generate the OAuth
// authorization URL for that provider, then returns it to the browser.
// The browser then redirects the user to that URL.
//
// Postiz endpoint used:
//   GET https://api.postiz.com/integrations/social/:provider
//   (Note: this is the INTERNAL Postiz API, not the public /public/v1 path)

const POSTIZ_API = 'https://api.postiz.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let provider, token, redirectUrl;
  try {
    const body = JSON.parse(event.body || '{}');
    provider    = body.provider;
    token       = body.token;
    redirectUrl = body.redirectUrl;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!provider || !token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing provider or token' }) };
  }

  try {
    // Build query params – redirectUrl tells Postiz where to send the user after OAuth
    const params = new URLSearchParams();
    if (redirectUrl) params.set('redirectUrl', redirectUrl);

    const url = `${POSTIZ_API}/integrations/social/${encodeURIComponent(provider)}?${params.toString()}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Postiz OAuth tokens are sent as Bearer
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error(`Postiz connect-url error (${resp.status}):`, data);
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: data?.message || data?.error || `Postiz error ${resp.status}` }),
      };
    }

    // Postiz returns { url: "https://..." } — the URL to redirect the user to
    if (!data?.url) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Postiz did not return an authorization URL', raw: data }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: data.url }),
    };
  } catch (err) {
    console.error('postiz-connect-url error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Internal error' }) };
  }
};