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

    const existing = await supabaseQuery(
      `/postiz_accounts?supabase_user_id=eq.${encodeURIComponent(userId)}&select=postiz_email,postiz_password&limit=1`,
      'GET', null, serviceKey
    );

    if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0 && existing.data[0].postiz_email) {
      postizEmail    = existing.data[0].postiz_email;
      postizPassword = existing.data[0].postiz_password;
    } else {
      postizEmail    = `mm_${userId.slice(0, 8)}@mediamachine.app`;
      postizPassword = randomPassword();

      await fetch(`${POSTIZ_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: postizEmail, password: postizPassword, provider: 'LOCAL' }),
      }).catch(() => {});

      await supabaseQuery('/postiz_accounts', 'POST', {
        supabase_user_id: userId,
        user_email:       userEmail,
        postiz_email:     postizEmail,
        postiz_password:  postizPassword,
        created_at:       new Date().toISOString(),
      }, serviceKey);
    }

    const jsPostiz = JSON.stringify(POSTIZ_URL);
    const jsEmail  = JSON.stringify(postizEmail);
    const jsPw     = JSON.stringify(postizPassword);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connecting...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0d0d0d; display: flex; align-items: center;
           justify-content: center; height: 100vh; font-family: sans-serif; }
    .spinner { width: 36px; height: 36px; border: 3px solid rgba(214,178,94,0.2);
               border-top-color: #D6B25E; border-radius: 50%;
               animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <script>
  (async () => {
    const POSTIZ = ${jsPostiz};
    const email  = ${jsEmail};
    const pw     = ${jsPw};

    async function doLogin() {
      return fetch(POSTIZ + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password: pw }),
      });
    }

    try {
      let res = await doLogin();

      if (!res.ok) {
        await fetch(POSTIZ + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password: pw, provider: 'LOCAL' }),
        }).catch(() => {});
        res = await doLogin();
      }

      if (window.parent !== window) {
        window.parent.postMessage({ type: 'POSTIZ_LOGIN_OK' }, '*');
      } else {
        window.location.replace(POSTIZ + '/launches');
      }
    } catch(e) {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'POSTIZ_LOGIN_OK' }, '*');
      } else {
        window.location.replace(POSTIZ + '/launches');
      }
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