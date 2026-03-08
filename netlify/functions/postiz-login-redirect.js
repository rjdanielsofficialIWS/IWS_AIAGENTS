// netlify/functions/postiz-login-redirect.js
// Silently logs into Postiz with admin credentials and redirects
// the user straight to the integrations page — no login screen shown.

const POSTIZ_URL = 'https://postiz.infinitewealthsolutionsai.com';

exports.handler = async (event) => {
  const email    = process.env.POSTIZ_ADMIN_EMAIL;
  const password = process.env.POSTIZ_ADMIN_PASSWORD;

  if (!email || !password) {
    return {
      statusCode: 302,
      headers: { Location: `${POSTIZ_URL}/integrations` },
      body: '',
    };
  }

  try {
    // Log in to Postiz
    const res = await fetch(`${POSTIZ_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }

    const token = data.access_token || data.token || data.jwt || data.accessToken;

    if (!token) {
      // If login fails just send them to Postiz directly
      return {
        statusCode: 302,
        headers: { Location: `${POSTIZ_URL}/integrations` },
        body: '',
      };
    }

    // Redirect to Postiz integrations with the token set as a cookie
    // Postiz reads the 'auth' cookie for session
    return {
      statusCode: 302,
      headers: {
        Location: `${POSTIZ_URL}/integrations`,
        'Set-Cookie': `auth=${token}; Domain=postiz.infinitewealthsolutionsai.com; Path=/; SameSite=Lax; Secure`,
      },
      body: '',
    };
  } catch (err) {
    console.error('postiz-login-redirect error:', err);
    return {
      statusCode: 302,
      headers: { Location: `${POSTIZ_URL}/integrations` },
      body: '',
    };
  }
};