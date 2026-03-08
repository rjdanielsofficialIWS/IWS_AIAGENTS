// netlify/functions/ayrshare-scheduled.js
// Returns scheduled/published posts for the calendar and composer views
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId     = event.queryStringParameters?.userId;
  const start      = event.queryStringParameters?.start;
  const end        = event.queryStringParameters?.end;

  if (!serviceKey) {
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: 'Server misconfiguration', posts: [] }),
    };
  }

  if (!userId) {
    return {
      statusCode: 400, headers: CORS,
      body: JSON.stringify({ error: 'userId is required', posts: [] }),
    };
  }

  try {
    let url = `${SUPABASE_URL}/rest/v1/scheduled_posts?supabase_user_id=eq.${encodeURIComponent(userId)}&order=scheduled_at.desc&limit=200`;

    if (start) url += `&scheduled_at=gte.${encodeURIComponent(start)}`;
    if (end)   url += `&scheduled_at=lte.${encodeURIComponent(end)}`;

    const res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase fetch failed (${res.status}): ${text}`);
    }

    const posts = await res.json();

    // Normalise to match what the frontend CalendarPanel / ComposerPanel expect
    const normalised = (Array.isArray(posts) ? posts : []).map((p) => ({
      id:          p.id,
      content:     p.content || '',
      platforms:   Array.isArray(p.platforms) ? p.platforms : [],
      scheduledAt: p.scheduled_at,
      status:      p.status || 'scheduled',
      mediaUrls:   Array.isArray(p.media_urls) ? p.media_urls : [],
    }));

    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({ posts: normalised }),
    };

  } catch (err) {
    console.error('[ayrshare-scheduled] Error:', err.message);
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: err.message, posts: [] }),
    };
  }
};