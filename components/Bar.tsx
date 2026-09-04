import { barCells, type BarCell } from "@/lib/core/macros";
import { COLORS } from "@/lib/core/theme";

const GLYPH: Record<BarCell, string> = {
  fill: "█",
  rest: "░",
  over: "▓",
};

export function Bar({
  value,
  goal,
  cells = 18,
  color,
  cap,
}: {
  value: number;
  goal: number;
  cells?: number;
  color: string;
  cap: boolean;
}) {
  const kinds = barCells(value, goal, cells, cap);
  // Fat fill is already the warning red; overflow uses amber so it still contrasts.
  const overColor = color === COLORS.fat ? COLORS.accent : COLORS.fat;
  return (
    <span style={{ letterSpacing: -0.5 }}>
      {kinds.map((k, i) => (
        <span
          key={i}
          style={{
            color: k === "over" ? overColor : k === "fill" ? color : COLORS.border,
          }}
        >
          {GLYPH[k]}
        </span>
      ))}
    </span>
  );
}
