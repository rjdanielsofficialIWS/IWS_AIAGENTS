// netlify/functions/upload-media.js
// Uploads media files (video/image) to Supabase Storage for use in posts.

const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }) };
  }

  try {
    // Expect multipart or base64 body with fileName and mimeType
    const body = JSON.parse(event.body || '{}');
    const { fileName, mimeType, fileBase64 } = body;

    if (!fileName || !mimeType || !fileBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'fileName, mimeType, and fileBase64 required' }) };
    }

    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const path = `media/${Date.now()}-${fileName}`;

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/media-uploads/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: fileBuffer,
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 500, body: JSON.stringify({ error: `Upload failed: ${err}` }) };
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/media-uploads/${path}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: publicUrl, path }),
    };
  } catch (err) {
    console.error('upload-media error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};