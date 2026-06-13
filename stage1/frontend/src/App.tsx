import { useState } from "react";

import { DemoBanner } from "./components/DemoBanner";
import { ConsentScreen } from "./consent/ConsentScreen";
import { UploadScreen } from "./upload/UploadScreen";
import type { ConsentResult } from "./api/client";

export default function App() {
  const [consent, setConsent] = useState<ConsentResult | null>(null);

  return (
    <>
      <DemoBanner />
      {!consent ? (
        <ConsentScreen onConsented={setConsent} />
      ) : (
        // Согласие записано → экран загрузки, привязанный к тому же ребёнку
        // (child_id из ответа /api/consent). Имя не используется.
        <UploadScreen childId={consent.child_id} />
      )}
    </>
  );
}
