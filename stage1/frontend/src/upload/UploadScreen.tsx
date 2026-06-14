import { useRef, useState } from "react";

import { Button } from "../components/ds/Button";
import { Card } from "../components/ds/Card";
import { Screen } from "../components/ds/Screen";
import { t } from "../i18n";
import { uploadVideo } from "../api/client";
import { TrustBadges } from "./TrustBadges";

// Экран съёмки/загрузки. Захват — нативный <input type="file" accept="video/*"
// capture>: на телефоне (iOS Safari, Android Chrome) это открывает РОДНУЮ камеру —
// родитель снимает в один тап; на десктопе без поддержки capture браузер сам даёт
// обычный выбор файла. После выбора показываем превью первого кадра + имя файла +
// статус «Uploading…», затем экран благодарности. Видео реально уходит на backend
// (POST /api/submissions). `upload` инъектируется для тестов.
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
  const [picked, setPicked] = useState<{ name: string; previewUrl: string } | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Превью первого кадра — локальный object URL, на backend не уходит.
    const previewUrl = URL.createObjectURL(file);
    setPicked((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { name: file.name, previewUrl };
    });
    setBusy(true);
    setError(null);
    try {
      await upload(childId, file);
      URL.revokeObjectURL(previewUrl);
      setQueued(true);
    } catch {
      setError(t().consent.error);
    } finally {
      setBusy(false);
    }
  }

  if (queued) {
    return (
      <Screen>
        <h1 className="ds-h2">{s.queuedTitle}</h1>
        <p className="ds-lead">{s.queuedBody}</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <h1 className="ds-h2">{s.title}</h1>
      <p className="ds-lead">{s.intro}</p>

      <Card style={{ textAlign: "center" }}>
        {picked ? (
          // Превью выбранного/снятого видео (первый кадр).
          <video
            data-testid="video-preview"
            src={picked.previewUrl}
            muted
            playsInline
            preload="metadata"
            aria-label={s.previewAlt}
            style={{
              inlineSize: "100%",
              maxBlockSize: 240,
              borderRadius: "var(--radius-md)",
              background: "var(--grey-surface-100)",
              objectFit: "contain",
            }}
          />
        ) : (
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
        )}
      </Card>

      {picked && (
        <p className="ds-small ds-muted" style={{ marginBlockStart: "var(--space-3)" }}>
          {s.selectedVideo}: <span style={{ color: "var(--text-body)" }}>{picked.name}</span>
        </p>
      )}

      {!picked && <TrustBadges />}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={onChange}
        style={{ display: "none" }}
        data-testid="video-input"
      />

      {busy && (
        <p role="status" className="ds-body" style={{ marginBlock: "var(--space-3)", color: "var(--text-muted)" }}>
          {s.uploading}
        </p>
      )}

      {error && (
        <p role="alert" style={{ color: "var(--coral-500)" }}>
          {error}
        </p>
      )}

      <Button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{ inlineSize: "100%", marginBlockStart: "var(--space-2)" }}
      >
        {error ? s.retry : s.chooseVideo}
      </Button>
    </Screen>
  );
}
