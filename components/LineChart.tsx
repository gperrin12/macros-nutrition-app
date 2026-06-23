import { useMemo } from "react";
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

export function LineChart({
  values,
  goal,
  labels,
  color,
  height = 120,
}: {
  values: number[];
  goal: number;
  labels: string[];
  color: string;
  height?: number;
}) {
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

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        style={{ display: "block", overflow: "visible" }}
        aria-hidden
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

        {dailyPts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill={color} />
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
            {labels[i]}
          </text>
        ))}
      </svg>

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
