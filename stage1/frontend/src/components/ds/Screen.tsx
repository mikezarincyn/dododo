import type { CSSProperties, ReactNode } from "react";

import { getDir } from "../../i18n";

// Единый контейнер parent-flow: центрированная колонка фиксированной max-ширины,
// mobile-first (на телефоне — во всю ширину с отступами, на десктопе — по центру).
// Все три экрана (consent / upload / thank-you) используют его, чтобы вёрстка была
// единообразной. Значения — только из дизайн-токенов.
export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <main
      dir={getDir()}
      style={{
        inlineSize: "100%",
        maxInlineSize: 520,
        marginInline: "auto",
        paddingInline: "var(--space-5)",
        paddingBlock: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {children}
    </main>
  );
}
