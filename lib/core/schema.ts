import { z } from "zod";

// Coerce + clamp so a sloppy model response still validates instead of 500-ing.
const macroNum = z.coerce.number().finite().transform((n) => Math.max(0, Math.round(n)));

export const mealSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export const lookupItemSchema = z.object({
  food: z.string().trim().min(1).catch("item"),
  serving: z.string().trim().catch(""),
  calories: macroNum.catch(0),
  protein: macroNum.catch(0),
  carbs: macroNum.catch(0),
  fat: macroNum.catch(0),
  fiber: macroNum.catch(0),
});

export const lookupResultSchema = z.object({
  items: z.array(lookupItemSchema).default([]),
  note: z.string().catch(""),
});

export const goalsSchema = z.object({
  calories: macroNum,
  protein: macroNum,
  carbs: macroNum,
  fat: macroNum,
  fiber: macroNum,
});

// POST /api/entries — commit one or more staged items to a given day.
export const logItemSchema = lookupItemSchema.extend({ meal: mealSchema });

export const createEntriesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(logItemSchema).min(1),
});

export const lookupRequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// One decimal place, typical bathroom-scale precision. Clamp to a humane range
// so a pasted typo can't write 0 or 99999 into the chart.
export const weightLbsSchema = z.coerce
  .number()
  .finite()
  .refine((n) => n > 0 && n < 1000, "weight must be between 0 and 1000 lbs")
  .transform((n) => Math.round(n * 10) / 10);

export const upsertWeightSchema = z.object({
  date: ymd,
  weight: weightLbsSchema,
});

export const importWeightsSchema = z.object({
  items: z.array(upsertWeightSchema).min(1).max(5000),
});

export type GoalsInput = z.infer<typeof goalsSchema>;
export type CreateEntriesInput = z.infer<typeof createEntriesSchema>;
export type UpsertWeightInput = z.infer<typeof upsertWeightSchema>;
export type ImportWeightsInput = z.infer<typeof importWeightsSchema>;
