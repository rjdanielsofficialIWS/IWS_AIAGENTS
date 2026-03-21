# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint across the project
npm run preview    # Serve the production build locally
```

There are no automated tests. Verification is done by running `npm run build` (catches type errors) and manual testing in the browser.

### Deploying Edge Functions

Edge functions live in `supabase/functions/<name>/index.ts` and are Deno-based. Deploy via the Supabase MCP tool (`mcp__claude_ai_Supabase__deploy_edge_function`) with `project_id: wcbkzebgcsfvrugibsjr`. After editing an edge function locally, always redeploy it — the deployed version is what production uses.

### Pushing to GitHub

`gh auth setup-git` must be run before `git push` in each new session — the HTTPS credential helper resets between sessions.

## Architecture

### Two separate products in one repo

**1. IWS AI Agents** (`/dashboard` route) — A Vapi-powered voice agent builder. Requires `membership_status === 'premium' | 'enterprise'` (checked in `ProtectedRoute` in `App.tsx`). Built with `DashboardLayout` + page components under `src/components/dashboard/`, `src/components/assistants/`, `src/components/widgets/`, `src/components/demo-pages/`.

**2. Infinite Media** (`/InfiniteMedia` route) — A social media content distribution platform. No auth wall at the route level; auth is handled in-page via `MediaMachineAuthModal`. This is by far the largest component: `src/components/MediaDistributionPage.tsx` (~7500 lines, single-file).

### Auth flow

`src/contexts/AuthContext.tsx` wraps the app in `AuthProvider` which exposes `user`, `session`, `loading`, and `signOut`. The Supabase client is the singleton exported from `src/services/vapiAI.ts` (named for historical reasons — it's just the Supabase client). All edge function calls attach the JWT from `supabase.auth.getSession()` as `Authorization: Bearer <token>`.

Membership gating works via a `subscriptions` table row. The `membership_status` field on `AuthUser` is used for the AI Agents dashboard gate. Edge functions re-check plan from the `subscriptions` table directly (don't trust frontend claims).

### Subscription plans & limits

Plans: `free`, `starter`, `viral`, `agency`. Enforced server-side in each edge function by querying `subscriptions`. Usage tracked in `usage_tracking` table (per-user, per-month period `YYYY-MM`). Key limits:
- **Posts**: `starter` 100/mo, `viral` 100/mo, `agency` unlimited
- **AI captions**: `starter` 15/mo, `viral` 100/mo, `agency` unlimited
- **Content Repurposing** (`repurpose_posts`, `repurpose_ideas`): `viral` and `agency` only

Trial accounts use `status: 'trialing'` with a `current_period_end`. Promo accounts use a `stripe_customer_id` starting with `promo_`. Both are treated as active in plan checks.

### Social posting pipeline

`MediaDistributionPage` → `supabase/functions/ayrshare-post` → GetLate API (`https://getlate.dev/api/v1`). Social accounts are connected via a Postiz/GetLate OAuth flow. Connected integrations are stored in Supabase and fetched by the frontend. The `profile` field on an integration holds the platform identifier (e.g. `twitter`, `linkedin`, `x`). Note: `x` and `twitter` are treated as the same platform throughout — always normalise with `prof === 'twitter' ? 'x' : prof` when comparing.

### AI generation pipeline

`MediaDistributionPage` → `supabase/functions/generate-captions` → Anthropic Claude (`claude-sonnet-4-20250514`). Modes:
- `captions_from_video` / `captions_from_description` — generates per-platform captions for media posts
- `repurpose_posts` — generates 10 posts per selected platform (twitter/linkedin/threads)
- `repurpose_ideas` — content strategy brainstorm

Video transcription goes through `supabase/functions/transcribe-video` before being passed to Claude.

### Edge function conventions

All edge functions follow the same pattern:
1. CORS headers set per-request based on origin allowlist (`infinitewealthsolutionsai.com`)
2. Extract JWT from `Authorization` header → verify with `supabase.auth.getUser(token)`
3. Query `subscriptions` to determine `plan`
4. Enforce plan limits, then do the work
5. Return JSON with `Content-Type: application/json`

### Styling conventions

All premium/dashboard UI uses **inline styles** with a shared gold palette (`GOLD = '#D6B25E'`, `GOLD_L = '#F0D27C'`, `GOLD_D = '#8F6B1E'`). CSS animations are injected via `<style>` tags inside components. Public-facing pages (`HomePage`, `SubscriptionSection`) use **Tailwind** classes. Do not mix the two approaches within a component.

### Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `HomePage` | Marketing + Vapi demo widget |
| `/InfiniteMedia` | `MediaDistributionPage` | Social media tool, auth in-page |
| `/dashboard` | `Dashboard` (in App.tsx) | Protected, premium only |
| `/demo/:slug` | `DynamicDemoPage` | Public AI demo pages |
| `/mediamachine/oauth/postiz/callback` | `PostizCallbackPage` | OAuth return |
