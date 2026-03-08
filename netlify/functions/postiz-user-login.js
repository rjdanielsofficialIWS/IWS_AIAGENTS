// netlify/functions/postiz-user-login.js
//
// Creates/retrieves a Postiz shadow account for the user,
// then returns an HTML page that auto-logs them in to Postiz
// and redirects to the integrations page.

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

    // Check for existing shadow account
    const existing = await supabaseQuery(
      `/postiz_accounts?supabase_user_id=eq.${encodeURIComponent(userId)}&select=postiz_email,postiz_password&limit=1`,
      'GET', null, serviceKey
    );

    if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0 && existing.data[0].postiz_email) {
      postizEmail    = existing.data[0].postiz_email;
      postizPassword = existing.data[0].postiz_password;
    } else {
      // Create new shadow account
      postizEmail    = `mm_${userId.slice(0, 8)}@mediamachine.app`;
      postizPassword = randomPassword();

      // Register with Postiz (ignore error if already exists)
      await fetch(`${POSTIZ_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: postizEmail, password: postizPassword, provider: 'LOCAL' }),
      }).catch(() => {});

      // Save to Supabase
      await supabaseQuery('/postiz_accounts', 'POST', {
        supabase_user_id: userId,
        user_email:       userEmail,
        postiz_email:     postizEmail,
        postiz_password:  postizPassword,
        created_at:       new Date().toISOString(),
      }, serviceKey);
    }

    // Safely escape credentials for inline JS
    const jsEmail = JSON.stringify(postizEmail);
    const jsPw    = JSON.stringify(postizPassword);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connecting your account...</title>
  <style>
    body { background: #0d0d0d; color: rgba(255,255,255,0.5); font-family: sans-serif;
           display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; }
    .spinner { width: 36px; height: 36px; border: 3px solid rgba(214,178,94,0.2);
               border-top-color: #D6B25E; border-radius: 50%;
               animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 14px; margin: 0; }
    .sub { font-size: 12px; opacity: 0.4; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <p>Signing in to connect your social accounts...</p>
    <p class="sub">You'll be redirected automatically</p>
  </div>
  <script>
  (async function() {
    const POSTIZ = ${JSON.stringify(POSTIZ_URL)};
    const email  = ${jsEmail};
    const pw     = ${jsPw};

    async function tryLogin() {
      const res = await fetch(POSTIZ + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password: pw }),
      });
      return res.ok;
    }

    async function tryRegister() {
      await fetch(POSTIZ + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password: pw, provider: 'LOCAL' }),
      }).catch(() => {});
    }

    try {
      let ok = await tryLogin();
      if (!ok) {
        await tryRegister();
        ok = await tryLogin();
      }
      window.location.replace(POSTIZ + '/integrations');
    } catch(e) {
      window.location.replace(POSTIZ + '/integrations');
    }
  })();
  </script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' },
      body: html,
    };

  } catch (err) {
    console.error('postiz-user-login error:', err);
    return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
  }
};