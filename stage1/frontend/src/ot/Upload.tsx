import { useRef, useState } from "react";

import { Button, Card, Icon, PageHead, Select } from "../components/ds";
import { SCENARIOS } from "../data/reference";
import { FilmingGuide } from "./FilmingGuide";
import type { TFunc } from "../i18n/strings";

// Shared upload screen (OT + parent). Child options come from the caller
// (care-linked children for OT; own children for parent). Real <input type=file
// accept video/* capture> — on a phone this opens the camera. Submits to
// /api/submissions via the injected `upload`.
export function Upload({
  t,
  go,
  mode,
  childOptions,
  upload,
  toast,
}: {
  t: TFunc;
  go: (screen: string) => void;
  mode: "ot" | "parent";
  childOptions: { value: string; label: string }[];
  upload: (childId: string, scenario: string, file: File) => Promise<unknown>;
  toast: (m: string) => void;
}) {
  const [childId, setChildId] = useState("");
  const [scenario, setScenario] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ready = childId && scenario && file && !busy;

  async function submit() {
    if (!ready || !file) return;
    setBusy(true);
    try {
      await upload(childId, scenario, file);
      toast(t("upload.toast"));
      go("queue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <PageHead a={t("upload.title.a")} b={t("upload.title.b")} sub={t("upload.sub")} />
      <Card padding={32}>
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

          <div>
            <span className="field-label">{t("nav.upload")}</span>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              capture="environment"
              style={{ display: "none" }}
              data-testid="video-input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="row" style={{ border: "1.5px solid var(--green-500)", background: "#eaf7f1", borderRadius: "var(--radius-md)", padding: "16px 18px" }}>
                <Icon name="film" size={20} color="var(--green-ink)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--navy-700)" }}>{file.name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{Math.max(1, Math.round(file.size / (1024 * 1024)))} MB</div>
                </div>
                <button type="button" className="linkish" onClick={() => setFile(null)}>
                  <Icon name="x" size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{ width: "100%", cursor: "pointer", background: "var(--grey-surface-100)", border: "1.5px dashed rgba(13,50,118,.25)", borderRadius: "var(--radius-md)", padding: "30px 20px", textAlign: "center", color: "var(--text-muted)" }}
              >
                <Icon name="upload-cloud" size={26} color="var(--navy-700)" />
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--navy-700)", marginTop: 8 }}>{t("upload.drop")}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{t("upload.drop.hint")}</div>
              </button>
            )}
          </div>

          <div className="row" style={{ marginTop: 4 }}>
            <Button variant="primary" size="sm" disabled={!ready} onClick={submit} iconRight={<Icon name="arrow-right" size={16} color={ready ? "#fff" : "rgba(43,42,42,.45)"} />}>
              {busy ? t("common.loading") : t("upload.submit")}
            </Button>
            <button type="button" className="linkish" onClick={() => go(mode === "parent" ? "children" : "dashboard")}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
