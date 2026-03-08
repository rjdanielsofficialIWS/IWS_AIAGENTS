// netlify/functions/ayrshare-scheduled.js
//
// Returns scheduled and recent posts for the current user via Ayrshare.

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

exports.handler = async (event) => {
  const apiKey     = process.env.AYRSHARE_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId     = event.queryStringParameters?.userId;

  if (!apiKey || !serviceKey || !userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing userId or env vars', posts: [] }),
    };
  }

  try {
    // 1. Look up user's profileKey
    const profiles = await supabaseGet(
      `/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key`,
      serviceKey
    );

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: [] }),
      };
    }

    const profileKey = profiles[0].profile_key;

    // 2. Fetch scheduled posts from Ayrshare
    const res = await fetch(`${AYRSHARE_API}/post?status=scheduled`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Profile-Key': profileKey,
      },
    });

    let scheduledPosts = [];
    if (res.ok) {
      const data = await res.json();
      scheduledPosts = Array.isArray(data) ? data : (data.posts || []);
    }

    // 3. Also fetch from our Supabase log for history
    const dbPosts = await supabaseGet(
      `/scheduled_posts?supabase_user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=50`,
      serviceKey
    );

    // Normalize Ayrshare posts
    const normalized = scheduledPosts.map(p => ({
      id:          p.id,
      content:     p.post,
      platforms:   p.platforms || [],
      scheduledAt: p.scheduleDate || p.created,
      status:      p.status === 'scheduled' ? 'scheduled' : p.status === 'success' ? 'published' : 'failed',
      source:      'ayrshare',
    }));

    // Merge with DB log (deduplicate by ayrshare_post_id)
    const ayrshareIds = new Set(normalized.map(p => p.id));
    const dbNormalized = Array.isArray(dbPosts)
      ? dbPosts
          .filter(p => !ayrshareIds.has(p.ayrshare_post_id))
          .map(p => ({
            id:          p.ayrshare_post_id || p.id,
            content:     p.content,
            platforms:   p.platforms || [],
            scheduledAt: p.scheduled_at,
            status:      p.status,
            source:      'db',
          }))
      : [];

    const posts = [...normalized, ...dbNormalized]
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts }),
    };

  } catch (err) {
    console.error('ayrshare-scheduled error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, posts: [] }),
    };
  }
};