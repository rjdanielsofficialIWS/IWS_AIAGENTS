// Generates a Nango session token for the frontend SDK.
// Called before opening the Nango Connect UI so users can
// authorize social accounts using Nango's pre-approved OAuth apps.
// No developer accounts needed — Nango handles all OAuth credentials.

const NANGO_API_URL  = 'https://api.nango.dev';
const SUPABASE_URL   = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

exports.handler = async (event) => {
  const nangoSecretKey  = process.env.NANGO_SECRET_KEY;
  const serviceKey      = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let userId, userEmail;
  try {
    const body = JSON.parse(event.body || '{}');
    userId    = body.userId;
    userEmail = body.email;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) };
  }

  if (!nangoSecretKey || !userId || !userEmail) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  try {
    // Create a Nango session token scoped to this user
    // end_user_id ties all their connections together in Nango
    const res = await fetch(`${NANGO_API_URL}/connect/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nangoSecretKey}`,
      },
      body: JSON.stringify({
        end_user: {
          id:    userId,
          email: userEmail,
        },
        // Optional: restrict which integrations this session can access
        // allowed_integrations: ['instagram', 'tiktok', 'linkedin', 'youtube', 'facebook', 'twitter'],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Nango session token error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create session token' }) };
    }

    const data = await res.json();
    // data.token is the session token for the frontend SDK
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: data.token }),
    };

  } catch (err) {
    console.error('nango-session-token error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};