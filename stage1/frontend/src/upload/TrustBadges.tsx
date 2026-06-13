import { t } from "../i18n";

// Плашки доверия на экране загрузки (P2): живой специалист, не диагноз,
// шифруется, видео удаляется после просмотра. Тексты — только из i18n.
export function TrustBadges() {
  const b = t().upload.trust;
  const items = [b.liveSpecialist, b.notDiagnosis, b.encrypted, b.deletedAfterReview];
  return (
    <ul
      aria-label="trust"
      style={{
        listStyle: "none",
        padding: 0,
        margin: "var(--space-4) 0",
        display: "grid",
        gap: "var(--space-2)",
      }}
    >
      {items.map((text) => (
        <li key={text} style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              inlineSize: 24,
              blockSize: 24,
              borderRadius: "var(--radius-pill)",
              background: "var(--green-100)",
              color: "var(--green-500)",
              fontWeight: 700,
              flex: "0 0 auto",
            }}
          >
            ✓
          </span>
          <span className="ds-body">{text}</span>
        </li>
      ))}
    </ul>
  );
}
