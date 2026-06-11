"use client";

import { useState } from "react";
import { COLORS } from "@/lib/core/theme";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!pw || busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) window.location.href = "/";
      else setErr("wrong password");
    } catch {
      setErr("could not reach server");
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18, justifyContent: "center" }}>
          <span style={{ color: COLORS.accent, fontSize: 18, letterSpacing: 1 }}>macros</span>
          <span className="cur" style={{ fontSize: 18 }}>▊</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.inset, border: `1px solid ${COLORS.border}`, padding: "10px 12px" }}>
          <span style={{ color: COLORS.accent }}>&gt;</span>
          <input
            className="tin"
            type="password"
            autoFocus
            value={pw}
            placeholder="password"
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button className="btn" onClick={submit} disabled={busy || !pw}>{busy ? "…" : "ENTER"}</button>
        </div>
        {err && <div style={{ color: COLORS.fat, fontSize: 12, marginTop: 10, textAlign: "center" }}>! {err}</div>}
      </div>
    </div>
  );
}
