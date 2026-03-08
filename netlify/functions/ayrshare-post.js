// netlify/functions/ayrshare-post.js
const AYRSHARE_API = 'https://api.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey     = process.env.AYRSHARE_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !serviceKey) {
    console.error('[ayrshare-post] Missing env vars');
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: 'Server misconfiguration' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { userId, platforms, post, mediaUrls, scheduleDate } = body;

  if (!userId || !platforms?.length || !post) {
    return {
      statusCode: 400, headers: CORS,
      body: JSON.stringify({ error: 'userId, platforms, and post are required' }),
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

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return {
        statusCode: 400, headers: CORS,
        body: JSON.stringify({ error: 'No Ayrshare profile found. Connect your accounts first.' }),
      };
    }

    const profileKey = profiles[0].profile_key;

    // Build the post payload
    const payload = {
      post,
      platforms,
      ...(mediaUrls?.length ? { mediaUrls } : {}),
      ...(scheduleDate ? { scheduleDate: new Date(scheduleDate).toISOString() } : {}),
      shortenLinks: false,
    };

    console.log('[ayrshare-post] Sending to Ayrshare:', JSON.stringify({ ...payload, post: payload.post?.slice(0, 80) }));

    const res = await fetch(`${AYRSHARE_API}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Profile-Key': profileKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[ayrshare-post] Ayrshare error:', JSON.stringify(data));
      return {
        statusCode: 400, headers: CORS,
        body: JSON.stringify({ error: data.message || data.error || 'Failed to post', details: data }),
      };
    }

    // Log post to Supabase (non-fatal if it fails)
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/scheduled_posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          supabase_user_id: userId,
          profile_key:      profileKey,
          ayrshare_post_id: data.id,
          platforms,
          content:          post,
          media_urls:       mediaUrls || [],
          scheduled_at:     scheduleDate ? new Date(scheduleDate).toISOString() : new Date().toISOString(),
          status:           scheduleDate ? 'scheduled' : 'published',
        }),
      });
    } catch (logErr) {
      console.error('[ayrshare-post] Failed to log post to Supabase:', logErr.message);
    }

    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({ success: true, postId: data.id, data }),
    };

  } catch (err) {
    console.error('[ayrshare-post] Error:', err.message);
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};