// ayrshare-connect.js
// Supports both GET (query params) and POST (JSON body)
// GET  ?userId=…&email=…  → returns { connectUrl } JSON

const AYRSHARE_API = 'https://api.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const DOMAIN       = 'id-9dQ6e';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  const API_KEY     = process.env.AYRSHARE_API_KEY;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RAW_KEY     = process.env.AYRSHARE_PRIVATE_KEY || '';

  const respond = (code, data) => ({
    statusCode: code,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(data),
  });

  if (!API_KEY)     return respond(500, { error: 'Missing AYRSHARE_API_KEY' });
  if (!SERVICE_KEY) return respond(500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
  if (!RAW_KEY)     return respond(500, { error: 'Missing AYRSHARE_PRIVATE_KEY' });

  const PRIVATE_KEY_B64 = Buffer.from(RAW_KEY.replace(/\\n/g, '\n')).toString('base64');

  // Parse userId and email from either query params (GET) or JSON body (POST)
  let userId, email;
  if (event.httpMethod === 'GET') {
    userId = event.queryStringParameters?.userId;
    email  = event.queryStringParameters?.email;
  } else if (event.httpMethod === 'POST') {
    try { ({ userId, email } = JSON.parse(event.body || '{}')); }
    catch { return respond(400, { error: 'Invalid JSON body' }); }
  } else {
    return respond(405, { error: 'Method Not Allowed' });
  }

  if (!userId || !email) return respond(400, { error: 'userId and email required' });

  const sbHeaders = {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };

  try {
    // 1. Get existing profile key from Supabase
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      { headers: sbHeaders }
    ).then(r => r.json());

    let profileKey = existing?.[0]?.profile_key;

    // 2. No profile? Create one
    if (!profileKey) {
      const created = await fetch(`${AYRSHARE_API}/profiles/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({ title: email }),
      }).then(r => r.json());

      profileKey = created.profileKey;
      if (!profileKey) return respond(500, { error: 'Ayrshare profile creation failed', detail: created });

      await fetch(`${SUPABASE_URL}/rest/v1/ayrshare_profiles`, {
        method: 'POST',
        headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ supabase_user_id: userId, user_email: email, profile_key: profileKey }),
      });
    }

    // 3. Build redirect callback URL
    const origin = event.headers?.origin || '';
    const callbackUrl = origin ? `${origin}/ayrshare-callback` : null;

    // 4. Generate JWT
    const jwtPayload = {
      domain: DOMAIN,
      privateKey: PRIVATE_KEY_B64,
      base64: true,
      profileKey,
    };
    if (callbackUrl) jwtPayload.redirect = callbackUrl;

    const jwt = await fetch(`${AYRSHARE_API}/profiles/generateJWT`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify(jwtPayload),
    }).then(r => r.json());

    if (!jwt.url) {
      console.error('generateJWT error:', JSON.stringify(jwt));
      return respond(500, { error: jwt.message || 'Ayrshare returned no URL', detail: jwt });
    }

    return respond(200, { connectUrl: jwt.url });

  } catch (err) {
    console.error('ayrshare-connect fatal:', err.message);
    return respond(500, { error: err.message });
  }
};