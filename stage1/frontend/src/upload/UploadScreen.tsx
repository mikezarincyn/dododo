import { useRef, useState } from "react";

import { Button } from "../components/ds/Button";
import { Card } from "../components/ds/Card";
import { getDir, t } from "../i18n";
import { TrustBadges } from "./TrustBadges";

// Экран подготовки/загрузки. Захват — нативный <input type="file" accept="video/*"
// capture> (без live-оверлея камеры): до открытия камеры показываем статичную
// иллюстрацию контура. Загрузка байтов на бэкенд (MediaStore.put) — отдельный шаг.
export function UploadScreen({ onSelected }: { onSelected?: (file: File) => void }) {
  const s = t().upload;
  const inputRef = useRef<HTMLInputElement>(null);
  const [queued, setQueued] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onSelected?.(file);
      setQueued(true);
    }
  }

  if (queued) {
    return (
      <main dir={getDir()} style={{ maxWidth: 480, margin: "0 auto", padding: "var(--space-5)" }}>
        <h1 className="ds-h2">{s.queuedTitle}</h1>
        <p className="ds-lead">{s.queuedBody}</p>
      </main>
    );
  }

  return (
    <main dir={getDir()} style={{ maxWidth: 480, margin: "0 auto", padding: "var(--space-5)" }}>
      <h1 className="ds-h2">{s.title}</h1>
      <p className="ds-lead">{s.intro}</p>

      <Card style={{ textAlign: "center" }}>
        <svg
          role="img"
          aria-label={s.contourAlt}
          viewBox="0 0 120 140"
          width="120"
          height="140"
          style={{ maxWidth: "60%", height: "auto" }}
        >
          <ellipse cx="60" cy="45" rx="26" ry="30" fill="none" stroke="var(--green-500)" strokeWidth="3" strokeDasharray="6 6" />
          <path d="M25 135 C25 95 95 95 95 135" fill="none" stroke="var(--green-500)" strokeWidth="3" strokeDasharray="6 6" />
        </svg>
      </Card>

      <TrustBadges />

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={onChange}
        style={{ display: "none" }}
        data-testid="video-input"
      />
      <Button onClick={() => inputRef.current?.click()} style={{ inlineSize: "100%" }}>
        {s.chooseVideo}
      </Button>
    </main>
  );
}
