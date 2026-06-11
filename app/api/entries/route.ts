import { sql, ensureSchema } from "@/lib/db";
import { createEntriesSchema } from "@/lib/core/schema";
import { uid } from "@/lib/core/macros";
import type { Entry } from "@/lib/core/types";

export const runtime = "nodejs";

function rowToEntry(row: Record<string, unknown>): Entry {
  return {
    id: String(row.id),
    date: String(row.date),
    food: String(row.food),
    serving: String(row.serving ?? ""),
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    ts: Number(row.ts), // BIGINT comes back as a string; coerce to number
  };
}

// Single-user app: returning the whole log is fine and keeps the client simple
// (it slices days/history itself). Add ?from=&to= pagination if it ever grows.
export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM entries ORDER BY date ASC, ts ASC`;
  return Response.json(rows.map((row) => rowToEntry(row as Record<string, unknown>)));
}

export async function POST(req: Request) {
  await ensureSchema();
  const parsed = createEntriesSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid payload" }, { status: 400 });

  const { date, items } = parsed.data;
  const now = Date.now();
  const created: Entry[] = items.map((it, i) => ({
    id: uid(),
    date,
    food: it.food,
    serving: it.serving,
    calories: it.calories,
    protein: it.protein,
    carbs: it.carbs,
    fat: it.fat,
    ts: now + i,
  }));

  // One multi-row INSERT: build ($1..$9), ($10..$18), … and a flat params array.
  const cols = 9;
  const placeholders = created
    .map((_, i) => `(${Array.from({ length: cols }, (_, k) => `$${i * cols + k + 1}`).join(", ")})`)
    .join(", ");
  const params = created.flatMap((e) => [e.id, e.date, e.food, e.serving, e.calories, e.protein, e.carbs, e.fat, e.ts]);

  await sql.query(
    `INSERT INTO entries (id, date, food, serving, calories, protein, carbs, fat, ts) VALUES ${placeholders}`,
    params,
  );

  return Response.json(created, { status: 201 });
}
