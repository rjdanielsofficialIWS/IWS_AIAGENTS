const POSTIZ_API_URL = 'https://postiz.infinitewealthsolutionsai.com/api';
const POSTIZ_API_KEY = '55d30501b8cd0af1946a2f1f335205afd5a499a3cc60047f102044b67cb6d9ff';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let integrationId;
  try {
    const body    = JSON.parse(event.body || '{}');
    integrationId = body.integrationId;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!integrationId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing integrationId' }) };
  }

  try {
    const res = await fetch(`${POSTIZ_API_URL}/public/v1/integrations/${integrationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': POSTIZ_API_KEY,
      },
    });

    if (res.ok || res.status === 404) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    throw new Error(`API delete failed: ${res.status}`);
  } catch (apiErr) {
    console.warn('API disconnect failed, trying DB:', apiErr.message);

    const dbUrl = process.env.POSTIZ_DB_URL;
    if (!dbUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not disconnect integration' }) };
    }

    const { Client } = require('pg');
    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();
      const result = await client.query(
        `UPDATE "Integration" SET "deletedAt" = NOW() WHERE id = $1 AND "deletedAt" IS NULL`,
        [integrationId]
      );
      if (result.rowCount === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Integration not found' }) };
      }
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    } finally {
      await client.end().catch(() => {});
    }
  }
};