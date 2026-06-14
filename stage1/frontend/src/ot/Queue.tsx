import { Button, Icon, PageHead, StatusBadge } from "../components/ds";
import { SCENARIOS } from "../data/reference";
import type { TFunc } from "../i18n/strings";
import { ParentJourney } from "../parent/ParentJourney";

export interface QueueRow {
  submission_id: string;
  display_code: string;
  scenario: string | null;
  size_bytes: number | null;
  state: string;
  video_purged?: boolean;
  recording_quality?: "good" | "partial" | "low" | null;
  created_at: string;
}

function scenarioLabel(t: TFunc, id: string | null): string {
  const s = SCENARIOS.find((x) => x.id === id);
  return s ? t(s.label) : "";
}

// Shared processing queue (OT + parent). OT gets an "Annotate now" action on
// ready items; parent sees "Shared with your therapist" (annotation is the OT's
// job) and "Reviewed" once done.
export function Queue({
  t,
  go,
  mode,
  items,
}: {
  t: TFunc;
  go: (screen: string, params?: Record<string, string>) => void;
  mode: "ot" | "parent";
  items: QueueRow[];
}) {
  return (
    <div style={{ maxWidth: 780 }}>
      <PageHead a={t("upload.queue.title.a")} b={t("upload.queue.title.b")} sub={mode === "parent" ? t("upload.queue.parentSub") : t("upload.queue.sub")} />
      {items.length === 0 ? (
        <p className="ds-muted" style={{ fontSize: 15 }}>{t("Nothing to review right now.")}</p>
      ) : mode === "parent" ? (
        // SAFE parent layer: processing journey + recording quality + regularity.
        // No metrics/graphs/skeleton/judgments ever reach the parent.
        <div className="col" style={{ gap: 14 }}>
          {items.map((u, i) => (
            <ParentJourney key={u.submission_id} t={t} item={u} ordinal={i + 1} />
          ))}
        </div>
      ) : (
        <div className="col" style={{ gap: 14 }}>
          {items.map((u) => {
            // Real async phase from the submission state.
            const purged = !!u.video_purged;
            const processing = !purged && (u.state === "queued" || u.state === "processing");
            const ready = !purged && (u.state === "ready" || u.state === "in_review");
            const failed = u.state === "failed";
            const sizeMb = u.size_bytes ? `${Math.max(1, Math.round(u.size_bytes / (1024 * 1024)))} MB` : "";
            return (
              <div key={u.submission_id} style={{ background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 20 }}>
                <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
                  <span style={{ width: 52, height: 52, borderRadius: 12, background: "#1e2b3c", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="film" size={20} color="rgba(255,255,255,.75)" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                      <span className="code-chip">{u.display_code}</span>
                      {u.scenario ? <span style={{ fontSize: 13.5, color: "var(--text-muted)", fontWeight: 600 }}>{scenarioLabel(t, u.scenario)}</span> : null}
                    </div>
                    <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>{sizeMb}</div>
                  </div>
                  <div className="col" style={{ alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                    {processing ? (
                      <StatusBadge state="processing" t={t} />
                    ) : ready ? (
                      <StatusBadge state="ready" t={t} />
                    ) : failed ? (
                      <span className="chip" style={{ background: "rgba(238,108,77,.14)", color: "var(--coral-500)" }}>
                        <Icon name="alert-triangle" size={13} /> {t("queue.failed")}
                      </span>
                    ) : (
                      <span className="chip" style={{ background: "var(--grey-surface-100)", color: "var(--text-muted)" }}>
                        <Icon name="check" size={13} /> {t("Reviewed")}
                      </span>
                    )}
                    {ready ? (
                      <Button variant="soft" size="sm" style={{ minHeight: 40, padding: "0 18px", fontSize: 13.5 }} onClick={() => go("annotate", { submissionId: u.submission_id })}>
                        {t("upload.queue.annotate")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
