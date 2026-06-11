// Portable domain types. No React, no Next, no DOM — safe to lift into a
// shared package when the Expo/iOS app arrives.

export type MacroKey = "calories" | "protein" | "carbs" | "fat";

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD (local)
  food: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ts: number; // epoch ms, for stable ordering within a day
}

// A single food the model returned, before it's committed to the log.
export interface LookupItem {
  food: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface LookupResult {
  items: LookupItem[];
  note: string;
}
