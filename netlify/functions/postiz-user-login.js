const POSTIZ_URL   = 'https://postiz.infinitewealthsolutionsai.com';
const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Create private org + link user directly in Postiz DB ────────────────────
// Called AFTER Postiz API registers the user (so bcrypt is handled by Postiz).

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
      ) VALUES (
        $1, $2, $3, true, false,
        'ASK'::"ShortLinkPreference", $4, $4
      )`,
      [orgId, `${displayName}'s Workspace`, apiKey, now]
    );

    await client.query(
      `INSERT INTO "UserOrganization" (
        id, "userId", "organizationId", disabled, role,
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, false, 'SUPERADMIN'::"Role",
        $4, $4
      )`,
      [uoId, postizUserId, orgId, now]
    );

    return { orgId, apiKey };

  } finally {
    await client.end().catch(() => {});
  }
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

// ─── Main handler ─────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const params     = new URLSearchParams(event.queryStringParameters || {});
  const userId     = params.get('uid');
  const userEmail  = params.get('email');

  if (!serviceKey || !userId || !userEmail) {
    return { statusCode: 302, headers: { Location: `${POSTIZ_URL}/auth/login` }, body: '' };
  }

  try {
    let postizEmail, postizPassword, postizOrgId;

    // ── Look up existing shadow account ──────────────────────────────────────
    const existing = await supabaseQuery(
      `/postiz_accounts?supabase_user_id=eq.${encodeURIComponent(userId)}&select=postiz_email,postiz_password,postiz_org_id&limit=1`,
      'GET', null, serviceKey
    );

    if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0 && existing.data[0].postiz_email) {
      postizEmail    = existing.data[0].postiz_email;
      postizPassword = existing.data[0].postiz_password;
      postizOrgId    = existing.data[0].postiz_org_id;

    } else {
      // ── New user ──────────────────────────────────────────────────────────
      postizEmail    = `mm_${userId.slice(0, 8)}@mediamachine.app`;
      postizPassword = randomPassword();
      const displayName = userEmail.split('@')[0];

      // Step 1: Register via Postiz API (Postiz handles bcrypt internally)
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

      // Step 2: Create a private org for this user via direct DB access
      if (process.env.POSTIZ_DB_URL) {
        try {
          if (!postizUserId) {
            postizUserId = await getPostizUserByEmail(postizEmail);
          }
          if (postizUserId) {
            const orgResult = await createPrivateOrgForUser(postizUserId, displayName);
            postizOrgId = orgResult.orgId;
          }
        } catch (dbErr) {
          console.warn('Private org creation failed, using default org:', dbErr.message);
        }
      }

      // Step 3: Save shadow account to Supabase
      await supabaseQuery('/postiz_accounts', 'POST', {
        supabase_user_id: userId,
        user_email:       userEmail,
        postiz_email:     postizEmail,
        postiz_password:  postizPassword,
        postiz_org_id:    postizOrgId || null,
        created_at:       new Date().toISOString(),
      }, serviceKey);
    }

    // ── Build the silent login HTML page ──────────────────────────────────────
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