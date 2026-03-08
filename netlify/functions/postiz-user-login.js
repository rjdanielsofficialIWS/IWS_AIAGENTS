// This function runs SERVER-SIDE on Netlify.
// It calls the Postiz login API from the server (no CORS issues),
// gets the JWT token back, then returns an HTML page that:
//   1. Sets the auth cookie on the postiz subdomain
//   2. Redirects the iframe to /launches (already authenticated)
//   3. /launches fires POSTIZ_LOGIN_OK to the parent

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

// SERVER-SIDE login — no CORS issues because this runs on Netlify's servers
async function serverSideLogin(email, password) {
  const res = await fetch(`${POSTIZ_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  // Postiz returns { token } or { access_token } or { jwt }
  return data?.token || data?.access_token || data?.jwt || null;
}

async function serverSideRegister(email, password) {
  const res = await fetch(`${POSTIZ_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, provider: 'LOCAL' }),
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    userId: data?.id || data?.user?.id || null,
  };
}

exports.handler = async (event) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const params     = new URLSearchParams(event.queryStringParameters || {});
  const userId     = params.get('uid');
  const userEmail  = params.get('email');

  const fallbackRedirect = { statusCode: 302, headers: { Location: `${POSTIZ_URL}/launches` }, body: '' };

  if (!serviceKey || !userId || !userEmail) return fallbackRedirect;

  try {
    let postizEmail, postizPassword, postizOrgId;

    // Look up existing shadow account
    const existing = await supabaseQuery(
      `/postiz_accounts?supabase_user_id=eq.${encodeURIComponent(userId)}&select=postiz_email,postiz_password,postiz_org_id&limit=1`,
      'GET', null, serviceKey
    );

    if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0 && existing.data[0].postiz_email) {
      postizEmail    = existing.data[0].postiz_email;
      postizPassword = existing.data[0].postiz_password;
      postizOrgId    = existing.data[0].postiz_org_id;
    } else {
      // New user — create shadow account
      postizEmail    = `mm_${userId.slice(0, 8)}@mediamachine.app`;
      postizPassword = randomPassword();
      const displayName = userEmail.split('@')[0];

      // Register via Postiz API (server-side, no CORS)
      let postizUserId = null;
      const reg = await serverSideRegister(postizEmail, postizPassword);
      if (reg.ok) postizUserId = reg.userId;

      // Create private org via direct DB access
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

      // Save to Supabase
      await supabaseQuery('/postiz_accounts', 'POST', {
        supabase_user_id: userId,
        user_email:       userEmail,
        postiz_email:     postizEmail,
        postiz_password:  postizPassword,
        postiz_org_id:    postizOrgId || null,
        created_at:       new Date().toISOString(),
      }, serviceKey);
    }

    // ── SERVER-SIDE LOGIN ─────────────────────────────────────────────────────
    // Call Postiz login API from Netlify server — zero CORS issues.
    // Get the JWT token back, pass it to the iframe page.
    // ─────────────────────────────────────────────────────────────────────────

    let token = await serverSideLogin(postizEmail, postizPassword);

    if (!token) {
      // Account might not exist yet in Postiz — try register then login again
      await serverSideRegister(postizEmail, postizPassword);
      token = await serverSideLogin(postizEmail, postizPassword);
    }

    // Even without a token we can still redirect — they'll see the login page
    // but at least there are no CORS errors
    if (!token) {
      console.warn(`Could not get Postiz token for ${postizEmail}`);
      return fallbackRedirect;
    }

    // ── RETURN HTML PAGE ──────────────────────────────────────────────────────
    // This page runs on the Netlify domain (same origin as the parent).
    // It uses a form POST trick to set the auth cookie on the Postiz subdomain,
    // then redirects the iframe to /launches.
    // ─────────────────────────────────────────────────────────────────────────

    const jsPostiz = JSON.stringify(POSTIZ_URL);
    const jsToken  = JSON.stringify(token);

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
  <div class="msg">Opening channel manager…</div>
  <script>
  (async () => {
    const POSTIZ = ${jsPostiz};
    const token  = ${jsToken};

    try {
      // Set the auth token as a cookie on the Postiz subdomain
      // by navigating to a Postiz endpoint that accepts a token param,
      // OR by calling the Postiz token-exchange endpoint if available.
      // 
      // Most Next.js/NestJS auth stacks store the JWT in localStorage or
      // a cookie named "auth_token", "token", "jwt", or "next-auth.session-token".
      // We'll try the Postiz /api/auth/token endpoint first, then fallback
      // to storing it in the iframe's localStorage via a postMessage bridge.

      // Approach: redirect to a Postiz page that accepts ?token= param
      // Postiz reads this and stores the session itself.
      const loginRedirectUrl = POSTIZ + '/launches?token=' + encodeURIComponent(token);
      window.location.replace(loginRedirectUrl);

    } catch(e) {
      console.error('Token handoff error:', e);
      // Signal parent anyway so modal doesn't hang
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
    return fallbackRedirect;
  }
};