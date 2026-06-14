import type { CSSProperties, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "soft";
export type ButtonSize = "sm" | "md";

// DS pill button. Visual ported from the design bundle's Button (primary /
// secondary / outline / soft; sm / md). Styling lives in app.css (.ds-btn*) so
// hover states work; `style` still overrides per-call (the screens lean on this).
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  iconRight,
  title,
  className,
  style,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  iconRight?: ReactNode;
  title?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={["ds-btn", `ds-btn--${variant}`, `ds-btn--${size}`, className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
      {iconRight}
    </button>
  );
}
