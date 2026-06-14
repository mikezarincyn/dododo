import { useEffect, useState } from "react";

import { DemoBanner } from "../components/DemoBanner";
import {
  Card,
  ConfettiBurst,
  Icon,
  LangSwitcher,
  Logo,
  PageHead,
  Shell,
  ToastView,
  useToast,
  type NavItem,
} from "../components/ds";
import { makeT, isRTL, type Lang } from "../i18n/strings";
import { ParentArea } from "../parent/ParentArea";
import { OtArea } from "../ot/OtArea";

// Pilot roles only: parent, OT, clinic admin. (System admin / break-glass / clinic
// transfers are intentionally out of scope — see the agreed plan.)
type RoleId = "ot" | "parent" | "clinic";

interface RoleMeta {
  id: RoleId;
  icon: string;
  tint: string;
  ink: string;
}

const ROLES: RoleMeta[] = [
  { id: "ot", icon: "clipboard-list", tint: "var(--green-100)", ink: "var(--green-ink)" },
  { id: "parent", icon: "heart", tint: "var(--blush-100)", ink: "#b85c68" },
  { id: "clinic", icon: "building-2", tint: "var(--lilac-100)", ink: "var(--navy-700)" },
];

const ROLE_KEY: Record<RoleId, string> = { ot: "role.ot", parent: "role.parent", clinic: "role.clinic" };
const ROLE_HOME: Record<RoleId, string> = { ot: "dashboard", parent: "children", clinic: "overview" };

interface Route {
  role: RoleId | null;
  screen?: string;
  params?: Record<string, string>;
}

// Sub-screens that keep their section's nav item highlighted (per role).
const ACTIVE_MAP: Record<RoleId, Record<string, string>> = {
  parent: { addchild: "children", progress: "children" },
  ot: { annotate: "queue", progress: "dashboard", obs: "dashboard" },
  clinic: {},
};

function loadRoute(): Route {
  try {
    const r = JSON.parse(localStorage.getItem("dododoRoute") || "null");
    if (r && (r.role === null || ROLE_HOME[r.role as RoleId])) return r;
  } catch {
    /* ignore */
  }
  return { role: null };
}

/* ---------- role switcher ---------- */
function RoleSwitcher({
  t,
  lang,
  setLang,
  onPick,
}: {
  t: ReturnType<typeof makeT>;
  lang: Lang;
  setLang: (l: Lang) => void;
  onPick: (role: RoleId) => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <header className="app-topbar" style={{ borderBottom: "none" }}>
        <Logo height={32} />
        <span className="chip" style={{ background: "var(--yellow-surface-100)", color: "var(--yellow-ink)", fontSize: 12, padding: "5px 12px" }}>
          {t("brand.demo")}
        </span>
        <span className="spacer" />
        <LangSwitcher lang={lang} setLang={setLang} />
      </header>

      <div style={{ flex: 1, padding: "40px 32px 60px", position: "relative" }}>
        <ConfettiBurst
          pieces={[
            { src: "confetti-dot-yellow.svg", w: 24, top: "12%", left: "8%" },
            { src: "confetti-triangle-pink.svg", w: 22, top: "7%", left: "90%" },
            { src: "confetti-triangle-blue.svg", w: 20, top: "26%", left: "94%" },
            { src: "sparkle.svg", w: 26, top: "34%", left: "4%" },
          ]}
        />
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 44px" }}>
          <div className="ds-eyebrow" style={{ fontSize: 14, marginBottom: 18 }}>
            {t("switcher.eyebrow")}
          </div>
          <h1 className="ds-h1 ds-h1--twotone" style={{ fontSize: 56, lineHeight: 1.1, margin: 0 }}>
            {t("switcher.title.a")}
            <strong>{t("switcher.title.b")}</strong>
          </h1>
          <p className="page-sub" style={{ margin: "18px auto 0", fontSize: 17 }}>
            {t("switcher.sub")}
          </p>
        </div>

        <div className="role-grid">
          {ROLES.map((r) => (
            <Card key={r.id} padding={28} className="role-card" onClick={() => onPick(r.id)}>
              <span
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: r.tint,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <Icon name={r.icon} size={24} color={r.ink} />
              </span>
              <h3 className="ds-h4" style={{ marginBottom: 8 }}>
                {t(ROLE_KEY[r.id])}
              </h3>
              <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.55, color: "var(--text-muted)", minHeight: 66 }}>
                {t(ROLE_KEY[r.id] + ".desc")}
              </p>
              <span className="linkish">
                {t("switcher.enter")} <Icon name="arrow-right" size={14} />
              </span>
            </Card>
          ))}
        </div>
      </div>

      <footer style={{ padding: "0 32px 36px", textAlign: "center" }}>
        <p style={{ margin: "0 auto", maxWidth: 560, fontSize: 13, lineHeight: 1.6, color: "var(--text-subtle)" }}>
          {t("brand.disclaimer")}
        </p>
      </footer>
    </div>
  );
}

/* ---------- placeholder body (real screens arrive in Stage B/C) ---------- */
function Placeholder({ t, title }: { t: ReturnType<typeof makeT>; title: string }) {
  return (
    <div>
      <PageHead a="" b={title} />
      <Card padding={28}>
        <div className="row" style={{ alignItems: "flex-start", gap: 12, color: "var(--text-muted)" }}>
          <Icon name="clapperboard" size={18} />
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>
            {t("brand.disclaimer")}
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ---------- app ---------- */
export default function DesignApp() {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("dododoLang") as Lang) || "en");
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("dododoLang", l);
  };
  const t = makeT(lang);

  const [route, setRoute] = useState<Route>(loadRoute);
  useEffect(() => {
    localStorage.setItem("dododoRoute", JSON.stringify(route));
  }, [route]);
  useEffect(() => {
    document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const [toastMsg, toast] = useToast();

  const pickRole = (role: RoleId) => setRoute({ role, screen: ROLE_HOME[role], params: {} });
  const switchRole = () => setRoute({ role: null });
  const go = (screen: string, params?: Record<string, string>) =>
    setRoute((r) => ({ ...r, screen, params: params || {} }));

  if (!route.role) {
    return (
      <>
        <DemoBanner />
        <RoleSwitcher t={t} lang={lang} setLang={setLang} onPick={pickRole} />
        <ToastView msg={toastMsg} />
      </>
    );
  }

  const role = route.role;
  const screen = route.screen || ROLE_HOME[role];
  const roleMeta = ROLES.find((r) => r.id === role)!;

  const NAVS: Record<RoleId, NavItem[]> = {
    ot: [
      { id: "dashboard", icon: "layout-grid", label: t("nav.dashboard") },
      { id: "upload", icon: "upload", label: t("nav.upload") },
      { id: "queue", icon: "film", label: t("nav.uploads") },
    ],
    parent: [
      { id: "children", icon: "users", label: t("nav.children") },
      { id: "upload", icon: "upload", label: t("nav.upload") },
      { id: "queue", icon: "film", label: t("nav.uploads") },
      { id: "invite", icon: "mail", label: t("nav.invites") },
    ],
    clinic: [
      { id: "overview", icon: "layout-grid", label: t("nav.clinic") },
      { id: "therapists", icon: "users", label: t("nav.therapists") },
    ],
  };
  const nav = NAVS[role];
  const params = route.params || {};
  const active = ACTIVE_MAP[role][screen] || screen;
  const activeLabel = nav.find((n) => n.id === active)?.label || nav[0].label;

  const body =
    role === "parent" ? (
      <ParentArea t={t} screen={screen} params={params} go={go} toast={toast} />
    ) : role === "ot" ? (
      <OtArea t={t} screen={screen} params={params} go={go} toast={toast} />
    ) : (
      // Clinic admin screens arrive in a later stage.
      <Placeholder t={t} title={activeLabel} />
    );

  return (
    <>
      <DemoBanner />
      <Shell
        t={t}
        lang={lang}
        setLang={setLang}
        roleLabel={t(ROLE_KEY[role])}
        roleIcon={roleMeta.icon}
        onSwitchRole={switchRole}
        nav={nav}
        active={active}
        onNav={go}
      >
        {body}
      </Shell>
      <ToastView msg={toastMsg} />
    </>
  );
}
