// One-time migration: single-user schema -> multi-user (keyed on email).
// Assigns all existing rows to OWNER_EMAIL. Idempotent and safe to re-run.
//
// Usage:
//   node --env-file=.env scripts/migrate-multiuser.mjs
// (requires DATABASE_URL and OWNER_EMAIL in the environment / .env)

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
const owner = process.env.OWNER_EMAIL;

if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
if (!owner) {
  console.error("OWNER_EMAIL is not set (the email you'll sign in with)");
  process.exit(1);
}

const sql = neon(url);

async function tableExists(table) {
  const r = await sql`SELECT 1 FROM information_schema.tables WHERE table_name = ${table}`;
  return r.length > 0;
}
async function columnExists(table, column) {
  const r = await sql`SELECT 1 FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}`;
  return r.length > 0;
}

console.log(`Migrating existing data to owner: ${owner}`);

if (await tableExists("entries")) {
  await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS user_id TEXT`;
  const res = await sql`UPDATE entries SET user_id = ${owner} WHERE user_id IS NULL`;
  await sql`ALTER TABLE entries ALTER COLUMN user_id SET NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries (user_id, date)`;
  console.log(`  entries: assigned ${res.length ?? 0} orphan rows, user_id NOT NULL + index ensured`);
} else {
  console.log("  entries: table not found, skipping (ensureSchema will create it)");
}

if (await tableExists("goals")) {
  await sql`ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await sql`UPDATE goals SET user_id = ${owner} WHERE user_id IS NULL`;
  if (await columnExists("goals", "id")) {
    await sql`ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_pkey`;
    await sql`ALTER TABLE goals DROP COLUMN IF EXISTS id`;
    await sql`ALTER TABLE goals ADD PRIMARY KEY (user_id)`;
    console.log("  goals: switched primary key from id to user_id");
  } else {
    console.log("  goals: already keyed on user_id, nothing to restructure");
  }
} else {
  console.log("  goals: table not found, skipping (ensureSchema will create it)");
}

console.log("Done.");
