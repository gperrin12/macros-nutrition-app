"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { api } from "@/lib/core/api-client";
import {
  DEFAULT_GOALS,
  HISTORY_WINDOWS,
  MAC,
  MACRO_KEYS,
  MEALS,
  MEAL_LABEL,
  buildCSV,
  buildJSON,
  defaultMeal,
  emptyTotals,
  entriesByMeal,
  num,
  prettyDate,
  sumEntries,
  today,
  uid,
  usualMealText,
  windowDates,
  type HistoryWindow,
} from "@/lib/core/macros";
import { COLORS, MACRO_COLOR } from "@/lib/core/theme";
import { parseWeightCsv } from "@/lib/core/weight";
import type { Entry, Goals, Meal, WeightLog } from "@/lib/core/types";
import { Bar } from "@/components/Bar";
import { Box } from "@/components/Box";
import { DatePicker } from "@/components/DatePicker";
import { LineChart } from "@/components/LineChart";

type Staged = {
  id: string;
  meal: Meal;
  food: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

function EntryRow({ e, onRemove }: { e: Entry; onRemove: (id: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "9px 12px", gap: 10 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: COLORS.bone, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.food}</div>
        <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 1 }}>
          {e.serving ? e.serving + "  " : ""}
          <span style={{ color: COLORS.protein }}>{e.protein}p</span> <span style={{ color: COLORS.carbs }}>{e.carbs}c</span>{" "}
          <span style={{ color: COLORS.fat }}>{e.fat}f</span> <span style={{ color: COLORS.fiber }}>{e.fiber}fi</span>
        </div>
      </div>
      <span style={{ color: COLORS.calories, width: 56, textAlign: "right" }}>{e.calories}</span>
      <button className="gbtn" onClick={() => onRemove(e.id)}>×</button>
    </div>
  );
}

function HistoryChart({
  title,
  goal,
  history,
  color,
  unit,
  domain,
}: {
  title: string;
  goal: number;
  history: { date: string; value: number }[];
  color: string;
  unit: string;
  domain: { start: string; end: string };
}) {
  return (
    <Box title={title}>
      <LineChart days={history} goal={goal} color={color} unit={unit} domain={domain} />
    </Box>
  );
}

function mergeWeights(prev: WeightLog[], incoming: WeightLog[]): WeightLog[] {
  const by = new Map(prev.map((w) => [w.date, w]));
  for (const w of incoming) by.set(w.date, w);
  return [...by.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

function Stat({ mk, val, goal, big }: { mk: (typeof MAC)[number]; val: number; goal: number; big?: boolean }) {
  const left = goal - val;
  const over = val > goal;
  const warn = over && mk.cap;
  const color = MACRO_COLOR[mk.key];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: big ? 14 : 13, marginBottom: big ? 10 : 7 }}>
      <span style={{ color: COLORS.dim, width: 64, flexShrink: 0 }}>{mk.label}</span>
      <Bar value={val} goal={goal} cells={big ? 24 : 18} color={color} cap={mk.cap} />
      <span style={{ marginLeft: "auto", whiteSpace: "nowrap", flexShrink: 0 }}>
        <span style={{ color: warn ? COLORS.fat : color }}>{val}</span>
        <span style={{ color: COLORS.dim }}>/{goal} {mk.unit}</span>
        <span style={{ color: warn ? COLORS.fat : over ? color : COLORS.dim, marginLeft: 8 }}>
          {over ? `+${-left}` : `${left} left`}
        </span>
      </span>
    </div>
  );
}

export default function Page() {
  const { data: session } = useSession();
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"today" | "history" | "export">("today");
  const [date, setDate] = useState(today());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [editGoals, setEditGoals] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [meal, setMeal] = useState<Meal>(() => defaultMeal());
  const [histWindow, setHistWindow] = useState<HistoryWindow>("14d");

  useEffect(() => {
    (async () => {
      try {
        const [g, e, w] = await Promise.all([api.getGoals(), api.getEntries(), api.getWeights()]);
        setGoals(g);
        setEntries(e);
        setWeights(w);
      } catch (ex) {
        console.error(ex);
        setErr("could not reach the server — is it running?");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const dayEntries = useMemo(() => entries.filter((e) => e.date === date), [entries, date]);
  const byMeal = useMemo(() => entriesByMeal(dayEntries), [dayEntries]);
  const totals = useMemo(() => sumEntries(dayEntries), [dayEntries]);
  const usual = useMemo(() => usualMealText(entries, meal), [entries, meal]);

  async function lookup(text?: string) {
    const q = (text ?? input).trim() || usual || "";
    if (!q || loading) return;
    setLoading(true);
    setErr("");
    setNote("");
    try {
      const res = await api.lookup(q);
      setStaged(res.items.map((it) => ({ id: uid(), meal, ...it })));
      setNote(res.note);
      setInput("");
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : "";
      if (msg.startsWith("401")) setErr("not signed in — refresh and sign in again");
      else if (msg.startsWith("502")) setErr("lookup failed — check ANTHROPIC_API_KEY on the server");
      else if (msg.startsWith("422")) setErr("no items parsed — rephrase, or add a row manually");
      else setErr(msg ? `lookup failed — ${msg}` : "lookup failed — try again or add a row manually");
    }
    setLoading(false);
  }

  const editStaged = (id: string, field: keyof Staged, val: string) =>
    setStaged((s) =>
      s.map((it) =>
        it.id === id ? { ...it, [field]: field === "food" || field === "serving" ? val : num(val) } : it,
      ),
    );
  const addManual = () =>
    setStaged((s) => [...s, { id: uid(), meal, food: "", serving: "", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }]);

  async function logStaged() {
    const items = staged.filter((it) => it.food.trim()).map(({ id, ...rest }) => rest);
    if (!items.length) return;
    const captured = date;
    setStaged([]);
    setNote("");
    try {
      const created = await api.createEntries(captured, items);
      setEntries((p) => [...p, ...created]);
    } catch {
      setErr("could not save — try again");
    }
  }

  async function removeEntry(id: string) {
    setEntries((p) => p.filter((e) => e.id !== id));
    try {
      await api.deleteEntry(id);
    } catch {
      console.error("delete failed for", id);
    }
  }

  function saveGoals(g: Goals) {
    setGoals(g);
    api.putGoals(g).catch(() => setErr("could not save targets"));
  }

  const histDays = useMemo(() => {
    const n = HISTORY_WINDOWS.find((w) => w.key === histWindow)?.days ?? 14;
    return windowDates(today(), n);
  }, [histWindow]);
  const histDomain = useMemo(
    () => ({ start: histDays[0], end: histDays[histDays.length - 1] }),
    [histDays],
  );

  const history = useMemo(() => {
    const by: Record<string, Goals> = {};
    const start = histDomain.start;
    const end = histDomain.end;
    for (const e of entries) {
      if (e.date < start || e.date > end) continue;
      by[e.date] ||= emptyTotals();
      MACRO_KEYS.forEach((k) => (by[e.date][k] += e[k] || 0));
    }
    return histDays.map((d) => ({ date: d, ...(by[d] || emptyTotals()) }));
  }, [entries, histDays, histDomain]);

  const weightHistory = useMemo(
    () => weights.filter((w) => w.date >= histDomain.start && w.date <= histDomain.end),
    [weights, histDomain],
  );

  const loggedDays = useMemo(() => new Set(entries.map((e) => e.date)).size, [entries]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "18px 14px 70px" }}>
      <div className="scan" />

      {/* title + menu */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ color: COLORS.accent, fontSize: 17, letterSpacing: 1, textShadow: `0 0 8px ${COLORS.accent}55` }}>macros</span>
          <span className="cur" style={{ fontSize: 17 }}>▊</span>
          <span style={{ color: COLORS.dim, fontSize: 11 }}>v0.1</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {session ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {session.user?.email && (
                <span style={{ color: COLORS.dim, fontSize: 11 }}>{session.user.email}</span>
              )}
              <button className="gbtn" onClick={() => signOut({ callbackUrl: "/login" })}>[ sign out ]</button>
            </span>
          ) : (
            <a href="/login" className="gbtn" style={{ textDecoration: "none" }}>
              [ sign in ]
            </a>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            {(["today", "history", "export"] as const).map((k) => (
              <div key={k} className={`tab${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>
                {k.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {loaded && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <button
            type="button"
            className="gbtn"
            onClick={() => setCalendarOpen(true)}
            style={{
              color: COLORS.bright,
              letterSpacing: 1,
              fontSize: 13,
              border: `1px solid ${calendarOpen ? COLORS.accent : COLORS.border}`,
              padding: "6px 14px",
            }}
          >
            {prettyDate(date)}
            <span style={{ color: COLORS.accent, marginLeft: 8 }}>▼</span>
          </button>
        </div>
      )}
      {calendarOpen && (
        <DatePicker value={date} onChange={setDate} onClose={() => setCalendarOpen(false)} />
      )}

      {!loaded && <div style={{ color: COLORS.dim, padding: 40, textAlign: "center" }}>reading log<span className="cur">_</span></div>}

      {loaded && tab === "today" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Box title="TARGETS" right={editGoals ? undefined : "READOUT"}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
              <button className="gbtn" onClick={() => setEditGoals((v) => !v)}>{editGoals ? "[ done ]" : "[ edit ]"}</button>
            </div>
            {editGoals ? (
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {MAC.map((m) => (
                  <label key={m.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ color: COLORS.dim, fontSize: 11 }}>{m.label} {m.unit}</span>
                    <input className="num" style={{ width: 64 }} type="number" value={goals[m.key]} onChange={(e) => saveGoals({ ...goals, [m.key]: num(e.target.value) })} />
                  </label>
                ))}
              </div>
            ) : (
              <>
                <Stat mk={MAC[0]} val={totals.calories} goal={goals.calories} big />
                <div style={{ height: 1, background: COLORS.border, margin: "4px 0 10px" }} />
                {MAC.slice(1).map((m) => (
                  <Stat key={m.key} mk={m} val={totals[m.key]} goal={goals[m.key]} />
                ))}
              </>
            )}
          </Box>

          <WeightDay
            date={date}
            weights={weights}
            onSaved={(w) => setWeights((p) => mergeWeights(p, [w]))}
            onImported={(items) => setWeights((p) => mergeWeights(p, items))}
          />

          <Box title="LOG FOOD" right={MEAL_LABEL[meal]}>
            <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
              {MEALS.map((m) => (
                <div key={m} className={`tab${meal === m ? " on" : ""}`} onClick={() => setMeal(m)}>
                  {MEAL_LABEL[m]}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.inset, border: `1px solid ${COLORS.border}`, padding: "9px 11px" }}>
              <span style={{ color: COLORS.accent }}>&gt;</span>
              <input
                className="tin"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Tab" && !input.trim() && usual) {
                    e.preventDefault();
                    setInput(usual);
                    return;
                  }
                  if (e.key === "Enter") lookup();
                }}
                placeholder={usual ?? "2 eggs scrambled in butter, 1 banana"}
              />
              <button className="btn" onClick={() => lookup()} disabled={loading || (!input.trim() && !usual)}>
                {loading ? "READING…" : "LOOK UP"}
              </button>
            </div>
            {!input.trim() && usual && (
              <div style={{ color: COLORS.dim, fontSize: 12, marginTop: 8 }}>
                // usual {MEAL_LABEL[meal].toLowerCase()} · ⇥ accept · ↵ look up
              </div>
            )}
            {err && <div style={{ color: COLORS.fat, fontSize: 12, marginTop: 8 }}>! {err}</div>}
            {note && <div style={{ color: COLORS.dim, fontSize: 12, marginTop: 8 }}>// {note}</div>}

            {staged.length > 0 && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {staged.map((it) => (
                  <div key={it.id} style={{ border: `1px solid ${COLORS.border}`, padding: 9, display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <input className="txt" style={{ flex: 2, minWidth: 130 }} value={it.food} placeholder="food" onChange={(e) => editStaged(it.id, "food", e.target.value)} />
                      <input className="txt" style={{ flex: 1, minWidth: 90, color: COLORS.dim }} value={it.serving} placeholder="serving" onChange={(e) => editStaged(it.id, "serving", e.target.value)} />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {MAC.map((m) => (
                          <label key={m.key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ color: MACRO_COLOR[m.key], fontSize: 10, letterSpacing: 0.5 }}>{m.short}</span>
                            <input className="num" type="number" value={it[m.key]} onChange={(e) => editStaged(it.id, m.key, e.target.value)} />
                          </label>
                        ))}
                      </div>
                      <button className="gbtn" onClick={() => setStaged((s) => s.filter((x) => x.id !== it.id))}>[ x ]</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                  <button className="gbtn" onClick={addManual}>+ add row</button>
                  <button className="btn" onClick={logStaged}>WRITE {staged.length} →</button>
                </div>
              </div>
            )}
            {staged.length === 0 && <button className="gbtn" onClick={addManual} style={{ marginTop: 10 }}>+ add manually</button>}
          </Box>

          {/* logged — grouped by meal */}
          <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${COLORS.border}` }}>
            {dayEntries.length === 0 && (
              <div style={{ color: COLORS.dim, fontSize: 12, padding: "16px 12px", textAlign: "center" }}>
                — empty — pick a meal above and describe what you ate —
              </div>
            )}
            {MEALS.map((m, i) => {
              const items = byMeal[m];
              const sub = sumEntries(items);
              if (dayEntries.length === 0) return null;
              return (
                <div key={m} style={{ borderTop: i ? `1px solid ${COLORS.border}` : undefined }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      color: meal === m ? COLORS.accent : COLORS.dim,
                      fontSize: 11,
                      padding: "6px 12px",
                      letterSpacing: 1,
                      background: COLORS.inset,
                    }}
                  >
                    <span>{MEAL_LABEL[m]}</span>
                    <span style={{ color: sub.calories ? COLORS.bone : COLORS.dim }}>
                      {sub.calories ? `${sub.calories} kcal` : "—"}
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <div style={{ color: COLORS.dim, fontSize: 12, padding: "10px 12px" }}>—</div>
                  ) : (
                    items.map((e) => <EntryRow key={e.id} e={e} onRemove={removeEntry} />)
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loaded && tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ color: COLORS.dim, fontSize: 11, letterSpacing: 1 }}>WINDOW</span>
            <div style={{ display: "flex", gap: 4 }}>
              {HISTORY_WINDOWS.map((w) => (
                <div
                  key={w.key}
                  className={`tab${histWindow === w.key ? " on" : ""}`}
                  onClick={() => setHistWindow(w.key)}
                >
                  {w.label}
                </div>
              ))}
            </div>
          </div>
          <HistoryChart
            title="CALORIES"
            goal={goals.calories}
            history={history.map((d) => ({ date: d.date, value: d.calories }))}
            color={COLORS.calories}
            unit="kcal"
            domain={histDomain}
          />
          <HistoryChart
            title="PROTEIN"
            goal={goals.protein}
            history={history.map((d) => ({ date: d.date, value: d.protein }))}
            color={COLORS.protein}
            unit="g"
            domain={histDomain}
          />
          <Box title="WEIGHT" right={`${weightHistory.length} ${weightHistory.length === 1 ? "READ" : "READS"}`}>
            <LineChart
              days={weightHistory.map((w) => ({ date: w.date, value: w.weight }))}
              color={COLORS.accent}
              unit="lbs"
              fromZero={false}
              avgLabel="7pt avg"
              height={160}
              domain={histDomain}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
              <span style={{ color: COLORS.dim, fontSize: 12 }}>// csv: date, weight (lbs)</span>
              <WeightImport
                onImported={(items) => setWeights((p) => mergeWeights(p, items))}
              />
            </div>
          </Box>
          <div style={{ border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column" }}>
            {[...history].reverse().filter((d) => d.calories > 0).map((d, i) => (
              <div key={d.date} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderTop: i ? `1px solid ${COLORS.border}` : "none", fontSize: 12 }}>
                <span style={{ color: COLORS.bone }}>{prettyDate(d.date)}</span>
                <span>
                  <span style={{ color: COLORS.calories }}>{d.calories}</span> <span style={{ color: COLORS.protein }}>{d.protein}p</span> <span style={{ color: COLORS.carbs }}>{d.carbs}c</span> <span style={{ color: COLORS.fat }}>{d.fat}f</span> <span style={{ color: COLORS.fiber }}>{d.fiber}fi</span>
                </span>
              </div>
            ))}
            {history.every((d) => d.calories === 0) && <div style={{ color: COLORS.dim, fontSize: 12, padding: "16px 12px", textAlign: "center" }}>— no history yet —</div>}
          </div>
        </div>
      )}

      {loaded && tab === "export" && <ExportPane json={buildJSON(goals, entries)} csv={buildCSV(entries)} days={loggedDays} />}

      <div className="statusbar">
        <span><span style={{ color: COLORS.accent }}>↵</span> look up</span>
        <span><span style={{ color: COLORS.accent }}>⇥</span> usual</span>
        <span><span style={{ color: COLORS.accent }}>▼</span> pick day</span>
        <span><span style={{ color: COLORS.accent }}>×</span> remove</span>
        <span style={{ marginLeft: "auto" }}>saved to your db · yours to export</span>
      </div>
    </div>
  );
}

function WeightDay({
  date,
  weights,
  onSaved,
  onImported,
}: {
  date: string;
  weights: WeightLog[];
  onSaved: (w: WeightLog) => void;
  onImported: (items: WeightLog[]) => void;
}) {
  const existing = weights.find((w) => w.date === date);
  const [draft, setDraft] = useState(existing ? String(existing.weight) : "");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [localErr, setLocalErr] = useState("");
  const latest = weights.length ? weights[weights.length - 1] : null;

  useEffect(() => {
    const w = weights.find((x) => x.date === date);
    setDraft(w ? String(w.weight) : "");
  }, [date, weights]);

  async function save() {
    const n = Number(draft);
    if (!Number.isFinite(n) || n <= 0 || busy) return;
    setBusy(true);
    setLocalErr("");
    try {
      const saved = await api.putWeight(date, n);
      onSaved(saved);
      setFlash("saved");
      setTimeout(() => setFlash(""), 1400);
    } catch {
      setLocalErr("could not save weight");
    }
    setBusy(false);
  }

  return (
    <Box title="WEIGHT" right="LBS">
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.inset, border: `1px solid ${COLORS.border}`, padding: "9px 11px" }}>
        <span style={{ color: COLORS.accent }}>&gt;</span>
        <input
          className="tin"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="1"
          max="999"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="172.5"
        />
        <span style={{ color: COLORS.dim, fontSize: 12 }}>lbs</span>
        <button className="btn" onClick={save} disabled={busy || !draft.trim()}>
          {busy ? "WRITING…" : flash ? "SAVED ✓" : "WRITE"}
        </button>
      </div>
      {localErr && <div style={{ color: COLORS.fat, fontSize: 12, marginTop: 8 }}>! {localErr}</div>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
        <span style={{ color: COLORS.dim, fontSize: 12 }}>
          {existing
            ? `// ${existing.weight} lbs on this day`
            : latest
              ? `// last ${latest.weight} lbs · ${prettyDate(latest.date)}`
              : "// one reading per day"}
        </span>
        <WeightImport onImported={onImported} />
      </div>
    </Box>
  );
}

function WeightImport({ onImported }: { onImported: (items: WeightLog[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [localErr, setLocalErr] = useState("");

  async function onFile(file: File | undefined) {
    if (!file || busy) return;
    const text = await file.text();
    const { items, skipped } = parseWeightCsv(text);
    if (fileRef.current) fileRef.current.value = "";
    if (!items.length) {
      setLocalErr("csv had no weigh-ins — need date and weight columns");
      return;
    }
    setBusy(true);
    setLocalErr("");
    try {
      const saved = await api.importWeights(items);
      onImported(saved);
      setFlash(`imported ${saved.length}${skipped ? ` · skipped ${skipped}` : ""}`);
      setTimeout(() => setFlash(""), 3200);
    } catch {
      setLocalErr("could not import weights");
    }
    setBusy(false);
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {localErr && <span style={{ color: COLORS.fat, fontSize: 12 }}>! {localErr}</span>}
      <button className="gbtn" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? "[ importing… ]" : flash ? `[ ${flash} ]` : "[ import csv ]"}
      </button>
    </span>
  );
}

function ExportPane({ json, csv, days }: { json: string; csv: string; days: number }) {
  const [fmt, setFmt] = useState<"json" | "csv">("json");
  const [copied, setCopied] = useState(false);
  const text = fmt === "json" ? json : csv;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      const ta = document.getElementById("ex") as HTMLTextAreaElement | null;
      ta?.focus();
      ta?.select();
    }
  };
  const dl = () => {
    const blob = new Blob([text], { type: fmt === "json" ? "application/json" : "text/csv" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `macros.${fmt}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(u);
  };

  return (
    <Box title="EXPORT" right={`${days} ${days === 1 ? "DAY" : "DAYS"}`}>
      <div style={{ color: COLORS.dim, fontSize: 12, marginBottom: 12 }}>// dump the log, then load it into a Claude project</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["json", "csv"] as const).map((f) => (
            <div key={f} className={`tab${fmt === f ? " on" : ""}`} style={{ border: `1px solid ${fmt === f ? COLORS.accent : COLORS.border}` }} onClick={() => setFmt(f)}>
              {f.toUpperCase()}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={copy}>{copied ? "COPIED ✓" : "COPY"}</button>
          <button className="btn" onClick={dl}>DOWNLOAD</button>
        </div>
      </div>
      <textarea id="ex" readOnly value={text} style={{ width: "100%", height: 300, background: COLORS.inset, color: COLORS.bone, border: `1px solid ${COLORS.border}`, borderRadius: 0, padding: 11, fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
    </Box>
  );
}
