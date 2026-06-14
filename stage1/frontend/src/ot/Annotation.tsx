import { useEffect, useState } from "react";

import { Button, CalBadge, Card, Icon, PageHead, Segmented, TextArea } from "../components/ds";
import { AN_ITEMS, SCENARIO_DOMAINS, SCENARIOS, anOptions } from "../data/reference";
import type { TFunc } from "../i18n/strings";
import type { Metric, Observation } from "../api/ot";
import type { QueueRow } from "./Queue";

function fmtDur(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Annotation — left: REAL video player (the ephemeral clip, streamed inline,
// download/PiP disabled; it lives only until this review is saved, then deleted);
// right: 7-item checklist. ANTI-ANCHORING: the AI suggestion for each item stays
// HIDDEN until the OT answers it themselves; only then can it be revealed (badged
// "in calibration"). Save is enabled only when every item is answered. On save →
// observation persisted, raw video + derivatives deleted (no-retention).
export function Annotation({
  t,
  go,
  item,
  annotate,
  loadVideo,
  toast,
}: {
  t: TFunc;
  go: (screen: string, params?: Record<string, string>) => void;
  item: QueueRow;
  annotate: (submissionId: string, payload: { scenario: string; domains: string[]; duration: string; summary: string; notes: string; metrics: Metric[] }) => Promise<Observation>;
  loadVideo: (submissionId: string) => Promise<Blob>;
  toast: (m: string) => void;
}) {
  const scenarioId = item.scenario || "name";
  const domains = SCENARIO_DOMAINS[scenarioId] || ["attention", "communication"];

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoErr, setVideoErr] = useState(false);
  const [duration, setDuration] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Stream the ephemeral clip as a blob → object URL (no token in the URL, no
  // download). Revoked on unmount so the decrypted bytes don't linger in the page.
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    loadVideo(item.submission_id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
      })
      .catch(() => active && setVideoErr(true));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.submission_id, loadVideo]);

  const answered = Object.keys(answers).length;
  const allAnswered = answered >= AN_ITEMS.length;

  async function save() {
    if (!allAnswered || busy) return;
    setBusy(true);
    try {
      const metrics: Metric[] = AN_ITEMS.map((it) => {
        const opts = anOptions(it.kind, t);
        const val = answers[it.id];
        const value = opts.find((o) => o.value === val)?.label || val;
        const base: Metric = { label: t(it.title), value, state: "confirmed" };
        if (it.kind === "score") return { ...base, score: Number(val), domains };
        return base;
      });
      // One auto-estimated metric the OT hasn't confirmed → in calibration (shown,
      // never counted in trends). Demonstrates the calibration red line end-to-end.
      metrics.push({ label: t("Attention hold after turn"), value: "~4 s", state: "calibration", domains: [domains[0]] });

      const charLabel = anOptions("character", t).find((o) => o.value === answers["character"])?.label || "";
      const attemptLabel = anOptions("attempt", t).find((o) => o.value === answers["attempt"])?.label || "";
      const summary = `${t(SCENARIOS.find((s) => s.id === scenarioId)?.label || "Response to name")} — ${charLabel}, ${attemptLabel}`;

      const obs = await annotate(item.submission_id, {
        scenario: scenarioId,
        domains,
        duration,
        summary,
        notes,
        metrics,
      });
      toast(t("annot.saved"));
      go("progress", { childId: obs.child_id });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="linkish" onClick={() => go("queue")} style={{ marginBottom: 16 }}>
        <Icon name="arrow-left" size={14} /> {t("common.back")}
      </button>
      <PageHead a={t("annot.title.a")} b={t("annot.title.b")} sub={t("annot.sub")} right={<span className="code-chip" style={{ fontSize: 15, padding: "6px 12px" }}>{item.display_code}</span>} />

      <div className="split-7-6">
        {/* player */}
        <Card padding={20} style={{ position: "sticky", top: 90 }}>
          {videoErr ? (
            <div className="vid-frame" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span role="alert" style={{ color: "#fff", fontSize: 14, textAlign: "center", padding: 20 }}>{t("annot.videoError")}</span>
            </div>
          ) : videoUrl ? (
            <video
              data-testid="annot-video"
              src={videoUrl}
              controls
              controlsList="nodownload noremoteplayback noplaybackrate"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              onLoadedMetadata={(e) => setDuration(fmtDur((e.target as HTMLVideoElement).duration))}
              style={{ width: "100%", borderRadius: "var(--radius-md)", background: "#000", display: "block" }}
            />
          ) : (
            <div className="vid-frame" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "rgba(255,255,255,.75)", fontSize: 14 }}>{t("common.loading")}</span>
            </div>
          )}
          <p className="ds-small ds-muted" style={{ marginTop: 12, lineHeight: 1.5 }}>{t("annot.playerNote")}</p>
        </Card>

        {/* checklist */}
        <div className="col" style={{ gap: 16 }}>
          <Card padding={24}>
            <div className="row" style={{ marginBottom: 6 }}>
              <h3 className="ds-h4" style={{ flex: 1 }}>{t("annot.checklist")}</h3>
              <span className="chip" style={{ background: "var(--grey-surface-100)", color: "var(--text-muted)" }}>
                {answered} / {AN_ITEMS.length}
              </span>
            </div>
            <div className="row" style={{ alignItems: "flex-start", gap: 8, marginBottom: 18, color: "var(--text-muted)", fontSize: 13 }}>
              <Icon name="lock" size={13} style={{ marginTop: 2 }} />
              <span>{t("annot.lock")}</span>
            </div>

            <div className="col" style={{ gap: 4 }}>
              {AN_ITEMS.map((it, i) => {
                const val = answers[it.id];
                const open = revealed[it.id];
                const opts = anOptions(it.kind, t);
                const sugLabel = opts.find((o) => o.value === it.suggest)?.label;
                const agrees = val === it.suggest;
                return (
                  <div key={it.id} style={{ padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--ink-900)", marginBottom: 10 }}>
                      <span style={{ color: "var(--text-subtle)", fontWeight: 700, marginInlineEnd: 8 }}>{it.n}</span>
                      {t(it.title)}
                      {it.kind === "score" ? <span style={{ color: "var(--text-subtle)" }}> · 0–3</span> : null}
                    </div>
                    <Segmented options={opts} value={val} onChange={(v) => setAnswers({ ...answers, [it.id]: v })} />

                    {val && !open ? (
                      <div style={{ marginTop: 10 }}>
                        <button type="button" className="linkish" style={{ fontSize: 13 }} onClick={() => setRevealed({ ...revealed, [it.id]: true })}>
                          <Icon name="eye" size={13} /> {t("annot.reveal")}
                        </button>
                      </div>
                    ) : null}

                    {val && open ? (
                      <div style={{ marginTop: 10, borderRadius: 12, padding: "12px 14px", background: agrees ? "#eaf7f1" : "var(--yellow-surface-100)", border: "1px solid " + (agrees ? "rgba(114,188,161,.5)" : "rgba(255,217,131,.8)") }}>
                        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                          <Icon name="sparkles" size={14} color={agrees ? "var(--green-ink)" : "var(--yellow-ink)"} />
                          <span style={{ fontSize: 13.5 }}>
                            {t("annot.suggestion")}: <strong>{sugLabel}</strong>
                            <span style={{ color: "var(--text-muted)" }}> — {agrees ? t("annot.agrees") : t("annot.differs")}</span>
                          </span>
                          <CalBadge t={t} small />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card padding={24}>
            <TextArea label={t("common.notes")} value={notes} onChange={setNotes} placeholder={t("annot.notes.ph")} />
            <div className="row" style={{ marginTop: 18 }}>
              <Button variant="primary" size="sm" disabled={!allAnswered || busy} onClick={save} iconRight={<Icon name="check" size={16} color={!allAnswered || busy ? "rgba(43,42,42,.45)" : "#fff"} />}>
                {busy ? t("common.loading") : t("annot.save")}
              </Button>
              {!allAnswered ? <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{AN_ITEMS.length - answered} {t("annot.left")}</span> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
