import type { Entry, Goals, LogItem, LookupResult, WeightLog } from "./types";

// Same-origin on web. For the future Expo app, set EXPO_PUBLIC_API_BASE to the
// deployed origin and reuse this file unchanged.
const BASE =
  (typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_API_BASE || process.env.EXPO_PUBLIC_API_BASE)) ||
  "";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body}` : ""}`);
  }
  return res.json() as Promise<T>;
}

const JSON_HEADERS = { "content-type": "application/json" };

const FETCH_OPTS: RequestInit = { credentials: "include" };

export const api = {
  lookup: (text: string) =>
    fetch(`${BASE}/api/lookup`, {
      ...FETCH_OPTS,
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ text }),
    }).then((r) => j<LookupResult>(r)),

  getGoals: () => fetch(`${BASE}/api/goals`, FETCH_OPTS).then((r) => j<Goals>(r)),
  putGoals: (goals: Goals) =>
    fetch(`${BASE}/api/goals`, {
      ...FETCH_OPTS,
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(goals),
    }).then((r) => j<Goals>(r)),

  getEntries: () => fetch(`${BASE}/api/entries`, FETCH_OPTS).then((r) => j<Entry[]>(r)),
  createEntries: (date: string, items: LogItem[]) =>
    fetch(`${BASE}/api/entries`, {
      ...FETCH_OPTS,
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ date, items }),
    }).then((r) => j<Entry[]>(r)),
  deleteEntry: (id: string) =>
    fetch(`${BASE}/api/entries/${id}`, { ...FETCH_OPTS, method: "DELETE" }).then((r) => j<{ ok: true }>(r)),

  getWeights: () => fetch(`${BASE}/api/weights`, FETCH_OPTS).then((r) => j<WeightLog[]>(r)),
  putWeight: (date: string, weight: number) =>
    fetch(`${BASE}/api/weights`, {
      ...FETCH_OPTS,
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ date, weight }),
    }).then((r) => j<WeightLog>(r)),
  importWeights: (items: WeightLog[]) =>
    fetch(`${BASE}/api/weights`, {
      ...FETCH_OPTS,
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ items }),
    }).then((r) => j<WeightLog[]>(r)),
};
