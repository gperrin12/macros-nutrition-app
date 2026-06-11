# macros

A nutrition tracker. Type what you ate in plain English — *"2 eggs scrambled in
butter, 1 banana"* — and an LLM estimates the calories, protein, carbs, and fat.
Review, tweak, and write it to your daily log. Track against your targets, browse
14-day history, and export everything as JSON or CSV.

Multi-user: sign in with GitHub or Google, and each account gets its own log.

The whole thing wears an amber-CRT terminal look: monospace, minimal, DOS-ish.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Auth.js (NextAuth v5)** — Sign in with GitHub / Google (OAuth, JWT sessions)
- **Neon Postgres** (`@neondatabase/serverless`) — serverless Postgres over HTTP
- **Anthropic API** — Claude Haiku for food → macros estimation (raw REST, no SDK)
- **Zod** for request/response validation
- Inline styles + a small `globals.css`; installable as a **PWA**

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the values below
npx auth secret          # generates AUTH_SECRET into .env
npm run dev              # http://localhost:3000
```

You need `ANTHROPIC_API_KEY`, a Neon `DATABASE_URL`, `AUTH_SECRET`, and at least
one OAuth provider (`AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` or the Google pair).
There's no local-file DB fallback. Tables are created automatically on the first
request; it's fine to point local dev at the same Neon database as production.

### Setting up OAuth

Register an app with at least one provider and paste the credentials into `.env`.
The callback URL is always `/api/auth/callback/{provider}`.

- **GitHub** — [Developer settings → OAuth Apps](https://github.com/settings/developers).
  Callback: `http://localhost:3000/api/auth/callback/github` (one URL per app, so
  use a separate app for production).
- **Google** — [Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
  OAuth client ID (Web). Add redirect URIs for both local and production.

Anyone with a Google/GitHub account can sign in and get their own empty log. To
restrict access, add a `signIn` callback allowlist in [auth.ts](auth.ts).

## Environment variables

See `.env.example` for the template. Summary:

| Variable | Required? | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | **Yes** | Powers the natural-language food lookup. |
| `DATABASE_URL` | **Yes** | Neon Postgres connection string (use the pooled one). |
| `AUTH_SECRET` | **Yes** | Signs the session JWT (`npx auth secret`). |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | One provider | GitHub OAuth app credentials. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | One provider | Google OAuth client credentials. |
| `AUTH_URL` | Prod | Deployed origin, e.g. `https://your-app.vercel.app`. |
| `OWNER_EMAIL` | One-time | Email to assign existing data to during migration. |
| `NEXT_PUBLIC_API_BASE` / `EXPO_PUBLIC_API_BASE` | Optional | API origin for a future Expo/iOS client. |

### Migrating an existing single-user database

If you have data from before multi-user, assign it to your account once:

```bash
OWNER_EMAIL=you@example.com node --env-file=.env scripts/migrate-multiuser.mjs
```

It adds `user_id` to the existing rows (set to `OWNER_EMAIL`) and re-keys the
`goals` table. It's idempotent and safe to re-run. Fresh databases don't need it.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — Next.js lint

## How it works

1. You describe food in the **LOG FOOD** box.
2. `POST /api/lookup` sends the text to Claude with a strict JSON-only system
   prompt; the response is validated/clamped with Zod and returned as staged rows.
3. You edit the rows (or add some manually), then **WRITE** them — `POST /api/entries`
   persists them to the day's log.
4. Totals, the 14-day history, and export are all derived client-side from the
   full entry list.

## Deploying

Designed for Vercel. Set `ANTHROPIC_API_KEY`, your Neon `DATABASE_URL`,
`AUTH_SECRET`, the OAuth provider credentials, and `AUTH_URL` (your deployed
origin). Register the production callback URL(s) with each OAuth provider. The
`@neondatabase/serverless` driver talks to Neon over HTTP, so it works cleanly in
serverless functions without connection-pool headaches.

## Project layout

```
auth.ts           Auth.js config (GitHub/Google, JWT sessions)
app/              Next.js routes + API handlers (lookup, entries, goals, auth)
components/       Bar + Box terminal-UI primitives
lib/anthropic.ts  Anthropic REST call (food → macros)
lib/db.ts         Neon Postgres client + schema bootstrap
lib/session.ts    requireEmail() helper for API routes
lib/core/         Portable domain logic (types, macros, schema, prompt, theme)
middleware.ts     Auth.js gate in front of pages + API
scripts/          One-time multi-user migration
```

`lib/core/` is intentionally framework-free (no React/Next/DOM) so it can be
lifted into a shared package when the planned Expo/iOS app arrives.

For deeper architectural context (for humans and AI agents), see `CLAUDE.md`.
