import type { CSSProperties, ReactNode } from "react";

export type CardTone = "white" | "mint";

// DS surface card — soft rounded, faint navy hairline, soft shadow.
// `padding` is a number (px) to match the design API; `tone` mint = soft green.
export function Card({
  children,
  padding = 24,
  tone = "white",
  onClick,
  className,
  style,
}: {
  children: ReactNode;
  padding?: number;
  tone?: CardTone;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: tone === "mint" ? "var(--green-100)" : "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
