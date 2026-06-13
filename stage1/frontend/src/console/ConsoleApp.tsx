import { useState } from "react";

import { Button } from "../components/ds/Button";
import { Card } from "../components/ds/Card";
import { t } from "../i18n";
import {
  completeReview,
  fetchQueue,
  loadVideoBlob,
  type QueueItem,
} from "../api/console";
import { ReviewPanel } from "./ReviewPanel";

// Минимальная консоль специалиста. Аутентификация Стадии 1 — bearer-токен
// (TODO: заменить на IdP/SSO, см. backend auth.py). Токен живёт только в памяти
// вкладки. Доступ к видео — через бэкенд, который проверяет роль и назначение.

export function ConsoleApp() {
  const c = t().console;
  const [token, setToken] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [active, setActive] = useState<QueueItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setItems(await fetchQueue(token));
      setSignedIn(true);
      setError(null);
    } catch {
      setSignedIn(false);
      setError(c.signInError);
    }
  }

  if (!signedIn) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "var(--space-5)" }}>
        <h1 className="ds-h2">{c.signInTitle}</h1>
        <p className="ds-lead">{c.signInIntro}</p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={c.accessToken}
          aria-label={c.accessToken}
          style={{
            width: "100%",
            blockSize: "var(--btn-height)",
            padding: "0 var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border-subtle)",
            marginBlockEnd: "var(--space-4)",
          }}
        />
        {error && <p role="alert" style={{ color: "var(--coral-500)" }}>{error}</p>}
        <Button onClick={refresh} disabled={token.length === 0} style={{ inlineSize: "100%" }}>
          {c.signIn}
        </Button>
      </main>
    );
  }

  if (active) {
    return (
      <div>
        <div style={{ padding: "var(--space-3) var(--space-5)" }}>
          <Button variant="outline" onClick={() => { setActive(null); void refresh(); }}>
            ← {c.back}
          </Button>
        </div>
        <ReviewPanel
          submissionId={active.submission_id}
          displayCode={active.display_code}
          loadVideo={(sid) => loadVideoBlob(token, sid)}
          submitFeedback={(sid, note) => completeReview(token, sid, note)}
        />
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "var(--space-5)" }}>
      <h1 className="ds-h2">{c.queueTitle}</h1>
      {items.length === 0 && <p className="ds-muted">{c.queueEmpty}</p>}
      {items.map((item) => (
        <Card key={item.submission_id} style={{ marginBlockEnd: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
            <div>
              <div className="ds-body" style={{ fontWeight: 600, color: "var(--navy-700)" }}>
                {item.display_code}
              </div>
              <div className="ds-small ds-muted">{item.created_at}</div>
            </div>
            <Button variant="soft" onClick={() => setActive(item)}>
              {c.open}
            </Button>
          </div>
        </Card>
      ))}
    </main>
  );
}
