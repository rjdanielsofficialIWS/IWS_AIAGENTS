// netlify/functions/postiz-user-login.js
//
// Returns an HTML page that lives on infinitewealthsolutionsai.com but
// makes a same-origin fetch to Postiz to log in, letting Postiz set its
// own cookie directly. No cross-domain cookie issues.

const POSTIZ_URL   = 'https://postiz.infinitewealthsolutionsai.com';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

function randomPassword() {
  return 'Mm1!' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function supabaseQuery(path, method, body, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function createPostizAccount(email, password) {
  const res = await fetch(`${POSTIZ_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, provider: 'LOCAL' }),
  });
  return { ok: res.ok };
}

exports.handler = async (event) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const params     = new URLSearchParams(event.queryStringParameters || {});
  const userId     = params.get('uid');
  const userEmail  = params.get('email');

  if (!serviceKey || !userId || !userEmail) {
    return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
  }

  try {
    let postizEmail, postizPassword;

    // Check for existing account
    const existing = await supabaseQuery(
      `/postiz_accounts?supabase_user_id=eq.${encodeURIComponent(userId)}&select=postiz_email,postiz_password`,
      'GET', null, serviceKey
    );

    if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0) {
      postizEmail    = existing.data[0].postiz_email;
      postizPassword = existing.data[0].postiz_password;
    } else {
      postizEmail    = `mm_${userId.slice(0, 8)}@mediamachine.app`;
      postizPassword = randomPassword();

      await createPostizAccount(postizEmail, postizPassword);

      await supabaseQuery('/postiz_accounts', 'POST', {
        supabase_user_id: userId,
        user_email:       userEmail,
        postiz_email:     postizEmail,
        postiz_password:  postizPassword,
        created_at:       new Date().toISOString(),
      }, serviceKey);
    }

    // Return an HTML page that runs ON the Postiz domain via redirect
    // We pass credentials as a one-time token via the relay page on Postiz
    // Encode password safely for URL
    const encodedEmail = encodeURIComponent(postizEmail);
    const encodedPw    = encodeURIComponent(postizPassword);

    // Redirect to our relay page on the Postiz domain
    return {
      statusCode: 302,
      headers: {
        Location: `${POSTIZ_URL}/relay?e=${encodedEmail}&p=${encodedPw}`,
      },
      body: '',
    };

  } catch (err) {
    console.error('postiz-user-login error:', err);
    return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
  }
};