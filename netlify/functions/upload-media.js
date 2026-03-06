// netlify/functions/upload-media.js
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

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');

    const { path, contentType } = JSON.parse(event.body || '{}');
    if (!path) throw new Error('Missing path');

    // Correct Supabase Storage signed upload URL endpoint
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upsert: 'true' }),
      }
    );

    const responseText = await res.text();

    if (!res.ok) {
      throw new Error(`Supabase error ${res.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);

    // data.url is the path portion e.g. /storage/v1/upload/sign/...?token=...
    // We need to prepend the Supabase project URL
    const signedUrl = data.url.startsWith('http')
      ? data.url
      : `${SUPABASE_URL}${data.url}`;

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