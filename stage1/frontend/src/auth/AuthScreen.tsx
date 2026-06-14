import { useState } from "react";

import { DemoBanner } from "../components/DemoBanner";
import { Button, Card, Icon, Input, LangSwitcher, Logo, Segmented, TwoTone } from "../components/ds";
import { authApi, type AuthApi, type AuthUser } from "../api/auth";
import { makeT, type Lang } from "../i18n/strings";

type Mode = "login" | "register";

// Pre-auth screen: sign in OR create an account. Parents self-register (active
// immediately); therapists request access (pending until an admin approves).
// (Password reset is added in the next stage.)
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
  const [mode, setMode] = useState<Mode>("login");
  const [regRole, setRegRole] = useState<"parent" | "ot">("parent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hcpc, setHcpc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otPending, setOtPending] = useState(false);

  function go(m: Mode) {
    setMode(m);
    setError(null);
    setOtPending(false);
  }

  async function login() {
    if (!email || !password || busy) return;
    setBusy(true);
    setError(null);
    try {
      onAuthed(await api.login(email, password));
    } catch (e) {
      const status = (e as { status?: number }).status;
      setError(status === 403 ? (e as Error).message : t("auth.error.invalid"));
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    if (!email || !password || !name || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.register({ email, password, name, role: regRole, hcpc: hcpc || undefined });
      if (res.pending) setOtPending(true); // therapist → awaits approval
      else onAuthed(res.user); // parent → straight in
    } catch (e) {
      const status = (e as { status?: number }).status;
      setError(status === 409 ? t("auth.register.emailTaken") : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login"
    ? { a: t("auth.signInTitle.a"), b: t("auth.signInTitle.b"), sub: t("auth.signInSub") }
    : { a: t("auth.register.title.a"), b: t("auth.register.title.b"), sub: t("auth.passwordHint") };

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
          <div style={{ width: "100%", maxWidth: 440 }}>
            <TwoTone a={title.a} b={title.b} />
            <p className="page-sub" style={{ marginBottom: 24 }}>{title.sub}</p>

            <Card padding={28}>
              {otPending ? (
                <div className="col" style={{ gap: 16 }}>
                  <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                    <Icon name="check" size={18} color="var(--green-ink)" />
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>{t("auth.register.otPending")}</p>
                  </div>
                  <button type="button" className="linkish" onClick={() => go("login")}>{t("auth.haveAccount")}</button>
                </div>
              ) : (
                <form className="col" style={{ gap: 18 }} onSubmit={(e) => { e.preventDefault(); mode === "login" ? login() : register(); }}>
                  {mode === "register" ? (
                    <>
                      <Segmented
                        options={[{ value: "parent", label: t("auth.register.iAmParent") }, { value: "ot", label: t("auth.register.iAmOt") }]}
                        value={regRole}
                        onChange={(v) => setRegRole(v as "parent" | "ot")}
                      />
                      <Input label={t("auth.name")} value={name} onChange={(e) => setName(e.target.value)} />
                    </>
                  ) : null}
                  <Input label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Input label={t("auth.password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  {mode === "register" && regRole === "ot" ? (
                    <Input label={t("auth.hcpc")} value={hcpc} onChange={(e) => setHcpc(e.target.value)} />
                  ) : null}
                  {error ? <p role="alert" style={{ color: "var(--coral-500)", margin: 0, fontSize: 14 }}>{error}</p> : null}
                  <div>
                    {mode === "login" ? (
                      <Button variant="primary" size="md" disabled={!email || !password || busy} onClick={login}
                        iconRight={<Icon name="arrow-right" size={16} color={!email || !password || busy ? "rgba(43,42,42,.45)" : "#fff"} />}>
                        {busy ? t("common.loading") : t("auth.signIn")}
                      </Button>
                    ) : (
                      <Button variant="primary" size="md" disabled={!email || !password || !name || busy} onClick={register}
                        iconRight={<Icon name="arrow-right" size={16} color={!email || !password || !name || busy ? "rgba(43,42,42,.45)" : "#fff"} />}>
                        {busy ? t("common.loading") : regRole === "ot" ? t("auth.register.submitOt") : t("auth.register.submitParent")}
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </Card>

            {!otPending ? (
              <div className="row" style={{ marginTop: 16, gap: 16, flexWrap: "wrap" }}>
                {mode === "login" ? (
                  <button type="button" className="linkish" onClick={() => go("register")}>{t("auth.createAccount")}</button>
                ) : (
                  <button type="button" className="linkish" onClick={() => go("login")}>{t("auth.haveAccount")}</button>
                )}
              </div>
            ) : null}

            <p className="ds-small ds-muted" style={{ marginTop: 18, lineHeight: 1.6 }}>{t("brand.disclaimer")}</p>
          </div>
        </div>
      </div>
    </>
  );
}
