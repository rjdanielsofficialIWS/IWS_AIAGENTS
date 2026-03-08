// This background function is called automatically by a Supabase DB trigger
// the moment a new user signs up on the platform.
// It creates their Postiz shadow account + private org silently in the background.
// By the time they ever click "Connect Social Accounts", everything is ready.

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

// ─── Main handler ─────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // Background functions return 202 immediately — all work happens async
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;

  let userId, userEmail;
  try {
    const body = JSON.parse(event.body || '{}');
    userId    = body.userId;
    userEmail = body.email;
  } catch {
    return;
  }

  if (!userId || !userEmail) return;

  try {
    // Guard: skip if already provisioned (e.g. duplicate trigger fire)
    const existing = await supabaseQuery(
      `/postiz_accounts?supabase_user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
      'GET', null, serviceKey
    );
    if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0) {
      console.log(`User ${userId} already provisioned, skipping.`);
      return;
    }

    const postizEmail    = `mm_${userId.slice(0, 8)}@mediamachine.app`;
    const postizPassword = randomPassword();
    const displayName    = userEmail.split('@')[0];

    // Step 1: Register the shadow account with Postiz
    let postizUserId = null;
    const regRes = await fetch(`${POSTIZ_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: postizEmail, password: postizPassword, provider: 'LOCAL' }),
    });

    if (regRes.ok) {
      const regData = await regRes.json().catch(() => ({}));
      postizUserId  = regData?.id || regData?.user?.id || null;
      console.log(`Registered Postiz user: ${postizEmail}`);
    } else {
      const errText = await regRes.text().catch(() => '');
      console.warn(`Postiz register failed (${regRes.status}): ${errText}`);
    }

    // Step 2: Create private org via direct DB access
    let postizOrgId = null;
    if (process.env.POSTIZ_DB_URL) {
      try {
        if (!postizUserId) {
          postizUserId = await getPostizUserByEmail(postizEmail);
        }
        if (postizUserId) {
          const orgResult = await createPrivateOrgForUser(postizUserId, displayName);
          postizOrgId = orgResult.orgId;
          console.log(`Created private org ${postizOrgId} for user ${postizUserId}`);
        }
      } catch (dbErr) {
        console.warn('Private org creation failed:', dbErr.message);
      }
    }

    // Step 3: Save to Supabase postiz_accounts
    const saveResult = await supabaseQuery('/postiz_accounts', 'POST', {
      supabase_user_id: userId,
      user_email:       userEmail,
      postiz_email:     postizEmail,
      postiz_password:  postizPassword,
      postiz_org_id:    postizOrgId || null,
      created_at:       new Date().toISOString(),
    }, serviceKey);

    if (saveResult.ok) {
      console.log(`Successfully provisioned Postiz account for ${userEmail}`);
    } else {
      console.error(`Failed to save postiz_accounts record:`, saveResult.data);
    }

  } catch (err) {
    console.error('postiz-provision-user error:', err);
  }
};