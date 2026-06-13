import { useState } from "react";

import { ConsentScreen } from "./consent/ConsentScreen";
import { UploadScreen } from "./upload/UploadScreen";
import type { ConsentResult } from "./api/client";

export default function App() {
  const [consent, setConsent] = useState<ConsentResult | null>(null);

  if (!consent) {
    return <ConsentScreen onConsented={setConsent} />;
  }

  // Согласие записано (session_id = consent.session_id). Дальше — экран загрузки.
  // TODO: загрузка байтов видео на бэкенд (MediaStore.put) для этой сессии.
  return <UploadScreen onSelected={() => undefined} />;
}
