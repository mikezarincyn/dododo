import { useState } from "react";

import { Button, Card, ConfettiBurst, Icon, Input, TwoTone } from "../components/ds";
import type { TFunc } from "../i18n/strings";

// The four required consent attestations. IDs are the backend's stable, versioned
// consent ids (CONSENT_REQUIRED_CHECKBOX_IDS) — NOT renamed. Wording is aligned to
// our no-retention invariant: videos are encrypted, visible only inside the care
// link, and deleted after review. Human-in-the-loop ("never decides on its own")
// is preserved. English is the authoritative consent text for the pilot.
const CONSENT = [
  {
    id: "guardian_authority",
    title: "I'm the parent or legal guardian",
    body: "I confirm I am the parent or legal guardian of this child and have the authority to share these videos.",
  },
  {
    id: "specialist_review_feedback",
    title: "A specialist reviews the videos",
    body: "A specialist may review the videos to share observations and feedback. The system may prepare draft observations — it never decides anything on its own.",
  },
  {
    id: "explicit_processing",
    title: "I consent to processing these videos",
    body: "I explicitly consent to processing information about my child's development contained in these videos.",
  },
  {
    id: "review_then_delete",
    title: "Videos are deleted after review",
    body: "Videos are encrypted, visible only inside the care link, and deleted after review. I can withdraw consent before review.",
  },
];
const REQUIRED_IDS = CONSENT.map((c) => c.id);

export function ParentAddChild({
  t,
  go,
  createChild,
  onAdded,
}: {
  t: TFunc;
  go: (screen: string) => void;
  createChild: (firstName: string, birthMonth: string, checkedIds: string[]) => Promise<{ child_id: string; display_code: string }>;
  onAdded: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [boxes, setBoxes] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const allBoxes = REQUIRED_IDS.every((id) => boxes[id]);

  async function agree() {
    if (!allBoxes || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createChild(name, month, REQUIRED_IDS);
      setCode(res.display_code);
      onAdded();
      setStep(2);
    } catch {
      setError(t("Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <button type="button" className="linkish" onClick={() => go("children")} style={{ marginBottom: 16 }}>
        <Icon name="arrow-left" size={14} /> {t("common.back")}
      </button>

      {/* step dots */}
      <div className="row" style={{ gap: 6, marginBottom: 20 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: i === step ? 24 : 8,
              height: 8,
              borderRadius: "var(--radius-pill)",
              background: i <= step ? "var(--green-500)" : "#e7e9eb",
              transition: "all .3s ease",
            }}
          />
        ))}
      </div>

      {step === 0 ? (
        <div>
          <TwoTone a={t("parent.wizard.title.a")} b={t("parent.wizard.title.b")} />
          <p className="page-sub" style={{ marginBottom: 24 }}>
            {t("Just the basics. Their name stays with you — therapists see a pseudonym like CH-AB12CD.")}
          </p>
          <Card padding={28}>
            <div className="col" style={{ gap: 18 }}>
              <Input label={t("Child's first name")} placeholder={t("e.g. Nora")} value={name} onChange={(e) => setName(e.target.value)} />
              <Input label={t("Birth month")} placeholder={t("e.g. March 2023")} value={month} onChange={(e) => setMonth(e.target.value)} />
              <div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!name || !month}
                  onClick={() => setStep(1)}
                  iconRight={<Icon name="arrow-right" size={16} color={!name || !month ? "rgba(43,42,42,.45)" : "#fff"} />}
                >
                  {t("common.continue")}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <TwoTone a={t("parent.consent.title.a")} b={t("parent.consent.title.b")} />
          <p className="page-sub" style={{ marginBottom: 24 }}>
            {t("Nothing happens without your say-so. Tick each point — you can withdraw before review.")}
          </p>
          <Card padding={28}>
            <div className="col" style={{ gap: 18 }}>
              {CONSENT.map((cn) => (
                <label
                  key={cn.id}
                  className="row"
                  style={{
                    alignItems: "flex-start",
                    cursor: "pointer",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "1.5px solid " + (boxes[cn.id] ? "var(--green-500)" : "var(--border-subtle)"),
                    background: boxes[cn.id] ? "#eaf7f1" : "var(--white)",
                    transition: "all .15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!boxes[cn.id]}
                    onChange={() => setBoxes({ ...boxes, [cn.id]: !boxes[cn.id] })}
                    style={{ width: 20, height: 20, accentColor: "#72BCA1", marginTop: 2, flexShrink: 0 }}
                  />
                  <span>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 15, color: "var(--navy-700)" }}>{t(cn.title)}</span>
                    <span style={{ display: "block", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 4 }}>{t(cn.body)}</span>
                  </span>
                </label>
              ))}
              <div className="row" style={{ alignItems: "flex-start", gap: 8, color: "var(--text-muted)", fontSize: 12.5 }}>
                <Icon name="shield" size={13} style={{ marginTop: 2 }} />
                <span>{t("brand.disclaimer")}</span>
              </div>
              {error ? (
                <p role="alert" style={{ color: "var(--coral-500)", margin: 0 }}>
                  {error}
                </p>
              ) : null}
              <div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!allBoxes || busy}
                  onClick={agree}
                  iconRight={<Icon name="check" size={16} color={!allBoxes || busy ? "rgba(43,42,42,.45)" : "#fff"} />}
                >
                  {busy ? t("common.loading") : t("parent.agree", { name: name || t("my child") })}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 2 ? (
        <Card padding={40} style={{ position: "relative", textAlign: "center" }}>
          <ConfettiBurst
            pieces={[
              { src: "confetti-dot-yellow.svg", w: 22, top: "14%", left: "12%" },
              { src: "confetti-triangle-pink.svg", w: 20, top: "10%", left: "88%" },
              { src: "confetti-triangle-blue.svg", w: 20, top: "78%", left: "8%" },
              { src: "sparkle.svg", w: 26, top: "80%", left: "90%" },
            ]}
          />
          <span
            style={{
              width: 64, height: 64, borderRadius: "50%", background: "var(--green-100)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
            }}
          >
            <Icon name="check" size={28} color="var(--green-ink)" />
          </span>
          <h3 className="ds-h3" style={{ marginBottom: 10 }}>{t("parent.done.title", { name })}</h3>
          <p style={{ margin: "0 0 6px", color: "var(--text-muted)", fontSize: 15, lineHeight: 1.55 }}>
            {t("parent.done.share", { name })}
          </p>
          <div style={{ margin: "14px 0 24px" }}>
            <span className="code-chip" style={{ fontSize: 20, padding: "10px 18px" }}>{code}</span>
          </div>
          <div className="row" style={{ justifyContent: "center", gap: 12 }}>
            <Button variant="primary" size="sm" onClick={() => go("invite")}>{t("parent.invite")}</Button>
            <Button variant="outline" size="sm" onClick={() => go("children")}>{t("nav.children")}</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
