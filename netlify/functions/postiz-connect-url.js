// netlify/functions/postiz-connect-url.js
//
// Builds the correct URL to send the user to Postiz so they can
// connect a specific social platform (Instagram, TikTok, etc.).
//
// Postiz's internal /integrations/social/:provider endpoint requires a
// full Postiz browser session — it cannot be called with an OAuth token.
//
// The correct approach is to redirect the user to Postiz's own integrations
// page with a `redirectUrl` parameter. After they connect the platform,
// Postiz sends them back to your site automatically.
//
// No API call needed — this just constructs the URL server-side.

const POSTIZ_FRONTEND_URL = 'https://www.tiktok.com/v2/auth/authorize/?client_key=sbaw5rklhtaoiu7crd&redirect_uri=https%3A%2F%2Fpostiz.infinitewealthsolutionsai.com%2Fintegrations%2Fsocial%2Ftiktok&state=yj9cjobuys8&response_type=code&scope=video.list%2Cuser.info.basic%2Cvideo.upload%2Cuser.info.profile%2Cuser.info.stats';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let provider, redirectUrl;
  try {
    const body = JSON.parse(event.body || '{}');
    provider    = body.provider;    // e.g. "instagram", "tiktok", "x"
    redirectUrl = body.redirectUrl; // where to send the user after connecting
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!provider) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing provider' }) };
  }

  // Build the Postiz integrations page URL.
  // The `redirectUrl` param tells Postiz where to send the user after they
  // finish connecting the platform. We also pass `provider` so Postiz can
  // pre-select or highlight the correct platform.
  const params = new URLSearchParams();
  if (redirectUrl) params.set('redirectUrl', redirectUrl);
  params.set('provider', provider);

  const url = `${POSTIZ_FRONTEND_URL}/integrations?${params.toString()}`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  };
};