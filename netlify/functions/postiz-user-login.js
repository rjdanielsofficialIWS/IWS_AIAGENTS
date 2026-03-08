// Flow:
// 1. Netlify function looks up/creates shadow account in Supabase
// 2. Calls Postiz /api/auth/login SERVER-SIDE (no CORS) — gets JWT token
// 3. Redirects iframe to https://postiz.domain/auth-bridge?token=JWT
// 4. auth-bridge runs on Postiz domain, sets cookie auth=JWT, redirects to /launches
// 5. /launches loads authenticated, injected script fires POSTIZ_LOGIN_OK to parent

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

async function serverSideLogin(email, password) {
  const res = await fetch(`${POSTIZ_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.warn(`Postiz login failed ${res.status}: ${txt}`);
    return null;
  }
  const data = await res.json().catch(() => null);
  // Postiz returns the token as { token: "..." }
  return data?.token || data?.access_token || data?.jwt || null;
}

async function serverSideRegister(email, password) {
  const res = await fetch(`${POSTIZ_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, provider: 'LOCAL' }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, userId: data?.id || data?.user?.id || null };
}

exports.handler = async (event) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const params     = new URLSearchParams(event.queryStringParameters || {});
  const userId     = params.get('uid');
  const userEmail  = params.get('email');

  const fallbackRedirect = {
    statusCode: 302,
    headers: { Location: `${POSTIZ_URL}/launches` },
    body: '',
  };

  if (!serviceKey || !userId || !userEmail) return fallbackRedirect;

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
      const reg = await serverSideRegister(postizEmail, postizPassword);
      if (reg.ok) postizUserId = reg.userId;

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

    // SERVER-SIDE LOGIN — Netlify server calls Postiz, zero CORS
    let token = await serverSideLogin(postizEmail, postizPassword);

    if (!token) {
      // Account may not exist in Postiz yet — register then retry
      await serverSideRegister(postizEmail, postizPassword);
      token = await serverSideLogin(postizEmail, postizPassword);
    }

    if (!token) {
      console.error(`All login attempts failed for ${postizEmail}`);
      return fallbackRedirect;
    }

    // Redirect iframe to /auth-bridge on the Postiz domain.
    // That page sets cookie auth=<token> (same domain as Postiz)
    // then redirects to /launches which loads fully authenticated.
    const bridgeUrl = `${POSTIZ_URL}/auth-bridge?token=${encodeURIComponent(token)}`;

    return {
      statusCode: 302,
      headers: {
        Location: bridgeUrl,
        'Cache-Control': 'no-store',
      },
      body: '',
    };

  } catch (err) {
    console.error('postiz-user-login error:', err);
    return fallbackRedirect;
  }
};