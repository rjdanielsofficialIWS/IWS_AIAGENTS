const POSTIZ_API_URL = 'https://postiz.infinitewealthsolutionsai.com/api';
const POSTIZ_API_KEY = '55d30501b8cd0af1946a2f1f335205afd5a499a3cc60047f102044b67cb6d9ff';
const ORG_ID         = '56bd14a6-07ab-4c57-bbfd-28d6d7d9eaa6';

function normalizeIdentifier(raw) {
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  if (lower.includes('instagram')) return 'instagram';
  if (lower.includes('tiktok'))    return 'tiktok';
  if (lower.includes('youtube'))   return 'youtube';
  if (lower.includes('linkedin'))  return 'linkedin';
  if (lower.includes('facebook'))  return 'facebook';
  if (lower.includes('twitter') || lower === 'x') return 'x';
  if (lower.includes('threads'))   return 'threads';
  if (lower.includes('bluesky'))   return 'bluesky';
  return lower;
}

async function fetchViaAPI() {
  const res = await fetch(`${POSTIZ_API_URL}/public/v1/integrations`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': POSTIZ_API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Postiz API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.integrations || data.channels || []);

  return list
    .filter(i => !i.disabled && !i.deletedAt)
    .map(i => ({
      id:         i.id,
      name:       i.name || i.providerIdentifier || i.identifier,
      identifier: normalizeIdentifier(i.providerIdentifier || i.identifier || i.type),
      picture:    i.picture || i.avatar || null,
      profile:    i.profile || i.username || null,
      disabled:   false,
    }));
}

async function fetchViaDB() {
  const { Client } = require('pg');
  const dbUrl = process.env.POSTIZ_DB_URL;
  if (!dbUrl) throw new Error('POSTIZ_DB_URL not set');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT id, name, "providerIdentifier" AS identifier, picture, profile, disabled
       FROM "Integration"
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND disabled = false
       ORDER BY "createdAt" ASC`,
      [ORG_ID]
    );
    return result.rows.map(r => ({ ...r, identifier: normalizeIdentifier(r.identifier) }));
  } finally {
    await client.end().catch(() => {});
  }
}

exports.handler = async () => {
  try {
    let integrations;
    try {
      integrations = await fetchViaAPI();
    } catch (apiErr) {
      console.warn('Postiz API failed, trying DB:', apiErr.message);
      integrations = await fetchViaDB();
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ integrations }),
    };
  } catch (err) {
    console.error('get-postiz-integrations error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, integrations: [] }),
    };
  }
};