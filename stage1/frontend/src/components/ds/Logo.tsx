import type { CSSProperties } from "react";

import logoUrl from "../../assets/dododo-logo.svg";

// Brand logo (self-hosted SVG asset). Clicking it returns to the role switcher.
export function Logo({
  height = 30,
  onClick,
  style,
}: {
  height?: number;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <img
      src={logoUrl}
      alt="dododo"
      height={height}
      onClick={onClick}
      style={{ height, width: "auto", display: "block", ...style }}
    />
  );
}
