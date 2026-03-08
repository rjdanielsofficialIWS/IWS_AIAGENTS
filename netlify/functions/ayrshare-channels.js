// ayrshare-channels.js
// Serves connected social channels with a 5-minute Supabase cache.
// Pass ?force=true to bypass the cache (e.g. right after a new connection).

const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const AYRSHARE_API = 'https://api.ayrshare.com/api';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

exports.handler = async (event) => {
  const userId      = event.queryStringParameters?.userId;
  const forceRefresh = event.queryStringParameters?.force === 'true';
  const API_KEY     = process.env.AYRSHARE_API_KEY;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const json = (statusCode, body) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  });

  if (!userId) return json(400, { channels: [], error: 'userId required' });

  const sbHeaders = {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };

  try {
    // 1. Fetch profile row (includes cache)
    const profiles = await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}&select=profile_key,cached_channels,channels_cached_at`,
      { headers: sbHeaders }
    ).then(r => r.json());

    const profile    = profiles?.[0];
    const profileKey = profile?.profile_key;
    if (!profileKey) return json(200, { channels: [], cached: false });

    // 2. Check if cache is still fresh
    const cachedAt   = profile?.channels_cached_at ? new Date(profile.channels_cached_at).getTime() : 0;
    const cacheAge   = Date.now() - cachedAt;
    const cacheValid = !forceRefresh && cacheAge < CACHE_TTL_MS && Array.isArray(profile?.cached_channels) && profile.cached_channels.length >= 0;

    if (cacheValid) {
      console.log(`ayrshare-channels: serving cache (age ${Math.round(cacheAge / 1000)}s) for user ${userId}`);
      return json(200, { channels: profile.cached_channels, cached: true });
    }

    // 3. Cache is stale or force-refresh — hit Ayrshare
    console.log(`ayrshare-channels: fetching live from Ayrshare for user ${userId} (force=${forceRefresh})`);
    const data = await fetch(`${AYRSHARE_API}/user`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Profile-Key': profileKey },
    }).then(r => r.json());

    // Handle rate limit from Ayrshare — return cached data if we have it
    if (data.status === 'error' && data.message?.toLowerCase().includes('rate limit')) {
      console.warn('ayrshare-channels: rate limited, returning stale cache');
      return json(200, {
        channels: Array.isArray(profile?.cached_channels) ? profile.cached_channels : [],
        cached: true,
        rateLimited: true,
      });
    }

    const channels = (data.activeSocialAccounts || []).map(p => ({
      id: p,
      identifier: p.toLowerCase(),
      name: p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
    }));

    // 4. Write fresh data back to Supabase cache
    await fetch(
      `${SUPABASE_URL}/rest/v1/ayrshare_profiles?supabase_user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({
          cached_channels: channels,
          channels_cached_at: new Date().toISOString(),
        }),
      }
    );

    return json(200, { channels, cached: false });

  } catch (err) {
    console.error('ayrshare-channels error:', err.message);
    return json(500, { channels: [], error: err.message });
  }
};