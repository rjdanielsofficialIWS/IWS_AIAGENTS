// netlify/functions/postiz-disconnect.js
// Soft-deletes a Postiz integration by setting deletedAt

const { Client } = require('pg');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let integrationId;
  try {
    const body = JSON.parse(event.body || '{}');
    integrationId = body.integrationId;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!integrationId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing integrationId' }) };
  }

  const dbUrl = process.env.POSTIZ_DB_URL;
  if (!dbUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: 'POSTIZ_DB_URL not configured' }) };
  }

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
};