// netlify/functions/ayrshare-connect.js
//
// ADD THIS ONE ENV VAR in Netlify → Site configuration → Environment variables:
//   AYRSHARE_PRIVATE_KEY  →  paste the entire contents of your private.key file
//                            (including -----BEGIN PRIVATE KEY----- lines)
//
// AYRSHARE_API_KEY and SUPABASE_SERVICE_ROLE_KEY are already set ✓

const AYRSHARE_API = 'https://api.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const AYRSHARE_DOMAIN = 'id-9dQ6e'; // From your Integration Package

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey     = process.env.AYRSHARE_API_KEY;
  const privateKey = process.env.AYRSHARE_PRIVATE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const missing = [];
  if (!apiKey)     missing.push('AYRSHARE_API_KEY');
  if (!privateKey) missing.push('AYRSHARE_PRIVATE_KEY');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    console.error('[ayrshare-connect] Missing env vars:', missing.join(', '));
    return {
      statusCode: 500, headers: HEADERS,
      body: JSON.stringify({ error: `Missing env vars: ${missing.join(', ')}` }),
    };
  }

  let userId, userEmail;
  try {
    const body = JSON.parse(event.body || '{}');
    userId    = body.userId;
    userEmail = body.email;
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!userId || !userEmail) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'userId and email are required' }) };
  }

  try {
    // ── 1. Look up existing Ayrshare profile key ───────────────────────────────
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
      throw new Error(`Supabase lookup failed (${lookupRes.status}): ${await lookupRes.text()}`);
    }

    const existing = await lookupRes.json();
    console.log('[ayrshare-connect] Existing profiles found:', existing.length);

    let profileKey;

    if (Array.isArray(existing) && existing.length > 0 && existing[0].profile_key) {
      // Re-use existing profile, just get a fresh JWT
      profileKey = existing[0].profile_key;
      console.log('[ayrshare-connect] Using existing profileKey:', profileKey);
    } else {
      // ── 2. Create a new Ayrshare profile ──────────────────────────────────────
      console.log('[ayrshare-connect] Creating new profile for:', userEmail);

      const createRes = await fetch(`${AYRSHARE_API}/profiles/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ title: userEmail }),
      });

      const createText = await createRes.text();
      console.log('[ayrshare-connect] Create profile:', createRes.status, createText);

      if (!createRes.ok) {
        throw new Error(`Profile creation failed (${createRes.status}): ${createText}`);
      }

      const profile = JSON.parse(createText);
      profileKey = profile.profileKey || profile.profile_key;

      if (!profileKey) {
        throw new Error(`No profileKey in response: ${createText}`);
      }

      // ── 3. Save to Supabase ────────────────────────────────────────────────────
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
        console.error('[ayrshare-connect] Supabase save error (non-fatal):', saveRes.status, await saveRes.text());
      }
    }

    // ── 4. Generate JWT → returns full social linking URL ──────────────────────
    // Requires: domain (from Integration Package), privateKey (RSA key), profileKey
    console.log('[ayrshare-connect] Generating JWT for profileKey:', profileKey);

    const jwtRes = await fetch(`${AYRSHARE_API}/profiles/generateJWT`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        domain:     AYRSHARE_DOMAIN,
        privateKey: privateKey,
        profileKey: profileKey,
      }),
    });

    const jwtText = await jwtRes.text();
    console.log('[ayrshare-connect] JWT status:', jwtRes.status);

    if (!jwtRes.ok) {
      console.error('[ayrshare-connect] JWT error:', jwtText);
      throw new Error(`JWT generation failed (${jwtRes.status}): ${jwtText}`);
    }

    const jwtData = JSON.parse(jwtText);

    // Ayrshare returns { status, title, token, url }
    // The `url` field is the full social linking page URL — open this in a new tab
    const connectUrl = jwtData.url;

    if (!connectUrl) {
      throw new Error(`No url in JWT response. Got keys: ${Object.keys(jwtData).join(', ')}`);
    }

    console.log('[ayrshare-connect] Success, returning connectUrl');

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ connectUrl, profileKey }),
    };

  } catch (err) {
    console.error('[ayrshare-connect] Fatal error:', err.message);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};