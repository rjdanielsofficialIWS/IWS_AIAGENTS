// netlify/functions/postiz-login-redirect.js
const POSTIZ_URL = 'https://postiz.infinitewealthsolutionsai.com';

exports.handler = async (event) => {
  const email    = process.env.POSTIZ_ADMIN_EMAIL;
  const password = process.env.POSTIZ_ADMIN_PASSWORD;

  if (!email || !password) {
    return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
  }

  try {
    const res = await fetch(`${POSTIZ_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, provider: 'LOCAL' }),
    });

    const setCookieHeader = res.headers.get('set-cookie');

    if (!setCookieHeader || !setCookieHeader.includes('auth=')) {
      return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
    }

    const authCookie = setCookieHeader.match(/auth=[^;]+/)?.[0];

    return {
      statusCode: 302,
      headers: {
        Location: `${POSTIZ_URL}/integrations`,
        'Set-Cookie': `${authCookie}; Domain=.infinitewealthsolutionsai.com; Path=/; Expires=Mon, 08 Mar 2027 04:35:39 GMT; HttpOnly; Secure; SameSite=None`,
      },
      body: '',
    };
  } catch (err) {
    console.error('postiz-login-redirect error:', err);
    return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
  }
};