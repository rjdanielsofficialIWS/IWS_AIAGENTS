// netlify/functions/ayrshare-connect.js
const AYRSHARE_API = 'https://app.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey     = process.env.AYRSHARE_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) {
    console.error('[ayrshare-connect] AYRSHARE_API_KEY is not set');
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: 'Server misconfiguration: AYRSHARE_API_KEY missing' }),
    };
  }
  if (!serviceKey) {
    console.error('[ayrshare-connect] SUPABASE_SERVICE_ROLE_KEY is not set');
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY missing' }),
    };
  }

  let userId, userEmail;
  try {
    const body = JSON.parse(event.body || '{}');
    userId    = body.userId;
    userEmail = body.email;
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!userId || !userEmail) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'userId and email are required' }) };
  }

  try {
    // ── 1. Check if user already has an Ayrshare profile ──────────────────────
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

    const existing = await lookupRes.json();
    console.log('[ayrshare-connect] Existing profiles:', JSON.stringify(existing));

    let profileKey;

    if (Array.isArray(existing) && existing.length > 0 && existing[0].profile_key) {
      // ── Existing profile: just generate a fresh JWT ────────────────────────
      profileKey = existing[0].profile_key;
      console.log('[ayrshare-connect] Re-using existing profileKey:', profileKey);
    } else {
      // ── 2. Create a brand-new Ayrshare profile ─────────────────────────────
      console.log('[ayrshare-connect] Creating new Ayrshare profile for:', userEmail);

      const createRes = await fetch(`${AYRSHARE_API}/profiles/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ title: userEmail }),
      });

      const createText = await createRes.text();
      console.log('[ayrshare-connect] Create profile response:', createRes.status, createText);

      if (!createRes.ok) {
        throw new Error(`Ayrshare profile creation failed (${createRes.status}): ${createText}`);
      }

      let profile;
      try {
        profile = JSON.parse(createText);
      } catch {
        throw new Error(`Ayrshare returned invalid JSON: ${createText}`);
      }

      profileKey = profile.profileKey || profile.profile_key;
      if (!profileKey) {
        throw new Error(`Ayrshare did not return a profileKey. Response: ${createText}`);
      }

      // ── 3. Upsert into Supabase ────────────────────────────────────────────
      const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/ayrshare_profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=minimal,resolution=merge-duplicates',
        },
        body: JSON.stringify({
          supabase_user_id: userId,
          user_email:       userEmail,
          profile_key:      profileKey,
          updated_at:       new Date().toISOString(),
        }),
      });

      if (!saveRes.ok) {
        const saveText = await saveRes.text();
        // Non-fatal: log but continue — the profile was created in Ayrshare
        console.error('[ayrshare-connect] Supabase save error:', saveRes.status, saveText);
      } else {
        console.log('[ayrshare-connect] Profile saved to Supabase, status:', saveRes.status);
      }
    }

    // ── 4. Generate short-lived JWT for Ayrshare hosted connect UI ────────────
    console.log('[ayrshare-connect] Generating JWT for profileKey:', profileKey);

    const jwtRes = await fetch(`${AYRSHARE_API}/profiles/generateJWT`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ profileKey }),
    });

    const jwtText = await jwtRes.text();
    console.log('[ayrshare-connect] JWT response:', jwtRes.status, jwtText);

    if (!jwtRes.ok) {
      throw new Error(`Ayrshare JWT generation failed (${jwtRes.status}): ${jwtText}`);
    }

    let jwtData;
    try {
      jwtData = JSON.parse(jwtText);
    } catch {
      throw new Error(`Ayrshare JWT returned invalid JSON: ${jwtText}`);
    }

    const token = jwtData.token || jwtData.jwt;
    if (!token) {
      throw new Error(`No JWT token in Ayrshare response: ${jwtText}`);
    }

    // Ayrshare Social Media Manager connect URL
    const connectUrl = `https://app.ayrshare.com/connect?token=${token}`;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ connectUrl, profileKey }),
    };

  } catch (err) {
    console.error('[ayrshare-connect] Error:', err.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};