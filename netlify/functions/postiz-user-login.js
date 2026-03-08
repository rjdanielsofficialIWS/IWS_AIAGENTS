// netlify/functions/postiz-user-login.js
//
// Per-user Postiz account flow:
// 1. Receive supabase_user_id + email from MediaMachine
// 2. Check Supabase postiz_accounts table for existing account
// 3. If none → create a new Postiz account, save to Supabase
// 4. Log into their Postiz account silently
// 5. Set auth cookie + redirect to /integrations

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
  // Use Postiz admin API to create a new user
  const res = await fetch(`${POSTIZ_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, provider: 'LOCAL' }),
  });
  const text = await res.text();
  try { return { ok: res.ok, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, data: text }; }
}

async function loginPostiz(email, password) {
  const res = await fetch(`${POSTIZ_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, provider: 'LOCAL' }),
  });
  const cookie = res.headers.get('set-cookie');
  return { ok: res.ok, cookie };
}

exports.handler = async (event) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
  }

  // Get user info from query params (passed by MediaMachine)
  const params     = new URLSearchParams(event.queryStringParameters || {});
  const userId     = params.get('uid');
  const userEmail  = params.get('email');

  if (!userId || !userEmail) {
    return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
  }

  try {
    // 1. Check if user already has a Postiz account
    const existing = await supabaseQuery(
      `/postiz_accounts?supabase_user_id=eq.${encodeURIComponent(userId)}&select=postiz_email,postiz_password`,
      'GET', null, serviceKey
    );

    let postizEmail, postizPassword;

    if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0) {
      // Existing account — use saved credentials
      postizEmail    = existing.data[0].postiz_email;
      postizPassword = existing.data[0].postiz_password;
    } else {
      // New user — create a Postiz account
      // Use a subdomain-namespaced email so it doesn't conflict with their real email
      postizEmail    = `mm_${userId.slice(0, 8)}@mediamachine.app`;
      postizPassword = randomPassword();

      const created = await createPostizAccount(postizEmail, postizPassword);

      if (!created.ok) {
        // Account might already exist from a previous attempt — try logging in anyway
        console.log('Create account response:', JSON.stringify(created.data));
      }

      // Save to Supabase regardless (upsert)
      await supabaseQuery('/postiz_accounts', 'POST', {
        supabase_user_id: userId,
        user_email:       userEmail,
        postiz_email:     postizEmail,
        postiz_password:  postizPassword,
        created_at:       new Date().toISOString(),
      }, serviceKey);
    }

    // 2. Log into their Postiz account
    const { ok, cookie } = await loginPostiz(postizEmail, postizPassword);

    if (!ok || !cookie || !cookie.includes('auth=')) {
      console.error('Postiz login failed for', postizEmail);
      return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
    }

    // 3. Extract the auth token and set cookie on the Postiz domain
    const authCookie = cookie.match(/auth=[^;]+/)?.[0];

    return {
      statusCode: 302,
      headers: {
        Location: `${POSTIZ_URL}/integrations`,
        'Set-Cookie': `${authCookie}; Domain=.infinitewealthsolutionsai.com; Path=/; Expires=Mon, 08 Mar 2027 00:00:00 GMT; HttpOnly; Secure; SameSite=None`,
      },
      body: '',
    };

  } catch (err) {
    console.error('postiz-user-login error:', err);
    return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
  }
};