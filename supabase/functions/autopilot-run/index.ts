import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { publishSocialPost } from '../_shared/publish-social.ts';

const CORS = ['https://infinitewealthsolutionsai.com', 'https://www.infinitewealthsolutionsai.com'];
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const TAVILY_KEY = Deno.env.get('TAVILY_API_KEY') ?? '';
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

// ── Topic fetching via Tavily (primary) + scrapers (fallback) ────────────────

const SOURCE_NAMES = new Set([
  'reuters','bloomberg','forbes','cnbc','cnn','bbc','fox news','the guardian',
  'new york times','nyt','washington post','wsj','wall street journal',
  'associated press','ap news','marketwatch','business insider','techcrunch',
  'the verge','wired','fortune','time','newsweek','axios','politico',
  'financial times','ft','yahoo finance','yahoo news','google news','msn',
]);

function isSourceOnlyTitle(title: string): boolean {
  const lower = title.toLowerCase().trim();
  if (title.length < 25 && SOURCE_NAMES.has(lower)) return true;
  // "Source - Section" pattern with no real story content
  if (/^[a-z\s]+\s[-|]\s[a-z\s]+$/i.test(title) && title.length < 40) return true;
  return false;
}

async function tavilySearch(query: string, maxResults = 5): Promise<string[]> {
  if (!TAVILY_KEY) throw new Error('No Tavily key');
  const r = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query,
      search_depth: 'basic',
      max_results: maxResults + 3,
      include_answer: false,
    }),
  });
  if (!r.ok) throw new Error('Tavily error: ' + r.status);
  const d = await r.json();
  return (d.results ?? [])
    .map((item: any) => {
      const title = (item.title ?? '').trim();
      if (isSourceOnlyTitle(title) && item.content) {
        const snippet = (item.content as string).split(/[.!?]/)[0]?.trim() ?? '';
        return snippet.length > 20 ? snippet.slice(0, 120) : '';
      }
      return title;
    })
    .filter((t: string) => t.length > 20)
    .slice(0, maxResults) as string[];
}

// Fallback scrapers used when Tavily is unavailable
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
      if (topics.length >= 6) break;
      const itemXml = itemMatch[0];
      const cdataMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i);
      const plainMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
      const raw = (cdataMatch?.[1] ?? plainMatch?.[1] ?? '').trim();
      const clean = raw.replace(/\s+-\s+[^-]{1,60}$/, '').trim();
      if (clean && clean.length > 10) topics.push(clean);
    }
    return topics;
  } catch { return []; }
}

async function fetchHackerNews(niche: string): Promise<string[]> {
  try {
    const query = encodeURIComponent(niche.trim());
    const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=10`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits ?? []).map((h: any) => (h.title ?? '').trim()).filter((t: string) => t.length > 10).slice(0, 8);
  } catch { return []; }
}

interface TopicSets {
  trending: string[];
  recent: string[];
}

async function fetchTopicsViaTavily(niche: string): Promise<TopicSets> {
  const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const [trendingRes, recentRes] = await Promise.allSettled([
    tavilySearch(`trending ${niche} news ${month}`, 4),
    tavilySearch(`latest ${niche} news stories ${month}`, 5),
  ]);

  const trendingRaw = trendingRes.status === 'fulfilled' ? trendingRes.value : [];
  const recentRaw   = recentRes.status   === 'fulfilled' ? recentRes.value   : [];

  const trendingSeen = new Set(trendingRaw.map((t: string) => t.toLowerCase().slice(0, 40)));
  const trending = trendingRaw.slice(0, 2);
  const recent = recentRaw
    .filter((t: string) => !trendingSeen.has(t.toLowerCase().slice(0, 40)))
    .slice(0, 3);

  if (trending.length === 0 && recent.length === 0) throw new Error('Tavily returned no results');
  return { trending, recent };
}

async function fetchTopicsFallback(niche: string): Promise<TopicSets> {
  const [googleRes, hnRes] = await Promise.allSettled([
    fetchGoogleNews(niche),
    fetchHackerNews(niche),
  ]);
  const all = [
    ...(googleRes.status === 'fulfilled' ? googleRes.value : []),
    ...(hnRes.status === 'fulfilled' ? hnRes.value : []),
  ];
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const item of all) {
    const key = item.toLowerCase().slice(0, 40);
    if (!seen.has(key)) { seen.add(key); deduped.push(item); }
  }
  return { trending: deduped.slice(0, 2), recent: deduped.slice(2, 5) };
}

async function fetchTopics(niche: string): Promise<TopicSets> {
  if (TAVILY_KEY) {
    try {
      return await fetchTopicsViaTavily(niche);
    } catch (e) {
      console.warn('Tavily topic fetch failed, falling back to scrapers:', e);
    }
  }
  return fetchTopicsFallback(niche);
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
- Never reference, name, cite, or allude to any publication, news source, website, or media outlet — not even vaguely ("according to reports", "a recent study", "experts say", "sources say"). Write from a pure personal perspective, as if this is your own insight or observation.
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
  recentTopics: string[],
  previousTopics: string[],
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
    ? `\nTRENDING STORIES (top ${trendingTopics.length} — highest engagement right now, actively going viral):\n${trendingTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : '';

  const recentBlock = recentTopics.length > 0
    ? `\nRECENT STORIES (${recentTopics.length} freshly published — new today, not necessarily viral yet):\n${recentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : '';

  const allTopicsCount = trendingTopics.length + recentTopics.length;

  const previousBlock = previousTopics.length > 0
    ? `\nYESTERDAY'S TOPICS (ALREADY COVERED — DO NOT REVISIT): These stories and angles were published yesterday. You must NOT write about any of these topics, themes, or angles. Find completely fresh ground — different stories, different sub-topics, different angles entirely:\n${previousTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : '';

  // Build explicit per-post story assignments so Claude cannot pile posts onto one topic
  const allStories = [
    ...trendingTopics.map((t, i) => `[TRENDING ${i + 1}] ${t}`),
    ...recentTopics.map((t, i) => `[RECENT ${i + 1}] ${t}`),
  ];
  const postAssignments = Array.from({ length: 9 }, (_, i) => {
    const story = allStories[i % allStories.length];
    return `Post ${i + 1}: ${story}`;
  }).join('\n');

  const userMsg = `Generate 10 posts for each of these platforms: ${platforms.map(p => p === 'x' ? 'X (Twitter)' : p[0].toUpperCase() + p.slice(1)).join(', ')}.

NICHE (used only to find the research above — not the subject of posts): ${config.niche}
${config.product_service ? `PRODUCT/SERVICE: ${config.product_service}` : ''}
${previousBlock}${trendingBlock}${recentBlock}${inspoBlock}

TONE DIRECTIVE:
${toneDirective}

PLATFORM RULES:
${platformInstructions}

ANGLE VARIETY — every post must use a completely different angle. Rotate through:
contrarian take, surprising insight, hard truth, pattern interrupt, personal story format, common mistake, bold prediction, myth bust, behind-the-scenes, aspirational outcome, fear/risk angle, social proof format, curiosity gap, micro-lesson, hot take (never use the words "hot take")

FRESHNESS RULE — this runs every day. The posts you write today must cover completely different ground than yesterday's posts. If you received a "YESTERDAY'S TOPICS" block above, treat it as a strict exclusion list — no overlapping topics, no recycled angles, no retreading the same sub-topics in different words. Find new stories, new angles, new entry points within the niche every single day.

MANDATORY POST-TO-STORY ASSIGNMENTS — this is the law. Every value post is pre-assigned to a specific story. Follow it exactly with no deviations:
${postAssignments}
Post 10: sell post — tie any one research story to why the product/service matters right now.

SPECIFICITY MANDATE — non-negotiable:
- When a story involves a specific tool, product, company, person, number, timeframe, or technique — use that specific detail directly in the post. Name the tool (ChatGPT, Claude, Cursor, Notion AI, etc.), cite the number, reference the concrete situation. Generic references when specifics are available are a failure.
- "AI tools are changing everything" is a bad post. "ChatGPT's new operator system prompts let businesses lock the AI to a single task" is a good post.
- Use real data points, names, and specifics from the assigned story — just never reveal the source publication.

REQUIREMENTS:
- Each value post (1-9) MUST be rooted exclusively in its assigned story above. Extract a specific insight, hard truth, angle, or lesson from that story and express it as YOUR OWN perspective and voice — never quote headlines, never name any source or publication, never allude to where you learned it. Write as if this is something you believe and observed, not something you read. Do not mention the product/service. Use a different angle, hook type, and sentence structure on every post.
- Post 10: sell post for the product/service. Makes the pitch feel timely and earned, not like an ad. Must end with a CTA. Rotate CTA style: "Link in bio", a reply-driving question, "DM me [word]", scarcity nudge, soft qualifier, curiosity tease, or benefit-forward command. Never name a source or platform in the post copy.
- All posts must feel handwritten, platform-native, and sharp.

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
  recentTopics: string[];
}

async function runForUser(config: AutopilotConfig, supabase: ReturnType<typeof createClient>, startFromNow = false, fromCron = false): Promise<RunResult> {
  const platforms = config.platforms.filter((p) => ['x', 'linkedin', 'threads'].includes(p));
  const errors: string[] = [];
  const byPlatform: Record<string, number> = {};
  let total = 0;

  // Fetch topics and inspiration tweets in parallel
  const handles = (config.twitter_accounts ?? []).filter(Boolean);
  const [topicsResult, ...tweetResults] = await Promise.allSettled([
    fetchTopics(config.niche),
    ...handles.map(h => fetchRecentTweets(h)),
  ]);
  const topics: TopicSets = topicsResult.status === 'fulfilled' ? topicsResult.value : { trending: [], recent: [] };
  const inspirationTweets: Record<string, string[]> = {};
  handles.forEach((handle, i) => {
    const r = tweetResults[i];
    inspirationTweets[handle] = r?.status === 'fulfilled' ? (r.value as string[]) : [];
  });

  // Topics from the previous run — used to force Claude onto fresh angles today
  const previousTopics: string[] = Array.isArray((config as any).trending_topics)
    ? (config as any).trending_topics as string[]
    : [];

  const generated = await generatePosts(config, platforms, inspirationTweets, topics.trending, topics.recent, previousTopics);
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
    trending_topics: [...topics.trending, ...topics.recent],
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

  return { userId: config.supabase_user_id, scheduled: { total, byPlatform }, errors, trendingTopics: topics.trending, recentTopics: topics.recent };
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
        trendingTopics: [],
        recentTopics: [],
      });
    }
  }

  return respond(200, { success: true, processed: configs.length, results, estHour, today });
});
