import { useEffect, useRef, useState } from "react";

import { Button, CalBadge, Card, Icon, PageHead, Segmented, SignalChart, TextArea, type ChartMarker, type ChartTrace } from "../components/ds";
import { AN_ITEMS, SCENARIO_DOMAINS, SCENARIOS, anOptions } from "../data/reference";
import type { TFunc } from "../i18n/strings";
import type { AnalysisBundle, Metric, Observation } from "../api/ot";
import type { QueueRow } from "./Queue";

function fmtDur(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Annotation — left: REAL video player + clinical analysis (synced signal graphs with
// click-to-seek, real engine event markers, recognized-words track, skeleton overlay
// toggle); right: 7-item checklist. The analysis bundle is the engine's RAW SIGNAL as
// facts (never auto-judgments) and is ephemeral (dies with the clip). ANTI-ANCHORING is
// unchanged: neutral signal is always shown, but the per-item suggestion stays hidden
// until the OT answers. On save → observation persisted, clip + bundle + overlay deleted.
export function Annotation({
  t,
  go,
  item,
  annotate,
  loadVideo,
  loadAnalysis,
  loadOverlay,
  toast,
}: {
  t: TFunc;
  go: (screen: string, params?: Record<string, string>) => void;
  item: QueueRow;
  annotate: (submissionId: string, payload: { scenario: string; domains: string[]; duration: string; summary: string; notes: string; metrics: Metric[] }) => Promise<Observation>;
  loadVideo: (submissionId: string) => Promise<Blob>;
  loadAnalysis: (submissionId: string) => Promise<AnalysisBundle>;
  loadOverlay: (submissionId: string) => Promise<Blob>;
  toast: (m: string) => void;
}) {
  const scenarioId = item.scenario || "name";
  const domains = SCENARIO_DOMAINS[scenarioId] || ["attention", "communication"];

  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [videoErr, setVideoErr] = useState(false);
  const [duration, setDuration] = useState("");
  const [durSec, setDurSec] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisBundle | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Stream the raw clip (blob → object URL, revoked on unmount).
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

  // Load the ephemeral analysis bundle (graphs/events). Optional — absent on clips
  // with no detectable signal; the screen still works for manual annotation.
  useEffect(() => {
    let active = true;
    loadAnalysis(item.submission_id)
      .then((b) => active && setAnalysis(b))
      .catch(() => active && setAnalysis(null));
    return () => {
      active = false;
    };
  }, [item.submission_id, loadAnalysis]);

  // Revoke the overlay URL on unmount.
  useEffect(() => () => {
    if (overlayUrl) URL.revokeObjectURL(overlayUrl);
  }, [overlayUrl]);

  async function toggleSkeleton() {
    pendingSeek.current = videoRef.current?.currentTime ?? 0;
    if (!showSkeleton && !overlayUrl) {
      try {
        const blob = await loadOverlay(item.submission_id);
        setOverlayUrl(URL.createObjectURL(blob));
      } catch {
        return; // overlay unavailable — stay on the raw clip
      }
    }
    setShowSkeleton((s) => !s);
  }

  const seek = (tSec: number) => {
    if (videoRef.current) videoRef.current.currentTime = tSec;
  };

  const answered = Object.keys(answers).length;
  const allAnswered = answered >= AN_ITEMS.length;
  const activeUrl = showSkeleton && overlayUrl ? overlayUrl : videoUrl;

  // Build chart traces + markers from the bundle (real engine signal).
  const traces: ChartTrace[] = [];
  if (analysis?.series.head_turn) traces.push({ label: t("annot.sig.headTurn"), color: "var(--navy-700)", t: analysis.series.head_turn.t, v: analysis.series.head_turn.v });
  if (analysis?.series.hand_movement) traces.push({ label: t("annot.sig.handMove"), color: "var(--green-500)", t: analysis.series.hand_movement.t, v: analysis.series.hand_movement.v });
  const markers: ChartMarker[] = [];
  for (const ct of analysis?.events.calls || []) markers.push({ t: ct, color: "var(--coral-500)", label: t("annot.ev.call") });
  for (const w of analysis?.events.words || []) markers.push({ t: w.t, color: "#7c6cf0", label: w.text });
  for (const p of analysis?.events.movement_peaks || []) markers.push({ t: p, color: "var(--yellow-ink)", label: t("annot.ev.peak") });
  const chartDur = (analysis?.duration_s && analysis.duration_s > 0) ? analysis.duration_s : durSec;

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

      const charLabel = anOptions("character", t).find((o) => o.value === answers["character"])?.label || "";
      const attemptLabel = anOptions("attempt", t).find((o) => o.value === answers["attempt"])?.label || "";
      const summary = `${t(SCENARIOS.find((s) => s.id === scenarioId)?.label || "Response to name")} — ${charLabel}, ${attemptLabel}`;

      const obs = await annotate(item.submission_id, { scenario: scenarioId, domains, duration, summary, notes, metrics });
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
        {/* player + analysis */}
        <Card padding={20} style={{ position: "sticky", top: 90 }}>
          {videoErr ? (
            <div className="vid-frame" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span role="alert" style={{ color: "#fff", fontSize: 14, textAlign: "center", padding: 20 }}>{t("annot.videoError")}</span>
            </div>
          ) : activeUrl ? (
            <video
              ref={videoRef}
              data-testid="annot-video"
              src={activeUrl}
              controls
              controlsList="nodownload noremoteplayback noplaybackrate"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
              onLoadedMetadata={(e) => {
                const v = e.target as HTMLVideoElement;
                setDuration(fmtDur(v.duration));
                if (isFinite(v.duration)) setDurSec(v.duration);
                if (pendingSeek.current != null) {
                  v.currentTime = pendingSeek.current;
                  pendingSeek.current = null;
                }
              }}
              style={{ width: "100%", borderRadius: "var(--radius-md)", background: "#000", display: "block" }}
            />
          ) : (
            <div className="vid-frame" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "rgba(255,255,255,.75)", fontSize: 14 }}>{t("common.loading")}</span>
            </div>
          )}

          {/* skeleton overlay toggle (OT-only; the engine already rendered the overlay) */}
          <div className="row" style={{ marginTop: 12, gap: 10, flexWrap: "wrap" }}>
            <Button variant={showSkeleton ? "primary" : "outline"} size="sm" style={{ minHeight: 36, padding: "0 14px", fontSize: 13 }} onClick={toggleSkeleton}>
              <Icon name="person-standing" size={14} color={showSkeleton ? "#fff" : undefined} /> {showSkeleton ? t("annot.overlay.hide") : t("annot.overlay.show")}
            </Button>
            <span className="ds-small ds-muted" style={{ flex: 1, minWidth: 160 }}>{t("annot.playerNote")}</span>
          </div>

          {/* synced signal chart + real event markers (click to seek) */}
          {analysis ? (
            <div style={{ marginTop: 14 }}>
              <SignalChart traces={traces} markers={markers} duration={chartDur} currentTime={currentTime} onSeek={seek} />
              <div className="row" style={{ gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                {traces.map((tr) => (
                  <span key={tr.label} className="row" style={{ gap: 5 }}>
                    <span style={{ width: 12, height: 3, background: tr.color, borderRadius: 2, display: "inline-block" }} /> {tr.label}
                  </span>
                ))}
                {analysis.events.calls.length ? <span className="row" style={{ gap: 5 }}><span style={{ width: 8, height: 8, background: "var(--coral-500)", display: "inline-block" }} /> {t("annot.ev.call")}</span> : null}
              </div>

              {/* recognized words — clickable transcript track (auto, may contain errors) */}
              {analysis.events.words.length ? (
                <div style={{ marginTop: 12 }}>
                  <div className="ds-small ds-muted" style={{ marginBottom: 6 }}>{t("annot.transcript")}</div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {analysis.events.words.map((w, i) => (
                      <button key={i} type="button" className="chip" onClick={() => seek(w.t)}
                        style={{ background: "var(--grey-surface-100)", color: "var(--ink-900)", border: "none", cursor: "pointer", fontSize: 12.5 }}>
                        {w.text} <span style={{ color: "var(--text-subtle)" }}>{fmtDur(w.t)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
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
                return (
                  <div key={it.id} style={{ padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--ink-900)", marginBottom: 10 }}>
                      <span style={{ color: "var(--text-subtle)", fontWeight: 700, marginInlineEnd: 8 }}>{it.n}</span>
                      {t(it.title)}
                      {it.kind === "score" ? <span style={{ color: "var(--text-subtle)" }}> · 0–3</span> : null}
                    </div>
                    <Segmented options={anOptions(it.kind, t)} value={val} onChange={(v) => setAnswers({ ...answers, [it.id]: v })} />

                    {val && !open ? (
                      <div style={{ marginTop: 10 }}>
                        <button type="button" className="linkish" style={{ fontSize: 13 }} onClick={() => setRevealed({ ...revealed, [it.id]: true })}>
                          <Icon name="eye" size={13} /> {t("annot.reveal")}
                        </button>
                      </div>
                    ) : null}

                    {val && open ? (() => {
                      // Stage 2: real engine hint or nothing — never a demo value.
                      const hint = analysis?.checklist_hints?.[it.id];
                      if (!hint) {
                        return <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>{t("annot.noHint")}</div>;
                      }
                      const hintLabel = anOptions(it.kind, t).find((o) => o.value === hint.value)?.label || hint.value;
                      const agrees = val === hint.value;
                      return (
                        <div style={{ marginTop: 10, borderRadius: 12, padding: "12px 14px", background: agrees ? "#eaf7f1" : "var(--yellow-surface-100)", border: "1px solid " + (agrees ? "rgba(114,188,161,.5)" : "rgba(255,217,131,.8)") }}>
                          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                            <Icon name="sparkles" size={14} color={agrees ? "var(--green-ink)" : "var(--yellow-ink)"} />
                            <span style={{ fontSize: 13.5 }}>
                              {t("annot.suggestion")}: <strong>{hintLabel}</strong>
                              <span style={{ color: "var(--text-muted)" }}> — {agrees ? t("annot.agrees") : t("annot.differs")}</span>
                            </span>
                            <CalBadge t={t} small />
                          </div>
                          {hint.basis ? <div className="ds-small ds-muted" style={{ marginTop: 6 }}>{hint.basis}</div> : null}
                        </div>
                      );
                    })() : null}
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
