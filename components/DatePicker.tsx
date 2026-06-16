"use client";

import { useEffect, useMemo, useState } from "react";
import { calendarGrid, monthTitle, parseYmd, shiftMonth, today } from "@/lib/core/macros";
import { COLORS } from "@/lib/core/theme";

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export function DatePicker({
  value,
  max = today(),
  onChange,
  onClose,
}: {
  value: string;
  max?: string;
  onChange: (date: string) => void;
  onClose: () => void;
}) {
  const selected = parseYmd(value);
  const [view, setView] = useState(() => ({ y: selected.y, m: selected.m }));
  const maxParts = parseYmd(max);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cells = useMemo(() => calendarGrid(view.y, view.m), [view.y, view.m]);
  const atMaxMonth = view.y > maxParts.y || (view.y === maxParts.y && view.m >= maxParts.m);

  function pick(date: string) {
    if (date > max) return;
    onChange(date);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="pick date"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "72px 14px 14px",
        background: "rgba(12, 13, 11, 0.72)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 300,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.panel,
          padding: "12px 14px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button
            type="button"
            className="gbtn"
            aria-label="previous month"
            onClick={() => setView((v) => shiftMonth(v.y, v.m, -1))}
            style={{ fontSize: 16, padding: "0 4px" }}
          >
            ◂
          </button>
          <span style={{ color: COLORS.bright, letterSpacing: 1, fontSize: 12 }}>{monthTitle(view.y, view.m)}</span>
          <button
            type="button"
            className="gbtn"
            aria-label="next month"
            disabled={atMaxMonth}
            onClick={() => setView((v) => shiftMonth(v.y, v.m, 1))}
            style={{ fontSize: 16, padding: "0 4px", opacity: atMaxMonth ? 0.3 : 1 }}
          >
            ▸
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 2,
            fontSize: 11,
            letterSpacing: 0.5,
          }}
        >
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ color: COLORS.dim, textAlign: "center", padding: "4px 0 6px" }}>
              {d}
            </div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={`pad-${i}`} />;
            const disabled = date > max;
            const isSelected = date === value;
            const isToday = date === max;
            return (
              <button
                key={date}
                type="button"
                disabled={disabled}
                onClick={() => pick(date)}
                style={{
                  background: isSelected ? COLORS.accent : "transparent",
                  border: `1px solid ${isToday && !isSelected ? COLORS.accent : "transparent"}`,
                  color: disabled ? COLORS.dim : isSelected ? COLORS.bg : isToday ? COLORS.accent : COLORS.bone,
                  cursor: disabled ? "default" : "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  padding: "6px 0",
                  opacity: disabled ? 0.35 : 1,
                }}
              >
                {parseYmd(date).d}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" className="gbtn" onClick={onClose}>
            [ done ]
          </button>
        </div>
      </div>
    </div>
  );
}
