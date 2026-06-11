# CLAUDE.md

Context for humans and AI agents working in this repo. Read this before making
changes.

## What this is

`macros` is a single-user nutrition tracker. The defining feature: you log food
in **natural language** and an LLM (Claude Haiku) estimates the macros. It's a
Next.js 15 App Router app with a deliberately retro **amber-CRT terminal**
aesthetic — monospace, minimal, DOS-like (think the Claude Code TUI). Data lives
in **Neon Postgres** via `@neondatabase/serverless`.

Keep that aesthetic in mind for any UI work: monospace everywhere, sharp corners
(no border radius), the palette in `lib/core/theme.ts`, lowercase/`UPPERCASE`
terminal-style labels, `>` prompts, blinking cursors, scanline overlay.

## Architecture at a glance

```
Browser (app/page.tsx, client component)
  │  calls lib/core/api-client.ts (typed fetch wrapper)
  ▼
Next API routes (app/api/*)  ── runtime = "nodejs"
  ├─ /api/lookup   → lib/anthropic.ts → Anthropic REST → Zod validate
  ├─ /api/entries  → lib/db.ts (Neon Postgres)
  ├─ /api/goals    → lib/db.ts (Neon Postgres)
  └─ /api/auth     → sets the session cookie
middleware.ts  ── optional password gate in front of everything
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

Single Neon Postgres DB, two tables (see `lib/db.ts`):

- `goals` — one row (`id = 1`), the daily targets. Seeded from `DEFAULT_GOALS`.
- `entries` — one row per logged food. `id` is a short random string, `date` is
  `YYYY-MM-DD` text (local time), `ts` is epoch-ms (`BIGINT`) for stable
  intra-day ordering.

`ensureSchema()` lazily creates tables + seeds goals on first request; every API
route awaits it. It's single-user, so `GET /api/entries` returns the **entire**
log and the client slices days/history itself.

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

## Auth

`middleware.ts` implements a minimal single-password gate. If `APP_PASSWORD` is
unset (local dev) it's a no-op. When set, unauthenticated API calls get 401 and
page loads redirect to `/login`; the password is stored verbatim in the
`macros_session` cookie. This is intentionally lightweight — replace with real
auth (Auth.js / Clerk) when the iOS app needs real sessions.

## Environment

See `.env.example`. Both `ANTHROPIC_API_KEY` and a Neon `DATABASE_URL` are
required locally and in production — there is no local-file DB fallback (using
the same Neon DB for dev and prod is fine for a solo app). `.env` is gitignored.

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
- New client → server calls go through `lib/core/api-client.ts`, not raw `fetch`
  in components.
- Keep `lib/core/` free of React/Next/DOM imports.
- Preserve the terminal aesthetic.
