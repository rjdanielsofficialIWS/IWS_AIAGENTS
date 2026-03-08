// netlify/functions/ayrshare-channels.js
const AYRSHARE_API = 'https://app.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

exports.handler = async (event) => {
  const apiKey     = process.env.AYRSHARE_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId     = event.queryStringParameters?.userId;

  if (!apiKey || !serviceKey || !userId) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing userId or env vars', channels: [] }) };
  }

  try {
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const profiles = await lookupRes.json();

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: [] }) };
    }

    const profileKey = profiles[0].profile_key;

    const res = await fetch(`${AYRSHARE_API}/user`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Profile-Key': profileKey },
    });

    if (!res.ok) {
      console.error('Ayrshare user fetch error:', await res.text());
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: [] }) };
    }

    const data = await res.json();
    const accounts = data.activeSocialAccounts || [];

    const channels = accounts.map(platform => ({
      id:         platform,
      identifier: platform.toLowerCase(),
      name:       platform.charAt(0).toUpperCase() + platform.slice(1),
      platform:   platform.toLowerCase(),
      picture:    null,
      profile:    null,
    }));

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels, profileKey }) };

  } catch (err) {
    console.error('ayrshare-channels error:', err.message);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, channels: [] }) };
  }
};