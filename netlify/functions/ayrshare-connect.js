// netlify/functions/ayrshare-connect.js
const AYRSHARE_API = 'https://app.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey     = process.env.AYRSHARE_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) {
    console.error('ayrshare-connect: AYRSHARE_API_KEY is not set');
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'AYRSHARE_API_KEY env var is missing' }) };
  }
  if (!serviceKey) {
    console.error('ayrshare-connect: SUPABASE_SERVICE_ROLE_KEY is not set');
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY env var is missing' }) };
  }

  let userId, userEmail;
  try {
    const body = JSON.parse(event.body || '{}');
    userId    = body.userId;
    userEmail = body.email;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!userId || !userEmail) {
    return { statusCode: 400, body: JSON.stringify({ error: 'userId and email are required' }) };
  }

  try {
    // 1. Check if user already has an Ayrshare profile
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const existing = await lookupRes.json();
    console.log('Existing profile lookup:', JSON.stringify(existing));

    let profileKey;

    if (Array.isArray(existing) && existing.length > 0) {
      profileKey = existing[0].profile_key;
      console.log('Using existing profileKey:', profileKey);
    } else {
      // 2. Create a new Ayrshare profile
      console.log('Creating new Ayrshare profile for:', userEmail);
      const createRes = await fetch(`${AYRSHARE_API}/profiles/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ title: userEmail, email: userEmail }),
      });
      const createText = await createRes.text();
      console.log('Ayrshare create profile:', createRes.status, createText);

      if (!createRes.ok) {
        throw new Error(`Ayrshare profile creation failed (${createRes.status}): ${createText}`);
      }

      const profile = JSON.parse(createText);
      profileKey = profile.profileKey;

      // 3. Save to Supabase
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
      console.log('Supabase save status:', saveRes.status);
    }

    // 4. Generate short-lived JWT for Ayrshare hosted connect UI
    console.log('Generating JWT for profileKey:', profileKey);
    const jwtRes = await fetch(`${AYRSHARE_API}/profiles/generateJWT`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ profileKey }),
    });
    const jwtText = await jwtRes.text();
    console.log('Ayrshare JWT response:', jwtRes.status, jwtText);

    if (!jwtRes.ok) {
      throw new Error(`Ayrshare JWT generation failed (${jwtRes.status}): ${jwtText}`);
    }

    const { jwt } = JSON.parse(jwtText);
    const connectUrl = `https://app.ayrshare.com/connect?jwt=${jwt}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectUrl, profileKey }),
    };

  } catch (err) {
    console.error('ayrshare-connect error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};