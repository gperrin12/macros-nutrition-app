"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { api } from "@/lib/core/api-client";
import {
  DEFAULT_GOALS,
  MAC,
  buildCSV,
  buildJSON,
  mmdd,
  num,
  prettyDate,
  shift,
  sumEntries,
  today,
  uid,
} from "@/lib/core/macros";
import { COLORS, MACRO_COLOR } from "@/lib/core/theme";
import type { Entry, Goals, MacroKey } from "@/lib/core/types";
import { Bar } from "@/components/Bar";
import { Box } from "@/components/Box";

type Staged = { id: string; food: string; serving: string; calories: number; protein: number; carbs: number; fat: number };

function Stat({ mk, val, goal, big }: { mk: (typeof MAC)[number]; val: number; goal: number; big?: boolean }) {
  const left = goal - val;
  const over = val > goal;
  const color = MACRO_COLOR[mk.key];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: big ? 14 : 13, marginBottom: big ? 10 : 7 }}>
      <span style={{ color: COLORS.dim, width: 64, flexShrink: 0 }}>{mk.label}</span>
      <Bar value={val} max={goal} goal={null} cells={big ? 24 : 18} color={color} />
      <span style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
        <span style={{ color: over ? COLORS.fat : color }}>{val}</span>
        <span style={{ color: COLORS.dim }}>/{goal} {mk.unit}</span>
        <span style={{ color: over ? COLORS.fat : COLORS.dim, marginLeft: 8 }}>{over ? `+${-left}` : `${left} left`}</span>
      </span>
    </div>
  );
}

export default function Page() {
  const { data: session } = useSession();
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"today" | "history" | "export">("today");
  const [date, setDate] = useState(today());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [editGoals, setEditGoals] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [g, e] = await Promise.all([api.getGoals(), api.getEntries()]);
        setGoals(g);
        setEntries(e);
      } catch (ex) {
        console.error(ex);
        setErr("could not reach the server — is it running?");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const dayEntries = useMemo(() => entries.filter((e) => e.date === date), [entries, date]);
  const totals = useMemo(() => sumEntries(dayEntries), [dayEntries]);

  async function lookup() {
    const q = input.trim();
    if (!q || loading) return;
    setLoading(true);
    setErr("");
    setNote("");
    try {
      const res = await api.lookup(q);
      setStaged(res.items.map((it) => ({ id: uid(), ...it })));
      setNote(res.note);
      setInput("");
    } catch {
      setErr("parse error — rephrase, or add a row manually");
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
    setStaged((s) => [...s, { id: uid(), food: "", serving: "", calories: 0, protein: 0, carbs: 0, fat: 0 }]);

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

  const history = useMemo(() => {
    const days = [...Array(14)].map((_, i) => shift(today(), -(13 - i)));
    const by: Record<string, Goals> = {};
    for (const e of entries) {
      by[e.date] ||= { calories: 0, protein: 0, carbs: 0, fat: 0 };
      (["calories", "protein", "carbs", "fat"] as MacroKey[]).forEach((k) => (by[e.date][k] += e[k] || 0));
    }
    return days.map((d) => ({ date: d, ...(by[d] || { calories: 0, protein: 0, carbs: 0, fat: 0 }) }));
  }, [entries]);

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
          {session?.user?.email && (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: COLORS.dim, fontSize: 11 }}>{session.user.email}</span>
              <button className="gbtn" onClick={() => signOut({ callbackUrl: "/login" })}>[ sign out ]</button>
            </span>
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

      {!loaded && <div style={{ color: COLORS.dim, padding: 40, textAlign: "center" }}>reading log<span className="cur">_</span></div>}

      {loaded && tab === "today" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button className="gbtn" onClick={() => setDate(shift(date, -1))} style={{ fontSize: 16 }}>◂</button>
            <span style={{ color: COLORS.bright, letterSpacing: 1, fontSize: 13 }}>{prettyDate(date)}</span>
            <button className="gbtn" onClick={() => setDate(shift(date, 1))} disabled={date === today()} style={{ fontSize: 16, opacity: date === today() ? 0.3 : 1 }}>▸</button>
          </div>

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

          <Box title="LOG FOOD">
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.inset, border: `1px solid ${COLORS.border}`, padding: "9px 11px" }}>
              <span style={{ color: COLORS.accent }}>&gt;</span>
              <input className="tin" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookup()} placeholder="2 eggs scrambled in butter, 1 banana" />
              <button className="btn" onClick={lookup} disabled={loading || !input.trim()}>{loading ? "READING…" : "LOOK UP"}</button>
            </div>
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
                            <span style={{ color: MACRO_COLOR[m.key], fontSize: 10, letterSpacing: 0.5 }}>{m.key === "calories" ? "KCAL" : m.label[0]}</span>
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

          {/* logged */}
          <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", color: COLORS.dim, fontSize: 11, padding: "6px 12px", borderBottom: `1px solid ${COLORS.border}`, letterSpacing: 1 }}>
              <span style={{ flex: 1 }}>ENTRY</span>
              <span style={{ width: 56, textAlign: "right" }}>KCAL</span>
            </div>
            {dayEntries.length === 0 && <div style={{ color: COLORS.dim, fontSize: 12, padding: "16px 12px", textAlign: "center" }}>— empty — describe what you ate above —</div>}
            {dayEntries.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", padding: "9px 12px", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: COLORS.bone, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.food}</div>
                  <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 1 }}>
                    {e.serving ? e.serving + "  " : ""}
                    <span style={{ color: COLORS.protein }}>{e.protein}p</span> <span style={{ color: COLORS.carbs }}>{e.carbs}c</span> <span style={{ color: COLORS.fat }}>{e.fat}f</span>
                  </div>
                </div>
                <span style={{ color: COLORS.calories, width: 56, textAlign: "right" }}>{e.calories}</span>
                <button className="gbtn" onClick={() => removeEntry(e.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loaded && tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Box title="CALORIES" right="14 DAYS">
            {(() => {
              const max = Math.max(goals.calories, ...history.map((d) => d.calories), 1);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                  {history.map((d) => (
                    <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: COLORS.dim, width: 44, flexShrink: 0 }}>{mmdd(d.date)}</span>
                      <Bar value={d.calories} max={max} goal={goals.calories} cells={26} color={COLORS.calories} />
                      <span style={{ marginLeft: "auto", color: d.calories > goals.calories ? COLORS.fat : d.calories ? COLORS.bone : COLORS.dim }}>{d.calories || "·"}</span>
                    </div>
                  ))}
                  <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 8 }}>
                    <span style={{ color: COLORS.accent }}>│</span> target {goals.calories} &nbsp; <span style={{ color: COLORS.fat }}>█</span> over
                  </div>
                </div>
              );
            })()}
          </Box>
          <div style={{ border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column" }}>
            {[...history].reverse().filter((d) => d.calories > 0).map((d, i) => (
              <div key={d.date} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderTop: i ? `1px solid ${COLORS.border}` : "none", fontSize: 12 }}>
                <span style={{ color: COLORS.bone }}>{prettyDate(d.date)}</span>
                <span>
                  <span style={{ color: COLORS.calories }}>{d.calories}</span> <span style={{ color: COLORS.protein }}>{d.protein}p</span> <span style={{ color: COLORS.carbs }}>{d.carbs}c</span> <span style={{ color: COLORS.fat }}>{d.fat}f</span>
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
        <span><span style={{ color: COLORS.accent }}>◂ ▸</span> change day</span>
        <span><span style={{ color: COLORS.accent }}>×</span> remove</span>
        <span style={{ marginLeft: "auto" }}>saved to your db · yours to export</span>
      </div>
    </div>
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
