exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const apiKey = process.env.POSTIZ_API_KEY;
    if (!apiKey) throw new Error('POSTIZ_API_KEY not configured');

    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body, 'binary');

    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

    const response = await fetch('https://postiz.infinitewealthsolutionsai.com/api/public/v1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Authorization': apiKey,
      },
      body: bodyBuffer,
    });

    const responseText = await response.text();
    return {
      statusCode: response.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
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