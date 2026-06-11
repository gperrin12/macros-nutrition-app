import { sql, ensureSchema } from "@/lib/db";
import { goalsSchema } from "@/lib/core/schema";
import type { Goals } from "@/lib/core/types";

export const runtime = "nodejs";

async function readGoals(): Promise<Goals> {
  const rows = await sql`SELECT calories, protein, carbs, fat FROM goals WHERE id = 1`;
  const row = rows[0];
  return {
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
  };
}

export async function GET() {
  await ensureSchema();
  return Response.json(await readGoals());
}

export async function PUT(req: Request) {
  await ensureSchema();
  const parsed = goalsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid goals" }, { status: 400 });
  const g = parsed.data;
  await sql`UPDATE goals SET calories = ${g.calories}, protein = ${g.protein}, carbs = ${g.carbs}, fat = ${g.fat} WHERE id = 1`;
  return Response.json(await readGoals());
}
