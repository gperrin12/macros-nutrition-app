import { neon } from "@neondatabase/serverless";

// Neon Postgres over HTTP — purpose-built for serverless (Vercel) route handlers,
// no connection pool to manage. Set DATABASE_URL to your Neon connection string.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const sql = neon(url);

let ready: Promise<void> | null = null;

// Multi-user schema (keyed on the signed-in email). For an existing single-user
// DB, run scripts/migrate-multiuser.mjs once — CREATE TABLE IF NOT EXISTS won't
// alter tables that already exist. Goals are seeded lazily per user, not here.
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS goals (
        user_id TEXT PRIMARY KEY,
        calories INTEGER NOT NULL,
        protein INTEGER NOT NULL,
        carbs INTEGER NOT NULL,
        fat INTEGER NOT NULL,
        fiber INTEGER NOT NULL DEFAULT 35
      )`;
      await sql`CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        food TEXT NOT NULL,
        serving TEXT NOT NULL DEFAULT '',
        calories INTEGER NOT NULL DEFAULT 0,
        protein INTEGER NOT NULL DEFAULT 0,
        carbs INTEGER NOT NULL DEFAULT 0,
        fat INTEGER NOT NULL DEFAULT 0,
        fiber INTEGER NOT NULL DEFAULT 0,
        meal TEXT NOT NULL DEFAULT 'snack',
        ts BIGINT NOT NULL
      )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries (user_id, date)`;
      // Idempotent column adds for DBs created before fiber was introduced.
      await sql`ALTER TABLE goals ADD COLUMN IF NOT EXISTS fiber INTEGER NOT NULL DEFAULT 35`;
      await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS fiber INTEGER NOT NULL DEFAULT 0`;
      await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS meal TEXT NOT NULL DEFAULT 'snack'`;
    })().catch((e) => {
      ready = null; // allow retry on next request if init failed
      throw e;
    });
  }
  return ready;
}
