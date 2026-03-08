// netlify/functions/ayrshare-post.js
//
// Publishes or schedules a post via Ayrshare on behalf of a user.
// Handles text, images, and video. Supports post now or scheduled.

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

async function supabaseInsert(path, body, serviceKey) {
  await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });
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

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) };
  }

  const { userId, platforms, post, mediaUrls, scheduleDate } = body;

  if (!userId || !platforms?.length || !post) {
    return { statusCode: 400, body: JSON.stringify({ error: 'userId, platforms, and post are required' }) };
  }

  try {
    // 1. Look up user's Ayrshare profileKey
    const profiles = await supabaseGet(
      `/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      serviceKey
    );

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No Ayrshare profile found. Connect your social accounts first.' }),
      };
    }

    const profileKey = profiles[0].profile_key;

    // 2. Build Ayrshare post payload
    const payload = {
      post,
      platforms,
      ...(mediaUrls?.length ? { mediaUrls } : {}),
      ...(scheduleDate ? { scheduleDate: new Date(scheduleDate).toISOString() } : {}),
      shortenLinks: false,
    };

    // 3. Send to Ayrshare
    const res = await fetch(`${AYRSHARE_API}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Profile-Key': profileKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Ayrshare post error:', data);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.message || 'Failed to post', details: data }),
      };
    }

    // 4. Log post to Supabase
    await supabaseInsert('/scheduled_posts', {
      supabase_user_id: userId,
      profile_key:      profileKey,
      ayrshare_post_id: data.id,
      platforms,
      content:          post,
      media_urls:       mediaUrls || [],
      scheduled_at:     scheduleDate ? new Date(scheduleDate).toISOString() : new Date().toISOString(),
      status:           scheduleDate ? 'scheduled' : 'published',
    }, serviceKey);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, postId: data.id, data }),
    };

  } catch (err) {
    console.error('ayrshare-post error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};