// netlify/functions/upload-media.js
//
// Returns a signed upload URL for direct browser-to-Supabase upload.
// The browser then PUTs the file directly to the signed URL — no size limit.
// POST { path, contentType } → { signedUrl, publicUrl }

const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const BUCKET = 'media';

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');

    const { path, contentType } = JSON.parse(event.body || '{}');
    if (!path) throw new Error('Missing path');

    // Ask Supabase storage for a signed upload URL using service role key
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upsert: true }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to get signed URL: ${err}`);
    }

    const data = await res.json();
    const signedUrl = `${SUPABASE_URL}/storage/v1${data.url}`;
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedUrl, publicUrl }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};