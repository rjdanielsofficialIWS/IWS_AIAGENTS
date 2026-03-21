import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"];

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (digits.length > 6) return '+' + digits;
  return '';
}

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin') ?? '';
  const cors = {
    'Access-Control-Allow-Origin': CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
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

  let phone: string;
  try {
    const body = await req.json();
    phone = body.phone ?? '';
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) {
    return json({ error: 'invalid_phone', message: 'Please enter a valid phone number.' }, 400);
  }

  // Rate limit: max 3 OTPs per phone per 10 minutes
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('phone_otps')
    .select('id', { count: 'exact', head: true })
    .eq('phone_normalized', phoneNormalized)
    .gte('created_at', tenMinAgo);

  if ((count ?? 0) >= 3) {
    return json({ error: 'rate_limited', message: 'Too many codes sent. Please wait a few minutes and try again.' }, 429);
  }

  // Generate and hash OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insertErr } = await supabase.from('phone_otps').insert({
    phone_normalized: phoneNormalized,
    supabase_user_id: user.id,
    otp_hash: otpHash,
    expires_at: expiresAt,
  });

  if (insertErr) return json({ error: 'db_error', message: insertErr.message }, 500);

  // Send SMS via Twilio
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  const smsRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To:   phoneNormalized,
        From: fromNumber ?? '',
        Body: `Your IWS verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      }),
    }
  );

  if (!smsRes.ok) {
    const smsErr = await smsRes.json().catch(() => ({}));
    console.error('Twilio error:', JSON.stringify(smsErr));
    return json({ error: 'sms_failed', message: 'Failed to send SMS. Please check your phone number and try again.' }, 500);
  }

  return json({ success: true, message: 'Verification code sent.' });
});
