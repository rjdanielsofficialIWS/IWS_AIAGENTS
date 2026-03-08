const { Client } = require('pg');

const ORG_ID = '56bd14a6-07ab-4c57-bbfd-28d6d7d9eaa6';

exports.handler = async () => {
  const dbUrl = process.env.POSTIZ_DB_URL;
  if (!dbUrl) return { statusCode: 500, body: JSON.stringify({ error: 'POSTIZ_DB_URL not configured' }) };

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, name, "providerIdentifier" AS identifier, picture, profile, disabled
       FROM "Integration"
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND disabled = false
       ORDER BY "createdAt" ASC`,
      [ORG_ID]
    );
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ integrations: result.rows }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  } finally {
    await client.end().catch(() => {});
  }
};