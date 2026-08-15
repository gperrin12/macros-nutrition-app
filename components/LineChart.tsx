"use client";

import { useMemo, useRef, useState } from "react";
import { mmdd, prettyDate } from "@/lib/core/macros";
import { COLORS } from "@/lib/core/theme";

function rollingAvg(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function polyline(points: [number, number][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function fmtNum(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function xTick(date: string, withYear: boolean): string {
  if (!withYear) return mmdd(date);
  const d = new Date(date + "T00:00:00");
  return `${mmdd(date)}/${String(d.getFullYear()).slice(2)}`;
}

export function LineChart({
  days,
  color,
  height = 120,
  goal,
  unit = "",
  fromZero = true,
  avgLabel = "7d avg",
}: {
  days: { date: string; value: number }[];
  color: string;
  height?: number;
  goal?: number;
  unit?: string;
  fromZero?: boolean;
  avgLabel?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const values = useMemo(() => days.map((d) => d.value), [days]);
  const rolling = useMemo(() => rollingAvg(values, 7), [values]);

  const spanYears = useMemo(() => {
    if (days.length < 2) return false;
    const a = new Date(days[0].date + "T00:00:00").getFullYear();
    const b = new Date(days[days.length - 1].date + "T00:00:00").getFullYear();
    return a !== b;
  }, [days]);

  const { yMin, yMax } = useMemo(() => {
    const pool = [...values, ...rolling];
    if (goal != null) pool.push(goal);
    const hi = Math.max(...pool, 1);
    if (fromZero) return { yMin: 0, yMax: hi };
    const lo = Math.min(...pool);
    const pad = Math.max(1, (hi - lo) * 0.12);
    return { yMin: lo - pad, yMax: hi + pad };
  }, [values, rolling, goal, fromZero]);

  const W = 640;
  const PL = 36;
  const PR = 10;
  const PT = 10;
  const PB = 22;
  const plotW = W - PL - PR;
  const plotH = height - PT - PB;
  const n = values.length;
  const showDots = n <= 80;
  const range = yMax - yMin || 1;

  const xAt = (i: number) => (n <= 1 ? PL + plotW / 2 : PL + (i / (n - 1)) * plotW);
  const yAt = (v: number) => PT + (1 - (v - yMin) / range) * plotH;

  const dailyPts = values.map((v, i) => [xAt(i), yAt(v)] as [number, number]);
  const avgPts = rolling.map((v, i) => [xAt(i), yAt(v)] as [number, number]);
  const goalY = goal != null ? yAt(goal) : null;

  const yTicks = fromZero ? [0, yMax] : [Math.min(...values), Math.max(...values)];
  const xLabelIdx =
    n <= 1
      ? [0]
      : Array.from({ length: Math.min(7, n) }, (_, i) =>
          i === Math.min(7, n) - 1 ? n - 1 : Math.round((i * (n - 1)) / (Math.min(7, n) - 1)),
        );

  function pickIndex(clientX: number) {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const dist = Math.abs(xAt(i) - x);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setHoverIdx(best);
  }

  const hover = hoverIdx !== null ? days[hoverIdx] : null;
  const tipLeft = hoverIdx !== null ? (xAt(hoverIdx) / W) * 100 : 0;
  const tipTop = hoverIdx !== null ? (yAt(values[hoverIdx]) / height) * 100 : 0;

  if (n === 0) {
    return (
      <div style={{ color: COLORS.dim, fontSize: 12, padding: "16px 0", textAlign: "center" }}>
        — no data yet —
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        style={{ display: "block", overflow: "visible", cursor: "crosshair" }}
        onMouseMove={(e) => pickIndex(e.clientX)}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((tick) => {
          const y = yAt(tick);
          return (
            <g key={tick}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={COLORS.border} strokeWidth={1} />
              <text
                x={PL - 6}
                y={y + 3}
                textAnchor="end"
                fill={COLORS.dim}
                fontSize={10}
                fontFamily="inherit"
              >
                {fmtNum(tick)}
              </text>
            </g>
          );
        })}

        {goalY != null && (
          <line
            x1={PL}
            y1={goalY}
            x2={W - PR}
            y2={goalY}
            stroke={COLORS.accent}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
        )}

        {avgPts.length > 1 && (
          <polyline
            points={polyline(avgPts)}
            fill="none"
            stroke={COLORS.dim}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {dailyPts.length > 1 && (
          <polyline points={polyline(dailyPts)} fill="none" stroke={color} strokeWidth={1.5} />
        )}

        {hoverIdx !== null && (
          <line
            x1={xAt(hoverIdx)}
            y1={PT}
            x2={xAt(hoverIdx)}
            y2={PT + plotH}
            stroke={COLORS.dim}
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.6}
          />
        )}

        {(showDots ? dailyPts : hoverIdx !== null ? [dailyPts[hoverIdx]] : []).map(([x, y], i) => (
          <circle
            key={showDots ? i : hoverIdx}
            cx={x}
            cy={y}
            r={hoverIdx === (showDots ? i : hoverIdx) ? 4 : 2.5}
            fill={color}
            style={{ transition: "r 0.1s" }}
          />
        ))}

        {xLabelIdx.map((i) => (
          <text
            key={i}
            x={xAt(i)}
            y={height - 4}
            textAnchor="middle"
            fill={COLORS.dim}
            fontSize={10}
            fontFamily="inherit"
          >
            {xTick(days[i].date, spanYears)}
          </text>
        ))}
      </svg>

      {hover && hoverIdx !== null && (
        <div
          style={{
            position: "absolute",
            left: `${tipLeft}%`,
            top: `${tipTop}%`,
            transform: `translate(-50%, calc(-100% - 8px))`,
            pointerEvents: "none",
            zIndex: 2,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.inset,
            padding: "6px 8px",
            fontSize: 11,
            lineHeight: 1.45,
            whiteSpace: "nowrap",
            boxShadow: `0 0 0 1px ${COLORS.bg}`,
          }}
        >
          <div style={{ color: COLORS.bone, marginBottom: 3 }}>
            {prettyDate(hover.date)}
            {new Date(hover.date + "T00:00:00").getFullYear() !== new Date().getFullYear()
              ? ` ${hover.date.slice(0, 4)}`
              : ""}
          </div>
          <div style={{ color }}>
            {fmtNum(hover.value)} {unit}
          </div>
          <div style={{ color: COLORS.dim, marginTop: 3 }}>
            {avgLabel} {fmtNum(rolling[hoverIdx])} {unit}
          </div>
        </div>
      )}

      <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 6, display: "flex", flexWrap: "wrap", gap: "12px 16px" }}>
        <span>
          <span style={{ color }}>─</span> daily
        </span>
        {goal != null && (
          <span>
            <span style={{ color: COLORS.accent }}>┄</span> goal {fmtNum(goal)}
          </span>
        )}
        <span>
          <span style={{ color: COLORS.dim }}>┄</span> {avgLabel}
        </span>
      </div>
    </div>
  );
}
