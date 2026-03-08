// ayrshare-connect.js
// Required env vars: AYRSHARE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, AYRSHARE_PRIVATE_KEY

const AYRSHARE_API = 'https://api.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const DOMAIN       = 'id-9dQ6e';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const API_KEY     = process.env.AYRSHARE_API_KEY;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RAW_KEY     = process.env.AYRSHARE_PRIVATE_KEY || '';

  const respond = (code, data) => ({
    statusCode: code,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!API_KEY)     return respond(500, { error: 'Missing AYRSHARE_API_KEY' });
  if (!SERVICE_KEY) return respond(500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
  if (!RAW_KEY)     return respond(500, { error: 'Missing AYRSHARE_PRIVATE_KEY' });

  // Base64-encode the key here in the function — avoids ALL newline/paste issues
  const PRIVATE_KEY_B64 = Buffer.from(RAW_KEY.replace(/\\n/g, '\n')).toString('base64');

  let userId, email;
  try { ({ userId, email } = JSON.parse(event.body || '{}')); }
  catch { return respond(400, { error: 'Invalid JSON body' }); }
  if (!userId || !email) return respond(400, { error: 'userId and email required' });

  const sbHeaders = {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };

  try {
    // 1. Get existing profile key from Supabase
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${userId}&select=profile_key`,
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

    // 3. Generate JWT — use base64:true so key format is guaranteed correct
    const jwt = await fetch(`${AYRSHARE_API}/profiles/generateJWT`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ domain: DOMAIN, privateKey: PRIVATE_KEY_B64, base64: true, profileKey }),
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