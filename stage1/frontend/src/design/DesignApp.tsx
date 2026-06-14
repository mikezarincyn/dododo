import { useEffect, useState } from "react";

import { DemoBanner } from "../components/DemoBanner";
import { Shell, ToastView, useToast, type NavItem } from "../components/ds";
import { makeT, isRTL, type Lang } from "../i18n/strings";
import { authApi, type AuthApi, type AuthUser, type Role } from "../api/auth";
import { AuthScreen } from "../auth/AuthScreen";
import { ParentArea } from "../parent/ParentArea";
import { OtArea } from "../ot/OtArea";
import { AdminArea } from "../admin/AdminArea";

const ROLE_KEY: Record<Role, string> = { ot: "role.ot", parent: "role.parent", admin: "role.clinic" };
const ROLE_ICON: Record<Role, string> = { ot: "clipboard-list", parent: "heart", admin: "building-2" };
const ROLE_HOME: Record<Role, string> = { ot: "dashboard", parent: "children", admin: "overview" };

// Sub-screens that keep their section's nav item highlighted (per role).
const ACTIVE_MAP: Record<Role, Record<string, string>> = {
  parent: { addchild: "children", progress: "children" },
  ot: { annotate: "queue", progress: "dashboard", obs: "dashboard" },
  admin: { childlinks: "children" },
};

interface Route {
  screen: string;
  params: Record<string, string>;
}

function navFor(role: Role, t: ReturnType<typeof makeT>): NavItem[] {
  if (role === "ot")
    return [
      { id: "dashboard", icon: "layout-grid", label: t("nav.dashboard") },
      { id: "upload", icon: "upload", label: t("nav.upload") },
      { id: "queue", icon: "film", label: t("nav.uploads") },
    ];
  if (role === "parent")
    return [
      { id: "children", icon: "users", label: t("nav.children") },
      { id: "upload", icon: "upload", label: t("nav.upload") },
      { id: "queue", icon: "film", label: t("nav.uploads") },
      { id: "invite", icon: "mail", label: t("nav.invites") },
    ];
  return [
    { id: "overview", icon: "layout-grid", label: t("nav.clinic") },
    { id: "therapists", icon: "users", label: t("nav.therapists") },
    { id: "parents", icon: "heart", label: t("nav.parents") },
    { id: "children", icon: "baby", label: t("nav.childrenLinks") },
  ];
}

export default function DesignApp({ api = authApi }: { api?: AuthApi }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("dododoLang") as Lang) || "en");
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("dododoLang", l);
  };
  const t = makeT(lang);

  // undefined = still checking the session; null = not signed in; user = signed in.
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [route, setRoute] = useState<Route | null>(null);
  const [toastMsg, toast] = useToast();

  useEffect(() => {
    document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe(null));
  }, [api]);

  function onAuthed(u: AuthUser) {
    setMe(u);
    setRoute({ screen: ROLE_HOME[u.role], params: {} });
  }
  async function logout() {
    await api.logout();
    setMe(null);
    setRoute(null);
  }
  const go = (screen: string, params?: Record<string, string>) => setRoute({ screen, params: params || {} });

  if (me === undefined) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        {t("common.loading")}
      </div>
    );
  }
  if (me === null) {
    return <AuthScreen lang={lang} setLang={setLang} onAuthed={onAuthed} />;
  }

  const role = me.role;
  const r = route || { screen: ROLE_HOME[role], params: {} };
  const screen = r.screen;
  const nav = navFor(role, t);
  const active = ACTIVE_MAP[role][screen] || screen;

  const body =
    role === "parent" ? (
      <ParentArea t={t} userName={me.name} screen={screen} params={r.params} go={go} toast={toast} />
    ) : role === "ot" ? (
      <OtArea t={t} userName={me.name} screen={screen} params={r.params} go={go} toast={toast} />
    ) : (
      <AdminArea t={t} screen={screen} params={r.params} go={go} toast={toast} />
    );

  return (
    <>
      <DemoBanner />
      <Shell
        t={t}
        lang={lang}
        setLang={setLang}
        roleLabel={t(ROLE_KEY[role])}
        roleIcon={ROLE_ICON[role]}
        onLogout={logout}
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
