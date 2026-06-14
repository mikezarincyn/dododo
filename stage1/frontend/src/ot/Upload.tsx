import { useEffect, useRef, useState } from "react";

import { Button, Card, Icon, PageHead, Select } from "../components/ds";
import { SCENARIOS } from "../data/reference";
import { FilmingGuide } from "./FilmingGuide";
import { VideoRecorder } from "./VideoRecorder";
import { canRecord } from "./recording";
import { uploadSubmission, type UploadFn } from "../api/upload";
import type { TFunc } from "../i18n/strings";

type UploadState = "idle" | "uploading" | "error";

// Shared upload screen (OT + parent). Top: child + scenario + filming guide. Then
// TWO paths with explicit hierarchy: a big primary "Record now" (in-window guided
// recording) and a quieter secondary "Upload a file". Feature-detects recording;
// where unavailable, falls back to the native capture input (OS camera) and always
// keeps "choose a file". Reliable upload: XHR progress, beforeunload guard, retry.
export function Upload({
  t,
  go,
  mode,
  childOptions,
  toast,
  onUploaded,
  upload = uploadSubmission,
}: {
  t: TFunc;
  go: (screen: string) => void;
  mode: "ot" | "parent";
  childOptions: { value: string; label: string }[];
  toast: (m: string) => void;
  onUploaded?: () => void;
  upload?: UploadFn;
}) {
  const [childId, setChildId] = useState(childOptions.length === 1 ? childOptions[0].value : "");
  const [scenario, setScenario] = useState("");
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const recInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recordable = canRecord();
  const canChoose = !!childId && !!scenario;

  // Warn before closing the tab mid-upload (raw video, no chunked resume).
  useEffect(() => {
    if (state !== "uploading") return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [state]);

  async function startUpload(f: File) {
    setFile(f);
    setState("uploading");
    setProgress(0);
    try {
      await upload(childId, scenario, f, (pct) => setProgress(pct));
      toast(t("upload.toast"));
      onUploaded?.();
      go("queue");
    } catch {
      setState("error");
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) startUpload(f);
  }

  if (recorderOpen) {
    return (
      <VideoRecorder
        t={t}
        scenarioId={scenario}
        onCancel={() => setRecorderOpen(false)}
        onUse={(f) => {
          setRecorderOpen(false);
          startUpload(f);
        }}
      />
    );
  }

  // ---- uploading / error states ----
  if (state !== "idle") {
    return (
      <div style={{ maxWidth: 560 }}>
        <PageHead a={t("upload.record.title.a")} b={t("upload.record.title.b")} sub={t("upload.sub")} />
        <Card padding={28}>
          {state === "uploading" ? (
            <div role="status">
              <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                <Icon name="film" size={18} color="var(--green-ink)" />
                <span style={{ fontWeight: 700, color: "var(--navy-700)", flex: 1 }}>{file?.name}</span>
                <span style={{ fontWeight: 700, color: "var(--navy-700)" }}>{progress}%</span>
              </div>
              <div className="processing-stripe"><span style={{ width: `${progress}%` }} /></div>
              <p className="ds-small ds-muted" style={{ marginTop: 12 }}>{t("upload.uploading")}</p>
              <p className="ds-small ds-muted" style={{ marginTop: 4 }}>{t("upload.keepOpen")}</p>
            </div>
          ) : (
            <div>
              <p role="alert" style={{ color: "var(--coral-500)", fontWeight: 600, margin: "0 0 16px" }}>
                {t("upload.uploadError")}
              </p>
              <div className="row" style={{ gap: 12 }}>
                <Button variant="primary" size="sm" onClick={() => file && startUpload(file)} iconRight={<Icon name="refresh-cw" size={15} color="#fff" />}>
                  {t("upload.retry")}
                </Button>
                <button type="button" className="linkish" onClick={() => { setState("idle"); setFile(null); }}>
                  {t("upload.chooseAnother")}
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ---- idle: pick child + scenario, then two paths ----
  return (
    <div style={{ maxWidth: 620 }}>
      <PageHead a={t("upload.record.title.a")} b={t("upload.record.title.b")} sub={t("upload.sub")} />

      {/* hidden inputs: native capture (record fallback) + plain file (always) */}
      <input ref={recInputRef} type="file" accept="video/*" capture="environment" style={{ display: "none" }} data-testid="record-input" onChange={onPick} />
      <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} data-testid="file-input" onChange={onPick} />

      <Card padding={28} style={{ marginBottom: 20 }}>
        <div className="col" style={{ gap: 20 }}>
          <Select label={t("upload.child")} value={childId} placeholder={t("upload.child.ph")} options={childOptions} onChange={setChildId} />
          <Select label={t("upload.scenario")} value={scenario} placeholder={t("upload.scenario.ph")} options={SCENARIOS.map((s) => ({ value: s.id, label: t(s.label) }))} onChange={setScenario} />
          {scenario ? (
            <FilmingGuide t={t} scenarioId={scenario} />
          ) : (
            <div className="row" style={{ gap: 8, color: "var(--text-subtle)", fontSize: 13 }}>
              <Icon name="clapperboard" size={14} />
              <span>{t("Pick a scenario above to see its filming guide.")}</span>
            </div>
          )}
        </div>
      </Card>

      {/* PRIMARY path — Record now */}
      <Card padding={24} tone="mint" style={{ marginBottom: 14, opacity: canChoose ? 1 : 0.55 }}>
        <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
          <span style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--green-500)", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="film" size={22} color="#fff" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--navy-700)" }}>{t("upload.record.now")}</div>
            <p style={{ margin: "4px 0 14px", fontSize: 14, lineHeight: 1.5, color: "var(--text-muted)" }}>
              {recordable ? t("upload.record.recommended") : t("upload.record.unavailable")}
            </p>
            <Button
              variant="primary"
              size="md"
              disabled={!canChoose}
              onClick={() => (recordable ? setRecorderOpen(true) : recInputRef.current?.click())}
              iconRight={<Icon name="arrow-right" size={16} color={canChoose ? "#fff" : "rgba(43,42,42,.45)"} />}
            >
              {t("upload.record.now")}
            </Button>
          </div>
        </div>
      </Card>

      {/* SECONDARY path — upload a file (quieter) */}
      <div className="row" style={{ justifyContent: "space-between", gap: 12, padding: "4px 4px 0", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--navy-700)" }}>{t("upload.record.haveFile")}</div>
          <div className="ds-small ds-muted">{t("upload.record.haveFileHint")}</div>
        </div>
        <Button variant="outline" size="sm" disabled={!canChoose} onClick={() => fileInputRef.current?.click()}>
          {t("upload.record.haveFile")}
        </Button>
      </div>

      <div className="row" style={{ marginTop: 20 }}>
        <button type="button" className="linkish" onClick={() => go(mode === "parent" ? "children" : "dashboard")}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}
