import { Button, Icon, PageHead, Spark, StatusBadge } from "../components/ds";
import { DOMAINS } from "../data/reference";
import type { TFunc } from "../i18n/strings";
import type { OtChild } from "../api/ot";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

// OT dashboard — care-linked children only, with a 6-domain mini-trend.
// Pseudonymous: display_code only (no name; age omitted for privacy).
export function OtDashboard({
  t,
  userName,
  go,
  children,
}: {
  t: TFunc;
  userName?: string;
  go: (screen: string, params?: Record<string, string>) => void;
  children: OtChild[];
}) {
  return (
    <div>
      <PageHead
        a={t("ot.dash.title.a")}
        b={userName?.trim() || t("ot.dash.title.b")}
        sub={`${children.length} ${t("ot.dash.sub")}`}
        right={
          <Button variant="primary" size="sm" onClick={() => go("upload")} iconRight={<Icon name="upload" size={16} color="#fff" />}>
            {t("ot.dash.upload")}
          </Button>
        }
      />

      {children.length === 0 ? (
        <p className="ds-muted" style={{ fontSize: 15 }}>{t("Nothing to review right now.")}</p>
      ) : (
        <div className="tile-grid">
          {children.map((c) => (
            <div
              key={c.child_id}
              onClick={() => go("progress", { childId: c.child_id })}
              style={{ background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 22, cursor: "pointer" }}
            >
              <div className="row" style={{ alignItems: "flex-start", marginBottom: 16 }}>
                <span style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--green-100)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--green-ink)", flexShrink: 0 }}>
                  <Icon name="baby" size={20} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="code-chip">{c.display_code}</span>
                </div>
                {c.last_video ? <StatusBadge state={c.last_video} t={t} small /> : null}
              </div>

              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 10 }}>
                {t("ot.dash.miniTrend")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                {DOMAINS.map((d) => {
                  const dd = c.domains[d.id] || { trend: "steady", filled: 0, spark: [0, 0, 0, 0, 0] };
                  const tone = dd.trend === "improving" ? "var(--green-ink)" : dd.trend === "declining" ? "var(--coral-500)" : "var(--text-subtle)";
                  const arrow = dd.trend === "improving" ? "trending-up" : dd.trend === "declining" ? "trending-down" : "move-right";
                  return (
                    <span key={d.id} title={`${t("domain." + d.id)} — ${t("trend." + dd.trend)}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 9px", borderRadius: 10, background: "var(--grey-surface-100)" }}>
                      <Icon name={d.icon} size={13} color="var(--text-muted)" />
                      <Spark values={dd.spark.length ? dd.spark : [0]} width={34} height={14} color={dd.trend === "declining" ? "var(--coral-500)" : "var(--green-500)"} />
                      <Icon name={arrow} size={12} color={tone} />
                    </span>
                  );
                })}
              </div>

              <hr className="hairline" style={{ marginBottom: 12 }} />
              <div className="row" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                <Icon name="calendar" size={13} />
                <span>{t("common.lastObservation")}: <strong style={{ color: "var(--ink-900)" }}>{fmtDate(c.last_obs)}</strong></span>
                <span style={{ flex: 1 }} />
                <span className="linkish" style={{ fontSize: 13 }}>
                  {t("ot.dash.openProgress")} <Icon name="arrow-right" size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
