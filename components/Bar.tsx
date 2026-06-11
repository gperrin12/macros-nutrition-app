import { COLORS } from "@/lib/core/theme";

export function Bar({
  value,
  max,
  goal,
  cells = 18,
  color,
}: {
  value: number;
  max: number;
  goal: number | null;
  cells?: number;
  color: string;
}) {
  const f = max > 0 ? Math.max(0, Math.min(cells, Math.round((value / max) * cells))) : 0;
  const g = goal && max > 0 ? Math.round((goal / max) * cells) : -1;
  const over = goal ? value > goal : false;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < cells; i++) {
    if (i === g && i !== f) out.push(<span key={i} style={{ color: COLORS.accent }}>│</span>);
    else if (i < f) out.push(<span key={i} style={{ color: over ? COLORS.fat : color }}>█</span>);
    else out.push(<span key={i} style={{ color: COLORS.border }}>░</span>);
  }
  return <span style={{ letterSpacing: -0.5 }}>{out}</span>;
}
