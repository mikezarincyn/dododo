"""Серверная нормализация видео (remux, НЕ сжатие).

Зачем: браузерная запись (MediaRecorder) пишет фрагментированный mp4 / webm,
который аналитический движок (OpenCV/cv2.VideoCapture) не всегда открывает.
После загрузки переупаковываем контейнер ffmpeg'ом:
  - H.264 на входе → `-c copy -movflags +faststart` (БЕЗ перекодирования, без
    потери сигнала движения) → out.mp4;
  - vp8/vp9/av1/неизвестно (Android без H.264) → вынужденный транскод в H.264
    (единственный случай потери; на клиенте сначала пытаемся писать H.264).

Best-effort и fail-open: если ffmpeg недоступен, отключён или упал — возвращаем
ИСХОДНЫЕ байты (загрузка не должна падать из-за нормализации). Все временные
файлы удаляются в finally (no-retention: оригинал не задерживаем).
"""

import os
import shutil
import subprocess
import tempfile

import stage1_config as cfg


def ffmpeg_available() -> bool:
    return bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))


def _probe_vcodec(path: str) -> str | None:
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=codec_name", "-of", "default=nk=1:nw=1", path],
            capture_output=True, timeout=30,
        )
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.decode("utf-8", "replace").strip().splitlines()[0].strip()
    except Exception:
        pass
    return None


def normalize(data: bytes, original_ext: str) -> dict:
    """Вернуть {bytes, ext, normalized, mode, note}. На любой проблеме — оригинал."""
    if cfg.REMUX_DISABLE:
        return {"bytes": data, "ext": original_ext, "normalized": False, "mode": "disabled", "note": "DODODO_REMUX_DISABLE"}
    if not ffmpeg_available():
        return {"bytes": data, "ext": original_ext, "normalized": False, "mode": "skip", "note": "ffmpeg unavailable"}

    tmp = tempfile.mkdtemp(prefix="dododo_norm_")
    try:
        in_ext = (original_ext or ".bin").lower()
        if not in_ext.startswith("."):
            in_ext = "." + in_ext
        in_path = os.path.join(tmp, "in" + in_ext)
        out_path = os.path.join(tmp, "out.mp4")
        with open(in_path, "wb") as f:
            f.write(data)

        codec = _probe_vcodec(in_path)
        if codec == "h264" and not cfg.REMUX_FORCE_CFR:
            mode = "remux-copy"  # lossless container rewrite
            cmd = ["ffmpeg", "-y", "-i", in_path, "-c", "copy", "-movflags", "+faststart", out_path]
        else:
            # transcode to H.264 (lossy — the one documented signal-loss case),
            # or forced CFR for the engine's constant-fps timing assumption.
            mode = "transcode-h264" + ("-cfr" if cfg.REMUX_FORCE_CFR else "")
            cmd = ["ffmpeg", "-y", "-i", in_path,
                   "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p"]
            if cfg.REMUX_FORCE_CFR:
                cmd += ["-vsync", "cfr", "-r", "30"]
            cmd += ["-c:a", "aac", "-movflags", "+faststart", out_path]

        res = subprocess.run(cmd, capture_output=True, timeout=cfg.REMUX_TIMEOUT_SEC)
        if res.returncode != 0 or not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            note = res.stderr.decode("utf-8", "replace")[-300:] if res.stderr else "ffmpeg failed"
            return {"bytes": data, "ext": original_ext, "normalized": False, "mode": "failed", "note": note}

        with open(out_path, "rb") as f:
            out = f.read()
        return {"bytes": out, "ext": ".mp4", "normalized": True, "mode": mode, "note": codec or "unknown"}
    except Exception as e:  # never let normalization break an upload
        return {"bytes": data, "ext": original_ext, "normalized": False, "mode": "error", "note": str(e)}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
