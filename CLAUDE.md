# CLAUDE.md

Context for humans and AI agents working in this repo. Read this before making
changes.

## What this is

`macros` is a multi-user nutrition tracker. The defining feature: you log food
in **natural language** and an LLM (Claude Haiku) estimates the macros. It's a
Next.js 15 App Router app with a deliberately retro **amber-CRT terminal**
aesthetic — monospace, minimal, DOS-like (think the Claude Code TUI). Data lives
in **Neon Postgres** via `@neondatabase/serverless`. Auth is **Auth.js (NextAuth
v5)** OAuth, and every user's data is keyed on their **signed-in email**.

Keep that aesthetic in mind for any UI work: monospace everywhere, sharp corners
(no border radius), the palette in `lib/core/theme.ts`, lowercase/`UPPERCASE`
terminal-style labels, `>` prompts, blinking cursors, scanline overlay.

## Architecture at a glance

```
Browser (app/page.tsx, client component, wrapped in SessionProvider)
  │  calls lib/core/api-client.ts (typed fetch wrapper, same-origin cookies)
  ▼
Next API routes (app/api/*)  ── runtime = "nodejs"
  ├─ /api/lookup        → requireEmail() → lib/anthropic.ts → Anthropic REST
  ├─ /api/entries       → requireEmail() → lib/db.ts (scoped by user_id = email)
  ├─ /api/goals         → requireEmail() → lib/db.ts (scoped by user_id = email)
  └─ /api/auth/[...nextauth] → Auth.js (OAuth, JWT session cookie)
middleware.ts  ── Auth.js gate: redirects pages to /login, 401s API
auth.ts        ── NextAuth config (edge-safe, no DB imports)
```

### Key principle: `lib/core/` is portable

Everything in `lib/core/` is **framework-free** — no React, no Next, no DOM. The
author plans an Expo/iOS app and wants to lift this directory into a shared
package unchanged. **Do not import React/Next/DOM APIs into `lib/core/`.**

- `types.ts` — domain types (`Goals`, `Entry`, `LookupItem`, `LookupResult`)
- `macros.ts` — totals, date helpers, CSV/JSON export builders, `DEFAULT_GOALS`
- `schema.ts` — Zod schemas; coerce + clamp so sloppy model output still validates
- `prompt.ts` — the `LOOKUP_MODEL` + system prompt (the LLM contract)
- `theme.ts` — the colour palette and mono font stack (plain values, no CSS)
- `api-client.ts` — typed `fetch` wrapper; reuse it on web and future Expo

`prompt.ts` and `schema.ts` together are the heart of the app — the
natural-language → macros contract. **Keep them in sync:** if you change the JSON
shape in the system prompt, update the Zod schema, and vice versa.

## Data model

Neon Postgres DB, two tables (see `lib/db.ts`), both keyed on `user_id` (the
signed-in email):

- `goals` — one row per user (`user_id` PK), the daily targets. Seeded lazily
  from `DEFAULT_GOALS` the first time a user reads goals (in `GET /api/goals`),
  not in `ensureSchema()`.
- `entries` — one row per logged food. `id` is a short random string, `user_id`
  scopes ownership, `date` is `YYYY-MM-DD` text (local time), `ts` is epoch-ms
  (`BIGINT`) for stable intra-day ordering. Indexed on `(user_id, date)`.

`ensureSchema()` lazily creates tables on first request (no seeding); every API
route awaits it. `GET /api/entries` returns that user's **entire** log and the
client slices days/history itself.

### Auth + per-user scoping

- `auth.ts` is the NextAuth config (GitHub/Google, JWT sessions, no DB adapter).
  Keep it **edge-safe** — no DB imports — because `middleware.ts` uses it.
- Every DB route calls `requireEmail()` from `lib/session.ts`, which returns
  `{ email }` or `{ error: Response }` (a 401). The email is the `user_id`; all
  queries filter/insert by it. `DELETE` also matches `user_id` so you can't touch
  another user's rows.
- Open sign-up by design (anyone with GitHub/Google). To restrict, add a `signIn`
  callback allowlist in `auth.ts`.
- Migrating a pre-existing single-user DB: `scripts/migrate-multiuser.mjs` assigns
  orphan rows to `OWNER_EMAIL` and re-keys `goals`. Idempotent.

### Postgres gotchas (vs. the old libSQL layer)

- `lib/db.ts` exports `sql` from `neon(...)`. Tagged-template calls
  (`` sql`SELECT ...` ``) return the **rows array directly** — there is no
  `.rows` wrapper.
- Use `$1, $2, …` placeholders, not `?`. For dynamic/variable-length statements
  (e.g. the multi-row insert in `app/api/entries/route.ts`) use
  `sql.query(text, params)`.
- `BIGINT` (`ts`) comes back as a **string**; the row mappers coerce with
  `Number(...)`. `INTEGER` columns come back as numbers.

## Conventions

- **TypeScript, strict.** No `any`. Prefer the existing domain types.
- **Validate at the boundary.** Every API route parses input with a Zod schema
  from `lib/core/schema.ts` and returns a clear status code on failure.
- **Be forgiving with model output.** `lib/anthropic.ts` extracts the JSON object
  even if Claude wraps it in prose/fences; schemas `.catch()`/clamp bad fields.
- **Styling is inline** in components, with a few global classes in
  `app/globals.css`. Colours come from `theme.ts`, never hardcoded hex in JSX.
- **Routes are Node runtime** (`export const runtime = "nodejs"`).
- The repo is solo/minimalist by design: no test suite, no state library, no
  component framework. Match that restraint; don't add heavy dependencies without
  a strong reason.

## Environment

See `.env.example`. Required locally and in production: `ANTHROPIC_API_KEY`, a
Neon `DATABASE_URL`, `AUTH_SECRET` (`npx auth secret`), and at least one OAuth
provider pair (`AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` or the Google equivalents).
Set `AUTH_URL` in production. There is no local-file DB fallback (using the same
Neon DB for dev and prod is fine for a small app). `.env` is gitignored.

## Common commands

```bash
npm run dev     # dev server at http://localhost:3000
npm run build   # production build
npm run lint    # next lint
```

## When making changes

- Touching the LLM contract? Update **both** `prompt.ts` and `schema.ts`.
- Adding data fields? Update the `entries` table DDL in `db.ts`, the `Entry` type,
  the row mapper + insert column list in `app/api/entries/route.ts`, and the
  export builders in `macros.ts`.
- Adding a DB-backed API route? Call `requireEmail()` first and scope every query
  by the returned email.
- Keep `auth.ts` edge-safe (no DB imports) — it runs in middleware.
- New client → server calls go through `lib/core/api-client.ts`, not raw `fetch`
  in components.
- Keep `lib/core/` free of React/Next/DOM imports.
- Preserve the terminal aesthetic.
