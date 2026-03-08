// netlify/functions/postiz-upload.js
// Handles large media uploads (video/image) to Supabase Storage.
// Called by the MediaDistributionPage uploader via XMLHttpRequest for progress tracking.

const SUPABASE_URL     = 'https://wcbkzebgcsfvrugibsjr.supabase.co';
const STORAGE_BUCKET   = 'media-uploads';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing service key' }) };
  }

  try {
    const body     = JSON.parse(event.body || '{}');
    const { fileName, mimeType, fileBase64, kind } = body;

    if (!fileName || !mimeType || !fileBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const folder     = kind === 'video' ? 'videos' : 'images';
    const path       = `${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: fileBuffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Storage upload failed: ${err}`);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ url: publicUrl, path }),
    };
  } catch (err) {
    console.error('postiz-upload error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};