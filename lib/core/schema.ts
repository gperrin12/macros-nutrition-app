import { z } from "zod";

// Coerce + clamp so a sloppy model response still validates instead of 500-ing.
const macroNum = z.coerce.number().finite().transform((n) => Math.max(0, Math.round(n)));

export const lookupItemSchema = z.object({
  food: z.string().trim().min(1).catch("item"),
  serving: z.string().trim().catch(""),
  calories: macroNum.catch(0),
  protein: macroNum.catch(0),
  carbs: macroNum.catch(0),
  fat: macroNum.catch(0),
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
});

// POST /api/entries — commit one or more staged items to a given day.
export const createEntriesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(lookupItemSchema).min(1),
});

export const lookupRequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export type GoalsInput = z.infer<typeof goalsSchema>;
export type CreateEntriesInput = z.infer<typeof createEntriesSchema>;
