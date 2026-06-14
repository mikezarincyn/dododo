import { Card, Icon } from "../components/ds";
import type { TFunc } from "../i18n/strings";
import type { QueueRow } from "../ot/Queue";

// SAFE parent layer for one upload. Conveys "serious, gentle technology at work" via a
// processing journey + neutral RECORDING-quality feedback (about the camera, not the
// child) + regularity. NEVER shows metrics, signal graphs, skeleton, latency, domain
// scores, or any norm/not-norm interpretation — those are OT-only.

const STEPS = ["received", "movement", "reactions", "specialist"] as const;

function reached(state: string): number {
  // How many journey steps are complete for this state.
  if (state === "queued") return 1;
  if (state === "processing") return 1; // received done; movement/reactions in progress
  if (state === "ready" || state === "in_review" || state === "reviewed") return 4;
  return 0; // failed / other
}

export function ParentJourney({ t, item, ordinal }: { t: TFunc; item: QueueRow; ordinal?: number }) {
  const failed = item.state === "failed";
  const reviewed = item.state === "reviewed";
  const done = reached(item.state);
  const processing = item.state === "queued" || item.state === "processing";
  const rq = item.recording_quality;

  return (
    <Card padding={20}>
      <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <span className="code-chip">{item.display_code}</span>
        {ordinal ? <span className="ds-small ds-muted">{t("parent.safe.observation")} #{ordinal}</span> : null}
      </div>

      {failed ? (
        <div className="row" style={{ gap: 10, color: "var(--coral-500)", fontSize: 14 }}>
          <Icon name="alert-triangle" size={16} color="var(--coral-500)" />
          <span>{t("parent.safe.failed")}</span>
        </div>
      ) : (
        <>
          {/* processing journey — checkmarks light up as the gentle technology works */}
          <div className="row" style={{ gap: 0, flexWrap: "wrap", alignItems: "flex-start" }}>
            {STEPS.map((step, i) => {
              const isDone = i < done;
              const isActive = processing && i === 1; // "analysing" pulse during processing
              const color = isDone ? "var(--green-ink)" : isActive ? "var(--navy-700)" : "var(--text-subtle)";
              return (
                <div key={step} className="col" style={{ alignItems: "center", flex: 1, minWidth: 72, gap: 6 }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: isDone ? "var(--green-100)" : isActive ? "var(--lilac-100, #efeafe)" : "var(--grey-surface-100)",
                  }}>
                    <span className={isActive ? "spin-slow" : ""} style={{ display: "inline-flex" }}>
                      <Icon name={isDone ? "check" : isActive ? "refresh-cw" : "clock"} size={15} color={color} />
                    </span>
                  </span>
                  <span style={{ fontSize: 11.5, textAlign: "center", color, lineHeight: 1.3 }}>{t("parent.safe.step." + step)}</span>
                </div>
              );
            })}
          </div>

          {reviewed ? (
            <div className="row" style={{ gap: 8, marginTop: 14, color: "var(--green-ink)", fontSize: 13.5 }}>
              <Icon name="heart-handshake" size={15} color="var(--green-ink)" />
              <span>{t("parent.safe.reviewed")}</span>
            </div>
          ) : done >= 4 ? (
            <div className="row" style={{ gap: 8, marginTop: 14, color: "var(--green-ink)", fontSize: 13.5 }}>
              <Icon name="check" size={15} color="var(--green-ink)" />
              <span>{t("parent.safe.specialistHas")}</span>
            </div>
          ) : (
            <div className="ds-small ds-muted" style={{ marginTop: 14 }}>{t("parent.safe.processingNote")}</div>
          )}

          {/* neutral RECORDING-quality feedback (camera, not the child) */}
          {rq && done >= 4 ? (
            <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)" }}>
              <Icon name={rq === "good" ? "check" : "alert-triangle"} size={14} color={rq === "good" ? "var(--green-ink)" : "var(--yellow-ink)"} style={{ marginTop: 2 }} />
              <span>{t("parent.safe.quality." + rq)}</span>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
