// In-browser recording capability detection + codec selection.
// MediaRecorder ALWAYS encodes (no uncompressed path). We prefer H.264/mp4 so the
// server can remux losslessly (-c copy); webm/VP9 falls back to a server transcode.

// Ordered by preference: H.264 in mp4 first (iOS always, modern Android), then
// H.264-in-webm, then VP9/VP8. First isTypeSupported wins.
const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1",
  "video/mp4",
  'video/webm;codecs="avc1"',
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return null;
  for (const m of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* ignore */
    }
  }
  return null;
}

// In-app webviews (opened from WhatsApp / Instagram / Facebook / etc.) frequently
// block getUserMedia even when the API objects exist. Heuristic by UA.
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|MicroMessenger|WhatsApp|Snapchat|TikTok/i.test(navigator.userAgent || "");
}

export function canRecord(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined" &&
    pickMimeType() !== null &&
    !isInAppBrowser()
  );
}

// File extension for a chosen mime (for the uploaded File name; the server remuxes
// to a clean mp4 regardless).
export function extForMime(mime: string): string {
  return mime.startsWith("video/mp4") ? "mp4" : "webm";
}
