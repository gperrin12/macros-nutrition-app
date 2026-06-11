import { neon } from "@neondatabase/serverless";
import { DEFAULT_GOALS } from "@/lib/core/macros";

// Neon Postgres over HTTP — purpose-built for serverless (Vercel) route handlers,
// no connection pool to manage. Set DATABASE_URL to your Neon connection string.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const sql = neon(url);

let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        calories INTEGER NOT NULL,
        protein INTEGER NOT NULL,
        carbs INTEGER NOT NULL,
        fat INTEGER NOT NULL
      )`;
      await sql`CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        food TEXT NOT NULL,
        serving TEXT NOT NULL DEFAULT '',
        calories INTEGER NOT NULL DEFAULT 0,
        protein INTEGER NOT NULL DEFAULT 0,
        carbs INTEGER NOT NULL DEFAULT 0,
        fat INTEGER NOT NULL DEFAULT 0,
        ts BIGINT NOT NULL
      )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (date)`;
      const seeded = await sql`SELECT id FROM goals WHERE id = 1`;
      if (seeded.length === 0) {
        await sql`INSERT INTO goals (id, calories, protein, carbs, fat)
          VALUES (1, ${DEFAULT_GOALS.calories}, ${DEFAULT_GOALS.protein}, ${DEFAULT_GOALS.carbs}, ${DEFAULT_GOALS.fat})`;
      }
    })().catch((e) => {
      ready = null; // allow retry on next request if init failed
      throw e;
    });
  }
  return ready;
}
