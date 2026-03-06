// netlify/functions/postiz-upload.js
// Proxies multipart file uploads to self-hosted Postiz.
// Runs server-side so CORS is not an issue.

const POSTIZ_BACKEND_URL = 'https://postiz.infinitewealthsolutionsai.com/api';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // event.body is base64-encoded when isBase64Encoded = true (binary/multipart)
    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body);

    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

    // Extract the token field from the multipart body so we can forward it as a header.
    // We do a simple string search rather than pulling in a multipart parser.
    let token = process.env.POSTIZ_API_KEY || '';
    const bodyStr = bodyBuffer.toString('binary');

    // Look for token field in form data: name="token"\r\n\r\n<value>\r\n
    const tokenMatch = bodyStr.match(/name="token"\r\n\r\n([^\r\n]+)/);
    if (tokenMatch) token = tokenMatch[1].trim();

    // We need to forward the body as-is (multipart) but without the token field.
    // Simplest approach: rebuild the request forwarding the raw body but strip the token part.
    // Actually Postiz just needs Authorization header + file field — send the full body as-is,
    // Postiz will ignore unknown fields.

    const response = await fetch(`${POSTIZ_BACKEND_URL}/public/v1/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        ...(token ? { Authorization: token } : {}),
      },
      body: bodyBuffer,
    });

    const responseText = await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: responseText,
    };
  } catch (err) {
    console.error('postiz-upload error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};