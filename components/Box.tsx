import type { ReactNode, CSSProperties } from "react";
import { COLORS } from "@/lib/core/theme";

export function Box({
  title,
  right,
  children,
  style,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <fieldset
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: 0,
        margin: 0,
        padding: "12px 14px 14px",
        background: COLORS.panel,
        ...style,
      }}
    >
      <legend style={{ padding: "0 7px", color: COLORS.accent, fontSize: 12, letterSpacing: 1 }}>
        {title}
        {right ? <span style={{ color: COLORS.dim }}>{"  "}{right}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}
