import { sql, ensureSchema } from "@/lib/db";
import { importWeightsSchema, upsertWeightSchema } from "@/lib/core/schema";
import { requireEmail } from "@/lib/session";
import type { WeightLog } from "@/lib/core/types";

export const runtime = "nodejs";

function rowToWeight(row: Record<string, unknown>): WeightLog {
  return {
    date: String(row.date),
    weight: Math.round(Number(row.weight) * 10) / 10,
  };
}

export async function GET() {
  const session = await requireEmail();
  if ("error" in session) return session.error;
  await ensureSchema();
  const rows = await sql`SELECT date, weight FROM weights WHERE user_id = ${session.email} ORDER BY date ASC`;
  return Response.json(rows.map((row) => rowToWeight(row as Record<string, unknown>)));
}

// One weigh-in for a day. Re-saving the same date overwrites.
export async function PUT(req: Request) {
  const session = await requireEmail();
  if ("error" in session) return session.error;
  await ensureSchema();
  const parsed = upsertWeightSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid weight" }, { status: 400 });
  const { date, weight } = parsed.data;
  await sql`INSERT INTO weights (user_id, date, weight)
    VALUES (${session.email}, ${date}, ${weight})
    ON CONFLICT (user_id, date) DO UPDATE SET weight = EXCLUDED.weight`;
  return Response.json({ date, weight });
}

// Bulk upsert — CSV import. Last row for a given date wins (already collapsed
// client-side; ON CONFLICT still covers races / re-imports).
export async function POST(req: Request) {
  const session = await requireEmail();
  if ("error" in session) return session.error;
  await ensureSchema();
  const parsed = importWeightsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid payload" }, { status: 400 });

  const { items } = parsed.data;
  const cols = 3;
  const placeholders = items
    .map((_, i) => `(${Array.from({ length: cols }, (_, k) => `$${i * cols + k + 1}`).join(", ")})`)
    .join(", ");
  const params = items.flatMap((it) => [session.email, it.date, it.weight]);

  await sql.query(
    `INSERT INTO weights (user_id, date, weight) VALUES ${placeholders}
     ON CONFLICT (user_id, date) DO UPDATE SET weight = EXCLUDED.weight`,
    params,
  );

  return Response.json(items, { status: 201 });
}
