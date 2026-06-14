import { CalBadge, ConfirmedBadge, Icon, PageHead, ProgressBar, TrendChip, VideoFrame } from "../components/ds";
import type { ProgressStatus } from "../components/ds";
import { DOMAINS, SCENARIOS } from "../data/reference";
import type { TFunc } from "../i18n/strings";
import type { DomainTrend, Observation } from "../api/ot";

const TREND_TO_STATUS: Record<string, ProgressStatus> = { improving: "typical", steady: "building", declining: "watch" };

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function DomainMiniChip({ d, t }: { d: string; t: TFunc }) {
  return (
    <span className="chip" style={{ background: "var(--grey-surface-100)", color: "var(--text-muted)", fontSize: 11.5, fontWeight: 600 }}>
      <Icon name={(DOMAINS.find((x) => x.id === d) || { icon: "circle" }).icon} size={11} />
      {t("domain." + d)}
    </span>
  );
}

// Child progress — left: six domains (segmented bar + trend chip, from CONFIRMED
// observations only); right: observation timeline. This is the reference screen.
export function ChildProgress({
  t,
  go,
  child,
  progress,
  observations,
}: {
  t: TFunc;
  go: (screen: string, params?: Record<string, string>) => void;
  child: { child_id: string; display_code: string; last_obs?: string | null };
  progress: Record<string, DomainTrend>;
  observations: Observation[];
}) {
  return (
    <div>
      <button type="button" className="linkish" onClick={() => go("dashboard")} style={{ marginBottom: 16 }}>
        <Icon name="arrow-left" size={14} /> {t("common.back")}
      </button>
      <PageHead
        a={`${t("progress.title")} — `}
        b={child.display_code}
        sub={observations[0] ? `${t("common.lastObservation")}: ${fmtDate(observations[0].created_at)}` : t("progress.empty")}
        right={<span className="code-chip" style={{ fontSize: 15, padding: "6px 12px" }}>{child.display_code}</span>}
      />

      <div className="split-6-7">
        {/* six areas */}
        <div style={{ background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 26 }}>
          <h3 className="ds-h4" style={{ marginBottom: 4 }}>{t("progress.areas")}</h3>
          <div className="row" style={{ alignItems: "flex-start", gap: 8, marginBottom: 18, color: "var(--text-muted)", fontSize: 13 }}>
            <Icon name="gauge" size={13} style={{ marginTop: 2 }} />
            <span>{t("progress.areas.sub")}</span>
          </div>
          <div className="col" style={{ gap: 4 }}>
            {DOMAINS.map((d, i) => {
              const dd = progress[d.id] || { trend: "steady", filled: 0, spark: [] };
              const firstObs = observations.find((o) => o.domains.includes(d.id));
              return (
                <div
                  key={d.id}
                  onClick={() => firstObs && go("obs", { childId: child.child_id, obsId: firstObs.id })}
                  style={{ padding: "14px 12px", borderRadius: 12, cursor: firstObs ? "pointer" : "default", borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                >
                  <div className="row" style={{ marginBottom: 10 }}>
                    <Icon name={d.icon} size={16} color="var(--navy-700)" />
                    <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--navy-700)", flex: 1 }}>{t("domain." + d.id)}</span>
                    <TrendChip trend={dd.trend} t={t} small />
                  </div>
                  <ProgressBar filled={dd.filled} segments={6} status={TREND_TO_STATUS[dd.trend]} />
                </div>
              );
            })}
          </div>
        </div>

        {/* timeline */}
        <div style={{ background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 26 }}>
          <h3 className="ds-h4" style={{ marginBottom: 4 }}>{t("progress.timeline")}</h3>
          <p style={{ margin: "0 0 18px", color: "var(--text-muted)", fontSize: 13 }}>{t("progress.timeline.sub")}</p>
          {observations.length === 0 ? (
            <div style={{ padding: "30px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>{t("progress.empty")}</div>
          ) : (
            <div className="col" style={{ gap: 0 }}>
              {observations.map((o, i) => {
                const calCount = o.metrics.filter((m) => m.state === "calibration").length;
                return (
                  <div key={o.id} className="tl-row" onClick={() => go("obs", { childId: child.child_id, obsId: o.id })}>
                    <div className="tl-rail">
                      <span className="tl-dot" style={{ background: i === 0 ? "var(--green-500)" : "#c9d2dc" }} />
                      {i < observations.length - 1 ? <span className="tl-line" /> : null}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 8 }}>
                      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--navy-700)" }}>{labelScenario(t, o.scenario)}</span>
                        <span style={{ fontSize: 12.5, color: "var(--text-subtle)", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtDate(o.created_at)} · {o.duration}</span>
                      </div>
                      <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5, margin: "6px 0 8px" }}>{o.summary}</div>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        {o.domains.map((d) => <DomainMiniChip key={d} d={d} t={t} />)}
                        {calCount > 0 ? <CalBadge t={t} small /> : null}
                      </div>
                    </div>
                    <Icon name="chevron-right" size={16} color="var(--text-subtle)" style={{ alignSelf: "center" }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function labelScenario(t: TFunc, id: string): string {
  const s = SCENARIOS.find((x) => x.id === id);
  return s ? t(s.label) : id;
}

// ---------- observation drill-down ----------
export function ObservationDetail({
  t,
  go,
  child,
  obs,
}: {
  t: TFunc;
  go: (screen: string, params?: Record<string, string>) => void;
  child: { child_id: string; display_code: string };
  obs: Observation;
}) {
  return (
    <div>
      <button type="button" className="linkish" onClick={() => go("progress", { childId: child.child_id })} style={{ marginBottom: 16 }}>
        <Icon name="arrow-left" size={14} /> {t("common.back")}
      </button>
      <PageHead a={`${labelScenario(t, obs.scenario)} — `} b={fmtDate(obs.created_at)} sub={`${obs.duration} · ${child.display_code}`} right={<span className="code-chip" style={{ fontSize: 15, padding: "6px 12px" }}>{child.display_code}</span>} />

      <div className="split-6-6">
        <div className="col" style={{ gap: 20 }}>
          <div style={{ background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 20 }}>
            <div className="row" style={{ marginBottom: 12 }}>
              <Icon name="film" size={16} color="var(--navy-700)" />
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--navy-700)", whiteSpace: "nowrap" }}>{t("progress.detail.clip")}</span>
            </div>
            {/* Raw video was deleted after review (no-retention) — placeholder only. */}
            <VideoFrame label={child.display_code} time={`0:00 / ${obs.duration}`} />
            <p className="ds-small ds-muted" style={{ marginTop: 10 }}>{t("Video deleted after review — observation kept.")}</p>
          </div>

          <div style={{ background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 24 }}>
            <div className="row" style={{ marginBottom: 12 }}>
              <Icon name="pen-line" size={16} color="var(--navy-700)" />
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--navy-700)", whiteSpace: "nowrap" }}>{t("progress.detail.annotation")}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>{obs.summary}</p>
            {obs.notes ? (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 12, background: "var(--yellow-surface-100)", fontSize: 13.5, lineHeight: 1.55, color: "var(--text-body)" }}>
                <strong style={{ color: "var(--navy-700)" }}>{t("common.notes")}: </strong>{obs.notes}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 24 }}>
          <div className="row" style={{ marginBottom: 4 }}>
            <Icon name="list-checks" size={16} color="var(--navy-700)" />
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--navy-700)", whiteSpace: "nowrap" }}>{t("progress.detail.metrics")}</span>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)" }}>{t("progress.calNote")}</p>
          <div className="col" style={{ gap: 0 }}>
            {obs.metrics.map((m, i) => (
              <div key={i} className="row" style={{ padding: "13px 4px", gap: 12, borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)", opacity: m.state === "calibration" ? 0.75 : 1 }}>
                <span style={{ flex: 1, fontSize: 14, color: "var(--text-body)" }}>{m.label}</span>
                <strong style={{ fontSize: 14, color: "var(--navy-700)", whiteSpace: "nowrap" }}>{m.value}</strong>
                {m.state === "calibration" ? <CalBadge t={t} small /> : <ConfirmedBadge t={t} small />}
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {obs.domains.map((d) => <DomainMiniChip key={d} d={d} t={t} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
