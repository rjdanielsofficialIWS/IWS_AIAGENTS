// netlify/functions/ayrshare-post.js
const AYRSHARE_API = 'https://app.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

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
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) }; }

  const { userId, platforms, post, mediaUrls, scheduleDate } = body;

  if (!userId || !platforms?.length || !post) {
    return { statusCode: 400, body: JSON.stringify({ error: 'userId, platforms, and post are required' }) };
  }

  try {
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const profiles = await lookupRes.json();

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No Ayrshare profile found. Connect your accounts first.' }) };
    }

    const profileKey = profiles[0].profile_key;

    const payload = {
      post,
      platforms,
      ...(mediaUrls?.length ? { mediaUrls } : {}),
      ...(scheduleDate ? { scheduleDate: new Date(scheduleDate).toISOString() } : {}),
      shortenLinks: false,
    };

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
      console.error('Ayrshare post error:', data);
      return { statusCode: 400, body: JSON.stringify({ error: data.message || 'Failed to post', details: data }) };
    }

    // Log to Supabase
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

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, postId: data.id, data }) };

  } catch (err) {
    console.error('ayrshare-post error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};