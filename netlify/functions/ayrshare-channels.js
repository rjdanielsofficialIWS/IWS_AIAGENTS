const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const AYRSHARE_API = 'https://api.ayrshare.com/api';

exports.handler = async (event) => {
  const userId     = event.queryStringParameters?.userId;
  const API_KEY    = process.env.AYRSHARE_API_KEY;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!userId) return json(400, { channels: [], error: 'userId required' });

  try {
    // Get profile key from Supabase
    const profiles = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${userId}&select=profile_key`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    ).then(r => r.json());

    const profileKey = profiles?.[0]?.profile_key;
    if (!profileKey) return json(200, { channels: [] });

    // Get connected social accounts from Ayrshare
    const data = await fetch(`${AYRSHARE_API}/user`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Profile-Key': profileKey },
    }).then(r => r.json());

    const channels = (data.activeSocialAccounts || []).map(p => ({
      id: p, identifier: p.toLowerCase(),
      name: p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
    }));

    return json(200, { channels });

  } catch (err) {
    console.error('ayrshare-channels error:', err.message);
    return json(500, { channels: [], error: err.message });
  }
};