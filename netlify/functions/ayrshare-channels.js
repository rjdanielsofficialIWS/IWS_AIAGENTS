// netlify/functions/ayrshare-channels.js
//
// Returns the connected social accounts for the current user
// by fetching from Ayrshare using their profile key.

const AYRSHARE_API = 'https://app.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

async function supabaseGet(path, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return []; }
}

exports.handler = async (event) => {
  const apiKey     = process.env.AYRSHARE_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const userId = event.queryStringParameters?.userId;

  if (!apiKey || !serviceKey || !userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing userId or env vars', channels: [] }),
    };
  }

  try {
    // 1. Look up user's Ayrshare profileKey
    const profiles = await supabaseGet(
      `/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      serviceKey
    );

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: [] }),
      };
    }

    const profileKey = profiles[0].profile_key;

    // 2. Fetch connected social accounts from Ayrshare
    const res = await fetch(`${AYRSHARE_API}/user`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Profile-Key': profileKey,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Ayrshare user fetch error:', err);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: [] }),
      };
    }

    const data = await res.json();

    // Ayrshare returns activeSocialAccounts array
    const accounts = data.activeSocialAccounts || [];

    // Normalize to our format
    const channels = accounts.map(platform => ({
      id:         platform,
      identifier: platform.toLowerCase(),
      name:       platform.charAt(0).toUpperCase() + platform.slice(1),
      platform:   platform.toLowerCase(),
      picture:    null,
      profile:    null,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels, profileKey }),
    };

  } catch (err) {
    console.error('ayrshare-channels error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, channels: [] }),
    };
  }
};