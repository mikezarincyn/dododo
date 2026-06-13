import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-4) var(--space-5)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
