// netlify/functions/ayrshare-channels.js
const AYRSHARE_API = 'https://app.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const apiKey     = process.env.AYRSHARE_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId     = event.queryStringParameters?.userId;

  if (!apiKey || !serviceKey) {
    console.error('[ayrshare-channels] Missing env vars');
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: 'Server misconfiguration', channels: [] }),
    };
  }

  if (!userId) {
    return {
      statusCode: 400, headers: CORS,
      body: JSON.stringify({ error: 'userId is required', channels: [] }),
    };
  }

  try {
    // Look up the user's Ayrshare profile key
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!lookupRes.ok) {
      const text = await lookupRes.text();
      throw new Error(`Supabase lookup failed (${lookupRes.status}): ${text}`);
    }

    const profiles = await lookupRes.json();

    if (!Array.isArray(profiles) || profiles.length === 0 || !profiles[0].profile_key) {
      return {
        statusCode: 200, headers: CORS,
        body: JSON.stringify({ channels: [] }),
      };
    }

    const profileKey = profiles[0].profile_key;

    // Fetch connected social accounts from Ayrshare
    const res = await fetch(`${AYRSHARE_API}/user`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Profile-Key': profileKey,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[ayrshare-channels] Ayrshare user fetch error:', res.status, text);
      return {
        statusCode: 200, headers: CORS,
        body: JSON.stringify({ channels: [] }),
      };
    }

    const data = await res.json();
    const accounts = data.activeSocialAccounts || [];

    // Normalise to a consistent shape the frontend expects
    const channels = accounts.map((platform) => ({
      id:         platform,
      identifier: platform.toLowerCase(),
      name:       platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase(),
      platform:   platform.toLowerCase(),
      picture:    null,
      profile:    null,
    }));

    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({ channels, profileKey }),
    };

  } catch (err) {
    console.error('[ayrshare-channels] Error:', err.message);
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: err.message, channels: [] }),
    };
  }
};