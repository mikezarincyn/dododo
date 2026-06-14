import type { CSSProperties, ReactNode } from "react";

export type BadgeTone = "green" | "yellow" | "lilac" | "grey" | "coral";

const TONES: Record<BadgeTone, CSSProperties> = {
  green: { background: "var(--green-100)", color: "var(--green-ink)" },
  yellow: { background: "var(--yellow-surface-100)", color: "var(--yellow-ink)" },
  lilac: { background: "var(--lilac-100)", color: "var(--navy-700)" },
  grey: { background: "var(--grey-surface-100)", color: "var(--text-muted)" },
  coral: { background: "rgba(238,108,77,.14)", color: "var(--coral-500)" },
};

// DS pill badge (small status/label). Default tone green.
export function Badge({
  children,
  tone = "green",
  style,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  style?: CSSProperties;
}) {
  return (
    <span className="chip" style={{ ...TONES[tone], ...style }}>
      {children}
    </span>
  );
}
