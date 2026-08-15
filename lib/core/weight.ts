import type { WeightLog } from "./types";

// Portable CSV helpers for weigh-ins. No React, no Next, no DOM.

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const MDY = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/;

/** Normalize a date cell to YYYY-MM-DD. US M/D/YYYY (Sheets default) or ISO. */
export function parseWeightDate(raw: string): string | null {
  const s = raw.trim().replace(/^["']|["']$/g, "");
  const iso = s.match(YMD);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (!validYmd(y, m, d)) return null;
    return s;
  }
  const mdy = s.match(MDY);
  if (!mdy) return null;
  let y = Number(mdy[3]);
  if (y < 100) y += y >= 70 ? 1900 : 2000;
  const m = Number(mdy[1]);
  const d = Number(mdy[2]);
  if (!validYmd(y, m, d)) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function validYmd(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function parseWeightLbs(raw: string): number | null {
  const s = raw.trim().replace(/^["']|["']$/g, "").replace(/lbs?\.?$/i, "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n >= 1000) return null;
  return Math.round(n * 10) / 10;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function headerIndex(cells: string[], needle: string): number {
  return cells.findIndex((c) => c.trim().toLowerCase().includes(needle));
}

export interface ParsedWeightCsv {
  items: WeightLog[];
  skipped: number;
}

/**
 * Two-column time series: date + weight (lbs). Empty weight cells are skipped
 * (Sheets exports often leave gaps). Duplicate dates: last row wins.
 */
export function parseWeightCsv(text: string): ParsedWeightCsv {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { items: [], skipped: 0 };

  const first = splitCsvLine(lines[0]);
  let dateCol = 0;
  let weightCol = 1;
  let start = 0;

  const hiDate = headerIndex(first, "date");
  const hiWeight = headerIndex(first, "weight");
  if (hiDate >= 0 && hiWeight >= 0) {
    dateCol = hiDate;
    weightCol = hiWeight;
    start = 1;
  } else if (parseWeightDate(first[0] ?? "") === null) {
    // Unknown header row — skip it.
    start = 1;
  }

  const byDate = new Map<string, number>();
  let skipped = 0;

  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const date = parseWeightDate(cells[dateCol] ?? "");
    const weight = parseWeightLbs(cells[weightCol] ?? "");
    if (!date) {
      skipped++;
      continue;
    }
    if (weight === null) {
      skipped++;
      continue;
    }
    byDate.set(date, weight);
  }

  const items = [...byDate.entries()]
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return { items, skipped };
}
