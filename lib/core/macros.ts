import type { Entry, Goals, MacroKey } from "./types";

export const MACRO_KEYS: MacroKey[] = ["calories", "protein", "carbs", "fat", "fiber"];

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

export const uid = (): string => Math.random().toString(36).slice(2, 10);
export const num = (v: unknown): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
};

/* ---- export builders ---- */
export function buildJSON(goals: Goals, entries: Entry[]): string {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.ts - b.ts));
  return JSON.stringify({ goals, entries: sorted }, null, 2);
}

export function buildCSV(entries: Entry[]): string {
  const esc = (s: unknown) => {
    const str = s == null ? "" : String(s);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const rows: (string | number)[][] = [
    ["date", "food", "serving", "calories", "protein", "carbs", "fat", "fiber"],
  ];
  [...entries]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.ts - b.ts))
    .forEach((e) =>
      rows.push([e.date, esc(e.food), esc(e.serving), e.calories, e.protein, e.carbs, e.fat, e.fiber]),
    );
  return rows.map((r) => r.join(",")).join("\n");
}
