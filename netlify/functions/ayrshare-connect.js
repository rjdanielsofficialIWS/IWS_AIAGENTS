// netlify/functions/ayrshare-connect.js
//
// Gets or creates an Ayrshare profile for the current user,
// then returns a hosted OAuth URL for connecting social accounts.
// Ayrshare handles all OAuth — no developer apps needed.

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

async function supabaseUpsert(path, body, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function createAyrshareProfile(email, title, apiKey) {
  const res = await fetch(`${AYRSHARE_API}/profiles/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      title: title || email,   // Display name in Ayrshare dashboard
      email,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ayrshare create profile failed: ${err}`);
  }
  return res.json(); // { profileKey, title, ... }
}

async function getJWTforProfile(profileKey, apiKey) {
  const res = await fetch(`${AYRSHARE_API}/profiles/generateJWT`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ profileKey }),
  });
  if (!res.ok) throw new Error('Failed to generate Ayrshare JWT');
  return res.json(); // { jwt }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey     = process.env.AYRSHARE_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars' }) };
  }

  let userId, userEmail;
  try {
    const body = JSON.parse(event.body || '{}');
    userId    = body.userId;
    userEmail = body.email;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) };
  }

  if (!userId || !userEmail) {
    return { statusCode: 400, body: JSON.stringify({ error: 'userId and email required' }) };
  }

  try {
    // 1. Check if user already has an Ayrshare profile
    const existing = await supabaseGet(
      `/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      serviceKey
    );

    let profileKey;

    if (Array.isArray(existing) && existing.length > 0) {
      profileKey = existing[0].profile_key;
    } else {
      // 2. Create a new Ayrshare profile for this user
      const profile = await createAyrshareProfile(userEmail, userEmail, apiKey);
      profileKey = profile.profileKey;

      // 3. Save to Supabase
      await supabaseUpsert('/ayrshare_profiles', {
        supabase_user_id: userId,
        user_email:       userEmail,
        profile_key:      profileKey,
        updated_at:       new Date().toISOString(),
      }, serviceKey);
    }

    // 4. Generate a short-lived JWT for the hosted social account connection UI
    const { jwt } = await getJWTforProfile(profileKey, apiKey);

    // 5. Return the Ayrshare hosted connection URL + JWT
    // Users visit this URL to connect their social accounts via Ayrshare's UI
    const connectUrl = `https://app.ayrshare.com/connect?jwt=${jwt}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectUrl, profileKey }),
    };

  } catch (err) {
    console.error('ayrshare-connect error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};