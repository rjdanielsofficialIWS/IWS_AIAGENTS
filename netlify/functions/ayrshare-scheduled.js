// netlify/functions/ayrshare-scheduled.js
const AYRSHARE_API = 'https://app.ayrshare.com/api';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

exports.handler = async (event) => {
  const apiKey     = process.env.AYRSHARE_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId     = event.queryStringParameters?.userId;

  if (!apiKey || !serviceKey || !userId) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing userId or env vars', posts: [] }) };
  }

  try {
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const profiles = await lookupRes.json();

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: [] }) };
    }

    const profileKey = profiles[0].profile_key;

    const res = await fetch(`${AYRSHARE_API}/post?status=scheduled`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Profile-Key': profileKey },
    });

    let posts = [];
    if (res.ok) {
      const data = await res.json();
      const raw = Array.isArray(data) ? data : (data.posts || []);
      posts = raw.map(p => ({
        id:          p.id,
        content:     p.post,
        platforms:   p.platforms || [],
        scheduledAt: p.scheduleDate || p.created,
        status:      p.status === 'scheduled' ? 'scheduled' : p.status === 'success' ? 'published' : 'failed',
      }));
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts }) };

  } catch (err) {
    console.error('ayrshare-scheduled error:', err.message);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, posts: [] }) };
  }
};