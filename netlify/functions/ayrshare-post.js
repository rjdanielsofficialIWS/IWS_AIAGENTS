const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const AYRSHARE_API = 'https://api.ayrshare.com/api';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { userId, platforms, post, mediaUrls, scheduleDate } = JSON.parse(event.body || '{}');
  const API_KEY     = process.env.AYRSHARE_API_KEY;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!userId || !platforms?.length || !post) return json(400, { error: 'userId, platforms, and post required' });

  try {
    // Get profile key
    const profiles = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${userId}&select=profile_key`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    ).then(r => r.json());

    const profileKey = profiles?.[0]?.profile_key;
    if (!profileKey) return json(400, { error: 'No profile found. Connect your accounts first.' });

    // Send post to Ayrshare
    const result = await fetch(`${AYRSHARE_API}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'Profile-Key': profileKey,
      },
      body: JSON.stringify({
        post, platforms,
        ...(mediaUrls?.length && { mediaUrls }),
        ...(scheduleDate && { scheduleDate: new Date(scheduleDate).toISOString() }),
      }),
    }).then(r => r.json());

    // Log to Supabase (non-fatal)
    fetch(`${SUPABASE_URL}/rest/v1/scheduled_posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        supabase_user_id: userId, profile_key: profileKey,
        ayrshare_post_id: result.id, platforms, content: post,
        media_urls: mediaUrls || [],
        scheduled_at: scheduleDate ? new Date(scheduleDate).toISOString() : new Date().toISOString(),
        status: scheduleDate ? 'scheduled' : 'published',
      }),
    }).catch(() => {});

    return json(200, { success: true, postId: result.id });

  } catch (err) {
    console.error('ayrshare-post error:', err.message);
    return json(500, { error: err.message });
  }
};