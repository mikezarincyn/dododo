import { useState } from "react";

import { DemoBanner } from "../components/DemoBanner";
import { Button, Card, Icon, Input, LangSwitcher, Logo, TwoTone } from "../components/ds";
import { authApi, type AuthApi, type AuthUser } from "../api/auth";
import { makeT, type Lang } from "../i18n/strings";

// Pre-auth screen. Stage 1: email/password sign-in. (Register & password-reset
// modes are added in later stages.) On success, hands the user up to DesignApp.
export function AuthScreen({
  lang,
  setLang,
  onAuthed,
  api = authApi,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  onAuthed: (u: AuthUser) => void;
  api?: AuthApi;
}) {
  const t = makeT(lang);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email || !password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const u = await api.login(email, password);
      onAuthed(u);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setError(status === 403 ? (e as Error).message : t("auth.error.invalid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DemoBanner />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header className="app-topbar" style={{ borderBottom: "none" }}>
          <Logo height={30} />
          <span className="spacer" />
          <LangSwitcher lang={lang} setLang={setLang} />
        </header>

        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "24px 16px" }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <TwoTone a={t("auth.signInTitle.a")} b={t("auth.signInTitle.b")} />
            <p className="page-sub" style={{ marginBottom: 24 }}>{t("auth.signInSub")}</p>
            <Card padding={28}>
              <form
                className="col"
                style={{ gap: 18 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <Input label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input label={t("auth.password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {error ? (
                  <p role="alert" style={{ color: "var(--coral-500)", margin: 0, fontSize: 14 }}>{error}</p>
                ) : null}
                <div>
                  <Button variant="primary" size="md" disabled={!email || !password || busy} onClick={submit}
                    iconRight={<Icon name="arrow-right" size={16} color={!email || !password || busy ? "rgba(43,42,42,.45)" : "#fff"} />}>
                    {busy ? t("common.loading") : t("auth.signIn")}
                  </Button>
                </div>
              </form>
            </Card>
            {/* register / forgot links arrive in later stages */}
            <p className="ds-small ds-muted" style={{ marginTop: 18, lineHeight: 1.6 }}>
              {t("brand.disclaimer")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
