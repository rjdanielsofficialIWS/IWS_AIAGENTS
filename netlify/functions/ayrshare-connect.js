const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const AYRSHARE_API = 'https://api.ayrshare.com/api';
const DOMAIN      = 'id-9dQ6e';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { userId, email } = JSON.parse(event.body || '{}');
  if (!userId || !email) return { statusCode: 400, body: JSON.stringify({ error: 'userId and email required' }) };

  const API_KEY     = process.env.AYRSHARE_API_KEY;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const PRIVATE_KEY = process.env.AYRSHARE_PRIVATE_KEY;

  const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  try {
    // 1. Check for existing profile
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${userId}&select=profile_key`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    ).then(r => r.json());

    let profileKey = existing?.[0]?.profile_key;

    // 2. Create profile if none exists
    if (!profileKey) {
      const created = await fetch(`${AYRSHARE_API}/profiles/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({ title: email }),
      }).then(r => r.json());

      profileKey = created.profileKey;
      if (!profileKey) return json(500, { error: 'Failed to create Ayrshare profile' });

      // 3. Save to Supabase
      await fetch(`${SUPABASE_URL}/rest/v1/ayrshare_profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ supabase_user_id: userId, user_email: email, profile_key: profileKey }),
      });
    }

    // 4. Generate JWT → get social connect URL
    const jwtData = await fetch(`${AYRSHARE_API}/profiles/generateJWT`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ domain: DOMAIN, privateKey: PRIVATE_KEY, profileKey }),
    }).then(r => r.json());

    if (!jwtData.url) return json(500, { error: `No URL from Ayrshare: ${JSON.stringify(jwtData)}` });

    return json(200, { connectUrl: jwtData.url, profileKey });

  } catch (err) {
    console.error('ayrshare-connect error:', err.message);
    return json(500, { error: err.message });
  }
};