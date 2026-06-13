import type { CSSProperties, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "soft";

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: { background: "var(--green-500)", color: "var(--white)" },
  secondary: { background: "var(--teal-500)", color: "var(--white)" },
  outline: {
    background: "transparent",
    color: "var(--ink-900)",
    border: "1.5px solid var(--ink-900)",
  },
  soft: { background: "var(--green-100)", color: "var(--green-500)" },
};

export function Button({
  children,
  variant = "primary",
  disabled = false,
  onClick,
  style,
}: {
  children: ReactNode;
  variant?: Variant;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: "var(--font-button)",
        blockSize: "var(--btn-height)",
        paddingInline: "var(--btn-pad-x)",
        borderRadius: "var(--radius-pill)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        ...VARIANTS[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
