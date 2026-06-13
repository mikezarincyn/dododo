import { useRef, useState } from "react";

import { Button } from "../components/ds/Button";
import { Card } from "../components/ds/Card";
import { getDir, t } from "../i18n";
import { uploadVideo } from "../api/client";
import { TrustBadges } from "./TrustBadges";

// Экран подготовки/загрузки. Захват — нативный <input type="file" accept="video/*"
// capture> (без live-оверлея камеры): до открытия камеры показываем статичную
// иллюстрацию контура. При выборе файла видео реально загружается на backend
// (POST /api/submissions через MediaStore.put). `upload` инъектируется для тестов.
export function UploadScreen({
  childId = null,
  upload = uploadVideo,
}: {
  childId?: string | null;
  upload?: (childId: string | null, file: File) => Promise<{ submission_id: string }>;
}) {
  const s = t().upload;
  const inputRef = useRef<HTMLInputElement>(null);
  const [queued, setQueued] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await upload(childId, file);
      setQueued(true);
    } catch {
      setError(t().consent.error);
    } finally {
      setBusy(false);
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
      {error && (
        <p role="alert" style={{ color: "var(--coral-500)" }}>
          {error}
        </p>
      )}
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{ inlineSize: "100%" }}
      >
        {s.chooseVideo}
      </Button>
    </main>
  );
}
