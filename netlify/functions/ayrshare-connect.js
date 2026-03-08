// netlify/functions/ayrshare-connect.js
//
// Gets or creates an Ayrshare profile for the current user,
// then returns a hosted OAuth URL for connecting social accounts.

const AYRSHARE_API = 'https://app.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey     = Netlify.env.get('AYRSHARE_API_KEY');
  const serviceKey = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Detailed env check — tells you exactly which var is missing
  if (!apiKey) {
    console.error('ayrshare-connect: AYRSHARE_API_KEY is not set');
    return new Response(JSON.stringify({ error: 'AYRSHARE_API_KEY env var is missing' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!serviceKey) {
    console.error('ayrshare-connect: SUPABASE_SERVICE_ROLE_KEY is not set');
    return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY env var is missing' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  let userId, userEmail;
  try {
    const body = await req.json();
    userId    = body.userId;
    userEmail = body.email;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!userId || !userEmail) {
    return new Response(JSON.stringify({ error: 'userId and email are required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Check if user already has an Ayrshare profile in Supabase
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const existing = await lookupRes.json();
    console.log('Existing profile lookup:', JSON.stringify(existing));

    let profileKey;

    if (Array.isArray(existing) && existing.length > 0) {
      profileKey = existing[0].profile_key;
      console.log('Using existing Ayrshare profileKey:', profileKey);
    } else {
      // 2. Create a new Ayrshare profile for this user
      console.log('Creating new Ayrshare profile for:', userEmail);
      const createRes = await fetch(`${AYRSHARE_API}/profiles/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ title: userEmail, email: userEmail }),
      });

      const createText = await createRes.text();
      console.log('Ayrshare create profile response:', createRes.status, createText);

      if (!createRes.ok) {
        throw new Error(`Ayrshare profile creation failed (${createRes.status}): ${createText}`);
      }

      const profile = JSON.parse(createText);
      profileKey = profile.profileKey;

      // 3. Save profileKey to Supabase
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

    // 4. Generate a short-lived JWT for Ayrshare's hosted connect UI
    console.log('Generating JWT for profileKey:', profileKey);
    const jwtRes = await fetch(`${AYRSHARE_API}/profiles/generateJWT`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ profileKey }),
    });

    const jwtText = await jwtRes.text();
    console.log('Ayrshare JWT response:', jwtRes.status, jwtText);

    if (!jwtRes.ok) {
      throw new Error(`Ayrshare JWT generation failed (${jwtRes.status}): ${jwtText}`);
    }

    const { jwt } = JSON.parse(jwtText);
    const connectUrl = `https://app.ayrshare.com/connect?jwt=${jwt}`;

    return new Response(JSON.stringify({ connectUrl, profileKey }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('ayrshare-connect caught error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};