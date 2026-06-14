import { Icon } from "../components/ds";
import { FILMING_GUIDES, SCENARIOS } from "../data/reference";
import type { TFunc } from "../i18n/strings";

// Per-scenario filming guide (setup / tips / duration), shown after a scenario is
// chosen on the upload screen. Ported from the design FilmingGuide.
export function FilmingGuide({ t, scenarioId }: { t: TFunc; scenarioId: string }) {
  const g = FILMING_GUIDES[scenarioId];
  const sc = SCENARIOS.find((s) => s.id === scenarioId);
  if (!g) return null;
  return (
    <div style={{ borderRadius: "var(--radius-md)", background: "var(--yellow-surface-100)", padding: "18px 20px" }}>
      <div className="row" style={{ gap: 10, marginBottom: 4 }}>
        <Icon name="clapperboard" size={16} color="var(--yellow-ink)" />
        <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--navy-700)", flex: 1 }}>
          {t("upload.guide.title")} · {sc ? t(sc.label) : ""}
        </span>
        <span className="chip" style={{ background: "var(--white)", color: "var(--yellow-ink)", fontSize: 11.5 }}>
          <Icon name="timer" size={11} /> {t("upload.guide.length")}: {t(g.duration)}
        </span>
      </div>
      <p style={{ margin: "6px 0 10px", fontSize: 13.5, lineHeight: 1.55, color: "var(--text-muted)" }}>
        <strong style={{ color: "var(--ink-900)" }}>{t("upload.guide.setup")}: </strong>
        {t(g.setup)}
      </p>
      <div className="col" style={{ gap: 8 }}>
        {g.tips.map((tip, i) => (
          <div key={i} className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--lilac-100)", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <Icon name="check" size={11} color="var(--navy-700)" />
            </span>
            <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{t(tip)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
