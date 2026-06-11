// Plain colour values — no CSS, no Tailwind — so an Expo app can import the
// exact same palette. The amber-CRT terminal look.
import type { MacroKey } from "./types";

export const COLORS = {
  bg: "#0C0D0B",
  panel: "#121310",
  inset: "#0A0B09",
  border: "#2C2D27",
  dim: "#6A6B62",
  bone: "#CAC8BC",
  bright: "#EAE6DA",
  accent: "#E0A85C", // amber chrome / prompt / selection
  calories: "#EAE6DA",
  protein: "#7BC97F",
  carbs: "#D9CE7A",
  fat: "#E5604E",
  fiber: "#9BB5C8",
} as const;

export const MACRO_COLOR: Record<MacroKey, string> = {
  calories: COLORS.calories,
  protein: COLORS.protein,
  carbs: COLORS.carbs,
  fat: COLORS.fat,
  fiber: COLORS.fiber,
};

export const MONO = `"SFMono-Regular", "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace`;
