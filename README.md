# macros

A personal nutrition tracker. Type what you ate in plain English — *"2 eggs
scrambled in butter, 1 banana"* — and an LLM estimates the calories, protein,
carbs, and fat. Review, tweak, and write it to your daily log. Track against your
targets, browse 14-day history, and export everything as JSON or CSV.

The whole thing wears an amber-CRT terminal look: monospace, minimal, DOS-ish.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Neon Postgres** (`@neondatabase/serverless`) — serverless Postgres over HTTP
- **Anthropic API** — Claude Haiku for food → macros estimation (raw REST, no SDK)
- **Zod** for request/response validation
- Inline styles + a small `globals.css`; installable as a **PWA**

## Quick start

```bash
npm install
cp .env.example .env      # then add ANTHROPIC_API_KEY + DATABASE_URL
npm run dev               # http://localhost:3000
```

You need both `ANTHROPIC_API_KEY` and a Neon `DATABASE_URL` to run — there's no
local-file fallback. Tables are created automatically on the first request. It's
fine to point local dev at the same Neon database you use in production.

## Environment variables

See `.env.example` for the template. Summary:

| Variable | Required? | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | **Yes** | Powers the natural-language food lookup. |
| `DATABASE_URL` | **Yes** | Neon Postgres connection string (use the pooled one). |
| `APP_PASSWORD` | Optional | Single shared password gate. Unset = open app. Set for public deploys. |
| `NEXT_PUBLIC_API_BASE` / `EXPO_PUBLIC_API_BASE` | Optional | API origin for a future Expo/iOS client. |

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

Designed for Vercel. Set `ANTHROPIC_API_KEY`, your Neon `DATABASE_URL`, and an
`APP_PASSWORD` so the deploy isn't wide open. The `@neondatabase/serverless`
driver talks to Neon over HTTP, so it works cleanly in serverless functions
without connection-pool headaches.

## Project layout

```
app/            Next.js routes + API handlers (lookup, entries, goals, auth)
components/      Bar + Box terminal-UI primitives
lib/anthropic.ts  Anthropic REST call (food → macros)
lib/db.ts         libSQL client + schema bootstrap
lib/core/         Portable domain logic (types, macros, schema, prompt, theme)
middleware.ts     Optional password gate
```

`lib/core/` is intentionally framework-free (no React/Next/DOM) so it can be
lifted into a shared package when the planned Expo/iOS app arrives.

For deeper architectural context (for humans and AI agents), see `CLAUDE.md`.
