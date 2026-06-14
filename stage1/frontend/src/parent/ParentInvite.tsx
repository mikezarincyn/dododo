import { useState } from "react";

import { Avatar, Button, Card, Icon, Input, PageHead } from "../components/ds";
import type { TFunc } from "../i18n/strings";
import type { Invite } from "../api/parent";

// Invite a therapist — email/code + a list of invites (Accepted / Sent).
// Pilot: this records intent only; the care link is activated later (admin/OT).
export function ParentInvite({
  t,
  invites,
  sendInvite,
}: {
  t: TFunc;
  invites: Invite[];
  sendInvite: (contact: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!email || busy) return;
    setBusy(true);
    try {
      await sendInvite(email);
      setEmail("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <PageHead a={t("invite.title.a")} b={t("invite.title.b")} sub={t("By email or with your child's code. They'll only see the children you share.")} />
      <Card padding={28} style={{ marginBottom: 20 }}>
        <div className="col" style={{ gap: 18 }}>
          <Input label={t("Therapist's email or invite code")} placeholder={t("name@clinic.org · or paste a code")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <Button
              variant="primary"
              size="sm"
              disabled={!email || busy}
              onClick={send}
              iconRight={<Icon name="send" size={15} color={!email || busy ? "rgba(43,42,42,.45)" : "#fff"} />}
            >
              {t("parent.invite")}
            </Button>
          </div>
        </div>
      </Card>

      <div className="col" style={{ gap: 12 }}>
        {invites.map((inv, i) => (
          <Card key={i} padding={18}>
            <div className="row">
              <Avatar name={inv.contact} size={38} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--navy-700)" }}>{inv.contact}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("Invitation sent")}</div>
              </div>
              {inv.status === "accepted" ? (
                <span className="chip" style={{ background: "var(--green-100)", color: "var(--green-ink)" }}>
                  <Icon name="check" size={13} /> {t("status.accepted")}
                </span>
              ) : (
                <span className="chip" style={{ background: "var(--lilac-100)", color: "var(--navy-700)" }}>
                  <Icon name="send" size={13} /> {t("status.sent")}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
