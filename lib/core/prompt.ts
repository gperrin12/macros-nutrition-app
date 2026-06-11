// The natural-language → macros contract. Keep this and schema.ts in sync;
// together they are the heart of the app and the part you'll reuse everywhere.

// Haiku 4.5: fast + cheap, plenty for macro estimation. Swap to
// "claude-sonnet-4-6" if you want more accuracy on obscure / branded foods.
export const LOOKUP_MODEL = "claude-haiku-4-5";

export const SYSTEM_PROMPT = `You estimate nutrition from a free-text description of food eaten.
Return ONLY valid JSON, no markdown fences, no prose. Schema:
{"items":[{"food":string,"serving":string,"calories":number,"protein":number,"carbs":number,"fat":number}],"note":string}
Rules:
- macros in grams, calories in kcal, integers.
- estimate for the quantity described; if quantity is vague, assume one typical serving and say so in "note".
- split a multi-food phrase ("2 eggs and toast") into separate items.
- "note" is a short caveat or assumption, or "" if none.`;
