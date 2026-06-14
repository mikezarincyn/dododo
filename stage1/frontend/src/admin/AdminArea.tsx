import { Card, Icon, PageHead } from "../components/ds";
import type { TFunc } from "../i18n/strings";

// Admin console. Stage 1: placeholder shell (auth + role routing land first).
// Stage 2 fills in overview / therapists / parents / children-&-links.
export function AdminArea({
  t,
  screen,
}: {
  t: TFunc;
  screen: string;
  params: Record<string, string>;
  go: (screen: string, params?: Record<string, string>) => void;
  toast: (m: string) => void;
}) {
  const titles: Record<string, string> = {
    overview: t("nav.clinic"),
    therapists: t("nav.therapists"),
    parents: t("nav.parents"),
    children: t("nav.childrenLinks"),
  };
  return (
    <div>
      <PageHead a="" b={titles[screen] || t("nav.clinic")} />
      <Card padding={28}>
        <div className="row" style={{ alignItems: "flex-start", gap: 12, color: "var(--text-muted)" }}>
          <Icon name="building-2" size={18} />
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>{t("brand.disclaimer")}</p>
        </div>
      </Card>
    </div>
  );
}
