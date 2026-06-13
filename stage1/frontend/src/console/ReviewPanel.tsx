import { useEffect, useState } from "react";

import { Button } from "../components/ds/Button";
import { t } from "../i18n";

// Просмотр ТОЛЬКО в консоли. Видео проигрывается inline; скачивание/forward
// средствами UI отключено: нет кнопки «скачать», у плеера controlsList=nodownload,
// PiP и контекстное меню выключены. (Полностью предотвратить запись экрана веб не
// может — остаточный риск закрывается need-to-know + аудитом на бэкенде.)

export function ReviewPanel({
  submissionId,
  displayCode,
  loadVideo,
  submitFeedback,
  onSaved,
}: {
  submissionId: string;
  displayCode: string;
  loadVideo: (submissionId: string) => Promise<Blob>;
  submitFeedback: (submissionId: string, note: string) => Promise<void>;
  onSaved?: () => void;
}) {
  const c = t().console;
  const [url, setUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    loadVideo(submissionId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => active && setError(c.loadError));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [submissionId, loadVideo, c.loadError]);

  async function onSave() {
    try {
      await submitFeedback(submissionId, note.trim());
      setSaved(true);
      onSaved?.();
    } catch {
      setError(c.saveError);
    }
  }

  return (
    <section style={{ maxWidth: 560, margin: "0 auto", padding: "var(--space-5)" }}>
      <h2 className="ds-h2">
        {c.reviewTitle} · {displayCode}
      </h2>

      {error && (
        <p role="alert" style={{ color: "var(--coral-500)" }}>
          {error}
        </p>
      )}

      {url ? (
        <video
          data-testid="review-video"
          src={url}
          controls
          controlsList="nodownload noremoteplayback noplaybackrate"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          style={{ width: "100%", borderRadius: "var(--radius-md)", background: "#000" }}
        />
      ) : (
        !error && <p className="ds-muted">{t().common.loading}</p>
      )}

      <label style={{ display: "block", marginBlockStart: "var(--space-4)" }}>
        <span className="ds-body" style={{ fontWeight: 600, color: "var(--navy-700)" }}>
          {c.feedbackLabel}
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={5}
          placeholder={c.feedbackPlaceholder}
          style={{
            width: "100%",
            marginBlockStart: "var(--space-2)",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border-subtle)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--font-body-size)",
          }}
        />
      </label>

      <Button
        onClick={onSave}
        disabled={note.trim().length === 0}
        style={{ inlineSize: "100%", marginBlockStart: "var(--space-4)" }}
      >
        {c.saveFeedback}
      </Button>

      {saved && <p className="ds-small ds-muted">{t().common.saved}</p>}
    </section>
  );
}
