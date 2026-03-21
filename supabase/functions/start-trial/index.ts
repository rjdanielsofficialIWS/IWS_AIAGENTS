import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"];
const TRIAL_PLANS  = ["starter", "viral"];
const TRIAL_DAYS   = 7;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (digits.length > 6) return '+' + digits;
  return '';
}

function normalizeEmail(email: string): string {
  const [local, domain] = email.toLowerCase().split('@');
  if (!local || !domain) return email.toLowerCase();
  const stripped = local.split('+')[0];
  const gmailDomains = ['gmail.com', 'googlemail.com'];
  const normalized = gmailDomains.includes(domain) ? stripped.replace(/\./g, '') : stripped;
  return `${normalized}@${domain}`;
}

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamail.biz','guerrillamail.de','guerrillamail.info','spam4.me',
  'trashmail.com','trashmail.me','trashmail.net','trashmail.at','trashmail.io',
  'tempmail.com','temp-mail.org','throwam.com','throwam.net','yopmail.com',
  'yopmail.fr','yopmail.net','sharklasers.com','guerrillamailblock.com',
  'grr.la','spam.la','dispostable.com','fakeinbox.com','mailnull.com',
  'spamgourmet.com','spamgourmet.net','spamgourmet.org','mailnesia.com',
  'discard.email','maildrop.cc','mohmal.com','mytrashmail.com',
  'shieldedmail.com','incognitomail.com','incognitomail.net','incognitomail.org',
  'filzmail.com','mail-temp.com','tmpmail.net','tmpmail.org','getnada.com',
  '33mail.com','spambox.us','mailexpire.com','tempr.email','crazymailing.com',
  'spamcon.org','trash-mail.at','trash-mail.cf','trash-mail.ga','trash-mail.gq',
  'trash-mail.ml','trash-mail.tk','trashmailer.com','trashymail.com',
]);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin') ?? '';
  const cors = {
    'Access-Control-Allow-Origin':  CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace('Bearer ', '').trim());
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  let plan: string, phone: string, code: string;
  try {
    const body = await req.json();
    plan  = (body.plan  ?? '').toLowerCase();
    phone = body.phone  ?? '';
    code  = body.code   ?? '';
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!TRIAL_PLANS.includes(plan)) {
    return json({ error: 'invalid_plan', message: 'Free trial is available for Creator and Viral plans.' }, 400);
  }

  if (!phone || !code) {
    return json({ error: 'missing_fields', message: 'Phone number and verification code are required.' }, 400);
  }

  // ── Check 1: Disposable email ────────────────────────────────────────────────
  const emailDomain = (user.email ?? '').toLowerCase().split('@')[1] ?? '';
  if (DISPOSABLE_DOMAINS.has(emailDomain)) {
    return json({ error: 'disposable_email', message: 'Free trials are not available for temporary email addresses. Please sign up with a permanent email.' }, 403);
  }

  // ── Check 2: This account already used a trial ───────────────────────────────
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id, status, current_period_end')
    .eq('supabase_user_id', user.id)
    .maybeSingle();

  if (existing?.status === 'active') {
    return json({ error: 'already_subscribed', message: 'You already have an active subscription.' }, 409);
  }
  if (existing?.status === 'trialing') {
    return json({ error: 'trial_already_used', message: 'You have already used your free trial.' }, 409);
  }

  // ── Check 3: Normalized email already used a trial ───────────────────────────
  const emailNormalized = normalizeEmail(user.email ?? '');
  const { data: emailMatch } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('email_normalized', emailNormalized)
    .in('status', ['trialing', 'active'])
    .maybeSingle();

  if (emailMatch) {
    return json({ error: 'trial_already_used', message: 'A free trial has already been used with this email address.' }, 409);
  }

  // ── Check 4: Verify phone OTP ────────────────────────────────────────────────
  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) {
    return json({ error: 'invalid_phone', message: 'Please enter a valid phone number.' }, 400);
  }

  const codeHash = await hashOtp(code.trim());
  const now = new Date();

  const { data: otpRow } = await supabase
    .from('phone_otps')
    .select('id')
    .eq('supabase_user_id', user.id)
    .eq('phone_normalized', phoneNormalized)
    .eq('otp_hash', codeHash)
    .eq('used', false)
    .gt('expires_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow) {
    return json({ error: 'invalid_code', message: 'That code is invalid or has expired. Please request a new one.' }, 400);
  }

  // Mark OTP as used
  await supabase.from('phone_otps').update({ used: true }).eq('id', otpRow.id);

  // ── Check 5: Phone number already used a trial ───────────────────────────────
  const { data: phoneMatch } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('phone_normalized', phoneNormalized)
    .in('status', ['trialing', 'active'])
    .maybeSingle();

  if (phoneMatch) {
    return json({ error: 'trial_already_used', message: 'A free trial has already been used with this phone number. Only one trial per person is allowed.' }, 409);
  }

  // ── All checks passed — create the trial ─────────────────────────────────────
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const row = {
    supabase_user_id:     user.id,
    plan,
    status:               'trialing',
    current_period_start: now.toISOString(),
    current_period_end:   trialEnd.toISOString(),
    email_normalized:     emailNormalized,
    phone_normalized:     phoneNormalized,
  };

  let dbErr;
  if (existing) {
    const { error } = await supabase
      .from('subscriptions')
      .update({ plan, status: 'trialing', current_period_start: row.current_period_start, current_period_end: row.current_period_end, email_normalized: row.email_normalized, phone_normalized: row.phone_normalized })
      .eq('supabase_user_id', user.id);
    dbErr = error;
  } else {
    const { error } = await supabase.from('subscriptions').insert(row);
    dbErr = error;
  }

  if (dbErr) return json({ error: 'db_error', message: dbErr.message }, 500);

  return json({ success: true, plan, trial_expires_at: trialEnd.toISOString() });
});
