import type { ReactNode } from "react";

import { Badge } from "./Badge";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { LangSwitcher } from "./LangSwitcher";
import { Logo } from "./Logo";
import type { Lang, TFunc } from "../../i18n/strings";

export interface NavItem {
  id: string;
  icon: string;
  label: string;
}

// Top bar: logo (→ switch role), current-role chip, Demo badge, language
// switcher, "Switch role" button.
export function TopBar({
  t,
  lang,
  setLang,
  roleLabel,
  roleIcon,
  onLogout,
}: {
  t: TFunc;
  lang: Lang;
  setLang: (l: Lang) => void;
  roleLabel?: string;
  roleIcon?: string;
  onLogout?: () => void;
}) {
  return (
    <header className="app-topbar">
      <Logo height={30} />
      {roleLabel ? (
        <span className="chip" style={{ background: "var(--lilac-100)", color: "var(--navy-700)", fontSize: 13 }}>
          <Icon name={roleIcon || "user"} size={13} />
          {roleLabel}
        </span>
      ) : null}
      <Badge tone="yellow" style={{ fontSize: 12, padding: "5px 12px", whiteSpace: "nowrap" }}>
        {t("brand.demo")}
      </Badge>
      <span className="spacer" />
      <LangSwitcher lang={lang} setLang={setLang} />
      {onLogout ? (
        <Button variant="soft" size="sm" onClick={onLogout} style={{ minHeight: 42, padding: "0 20px", fontSize: 14 }}>
          {t("auth.logout")}
        </Button>
      ) : null}
    </header>
  );
}

// App shell: top bar + left nav (with the non-medical disclaimer pinned to the
// bottom of the menu) + main content column.
export function Shell({
  t,
  lang,
  setLang,
  roleLabel,
  roleIcon,
  onLogout,
  nav,
  active,
  onNav,
  children,
}: {
  t: TFunc;
  lang: Lang;
  setLang: (l: Lang) => void;
  roleLabel?: string;
  roleIcon?: string;
  onLogout?: () => void;
  nav: NavItem[];
  active: string;
  onNav: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minBlockSize: 0 }}>
      <TopBar t={t} lang={lang} setLang={setLang} roleLabel={roleLabel} roleIcon={roleIcon} onLogout={onLogout} />
      <div className="app-frame">
        <nav className="app-side">
          {nav.map((n) => (
            <button key={n.id} type="button" className={"navitem" + (active === n.id ? " active" : "")} onClick={() => onNav(n.id)}>
              <Icon name={n.icon} size={17} />
              <span>{n.label}</span>
            </button>
          ))}
          <div className="side-note">{t("brand.disclaimer")}</div>
        </nav>
        <main className="app-main">
          <div className="app-main-inner">{children}</div>
        </main>
      </div>

      {/* Mobile navigation: the left rail is hidden ≤900px, so this bottom tab bar
          becomes the navigation (thumb-friendly). Same items as the side nav. */}
      <nav className="app-bottomnav" aria-label={t("nav.menu")}>
        {nav.map((n) => (
          <button key={n.id} type="button" className={"bottomnav-item" + (active === n.id ? " active" : "")} onClick={() => onNav(n.id)}>
            <Icon name={n.icon} size={20} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
