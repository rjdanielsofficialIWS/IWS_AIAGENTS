const https = require('https');

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const apiKey = process.env.POSTIZ_API_KEY;
  if (!apiKey) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'POSTIZ_API_KEY not set' }) };

  const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'binary');
  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'postiz.infinitewealthsolutionsai.com',
      path: '/api/public/v1/upload',
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': body.length,
        'Authorization': apiKey,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: { ...cors, 'Content-Type': 'application/json' },
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message }),
      });
    });

    req.write(body);
    req.end();
  });
};