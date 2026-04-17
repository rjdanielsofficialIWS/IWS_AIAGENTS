import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { publishSocialPost } from '../_shared/publish-social.ts';

const CORS = ['https://infinitewealthsolutionsai.com', 'https://www.infinitewealthsolutionsai.com'];
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// ── EST helpers ────────────────────────────────────────────────────────────────

function getEstOffsetHours(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const marchStart = new Date(Date.UTC(year, 2, 1));
  const marchDay = marchStart.getUTCDay();
  const march2ndSun = new Date(Date.UTC(year, 2, marchDay === 0 ? 8 : 15 - marchDay));
  const novStart = new Date(Date.UTC(year, 10, 1));
  const novDay = novStart.getUTCDay();
  const nov1stSun = new Date(Date.UTC(year, 10, novDay === 0 ? 1 : 8 - novDay));
  return now >= march2ndSun && now < nov1stSun ? -4 : -5;
}

function getEstHour(): number {
  return ((new Date().getUTCHours() + getEstOffsetHours()) + 24) % 24;
}

function getEstDateStr(): string {
  const now = new Date();
  const est = new Date(now.getTime() + getEstOffsetHours() * 3_600_000);
  return est.toISOString().slice(0, 10);
}

function scheduleTimes(startHour: number, endHour: number, startFromNow = false): string[] {
  const now = new Date();
  const offset = getEstOffsetHours();
  const est = new Date(now.getTime() + offset * 3_600_000);
  const today = est.toISOString().slice(0, 10); // EST date e.g. "2026-04-12"

  const currentEstMinutes = est.getUTCHours() * 60 + est.getUTCMinutes();
  // In Run Now mode, start from current time (+15 min buffer) if that's later than startHour
  const effectiveStartMinutes = startFromNow
    ? Math.max(startHour * 60, currentEstMinutes + 15)
    : startHour * 60;

  const endMinutes = endHour * 60;
  // Spread over however much window is left; minimum 30 min so posts aren't all at once
  const windowMinutes = Math.max(endMinutes - effectiveStartMinutes, 30);
  const step = windowMinutes / 10;

  // UTC timestamp for midnight of today in EST
  // (EST midnight = UTC midnight minus offset, e.g. EDT midnight = UTC 04:00)
  const estMidnightUtcMs = new Date(`${today}T00:00:00Z`).getTime() - offset * 3_600_000;

  const times: string[] = [];
  for (let i = 0; i < 10; i++) {
    const estMinutes = effectiveStartMinutes + Math.round(step * i);
    // Compute absolute UTC timestamp — this correctly handles midnight rollover
    const utcMs = estMidnightUtcMs + estMinutes * 60_000;
    times.push(new Date(utcMs).toISOString().replace(/\.\d{3}Z$/, 'Z'));
  }
  return times;
}

// ── Multi-source trending topics ─────────────────────────────────────────────

async function fetchGoogleNews(niche: string): Promise<string[]> {
  try {
    const query = encodeURIComponent(niche.trim());
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();
    const topics: string[] = [];
    const itemMatches = xml.matchAll(/<item>[\s\S]*?<\/item>/gi);
    for (const itemMatch of itemMatches) {
      if (topics.length >= 5) break;
      const itemXml = itemMatch[0];
      const cdataMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i);
      const plainMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
      const raw = (cdataMatch?.[1] ?? plainMatch?.[1] ?? '').trim();
      const clean = raw.replace(/\s+-\s+[^-]{1,60}$/, '').trim();
      if (clean && clean.length > 10) topics.push(clean);
    }
    return topics;
  } catch {
    return [];
  }
}

async function fetchHackerNews(niche: string): Promise<string[]> {
  try {
    const query = encodeURIComponent(niche.trim());
    const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=5`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const titles: string[] = [];
    for (const hit of (data.hits ?? [])) {
      const title = (hit.title ?? '').trim();
      if (title && title.length > 10 && titles.length < 3) titles.push(title);
    }
    return titles;
  } catch {
    return [];
  }
}

async function fetchRedditTrending(niche: string): Promise<string[]> {
  try {
    const query = encodeURIComponent(niche.trim());
    const url = `https://www.reddit.com/search.json?q=${query}&sort=hot&t=week&limit=5`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'trending-bot/1.0', 'Accept': 'application/json' },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const posts: string[] = [];
    for (const child of (data?.data?.children ?? [])) {
      const title = (child?.data?.title ?? '').trim();
      const score = child?.data?.score ?? 0;
      if (title && title.length > 10 && score > 10 && posts.length < 3) posts.push(title);
    }
    return posts;
  } catch {
    return [];
  }
}

async function fetchTrendingTopics(niche: string): Promise<string[]> {
  // Run all sources in parallel, take best results
  const [googleResults, hnResults, redditResults] = await Promise.allSettled([
    fetchGoogleNews(niche),
    fetchHackerNews(niche),
    fetchRedditTrending(niche),
  ]);

  const google = googleResults.status === 'fulfilled' ? googleResults.value : [];
  const hn = hnResults.status === 'fulfilled' ? hnResults.value : [];
  const reddit = redditResults.status === 'fulfilled' ? redditResults.value : [];

  // Interleave: prefer Google News as primary, supplement with HN and Reddit
  const combined: string[] = [];
  const seen = new Set<string>();

  const addUnique = (item: string) => {
    const key = item.toLowerCase().slice(0, 40);
    if (!seen.has(key) && combined.length < 5) { seen.add(key); combined.push(item); }
  };

  // Take top 3 from Google, then fill from HN and Reddit
  google.slice(0, 3).forEach(addUnique);
  hn.forEach(addUnique);
  reddit.forEach(addUnique);
  // Fill remaining slots from google if needed
  google.slice(3).forEach(addUnique);

  return combined.slice(0, 5);
}

// ── Nitter RSS fetching ────────────────────────────────────────────────────────

const NITTER_INSTANCES = [
  'nitter.poast.org',
  'nitter.privacydev.net',
  'nitter.1d4.us',
  'lightbrd.com',
  'nitter.net',
];

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parseNitterRss(xml: string): string[] {
  const items: string[] = [];
  // Match <description> blocks inside <item> tags
  const itemMatches = xml.matchAll(/<item>[\s\S]*?<\/item>/gi);
  for (const itemMatch of itemMatches) {
    const itemXml = itemMatch[0];
    // Extract CDATA or plain description
    const cdataMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i);
    const plainMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
    const raw = cdataMatch?.[1] ?? plainMatch?.[1] ?? '';
    const text = stripHtml(raw).replace(/\n{3,}/g, '\n\n').trim();
    if (text && text.length > 10 && items.length < 10) {
      items.push(text);
    }
  }
  return items;
}

async function fetchRecentTweets(handle: string): Promise<string[]> {
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return [];

  for (const instance of NITTER_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6_000);
      const res = await fetch(`https://${instance}/${clean}/rss`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes('<item>')) continue;
      const tweets = parseNitterRss(xml);
      if (tweets.length > 0) return tweets;
    } catch {
      // try next instance
    }
  }
  return [];
}

// ── Tone builder (matches generate-captions quality) ──────────────────────────

function buildTone(tone: string): string {
  const raw = (tone || '').trim();
  const t = raw.toLowerCase();
  if (t.includes('alex hormozi')) return `Primary voice profile: Alex Hormozi-inspired.\n- Short punchy sentences\n- High conviction\n- ROI-focused\n- Concrete and blunt\n- Zero fluff\n- Make every line feel useful\nUser-specified tone: ${raw}`;
  if (t.includes('gary vee')) return `Primary voice profile: Gary Vee-inspired.\n- Fast, energetic, direct\n- Conversational and raw\n- Motivational without sounding scripted\n- Punchy rhythm\n- No emojis\nUser-specified tone: ${raw}`;
  if (t.includes('luxury')) return `Primary voice profile: luxury.\n- Calm confidence\n- Premium restraint\n- Elegant simplicity\n- No hype, no cheap hooks\n- Precise wording\nUser-specified tone: ${raw}`;
  if (t.includes('casual')) return `Primary voice profile: casual.\n- Normal person talking\n- Warm and conversational\n- Easy to read out loud\n- Relaxed but still sharp\nUser-specified tone: ${raw}`;
  if (t.includes('professional')) return `Primary voice profile: professional.\n- Clear, credible, polished\n- Authoritative without sounding corporate\n- Smart and concise\nUser-specified tone: ${raw}`;
  if (t.includes('funny')) return `Primary voice profile: funny.\n- Dry wit\n- Human timing\n- Clever, not cheesy\n- No forced jokes\nUser-specified tone: ${raw}`;
  return raw
    ? `Treat this tone instruction as a top-priority constraint — let it heavily shape vocabulary, rhythm, sentence length, confidence level, and emotional temperature:\n${raw}`
    : `Natural, high-conviction, highly human, contemporary, and non-robotic.`;
}

// ── Post generation ────────────────────────────────────────────────────────────

interface AutopilotConfig {
  id: string;
  supabase_user_id: string;
  workspace_id: string | null;
  niche: string;
  product_service: string;
  twitter_accounts: string[];
  tone: string;
  start_hour: number;
  end_hour: number;
  platforms: string[];
  is_active: boolean;
}

interface GeneratedPosts {
  x: string[];
  linkedin: string[];
  threads: string[];
}

const SYS = `You are a high-level content strategist and elite direct-response social copywriter. You understand viral mechanics, attention economics, audience psychology, and platform-native writing. You write copy that feels unmistakably human, current, and specific.

Today is ${getEstDateStr()}. Write like someone publishing right now, not a generic timeless AI.

Primary objective:
- Turn the user's niche and context into copy that earns attention, holds attention, and creates response
- Maximize curiosity, specificity, clarity, emotional charge, and native platform fit
- Make each post feel like it came from a sharp human strategist, not a template engine

Human writing rules:
- Sound like a real person with taste, instincts, and a point of view
- Use natural contractions and sentence rhythm
- Vary sentence length to create momentum
- Prefer concrete details over generic claims
- Prefer sharp language over padded language
- Every line should feel intentional
- Avoid robotic transitions and obvious AI phrasing

Viral copy rules:
- Lead with a hook that creates tension, curiosity, surprise, relevance, status, or emotional recognition
- Build around one clear angle per post
- Make the payoff feel worth the read
- Use specificity, contrast, stakes, and pattern interruption
- Create forward momentum from line to line

Non-negotiable bans:
- No em-dashes
- No emojis
- No markdown fences
- No generic marketing filler
- Never use: game-changer, leverage, synergy, unlock, empower, transformative, elevate, cutting-edge, dive deep, journey, landscape, streamline

Output rules:
- Return ONLY valid JSON — no markdown, no explanation
- JSON keys: "x", "linkedin", "threads" (only include platforms requested)
- Each key maps to an array of exactly 10 strings
- Posts 1-9 are pure value — no selling whatsoever
- Post 10 is the sell post — promote the product/service naturally with a clear CTA`;

async function generatePosts(
  config: AutopilotConfig,
  platforms: string[],
  inspirationTweets: Record<string, string[]>,
  trendingTopics: string[],
): Promise<GeneratedPosts> {
  const toneDirective = buildTone(config.tone);

  // Build inspiration block from real fetched tweets
  let inspoBlock = '';
  const handles = config.twitter_accounts?.filter(Boolean) ?? [];
  if (handles.length > 0) {
    const lines: string[] = [];
    for (const handle of handles) {
      const tweets = inspirationTweets[handle] ?? [];
      if (tweets.length > 0) {
        lines.push(`@${handle} recent posts:\n${tweets.slice(0, 5).map(t => `- ${t.slice(0, 200)}`).join('\n')}`);
      } else {
        lines.push(`@${handle}: (no recent posts fetched — use your knowledge of this account's content style)`);
      }
    }
    if (lines.length > 0) {
      inspoBlock = `\nSTYLE INSPIRATION — study the tone, hook style, sentence rhythm, and angle types from these real posts. Never copy them. Use them to calibrate your voice:\n${lines.join('\n\n')}`;
    }
  }

  const platformRules: Record<string, string> = {
    x: 'X/Twitter posts: between 200-280 characters — both are hard limits. Never under 200, never over 280. Sharp and punchy. One strong insight or contrarian take. 0-1 hashtags. Must stand alone.',
    linkedin: 'LinkedIn posts: 150-350 words. Professional but human — not corporate. Hook in first line (must make people click "see more"). Line breaks between short paragraphs. Specific insight, lesson, or story. End with a CTA or thought-provoking question. 2-3 hashtags max.',
    threads: 'Threads posts: Casual, conversational. 2-5 sentences. Feels like a message to a friend. Relatable and specific. No hashtags needed.',
  };

  const platformInstructions = platforms
    .map(p => platformRules[p] ?? `${p}: write an engaging native post`)
    .join('\n');

  const trendingBlock = trendingTopics.length > 0
    ? `\nRESEARCH FINDINGS — these are real trending stories and headlines found in your niche right now. These are your PRIMARY source material for posts 1-9. Each post must be rooted in one of these specific findings — extract an insight, hard truth, angle, lesson, or perspective FROM the actual story. Do not write generically about the niche. Do not quote or name the headline directly — translate it into original copy that stands completely on its own:\n${trendingTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : '';

  const userMsg = `Generate 10 posts for each of these platforms: ${platforms.map(p => p === 'x' ? 'X (Twitter)' : p[0].toUpperCase() + p.slice(1)).join(', ')}.

NICHE (used only to find the research above — not the subject of posts): ${config.niche}
${config.product_service ? `PRODUCT/SERVICE: ${config.product_service}` : ''}
${trendingBlock}${inspoBlock}

TONE DIRECTIVE:
${toneDirective}

PLATFORM RULES:
${platformInstructions}

ANGLE VARIETY — every post must use a completely different angle. Rotate through:
contrarian take, surprising insight, hard truth, pattern interrupt, personal story format, common mistake, bold prediction, myth bust, behind-the-scenes, aspirational outcome, fear/risk angle, social proof format, curiosity gap, micro-lesson, hot take (never use the words "hot take")

REQUIREMENTS:
- Posts 1-9: 90% of each post's inspiration must come directly from one of the research findings above. The niche label is just what was searched — the research findings are what you actually write from. Draw a specific insight, angle, or lesson out of a real finding, then craft it into sharp original copy. Spread coverage across different findings. Never quote a headline, never name a news source. Never mention the product/service. Vary angle, hook type, and structure on every post.
- Post 10: sell post for the product/service. If any of the research findings are relevant to the offer, use one to make the pitch feel timely and earned — tying a real trend or insight to why the product/service matters right now. Feels natural, not like an ad. Must end with a CTA. Rotate through CTA styles — never repeat the same one across platforms. Options: a direct link prompt ("Link in bio"), a question that drives replies, a DM invitation ("DM me [word]"), a scarcity/urgency nudge, a soft qualifier ("If you're serious about X, this is for you"), a curiosity tease ("Reply 'info' and I'll send details"), or a benefit-forward command ("Go read/watch/grab [it] now"). Never name any news source, platform name (e.g. Reddit, Google, HackerNews), or headline in the post copy.
- All posts must feel handwritten, platform-native, and sharp — the currency comes from the specific insight drawn from real findings, not from generic niche commentary. Never name any research source, news outlet, or platform in any post.

Return ONLY the JSON object with keys for each requested platform, each containing an array of exactly 10 strings.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: SYS,
        messages: [{ role: 'user', content: userMsg }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) throw new Error('Claude API error: ' + await res.text());
  const data = await res.json();
  const raw = (data.content?.[0]?.text ?? '').trim()
    .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').replace(/—/g, '-').trim();

  // Extract the JSON object robustly
  const start = raw.indexOf('{');
  if (start === -1) throw new Error('No JSON in Claude response');
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const jsonStr = end >= 0 ? raw.slice(start, end + 1) : raw.slice(start);
  const parsed: Partial<GeneratedPosts> = JSON.parse(jsonStr);

  const enforceXLimit = (posts: string[]) =>
    posts.map(p => p.length > 280 ? p.slice(0, 280) : p);

  return {
    x: Array.isArray(parsed.x) ? enforceXLimit(parsed.x).slice(0, 10) : [],
    linkedin: Array.isArray(parsed.linkedin) ? parsed.linkedin.slice(0, 10) : [],
    threads: Array.isArray(parsed.threads) ? parsed.threads.slice(0, 10) : [],
  };
}

// ── Run a single user's autopilot ─────────────────────────────────────────────

interface RunResult {
  userId: string;
  scheduled: { total: number; byPlatform: Record<string, number> };
  errors: string[];
  trendingTopics: string[];
}

async function runForUser(config: AutopilotConfig, supabase: ReturnType<typeof createClient>, startFromNow = false, fromCron = false): Promise<RunResult> {
  const platforms = config.platforms.filter((p) => ['x', 'linkedin', 'threads'].includes(p));
  const errors: string[] = [];
  const byPlatform: Record<string, number> = {};
  let total = 0;

  // Fetch trending topics and inspiration tweets in parallel
  const handles = (config.twitter_accounts ?? []).filter(Boolean);
  const [trendingTopics, ...tweetResults] = await Promise.allSettled([
    fetchTrendingTopics(config.niche),
    ...handles.map(h => fetchRecentTweets(h)),
  ]);
  const trending: string[] = trendingTopics.status === 'fulfilled' ? trendingTopics.value : [];
  const inspirationTweets: Record<string, string[]> = {};
  handles.forEach((handle, i) => {
    const r = tweetResults[i];
    inspirationTweets[handle] = r?.status === 'fulfilled' ? (r.value as string[]) : [];
  });

  const generated = await generatePosts(config, platforms, inspirationTweets, trending);
  const times = scheduleTimes(config.start_hour, config.end_hour, startFromNow);

  for (const platform of platforms) {
    const posts: string[] = generated[platform as keyof GeneratedPosts] ?? [];
    if (posts.length === 0) continue;

    byPlatform[platform] = 0;

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const scheduleDate = times[i] ?? times[times.length - 1];

      try {
        const result = await publishSocialPost({
          supabase,
          userId: config.supabase_user_id,
          // skipDuplicateCheck: autopilot posts are AI-generated and must never
          // collide with or be blocked by manually scheduled posts.
          payload: { platforms: [platform], post, scheduleDate, workspaceId: config.workspace_id ?? null, skipDuplicateCheck: true },
        });

        if (result.ok) {
          byPlatform[platform]++;
          total++;
        } else {
          errors.push(`${platform}[${i + 1}]: ${result.error ?? 'unknown error'}`);
          // Monthly post limit reached — no point trying remaining posts for this platform.
          if (result.error === 'limit_reached') break;
        }
      } catch (e: unknown) {
        errors.push(`${platform}[${i + 1}]: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const updatePayload: Record<string, unknown> = {
    trending_topics: trending,
    last_run_at: new Date().toISOString(),
    last_run_date: getEstDateStr(), // always stamp — enforces 1-per-day for both manual and cron
  };

  // Scope the update to this specific config row — NOT all configs for the user.
  // Using supabase_user_id would stamp every workspace's config with today's date,
  // preventing workspaces configured to run at a later hour from ever firing.
  await supabase
    .from('autopilot_configs')
    .update(updatePayload)
    .eq('id', config.id);

  return { userId: config.supabase_user_id, scheduled: { total, byPlatform }, errors, trendingTopics: trending };
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = CORS.includes(origin) ? origin : CORS[0];
  const cors = {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: cors });
  const respond = (code: number, data: unknown) =>
    new Response(JSON.stringify(data), { status: code, headers: cors });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();

  let authedUserId: string | null = null;
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    authedUserId = user?.id ?? null;
  }

  // ── User mode ──────────────────────────────────────────────────────────────
  if (authedUserId) {
    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { /* no body is fine */ }
    }
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : null;

    let cfgQ = supabase.from('autopilot_configs').select('*').eq('supabase_user_id', authedUserId);
    cfgQ = workspaceId ? (cfgQ as any).eq('workspace_id', workspaceId) : (cfgQ as any).is('workspace_id', null);
    const { data: config, error: cfgErr } = await (cfgQ as any).maybeSingle();

    if (cfgErr) return respond(500, { error: cfgErr.message });
    if (!config) return respond(404, { error: 'No autopilot config found. Please save your settings first.' });

    // Enforce 1 run per day (EST date) — both manual and scheduled count
    const todayEst = getEstDateStr();
    if (config.last_run_date && config.last_run_date >= todayEst) {
      return respond(429, { error: 'already_ran_today', message: 'Auto-Posting already ran today. Come back tomorrow!' });
    }

    try {
      const result = await runForUser(config as AutopilotConfig, supabase, true);
      return respond(200, { success: true, processed: 1, results: [result] });
    } catch (e: unknown) {
      return respond(500, { error: e instanceof Error ? e.message : String(e) });
    }
  }

  // ── Cron mode ──────────────────────────────────────────────────────────────
  const estHour = getEstHour();
  const today = getEstDateStr();

  const { data: configs, error: listErr } = await supabase
    .from('autopilot_configs')
    .select('*')
    .eq('is_active', true)
    .eq('start_hour', estHour)
    .or(`last_run_date.is.null,last_run_date.lt.${today}`);

  if (listErr) return respond(500, { error: listErr.message });
  if (!configs || configs.length === 0) {
    return respond(200, { success: true, processed: 0, results: [], estHour, today });
  }

  const results: RunResult[] = [];
  for (const config of configs) {
    try {
      const r = await runForUser(config as AutopilotConfig, supabase, false, true);
      results.push(r);
    } catch (e: unknown) {
      results.push({
        userId: config.supabase_user_id,
        scheduled: { total: 0, byPlatform: {} },
        errors: [e instanceof Error ? e.message : String(e)],
      });
    }
  }

  return respond(200, { success: true, processed: configs.length, results, estHour, today });
});
