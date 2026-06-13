import { t } from "../i18n";

// Видимая плашка демо. Показывается на parent-экранах и в консоли специалиста.
export function DemoBanner() {
  return (
    <div
      role="note"
      style={{
        background: "var(--yellow-surface-100)",
        color: "var(--ink-900)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "var(--space-2) var(--space-4)",
        textAlign: "center",
        fontSize: "var(--font-small)",
        fontWeight: 600,
      }}
    >
      {t().common.demoBanner}
    </div>
  );
}
