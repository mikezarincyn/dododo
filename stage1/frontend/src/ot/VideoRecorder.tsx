import { useEffect, useRef, useState } from "react";

import { Button, Icon } from "../components/ds";
import { FILMING_GUIDES } from "../data/reference";
import { extForMime, pickMimeType } from "./recording";
import type { TFunc } from "../i18n/strings";

// Full-screen, focused recorder. Records the getUserMedia stream DIRECTLY via
// MediaRecorder — the silhouette contour is a separate absolutely-positioned SVG
// layer over the <video> and is NEVER part of the recorded file. Prefers H.264;
// high bitrate to preserve micro-movement. Start is on a user gesture (iOS).
//
// NOTE: getUserMedia/MediaRecorder do not run in jsdom, so this component is
// verified by feature-detect tests + MANUAL device testing (iOS Safari / Android
// Chrome) — flagged honestly in the report.
export function VideoRecorder({
  t,
  scenarioId,
  onCancel,
  onUse,
}: {
  t: TFunc;
  scenarioId: string;
  onCancel: () => void;
  onUse: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recorded, setRecorded] = useState<{ url: string; file: File } | null>(null);

  const duration = FILMING_GUIDES[scenarioId]?.duration;

  // Start camera on mount; stop tracks on unmount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      } catch {
        setError(t("record.cameraError"));
      }
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, [t]);

  function start() {
    const stream = streamRef.current;
    const mime = pickMimeType();
    if (!stream || !mime) {
      setError(t("record.cameraError"));
      return;
    }
    chunksRef.current = [];
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000 });
    } catch {
      rec = new MediaRecorder(stream); // last resort: browser default
    }
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || mime;
      const blob = new Blob(chunksRef.current, { type });
      const url = URL.createObjectURL(blob);
      const file = new File([blob], `recording.${extForMime(type)}`, { type });
      setRecorded({ url, file });
    };
    recorderRef.current = rec;
    rec.start(); // no timeslice — finalize on stop (iOS-friendly)
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function retake() {
    if (recorded) URL.revokeObjectURL(recorded.url);
    setRecorded(null);
    setSeconds(0);
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#000", display: "flex", flexDirection: "column" }}>
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", color: "#fff", flexShrink: 0 }}>
        <button type="button" onClick={onCancel} aria-label={t("record.cancel")} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" size={20} color="#fff" />
        </button>
        <span style={{ flex: 1 }} />
        {recording ? (
          <span className="chip" style={{ background: "rgba(238,108,77,.9)", color: "#fff" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fff", display: "inline-block" }} /> {mmss}
          </span>
        ) : duration ? (
          <span className="chip" style={{ background: "rgba(255,255,255,.15)", color: "#fff" }}>
            <Icon name="timer" size={13} color="#fff" /> {t("record.recommendedLength")}: {t(duration)}
          </span>
        ) : null}
      </div>

      {/* stage */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {error ? (
          <div style={{ color: "#fff", textAlign: "center", padding: 24, maxWidth: 420 }}>
            <Icon name="alert-triangle" size={28} color="var(--coral-500)" />
            <p style={{ fontSize: 15.5, lineHeight: 1.55, margin: "12px 0 20px" }}>{error}</p>
            <Button variant="soft" size="sm" onClick={onCancel}>{t("record.cancel")}</Button>
          </div>
        ) : recorded ? (
          // playback of the recorded clip
          <video src={recorded.url} controls playsInline style={{ maxWidth: "100%", maxHeight: "100%" }} />
        ) : (
          <>
            <video ref={videoRef} muted playsInline autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* CONTOUR overlay — UI guide only, NOT part of the recording */}
            <svg viewBox="0 0 200 280" preserveAspectRatio="xMidYMid meet" aria-hidden="true"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.85 }}>
              <g fill="none" stroke="var(--green-400)" strokeWidth="2.5" strokeDasharray="7 7" strokeLinecap="round">
                <circle cx="100" cy="62" r="34" />
                <path d="M58 250 C58 150 60 120 100 120 C140 120 142 150 142 250" />
              </g>
            </svg>
            <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,.9)", fontSize: 13, pointerEvents: "none", textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>
              {t("record.placeChild")}
            </div>
          </>
        )}
      </div>

      {/* controls */}
      {!error ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "20px 16px calc(20px + env(safe-area-inset-bottom))", flexShrink: 0 }}>
          {recorded ? (
            <>
              <Button variant="outline" size="md" onClick={retake} style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.5)" }}>
                <Icon name="refresh-cw" size={16} color="#fff" /> {t("record.retake")}
              </Button>
              <Button variant="primary" size="md" onClick={() => onUse(recorded.file)}>
                <Icon name="check" size={16} color="#fff" /> {t("record.use")}
              </Button>
            </>
          ) : recording ? (
            <button type="button" onClick={stop} aria-label={t("record.stop")} style={{ width: 76, height: 76, borderRadius: 18, background: "#fff", border: "5px solid rgba(255,255,255,.5)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 26, height: 26, borderRadius: 5, background: "var(--coral-500)" }} />
            </button>
          ) : (
            <button type="button" onClick={start} aria-label={t("record.start")} style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--coral-500)", border: "5px solid rgba(255,255,255,.6)", cursor: "pointer" }} />
          )}
        </div>
      ) : null}
    </div>
  );
}
