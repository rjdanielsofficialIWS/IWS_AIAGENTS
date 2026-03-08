const POSTIZ_URL   = 'https://postiz.infinitewealthsolutionsai.com';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

function randomPassword() {
  const crypto = require('crypto');
  return 'Mm1!' + crypto.randomBytes(8).toString('hex');
}

function randomId() {
  const crypto = require('crypto');
  return crypto.randomBytes(13).toString('hex').slice(0, 25);
}

function randomApiKey() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
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

async function getPostizUserByEmail(email) {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.POSTIZ_DB_URL });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT id FROM "User" WHERE email = $1 AND "providerName" = 'LOCAL' LIMIT 1`,
      [email]
    );
    return result.rows[0]?.id || null;
  } finally {
    await client.end().catch(() => {});
  }
}

async function createPrivateOrgForUser(postizUserId, displayName) {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.POSTIZ_DB_URL });
  await client.connect();
  try {
    const orgId  = randomId();
    const uoId   = randomId();
    const apiKey = randomApiKey();
    const now    = new Date().toISOString();

    await client.query(
      `INSERT INTO "Organization" (
        id, name, "apiKey", "allowTrial", "isTrailing",
        shortlink, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, true, false, 'ASK'::"ShortLinkPreference", $4, $4)`,
      [orgId, `${displayName}'s Workspace`, apiKey, now]
    );

    await client.query(
      `INSERT INTO "UserOrganization" (
        id, "userId", "organizationId", disabled, role, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, false, 'SUPERADMIN'::"Role", $4, $4)`,
      [uoId, postizUserId, orgId, now]
    );

    return { orgId, apiKey };
  } finally {
    await client.end().catch(() => {});
  }
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

    // Look up existing shadow account
    const existing = await supabaseQuery(
      `/postiz_accounts?supabase_user_id=eq.${encodeURIComponent(userId)}&select=postiz_email,postiz_password,postiz_org_id&limit=1`,
      'GET', null, serviceKey
    );

    if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0 && existing.data[0].postiz_email) {
      postizEmail    = existing.data[0].postiz_email;
      postizPassword = existing.data[0].postiz_password;
    } else {
      // New user — create shadow account
      postizEmail    = `mm_${userId.slice(0, 8)}@mediamachine.app`;
      postizPassword = randomPassword();
      const displayName = userEmail.split('@')[0];

      let postizUserId = null;
      const regRes = await fetch(`${POSTIZ_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: postizEmail, password: postizPassword, provider: 'LOCAL' }),
      });

      if (regRes.ok) {
        const regData = await regRes.json().catch(() => ({}));
        postizUserId  = regData?.id || regData?.user?.id || null;
      }

      let postizOrgId = null;
      if (process.env.POSTIZ_DB_URL) {
        try {
          if (!postizUserId) postizUserId = await getPostizUserByEmail(postizEmail);
          if (postizUserId) {
            const orgResult = await createPrivateOrgForUser(postizUserId, displayName);
            postizOrgId = orgResult.orgId;
          }
        } catch (dbErr) {
          console.warn('Private org creation failed:', dbErr.message);
        }
      }

      await supabaseQuery('/postiz_accounts', 'POST', {
        supabase_user_id: userId,
        user_email:       userEmail,
        postiz_email:     postizEmail,
        postiz_password:  postizPassword,
        postiz_org_id:    postizOrgId || null,
        created_at:       new Date().toISOString(),
      }, serviceKey);
    }

    // ── THE KEY FIX ──────────────────────────────────────────────────────────
    // This page:
    // 1. Calls /api/auth/login — Postiz sets the session cookie in THIS iframe
    // 2. Waits 800ms for the cookie to fully propagate
    // 3. Redirects THIS iframe to /launches (already authenticated)
    // 4. /launches detects it's in an iframe and fires POSTIZ_LOGIN_OK
    //
    // This is one continuous iframe navigation — no swap, no second iframe.
    // The cookie is valid because login and /launches are the same origin.
    // ─────────────────────────────────────────────────────────────────────────

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
    body {
      background: #0d0d0d;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: sans-serif;
      gap: 12px;
    }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid rgba(214,178,94,0.2);
      border-top-color: #D6B25E;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .msg { font-size: 12px; color: rgba(255,255,255,0.3); }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="msg" id="msg">Signing in...</div>
  <script>
  (async () => {
    const POSTIZ = ${jsPostiz};
    const email  = ${jsEmail};
    const pw     = ${jsPw};
    const msg    = document.getElementById('msg');

    async function tryLogin() {
      const res = await fetch(POSTIZ + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password: pw }),
      });
      return res.ok;
    }

    async function tryRegisterThenLogin() {
      await fetch(POSTIZ + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password: pw, provider: 'LOCAL' }),
      }).catch(() => {});
      return tryLogin();
    }

    try {
      msg.textContent = 'Signing in...';
      let ok = await tryLogin();

      if (!ok) {
        msg.textContent = 'Setting up your account...';
        ok = await tryRegisterThenLogin();
      }

      if (ok) {
        msg.textContent = 'Loading channels...';
        // Small delay to ensure cookie is fully set before navigation
        await new Promise(r => setTimeout(r, 600));
        // Navigate THIS iframe to /launches — already authenticated
        window.location.replace(POSTIZ + '/launches');
      } else {
        // Login truly failed — still signal parent so modal doesn't hang
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'POSTIZ_LOGIN_OK' }, '*');
        }
      }
    } catch(e) {
      console.error('Login error:', e);
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'POSTIZ_LOGIN_OK' }, '*');
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