const POSTIZ_API_URL = 'https://postiz.infinitewealthsolutionsai.com/api';
const POSTIZ_API_KEY = '55d30501b8cd0af1946a2f1f335205afd5a499a3cc60047f102044b67cb6d9ff';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const resp = await fetch(`${POSTIZ_API_URL}/public/v1/integrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': POSTIZ_API_KEY,
      },
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: data?.message || `Postiz error ${resp.status}` }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('postiz-connect-callback error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Internal error' }) };
  }
};