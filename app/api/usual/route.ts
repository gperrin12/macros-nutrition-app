import { sql, ensureSchema } from "@/lib/db";
import { mealSchema } from "@/lib/core/schema";
import { EMPTY_USUAL_MEALS, shift, today, USUAL_LOOKBACK_DAYS } from "@/lib/core/macros";
import { requireEmail } from "@/lib/session";
import type { UsualMeals } from "@/lib/core/types";

export const runtime = "nodejs";

// Rank this user's plates per meal over the last ~4 weeks.
// A plate is every food in that meal bucket on a given date (yogurt + oats +
// almond butter counts as one breakfast, not three). Same foods/servings
// (normalized) tally together; the most frequent wins, preferring multi-item
// plates, then recency.
export async function GET() {
  const session = await requireEmail();
  if ("error" in session) return session.error;
  await ensureSchema();

  const asOf = today();
  const from = shift(asOf, -(USUAL_LOOKBACK_DAYS - 1));

  const rows = await sql`
    WITH plates AS (
      SELECT
        meal,
        date,
        COUNT(*)::int AS items,
        string_agg(
          CASE
            WHEN btrim(serving) <> '' THEN btrim(serving) || ' ' || btrim(food)
            ELSE btrim(food)
          END,
          ', ' ORDER BY ts
        ) AS prompt,
        string_agg(
          regexp_replace(lower(btrim(food)), '[^a-z0-9]', '', 'g')
            || chr(1)
            || lower(btrim(serving)),
          chr(10)
          ORDER BY
            regexp_replace(lower(btrim(food)), '[^a-z0-9]', '', 'g'),
            lower(btrim(serving))
        ) AS combo_key
      FROM entries
      WHERE user_id = ${session.email}
        AND date >= ${from}
        AND date <= ${asOf}
        AND btrim(food) <> ''
      GROUP BY meal, date
    ),
    scores AS (
      SELECT
        meal,
        combo_key,
        COUNT(*)::int AS n,
        MAX(date) AS last_date,
        MAX(items) AS items
      FROM plates
      GROUP BY meal, combo_key
    ),
    best AS (
      SELECT DISTINCT ON (meal)
        meal, combo_key, last_date
      FROM scores
      ORDER BY meal, (items >= 2) DESC, n DESC, last_date DESC
    )
    SELECT b.meal, p.prompt
    FROM best b
    JOIN plates p
      ON p.meal = b.meal
     AND p.combo_key = b.combo_key
     AND p.date = b.last_date
  `;

  const usual: UsualMeals = { ...EMPTY_USUAL_MEALS };
  for (const row of rows) {
    const meal = mealSchema.safeParse(row.meal);
    const prompt = typeof row.prompt === "string" ? row.prompt.trim() : "";
    if (meal.success && prompt) usual[meal.data] = prompt;
  }
  return Response.json(usual);
}
