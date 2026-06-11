import { sql, ensureSchema } from "@/lib/db";
import { goalsSchema } from "@/lib/core/schema";
import { DEFAULT_GOALS } from "@/lib/core/macros";
import { requireEmail } from "@/lib/session";
import type { Goals } from "@/lib/core/types";

export const runtime = "nodejs";

// Read the user's goals, seeding DEFAULT_GOALS the first time they have none.
async function readOrSeedGoals(email: string): Promise<Goals> {
  const rows = await sql`SELECT calories, protein, carbs, fat, fiber FROM goals WHERE user_id = ${email}`;
  if (rows.length === 0) {
    await sql`INSERT INTO goals (user_id, calories, protein, carbs, fat, fiber)
      VALUES (${email}, ${DEFAULT_GOALS.calories}, ${DEFAULT_GOALS.protein}, ${DEFAULT_GOALS.carbs}, ${DEFAULT_GOALS.fat}, ${DEFAULT_GOALS.fiber})
      ON CONFLICT (user_id) DO NOTHING`;
    return { ...DEFAULT_GOALS };
  }
  const row = rows[0];
  return {
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    fiber: Number(row.fiber ?? DEFAULT_GOALS.fiber),
  };
}

export async function GET() {
  const session = await requireEmail();
  if ("error" in session) return session.error;
  await ensureSchema();
  return Response.json(await readOrSeedGoals(session.email));
}

export async function PUT(req: Request) {
  const session = await requireEmail();
  if ("error" in session) return session.error;
  await ensureSchema();
  const parsed = goalsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid goals" }, { status: 400 });
  const g = parsed.data;
  await sql`INSERT INTO goals (user_id, calories, protein, carbs, fat, fiber)
    VALUES (${session.email}, ${g.calories}, ${g.protein}, ${g.carbs}, ${g.fat}, ${g.fiber})
    ON CONFLICT (user_id) DO UPDATE
    SET calories = EXCLUDED.calories, protein = EXCLUDED.protein, carbs = EXCLUDED.carbs, fat = EXCLUDED.fat, fiber = EXCLUDED.fiber`;
  return Response.json(g);
}
