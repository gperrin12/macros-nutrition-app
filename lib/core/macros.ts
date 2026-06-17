import type { Entry, Goals, MacroKey, Meal } from "./types";

export const MACRO_KEYS: MacroKey[] = ["calories", "protein", "carbs", "fat", "fiber"];

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "BREAKFAST",
  lunch: "LUNCH",
  dinner: "DINNER",
  snack: "SNACK",
};

const MEAL_ORDER: Record<Meal, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

export const MAC: { key: MacroKey; label: string; unit: string; short: string }[] = [
  { key: "calories", label: "CAL", unit: "kcal", short: "KCAL" },
  { key: "protein", label: "PROTEIN", unit: "g", short: "P" },
  { key: "carbs", label: "CARBS", unit: "g", short: "C" },
  { key: "fat", label: "FAT", unit: "g", short: "F" },
  { key: "fiber", label: "FIBER", unit: "g", short: "FI" },
];

export const DEFAULT_GOALS: Goals = { calories: 2800, protein: 175, carbs: 340, fat: 75, fiber: 35 };

export function emptyTotals(): Goals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

export function sumEntries(entries: Entry[]): Goals {
  const t = emptyTotals();
  for (const e of entries) for (const k of MACRO_KEYS) t[k] += e[k] || 0;
  return t;
}

export function entriesByMeal(entries: Entry[]): Record<Meal, Entry[]> {
  const out: Record<Meal, Entry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  for (const e of entries) {
    const m = MEALS.includes(e.meal) ? e.meal : "snack";
    out[m].push(e);
  }
  for (const m of MEALS) out[m].sort((a, b) => a.ts - b.ts);
  return out;
}

function compareEntries(a: Entry, b: Entry): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const ma = MEAL_ORDER[a.meal] ?? 3;
  const mb = MEAL_ORDER[b.meal] ?? 3;
  if (ma !== mb) return ma - mb;
  return a.ts - b.ts;
}

/* ---- dates (local time) ---- */
export const dstr = (d: Date | string | number): string => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const today = (): string => dstr(new Date());
export const shift = (s: string, n: number): string => {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + n);
  return dstr(d);
};
export const prettyDate = (s: string): string => {
  const d = new Date(s + "T00:00:00");
  const md = d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
  if (s === today()) return `TODAY · ${md}`;
  if (s === shift(today(), -1)) return `YESTERDAY · ${md}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()} ${md}`;
};
export const mmdd = (s: string): string => {
  const d = new Date(s + "T00:00:00");
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};

export const parseYmd = (s: string): { y: number; m: number; d: number } => {
  const x = new Date(s + "T00:00:00");
  return { y: x.getFullYear(), m: x.getMonth() + 1, d: x.getDate() };
};

export const shiftMonth = (year: number, month: number, n: number): { y: number; m: number } => {
  const x = new Date(year, month - 1 + n, 1);
  return { y: x.getFullYear(), m: x.getMonth() + 1 };
};

export const monthTitle = (year: number, month: number): string =>
  new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" }).toUpperCase();

/** Sunday-first grid: null pads leading cells, then YYYY-MM-DD strings. */
export function calendarGrid(year: number, month: number): (string | null)[] {
  const lead = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return cells;
}

/** Rough local-time guess for which meal bucket to pre-select. */
export function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export const uid = (): string => Math.random().toString(36).slice(2, 10);
export const num = (v: unknown): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
};

/* ---- export builders ---- */
export function buildJSON(goals: Goals, entries: Entry[]): string {
  const sorted = [...entries].sort(compareEntries);
  return JSON.stringify({ goals, entries: sorted }, null, 2);
}

export function buildCSV(entries: Entry[]): string {
  const esc = (s: unknown) => {
    const str = s == null ? "" : String(s);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const rows: (string | number)[][] = [
    ["date", "meal", "food", "serving", "calories", "protein", "carbs", "fat", "fiber"],
  ];
  [...entries].sort(compareEntries).forEach((e) =>
    rows.push([e.date, e.meal, esc(e.food), esc(e.serving), e.calories, e.protein, e.carbs, e.fat, e.fiber]),
  );
  return rows.map((r) => r.join(",")).join("\n");
}
