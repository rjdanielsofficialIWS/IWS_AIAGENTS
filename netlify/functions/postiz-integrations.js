exports.handler = async function (event) {
  const token = event.headers['authorization'];

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Missing authorization token' }),
    };
  }

  try {
    const response = await fetch('https://api.postiz.com/public/v1/integrations', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch integrations' }),
    };
  }
};