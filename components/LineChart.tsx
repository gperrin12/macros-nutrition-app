"use client";

import { useMemo, useRef, useState } from "react";
import { MAC, mmdd, prettyDate } from "@/lib/core/macros";
import { COLORS } from "@/lib/core/theme";
import type { Goals, MacroKey } from "@/lib/core/types";

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

export function LineChart({
  days,
  macro,
  goal,
  color,
  height = 120,
}: {
  days: ({ date: string } & Goals)[];
  macro: MacroKey;
  goal: number;
  color: string;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const values = useMemo(() => days.map((d) => d[macro]), [days, macro]);
  const rolling = useMemo(() => rollingAvg(values, 7), [values]);
  const max = Math.max(goal, ...values, ...rolling, 1);

  const W = 640;
  const PL = 36;
  const PR = 10;
  const PT = 10;
  const PB = 22;
  const plotW = W - PL - PR;
  const plotH = height - PT - PB;
  const n = values.length;

  const xAt = (i: number) => (n <= 1 ? PL + plotW / 2 : PL + (i / (n - 1)) * plotW);
  const yAt = (v: number) => PT + (1 - v / max) * plotH;

  const dailyPts = values.map((v, i) => [xAt(i), yAt(v)] as [number, number]);
  const avgPts = rolling.map((v, i) => [xAt(i), yAt(v)] as [number, number]);
  const goalY = yAt(goal);

  const yTicks = [0, max];
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
  const macroMeta = MAC.find((m) => m.key === macro);
  const tipLeft = hoverIdx !== null ? (xAt(hoverIdx) / W) * 100 : 0;
  const tipTop = hoverIdx !== null ? (yAt(values[hoverIdx]) / height) * 100 : 0;

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
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

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

        {dailyPts.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={hoverIdx === i ? 4 : 2.5}
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
            {mmdd(days[i].date)}
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
          <div style={{ color: COLORS.bone, marginBottom: 3 }}>{prettyDate(hover.date)}</div>
          <div style={{ color }}>
            {hover[macro]} {macroMeta?.unit ?? ""}
          </div>
          <div style={{ color: COLORS.dim, marginTop: 3 }}>
            7d avg {Math.round(rolling[hoverIdx])} {macroMeta?.unit ?? ""}
          </div>
        </div>
      )}

      <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 6, display: "flex", flexWrap: "wrap", gap: "12px 16px" }}>
        <span>
          <span style={{ color }}>─</span> daily
        </span>
        <span>
          <span style={{ color: COLORS.accent }}>┄</span> goal {goal}
        </span>
        <span>
          <span style={{ color: COLORS.dim }}>┄</span> 7d avg
        </span>
      </div>
    </div>
  );
}
