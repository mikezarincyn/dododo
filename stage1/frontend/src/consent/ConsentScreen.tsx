import { useState } from "react";

import { Button } from "../components/ds/Button";
import { Card } from "../components/ds/Card";
import { Checkbox } from "../components/ds/Checkbox";
import { Screen } from "../components/ds/Screen";
import { t } from "../i18n";
import { postConsent, type ConsentResult } from "../api/client";
import { REQUIRED_CHECKBOX_IDS } from "./consentConfig";
import { allRequiredChecked } from "./consentGate";

type SubmitFn = (checkedIds: string[]) => Promise<ConsentResult>;

export function ConsentScreen({
  onConsented,
  submit = postConsent,
}: {
  onConsented?: (result: ConsentResult) => void;
  submit?: SubmitFn;
}) {
  const s = t();

  // Explicit consent: НИ ОДНА галочка не пред-проставлена.
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(REQUIRED_CHECKBOX_IDS.map((id) => [id, false])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = allRequiredChecked(checked, REQUIRED_CHECKBOX_IDS) && !busy;

  async function onContinue() {
    if (!canContinue) return;
    setBusy(true);
    setError(null);
    try {
      const checkedIds = REQUIRED_CHECKBOX_IDS.filter((id) => checked[id]);
      const result = await submit(checkedIds);
      onConsented?.(result);
    } catch {
      setError(s.consent.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <h1 className="ds-h2">{s.consent.title}</h1>
      <p className="ds-lead">{s.consent.intro}</p>

      <Card style={{ marginBlock: "var(--space-5)" }}>
        {REQUIRED_CHECKBOX_IDS.map((id) => (
          <Checkbox
            key={id}
            id={id}
            checked={checked[id]}
            label={s.consent.checkboxes[id]}
            onChange={(next) => setChecked((prev) => ({ ...prev, [id]: next }))}
          />
        ))}
      </Card>

      {error && (
        <p role="alert" style={{ color: "var(--coral-500)" }}>
          {error}
        </p>
      )}

      <Button
        variant="primary"
        disabled={!canContinue}
        onClick={onContinue}
        style={{ inlineSize: "100%" }}
      >
        {s.consent.continue}
      </Button>

      <p className="ds-small ds-muted" style={{ marginBlockStart: "var(--space-4)" }}>
        {s.consent.disclaimer}
      </p>
    </Screen>
  );
}
