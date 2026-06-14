import { useEffect, useRef, useState } from "react";

import { Button, CalBadge, Card, Icon, PageHead, Segmented, TextArea, VideoFrame } from "../components/ds";
import { AN_CALLS, AN_FRAMES, AN_ITEMS, AN_SECONDS, SCENARIO_DOMAINS, SCENARIOS, anOptions } from "../data/reference";
import type { TFunc } from "../i18n/strings";
import type { Metric, Observation } from "../api/ot";
import type { QueueRow } from "./Queue";

function anTime(frac: number): string {
  const s = Math.round(frac * AN_SECONDS);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Annotation — left: video player (placeholder clip + scrubber + call markers +
// frame stepper); right: 7-item checklist. ANTI-ANCHORING: the AI suggestion for
// each item stays HIDDEN until the OT answers it themselves; only then can it be
// revealed (and is badged "in calibration"). Save is enabled only when every item
// is answered. On save → observation persisted, raw video deleted (no-retention).
export function Annotation({
  t,
  go,
  item,
  annotate,
  toast,
}: {
  t: TFunc;
  go: (screen: string, params?: Record<string, string>) => void;
  item: QueueRow;
  annotate: (submissionId: string, payload: { scenario: string; domains: string[]; duration: string; summary: string; notes: string; metrics: Metric[] }) => Promise<Observation>;
  toast: (m: string) => void;
}) {
  const scenarioId = item.scenario || "name";
  const domains = SCENARIO_DOMAINS[scenarioId] || ["attention", "communication"];

  const [pos, setPos] = useState(0.18);
  const [playing, setPlaying] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const scrubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setPos((p) => {
        if (p + 0.004 >= 1) {
          setPlaying(false);
          return 1;
        }
        return p + 0.004;
      });
    }, 40);
    return () => clearInterval(id);
  }, [playing]);

  const frame = Math.min(AN_FRAMES, Math.max(1, Math.round(pos * AN_FRAMES)));
  const stepFrame = (d: number) => {
    setPlaying(false);
    setPos(Math.min(1, Math.max(0, (frame + d - 0.5) / AN_FRAMES)));
  };
  const answered = Object.keys(answers).length;
  const allAnswered = answered >= AN_ITEMS.length;

  const seek = (e: React.MouseEvent) => {
    if (!scrubRef.current) return;
    const r = scrubRef.current.getBoundingClientRect();
    let f = (e.clientX - r.left) / r.width;
    if (document.documentElement.dir === "rtl") f = 1 - f;
    setPos(Math.min(1, Math.max(0, f)));
    setPlaying(false);
  };

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
        duration: anTime(1),
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

  const tBtn = { minHeight: 38, padding: "0 14px", fontSize: 13 };

  return (
    <div>
      <button type="button" className="linkish" onClick={() => go("queue")} style={{ marginBottom: 16 }}>
        <Icon name="arrow-left" size={14} /> {t("common.back")}
      </button>
      <PageHead a={t("annot.title.a")} b={t("annot.title.b")} sub={t("annot.sub")} right={<span className="code-chip" style={{ fontSize: 15, padding: "6px 12px" }}>{item.display_code}</span>} />

      <div className="split-7-6">
        {/* player */}
        <Card padding={20} style={{ position: "sticky", top: 90 }}>
          <VideoFrame label={item.display_code} time={`${anTime(pos)} / ${anTime(1)}`} />
          <div className="scrub" ref={scrubRef} onClick={seek} style={{ marginTop: 14 }}>
            <span className="scrub-track" />
            <span className="scrub-fill" style={{ width: `${pos * 100}%` }} />
            {AN_CALLS.map((c) => (
              <span key={c.n} className="scrub-marker" title={`${t("annot.call")} ${c.n} · ${c.time}`} style={{ left: `${c.at * 100}%` }} />
            ))}
            <span className="scrub-head" style={{ left: `${pos * 100}%` }} />
          </div>
          <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 10 }}>
            <Button variant="outline" size="sm" style={tBtn} onClick={() => { setPos(0); setPlaying(false); }} title={t("annot.restart")}>
              <Icon name="skip-back" size={15} />
            </Button>
            <Button variant="outline" size="sm" style={tBtn} onClick={() => stepFrame(-1)} title={t("annot.prevFrame")}>
              <Icon name="chevron-left" size={15} />
            </Button>
            <Button variant="primary" size="sm" style={{ minHeight: 44, padding: "0 22px" }} onClick={() => setPlaying(!playing)}>
              <Icon name={playing ? "pause" : "play"} size={16} color="#fff" />
            </Button>
            <Button variant="outline" size="sm" style={tBtn} onClick={() => stepFrame(1)} title={t("annot.nextFrame")}>
              <Icon name="chevron-right" size={15} />
            </Button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginInlineStart: 8, whiteSpace: "nowrap" }}>
              {t("annot.frame")} {String(frame).padStart(2, "0")}/{AN_FRAMES}
            </span>
          </div>
          <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {AN_CALLS.map((c) => (
              <button key={c.n} type="button" onClick={() => { setPos(c.at); setPlaying(false); }} className="chip"
                style={{ background: Math.abs(pos - c.at) < 0.02 ? "var(--navy-700)" : "var(--grey-surface-100)", color: Math.abs(pos - c.at) < 0.02 ? "#fff" : "var(--text-muted)", border: "none", cursor: "pointer", fontSize: 12.5 }}>
                <Icon name="megaphone" size={12} /> {t("annot.call")} {c.n} · {c.time}
              </button>
            ))}
          </div>
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
