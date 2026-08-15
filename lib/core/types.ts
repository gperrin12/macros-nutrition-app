// Portable domain types. No React, no Next, no DOM — safe to lift into a
// shared package when the Expo/iOS app arrives.

export type MacroKey = "calories" | "protein" | "carbs" | "fat" | "fiber";

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD (local)
  meal: Meal;
  food: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ts: number; // epoch ms, for stable ordering within a day
}

// Staged / POST payload — macros from lookup or manual entry, plus meal bucket.
export interface LogItem extends LookupItem {
  meal: Meal;
}

// A single food the model returned, before it's committed to the log.
export interface LookupItem {
  food: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface LookupResult {
  items: LookupItem[];
  note: string;
}

// One weigh-in per calendar day (lbs). Re-saving the same date overwrites.
export interface WeightLog {
  date: string; // YYYY-MM-DD (local)
  weight: number; // pounds
}
