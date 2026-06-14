import { Avatar, Badge, Card, Icon, TwoTone } from "../components/ds";
import type { TFunc } from "../i18n/strings";
import type { ParentChild } from "../api/parent";

// Gentle parent progress — by design: NO scores, NO comparisons, and NO machine
// auto-judgements. (Domain trends shown to a parent would be confirmed-OT only;
// in-calibration auto-metrics are never surfaced to parents.) Until a therapist
// has reviewed real videos there are no observations, so this is a clearly-marked
// SAMPLE of the gentle weekly story. Stage C wires it to confirmed observations.
const SAMPLE = {
  moments: [
    { icon: "eye", text: "This is a sample of the kind of warm, everyday moments your therapist will highlight here." },
    { icon: "puzzle", text: "Short, encouraging notes — never scores or comparisons." },
  ],
  nextSteps: [
    { title: "Name + pause game", body: "Once a day, say their name once, then wait a full 5 seconds before repeating. Celebrate any turn — even a glance.", mins: 5 },
    { title: "Build it together", body: "Take turns adding one block each. Narrate simply: “my turn… your turn.”", mins: 10 },
  ],
};

export function ParentProgress({
  t,
  go,
  child,
  reviewedCount = 0,
}: {
  t: TFunc;
  go: (screen: string) => void;
  child?: ParentChild;
  reviewedCount?: number;
}) {
  return (
    <div style={{ maxWidth: 720 }}>
      <button type="button" className="linkish" onClick={() => go("children")} style={{ marginBottom: 16 }}>
        <Icon name="arrow-left" size={14} /> {t("common.back")}
      </button>

      <div className="row" style={{ gap: 14, marginBottom: 8 }}>
        <Avatar name={child?.first_name} size={46} />
        <TwoTone a={t("parent.progress.week.a")} b={t("more shared attention")} style={{ fontSize: 34 }} />
      </div>
      <p className="page-sub" style={{ marginBottom: 20 }}>{t("parent.progress.sub")}</p>

      {/* When the therapist has reviewed videos, the parent sees that it happened
          (count only) — never clinical summaries, metrics or scores (red line).
          Otherwise this is a clearly-marked sample of the gentle weekly story. */}
      <Card padding={18} tone="mint" style={{ marginBottom: 22 }}>
        <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
          <Icon name={reviewedCount > 0 ? "heart-handshake" : "sparkles"} size={16} color="var(--green-ink)" style={{ marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--text-body)" }}>
            {reviewedCount > 0
              ? t("Your therapist has reviewed {n} video(s). Gentle ideas to try at home are below.", { n: reviewedCount })
              : t("Sample view. Your child's real weekly highlights appear here once your therapist has reviewed your videos.")}
          </p>
        </div>
      </Card>

      <Card padding={28} style={{ marginBottom: 22 }}>
        <div className="col" style={{ gap: 20 }}>
          {SAMPLE.moments.map((m, i) => (
            <div key={i} className="row" style={{ alignItems: "flex-start", gap: 14 }}>
              <span
                style={{
                  width: 38, height: 38, borderRadius: "50%", background: "var(--lilac-100)", flexShrink: 0,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--navy-700)",
                }}
              >
                <Icon name={m.icon} size={17} />
              </span>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, paddingTop: 6 }}>{t(m.text)}</p>
            </div>
          ))}
        </div>
      </Card>

      <h3 className="ds-h4" style={{ marginBottom: 14 }}>{t("parent.nextSteps")}</h3>
      <div className="col" style={{ gap: 12, marginBottom: 24 }}>
        {SAMPLE.nextSteps.map((s, i) => (
          <Card key={i} tone={i === 0 ? "mint" : "white"} padding={20}>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15.5, color: "var(--navy-700)" }}>{t(s.title)}</div>
                <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.55, color: "var(--text-muted)" }}>{t(s.body)}</p>
              </div>
              <Badge tone="green" style={{ flexShrink: 0 }}>{s.mins} {t("min")}</Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: 10, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.55 }}>
        <Icon name="heart" size={14} style={{ marginTop: 2 }} />
        <span>{t("No scores, no comparisons — on purpose. Your therapist sees the detailed observations; you see what matters at home.")}</span>
      </div>
    </div>
  );
}
