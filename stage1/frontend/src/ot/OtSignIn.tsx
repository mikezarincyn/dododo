import { useState } from "react";

import { Button, Card, Icon, Input, TwoTone } from "../components/ds";
import type { TFunc } from "../i18n/strings";

// OT sign-in — reviewer access token (pilot auth; real IdP/SSO later). Needed so
// the backend can scope everything to this OT's care links.
export function OtSignIn({ t, onSubmit, error }: { t: TFunc; onSubmit: (token: string) => void; error?: string | null }) {
  const [token, setToken] = useState("");
  return (
    <div style={{ maxWidth: 460, margin: "40px auto 0" }}>
      <TwoTone a={t("console.signInTitle")} b="" />
      <p className="page-sub" style={{ marginBottom: 24 }}>{t("console.signInIntro")}</p>
      <Card padding={28}>
        <div className="col" style={{ gap: 18 }}>
          <Input label={t("console.accessToken")} value={token} onChange={(e) => setToken(e.target.value)} type="password" />
          {error ? (
            <p role="alert" style={{ color: "var(--coral-500)", margin: 0 }}>{error}</p>
          ) : null}
          <div>
            <Button variant="primary" size="sm" disabled={!token} onClick={() => onSubmit(token.trim())} iconRight={<Icon name="arrow-right" size={16} color={token ? "#fff" : "rgba(43,42,42,.45)"} />}>
              {t("console.signIn")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
