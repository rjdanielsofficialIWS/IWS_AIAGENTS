// netlify/functions/upload-media.js
//
// Proxies file uploads directly to Supabase Storage using the service role key.
// This bypasses the 50MB Supabase JS client limit and the Supabase edge function
// gateway limit. Netlify functions support up to 6MB by default, but with
// background functions or streaming, much larger files work fine.
//
// To use: POST to /.netlify/functions/upload-media
// Headers: x-file-path, content-type
// Body: raw file bytes

const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const BUCKET = 'media';

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, x-file-path, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    const filePath = event.headers['x-file-path'];
    if (!filePath) {
      throw new Error('Missing x-file-path header');
    }

    const contentType = event.headers['content-type'] || 'application/octet-stream';

    // event.body is base64 encoded by Netlify for binary data
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '', 'utf8');

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Storage upload failed: ${err}`);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: publicUrl }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};