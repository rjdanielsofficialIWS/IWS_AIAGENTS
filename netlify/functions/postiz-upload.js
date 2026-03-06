// netlify/functions/postiz-upload.js
// Returns the Postiz API key so the browser can upload directly.
// Postiz CORS is open, so no binary proxying needed.

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  return {
    statusCode: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: process.env.POSTIZ_API_KEY || null }),
  };
};