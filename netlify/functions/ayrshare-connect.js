// ayrshare-connect.js
// Netlify env vars required:
//   AYRSHARE_API_KEY         — primary API key from Ayrshare dashboard
//   SUPABASE_SERVICE_ROLE_KEY
//   AYRSHARE_PRIVATE_KEY_B64 — private.key file base64 encoded (single line)
//                              Generate with: cat private.key | base64 -w 0

const AYRSHARE_API = 'https://api.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const DOMAIN       = 'id-9dQ6e';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY         = process.env.AYRSHARE_API_KEY;
  const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const PRIVATE_KEY_B64 = process.env.AYRSHARE_PRIVATE_KEY_B64;

  const respond = (code, data) => ({
    statusCode: code,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!API_KEY)         return respond(500, { error: 'Missing env var: AYRSHARE_API_KEY' });
  if (!SERVICE_KEY)     return respond(500, { error: 'Missing env var: SUPABASE_SERVICE_ROLE_KEY' });
  if (!PRIVATE_KEY_B64) return respond(500, { error: 'Missing env var: AYRSHARE_PRIVATE_KEY_B64' });

  let userId, email;
  try {
    ({ userId, email } = JSON.parse(event.body || '{}'));
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }
  if (!userId || !email) return respond(400, { error: 'userId and email are required' });

  const supabaseHeaders = {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };

  try {
    // 1. Look up existing Ayrshare profile
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${userId}&select=profile_key`,
      { headers: supabaseHeaders }
    ).then(r => r.json());

    let profileKey = existing?.[0]?.profile_key;

    // 2. Create profile if none exists
    if (!profileKey) {
      const created = await fetch(`${AYRSHARE_API}/profiles/profile`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body:    JSON.stringify({ title: email }),
      }).then(r => r.json());

      profileKey = created.profileKey;
      if (!profileKey) {
        console.error('Create profile failed:', JSON.stringify(created));
        return respond(500, { error: 'Ayrshare failed to create profile', detail: created });
      }

      await fetch(`${SUPABASE_URL}/rest/v1/ayrshare_profiles`, {
        method:  'POST',
        headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
        body:    JSON.stringify({ supabase_user_id: userId, user_email: email, profile_key: profileKey }),
      });
    }

    // 3. Generate JWT using base64 key — no newline corruption possible
    const jwtData = await fetch(`${AYRSHARE_API}/profiles/generateJWT`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body:    JSON.stringify({
        domain:     DOMAIN,
        privateKey: PRIVATE_KEY_B64,
        base64:     true,
        profileKey,
      }),
    }).then(r => r.json());

    if (!jwtData.url) {
      console.error('generateJWT failed:', JSON.stringify(jwtData));
      return respond(500, { error: jwtData.message || 'No URL from Ayrshare', detail: jwtData });
    }

    return respond(200, { connectUrl: jwtData.url });

  } catch (err) {
    console.error('ayrshare-connect error:', err.message);
    return respond(500, { error: err.message });
  }
};