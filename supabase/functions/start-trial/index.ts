import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = ["https://infinitewealthsolutionsai.com", "https://www.infinitewealthsolutionsai.com"];
const TRIAL_PLANS  = ["starter", "viral"];
const TRIAL_DAYS   = 7;

// Normalize email to catch +alias and Gmail dot tricks across accounts
function normalizeEmail(email: string): string {
  const [local, domain] = email.toLowerCase().split('@');
  if (!local || !domain) return email.toLowerCase();
  // Strip +alias suffix
  const stripped = local.split('+')[0];
  // Remove dots for Gmail / Googlemail
  const gmailDomains = ['gmail.com', 'googlemail.com'];
  const normalized = gmailDomains.includes(domain) ? stripped.replace(/\./g, '') : stripped;
  return `${normalized}@${domain}`;
}

// Common disposable email domains — extend as needed
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamail.biz','guerrillamail.de','guerrillamail.info','spam4.me',
  'trashmail.com','trashmail.me','trashmail.net','trashmail.at','trashmail.io',
  'tempmail.com','temp-mail.org','throwam.com','throwam.net','yopmail.com',
  'yopmail.fr','yopmail.net','cool.fr.nf','jetable.fr.nf','nospam.ze.tc',
  'nomail.xl.cx','mega.zik.dj','speed.1s.fr','courriel.fr.nf','moncourrier.fr.nf',
  'monemail.fr.nf','monmail.fr.nf','sharklasers.com','guerrillamailblock.com',
  'grr.la','guerrillamail.info','spam.la','dispostable.com','fakeinbox.com',
  'mailnull.com','spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'mailnesia.com','discard.email','spamherr.com','maildrop.cc','spamfree24.org',
  'spamfree24.de','spamfree24.eu','spamfree24.net','spamfree24.info',
  'mohmal.com','mt2015.com','mt2014.com','mytrashmail.com','sogetthis.com',
  'shieldedmail.com','incognitomail.com','incognitomail.net','incognitomail.org',
  'filzmail.com','spamevader.com','mail-temp.com','tmpmail.net','tmpmail.org',
  'getnada.com','33mail.com','spambox.us','mailexpire.com','tempr.email',
  'owo.kr','crazymailing.com','explodemail.com','iroid.com','mail.mezimages.net',
  'kurzepost.de','objectmail.com','obobbo.com','proxymail.eu','rcpt.at',
  'rklips.com','rmqkr.net','royal.net','smellfear.com','smwg.info',
  'snkmail.com','sofort-mail.de','spamcon.org','suremail.info','tafmail.com',
  'tapako.de','teewars.org','temporaryforwarding.com','tempsky.com',
  'thanksnospam.info','thisisnotmyrealemail.com','throwam.com','tittbit.in',
  'toss.pw','tradermail.info','trash2009.com','trashdevil.com','trashdevil.de',
  'trash-mail.at','trash-mail.cf','trash-mail.ga','trash-mail.gq',
  'trash-mail.ml','trash-mail.tk','trashmailer.com','trashymail.com',
  'trbvm.com','trbvn.com','trbvo.com','turual.com','tuttoposta.com',
  'twinmail.de','tyldd.com','uggsrock.com','uroid.com','veryrealemail.com',
  'viditag.com','viralplays.com','vpn.st','vsimcard.com','vubby.com',
  'wasteland.raptors.dk','wetrainbayarea.com','willhackforfood.biz',
  'willselfdestruct.com','wilemail.com','wralmail.com','wronghead.com',
  'wuzupmail.net','www.e4ward.com','www.gishpuppy.com','www.mailinator.com',
  'xagloo.com','xemaps.com','xents.com','xmaily.com','xoxy.net','xyzzy.nl',
  'yapped.net','yeah.net','yesey.net','yogamaven.com','yuurok.com','z1p.biz',
  'za.com','zfymail.com','zippymail.info','zoaxe.com','zoemail.net','zoemail.org',
  'zomg.info','zxcv.com','zxcvbnm.com','zzrgg.com',
]);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin":  CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", "").trim());
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  let plan: string;
  try {
    const body = await req.json();
    plan = (body.plan ?? "").toLowerCase();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!TRIAL_PLANS.includes(plan)) {
    return json({ error: "invalid_plan", message: "Free trial is available for Creator and Viral plans." }, 400);
  }

  // ── Check 1: Disposable email ────────────────────────────────────────────────
  const emailDomain = (user.email ?? "").toLowerCase().split("@")[1] ?? "";
  if (DISPOSABLE_DOMAINS.has(emailDomain)) {
    return json({ error: "disposable_email", message: "Free trials are not available for temporary email addresses. Please sign up with a permanent email." }, 403);
  }

  // ── Check 2: This account already used a trial ───────────────────────────────
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end")
    .eq("supabase_user_id", user.id)
    .maybeSingle();

  if (existing?.status === "active") {
    return json({ error: "already_subscribed", message: "You already have an active subscription." }, 409);
  }
  if (existing?.status === "trialing") {
    return json({ error: "trial_already_used", message: "You have already used your free trial." }, 409);
  }

  // ── Check 3: Normalized email already used a trial (different account) ───────
  const emailNormalized = normalizeEmail(user.email ?? "");
  const { data: emailMatch } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("email_normalized", emailNormalized)
    .in("status", ["trialing", "active"])
    .maybeSingle();

  if (emailMatch) {
    return json({ error: "trial_already_used", message: "A free trial has already been used with this email address." }, 409);
  }

  // ── Check 4: IP address already used a trial ─────────────────────────────────
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ipAddress = forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "";

  if (ipAddress) {
    const { data: ipMatch } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("ip_address", ipAddress)
      .in("status", ["trialing", "active"])
      .maybeSingle();

    if (ipMatch) {
      return json({ error: "trial_already_used", message: "A free trial has already been activated from this network. Only one trial per person is allowed." }, 409);
    }
  }

  // ── All checks passed — create the trial ─────────────────────────────────────
  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const row = {
    supabase_user_id:     user.id,
    plan,
    status:               "trialing",
    current_period_start: now.toISOString(),
    current_period_end:   trialEnd.toISOString(),
    ip_address:           ipAddress || null,
    email_normalized:     emailNormalized,
  };

  let dbErr;
  if (existing) {
    const { error } = await supabase
      .from("subscriptions")
      .update({ plan, status: "trialing", current_period_start: row.current_period_start, current_period_end: row.current_period_end, ip_address: row.ip_address, email_normalized: row.email_normalized })
      .eq("supabase_user_id", user.id);
    dbErr = error;
  } else {
    const { error } = await supabase.from("subscriptions").insert(row);
    dbErr = error;
  }

  if (dbErr) {
    return json({ error: "db_error", message: dbErr.message }, 500);
  }

  return json({ success: true, plan, trial_expires_at: trialEnd.toISOString() });
});
