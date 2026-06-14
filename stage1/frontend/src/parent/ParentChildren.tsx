import { Avatar, Button, Card, Icon, PageHead } from "../components/ds";
import type { TFunc } from "../i18n/strings";
import type { ParentChild } from "../api/parent";
import { ageFromBirthMonth } from "./age";

// My children — cards with the (private) first name, avatar, age, display_code
// and care-link status. Pixel-ported from the design's ParentChildren.
export function ParentChildren({
  t,
  userName,
  go,
  children,
}: {
  t: TFunc;
  userName?: string;
  go: (screen: string, params?: Record<string, string>) => void;
  children: ParentChild[];
}) {
  return (
    <div>
      <PageHead
        a={t("parent.dash.title.a")}
        b={userName?.trim() || t("parent.dash.title.b")}
        sub={t("parent.dash.sub")}
        right={
          <Button variant="primary" size="sm" onClick={() => go("addchild")} iconRight={<Icon name="plus" size={16} color="#fff" />}>
            {t("parent.addChild")}
          </Button>
        }
      />

      {children.length === 0 ? (
        <Card padding={40} style={{ textAlign: "center" }}>
          <span
            style={{
              width: 56, height: 56, borderRadius: "50%", background: "var(--green-100)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
            }}
          >
            <Icon name="user-plus" size={24} color="var(--green-ink)" />
          </span>
          <p style={{ margin: "0 0 18px", color: "var(--text-muted)", fontSize: 15.5, lineHeight: 1.55 }}>
            {t("Add your first child to get started — their name stays with you.")}
          </p>
          <Button variant="primary" size="sm" onClick={() => go("addchild")} iconRight={<Icon name="plus" size={16} color="#fff" />}>
            {t("parent.addChild")}
          </Button>
        </Card>
      ) : (
        <div className="tile-grid">
          {children.map((c) => {
            const age = ageFromBirthMonth(c.birth_month);
            const linked = !!(c.care_link && c.care_link.ot_name);
            return (
              <Card key={c.child_id} padding={24} style={{ cursor: "pointer" }} onClick={() => go("progress", { childId: c.child_id })}>
                <div className="row" style={{ marginBottom: 14 }}>
                  <Avatar name={c.first_name} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19, color: "var(--navy-700)" }}>{c.first_name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      {age
                        ? `${t("common.age")} ${age.y}${t("common.years")} ${age.m}${t("common.months")}`
                        : c.birth_month}
                    </div>
                  </div>
                  <span className="code-chip">{c.display_code}</span>
                </div>
                <hr className="hairline" style={{ marginBottom: 12 }} />
                <div className="row" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
                  {linked ? (
                    <>
                      <Icon name="heart-handshake" size={14} color="var(--green-ink)" />
                      <span style={{ flex: 1 }}>
                        {t("With")} <strong style={{ color: "var(--ink-900)" }}>{c.care_link!.ot_name}</strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <Icon name="user-plus" size={14} />
                      <span style={{ flex: 1 }}>{t("No therapist yet")}</span>
                    </>
                  )}
                  <span className="linkish" style={{ fontSize: 13 }}>
                    {t("nav.progress")} <Icon name="arrow-right" size={13} />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="row" style={{ marginTop: 26 }}>
        <button type="button" className="linkish" onClick={() => go("invite")}>
          <Icon name="mail" size={14} /> {t("parent.invite")}
        </button>
      </div>
    </div>
  );
}
