import type { CSSProperties, ReactNode } from "react";

// Two-tone heading: light base text + bold emphasis (Poppins 400 + <strong> 700).
export function TwoTone({
  a,
  b,
  size = "h2",
  style = {},
}: {
  a: ReactNode;
  b: ReactNode;
  size?: "h1" | "h2";
  style?: CSSProperties;
}) {
  const cls = size === "h1" ? "ds-h1 ds-h1--twotone" : "ds-h2 ds-h2--twotone";
  return (
    <h2 className={cls} style={{ margin: 0, ...style }}>
      {a}
      <strong>{b}</strong>
    </h2>
  );
}

// Page header: two-tone title + optional subtitle on the left, optional action
// (e.g. a primary button) on the right.
export function PageHead({
  a,
  b,
  sub,
  right,
}: {
  a: ReactNode;
  b: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="page-head" style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <TwoTone a={a} b={b} />
        {sub ? <p className="page-sub">{sub}</p> : null}
      </div>
      {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </div>
  );
}
