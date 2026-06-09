import csv
import hashlib
import json
import math
import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from scipy.io import wavfile
from scipy.signal import find_peaks

from config import (
    ACTION_K,
    ACTION_MIN_BURST_FRAMES,
    ACTION_MIN_THRESHOLD,
    ACTION_WINDOW_S,
    AUDIO_PEAK_MIN_GAP_S,
    AUDIO_SAMPLE_RATE,
    AUDIO_WINDOW_MS,
    BASELINE_WINDOW_S,
    FACE_MODEL_PATH,
    HEAD_TURN_SMOOTH_K,
    MODEL_FILE,
    RESPONSE_WINDOW_S,
    TURN_THRESHOLD,
    UTTERANCE_GAP_S,
    WHISPER_LANGUAGE,
    WHISPER_MODEL_SIZE,
    WRIST_MAX_JUMP,
    WRIST_MIN_VISIBILITY,
    WRIST_MOVE_THRESHOLD,
)

POSE_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6), (6, 8), (9, 10),
    (11, 12), (11, 13), (13, 15), (15, 17), (15, 19), (15, 21), (17, 19),
    (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
    (11, 23), (12, 24), (23, 24),
    (23, 25), (25, 27), (27, 29), (29, 31), (27, 31),
    (24, 26), (26, 28), (28, 30), (30, 32), (28, 32),
]

# Точки, по которым считаем "общую активность" (нос, плечи, запястья, бёдра)
ACTIVITY_POINTS = [0, 11, 12, 15, 16, 23, 24]


def _head_turn_index(landmarks):
    """Индекс поворота головы из носа (0) и ушей (7, 8). NaN, если точки невидимы."""
    nose = landmarks[0]
    ear_l = landmarks[7]
    ear_r = landmarks[8]
    ear_mid_x = (ear_l.x + ear_r.x) / 2
    ear_dist = math.hypot(ear_l.x - ear_r.x, ear_l.y - ear_r.y)
    if ear_dist <= 1e-6:
        return float("nan")
    return (nose.x - ear_mid_x) / ear_dist


def _yaw_from_matrix(matrix4x4):
    """Извлекает yaw (поворот вокруг вертикальной оси, влево-вправо) в градусах
    из 4x4 facial_transformation_matrix MediaPipe Face Landmarker.

    Берём верхнюю-левую 3x3 матрицу вращения R и считаем
        yaw = atan2(R[0, 2], R[2, 2])
    что соответствует Tait-Bryan-разложению YXZ — это и есть угол «голова влево-вправо».
    Возвращает NaN, если матрица невалидна.
    """
    try:
        m = np.asarray(matrix4x4, dtype=np.float64)
        if m.shape != (4, 4):
            return float("nan")
        r = m[:3, :3]
        yaw_rad = math.atan2(r[0, 2], r[2, 2])
        return math.degrees(yaw_rad)
    except Exception:
        return float("nan")


def process_video(input_path, output_path, csv_path, meta_path, progress_callback=None):
    """Прогоняет видео через MediaPipe Pose.

    Сохраняет:
      - output_path: видео со скелетом (H.264)
      - csv_path: координаты 33 точек по кадрам + колонка head_turn
      - meta_path: метаданные и метрики

    Возвращает dict с путями и посчитанными метриками.
    """
    input_path = Path(input_path)
    output_path = Path(output_path)
    csv_path = Path(csv_path)
    meta_path = Path(meta_path)

    base_options = python.BaseOptions(model_asset_path=str(MODEL_FILE))
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    landmarker = vision.PoseLandmarker.create_from_options(options)

    face_landmarker = None
    try:
        face_base = python.BaseOptions(model_asset_path=str(FACE_MODEL_PATH))
        face_options = vision.FaceLandmarkerOptions(
            base_options=face_base,
            running_mode=vision.RunningMode.VIDEO,
            num_faces=1,
            output_facial_transformation_matrixes=True,
        )
        face_landmarker = vision.FaceLandmarker.create_from_options(face_options)
    except Exception as e:
        # Если модель лица недоступна — продолжаем без неё, колонка head_yaw_deg будет пустой.
        print(f"WARN: Face Landmarker не инициализирован: {e}")
        face_landmarker = None

    cap = cv2.VideoCapture(str(input_path))
    if not cap.isOpened():
        landmarker.close()
        raise RuntimeError(f"Не удалось открыть видео: {input_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    raw_path = output_path.with_name(output_path.stem + "_raw.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(raw_path), fourcc, fps, (width, height))

    header = ["frame", "timestamp_ms"]
    for i in range(33):
        header += [f"p{i}_x", f"p{i}_y", f"p{i}_z", f"p{i}_v"]
    header.append("head_turn")
    header.append("head_yaw_deg")
    header.append("wrist_speed")
    header.append("wrist_extension")

    # CSV-строки буферизуем — wrist_extension добавляется ПОСЛЕ прохода
    # (нужны медианы запястий по базовому окну в начале видео).
    csv_rows = []
    # Параллельный буфер per-frame координат запястий для расчёта extension
    # элементы: (timestamp_ms, lx, ly, lv, rx, ry, rv) или None в pose-not-found кадре
    wrist_track = []

    frame_idx = 0
    detected_frames = 0
    prev_activity_coords = None
    activity_sum = 0.0
    activity_count = 0
    # Координаты запястий (точки 15 и 16) с предыдущего кадра — для расчёта wrist_speed
    prev_wrist_coords = None

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame_idx += 1

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            timestamp_ms = int(frame_idx * 1000 / fps)

            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            row = [frame_idx, timestamp_ms]
            if result.pose_landmarks:
                detected_frames += 1
                landmarks = result.pose_landmarks[0]

                for lm in landmarks:
                    row += [round(lm.x, 5), round(lm.y, 5), round(lm.z, 5), round(lm.visibility, 4)]

                head_turn = _head_turn_index(landmarks)
                row.append("" if math.isnan(head_turn) else round(head_turn, 5))

                pts = [(int(lm.x * width), int(lm.y * height)) for lm in landmarks]
                for a, b in POSE_CONNECTIONS:
                    cv2.line(frame, pts[a], pts[b], (255, 255, 255), 2)
                for (x, y) in pts:
                    cv2.circle(frame, (x, y), 4, (0, 0, 255), -1)

                cur = [(landmarks[i].x, landmarks[i].y) for i in ACTIVITY_POINTS]
                if prev_activity_coords is not None:
                    d = 0.0
                    for (x1, y1), (x0, y0) in zip(cur, prev_activity_coords):
                        d += math.hypot(x1 - x0, y1 - y0)
                    activity_sum += d / len(cur)
                    activity_count += 1
                prev_activity_coords = cur

                # --- Скорость кистей (точки 15 и 16) с фильтрами:
                #     1) visibility ≥ WRIST_MIN_VISIBILITY на текущем и предыдущем кадре;
                #     2) смещение ≤ WRIST_MAX_JUMP (иначе считаем артефактом).
                #     wrist_speed = max из двух валидных запястий, NaN если оба отсеяны.
                cur_wrist = (
                    (landmarks[15].x, landmarks[15].y, landmarks[15].visibility),
                    (landmarks[16].x, landmarks[16].y, landmarks[16].visibility),
                )
                speeds = []
                if prev_wrist_coords is not None:
                    for cur_w, prev_w in zip(cur_wrist, prev_wrist_coords):
                        if cur_w[2] < WRIST_MIN_VISIBILITY:
                            continue
                        if prev_w[2] < WRIST_MIN_VISIBILITY:
                            continue
                        d = math.hypot(cur_w[0] - prev_w[0], cur_w[1] - prev_w[1])
                        if d > WRIST_MAX_JUMP:
                            continue
                        speeds.append(d)
                wrist_speed = max(speeds) if speeds else float("nan")
                prev_wrist_coords = cur_wrist
                wrist_track.append((
                    timestamp_ms,
                    landmarks[15].x, landmarks[15].y, landmarks[15].visibility,
                    landmarks[16].x, landmarks[16].y, landmarks[16].visibility,
                ))
            else:
                row += [""] * (33 * 4)
                row.append("")
                prev_activity_coords = None
                prev_wrist_coords = None
                wrist_speed = float("nan")
                wrist_track.append(None)

            # --- Face Landmarker: yaw в градусах (добавочный сигнал, не влияет на латентность) ---
            head_yaw_deg = float("nan")
            if face_landmarker is not None:
                try:
                    face_result = face_landmarker.detect_for_video(mp_image, timestamp_ms)
                    mats = getattr(face_result, "facial_transformation_matrixes", None) or []
                    if len(mats) > 0:
                        head_yaw_deg = _yaw_from_matrix(mats[0])
                except Exception:
                    head_yaw_deg = float("nan")
            row.append("" if math.isnan(head_yaw_deg) else round(head_yaw_deg, 3))

            row.append("" if math.isnan(wrist_speed) else round(wrist_speed, 6))

            # wrist_extension добавим после прохода
            csv_rows.append(row)
            out.write(frame)

            if progress_callback is not None:
                progress_callback(frame_idx, total)
    finally:
        cap.release()
        out.release()
        landmarker.close()
        if face_landmarker is not None:
            try:
                face_landmarker.close()
            except Exception:
                pass

    # --- Пост-расчёт wrist_extension: «насколько далеко рука от исходного положения покоя» ---
    # Для каждой руки отдельно: медиана позиции по базовому окну (только кадры,
    # где visibility ≥ WRIST_MIN_VISIBILITY). Активная рука кадра = та, у кого выше
    # visibility (среди видимых). Extension = расстояние от её медианы покоя.
    baseline_ms = BASELINE_WINDOW_S * 1000
    left_xs, left_ys, right_xs, right_ys = [], [], [], []
    for w in wrist_track:
        if w is None or w[0] > baseline_ms:
            continue
        ts, lx, ly, lv, rx, ry, rv = w
        if lv is not None and lv >= WRIST_MIN_VISIBILITY:
            left_xs.append(lx); left_ys.append(ly)
        if rv is not None and rv >= WRIST_MIN_VISIBILITY:
            right_xs.append(rx); right_ys.append(ry)

    def _median(xs):
        if not xs:
            return None
        s = sorted(xs)
        n = len(s)
        return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2

    left_med = (_median(left_xs), _median(left_ys)) if left_xs else None
    right_med = (_median(right_xs), _median(right_ys)) if right_xs else None

    for i, row in enumerate(csv_rows):
        w = wrist_track[i]
        ext = float("nan")
        if w is not None:
            ts, lx, ly, lv, rx, ry, rv = w
            l_ok = (lv is not None and lv >= WRIST_MIN_VISIBILITY)
            r_ok = (rv is not None and rv >= WRIST_MIN_VISIBILITY)
            if l_ok and r_ok:
                active_left = lv >= rv
            elif l_ok:
                active_left = True
            elif r_ok:
                active_left = False
            else:
                active_left = None

            if active_left is True and left_med is not None:
                ext = math.hypot(lx - left_med[0], ly - left_med[1])
            elif active_left is False and right_med is not None:
                ext = math.hypot(rx - right_med[0], ry - right_med[1])
            elif active_left is True and right_med is not None:
                # левая выбрана, но её базовой нет — попробуем правую
                if r_ok:
                    ext = math.hypot(rx - right_med[0], ry - right_med[1])
            elif active_left is False and left_med is not None:
                if l_ok:
                    ext = math.hypot(lx - left_med[0], ly - left_med[1])

        row.append("" if math.isnan(ext) else round(ext, 5))

    # Записываем CSV целиком (включая wrist_extension)
    with open(csv_path, "w", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(header)
        writer.writerows(csv_rows)

    # Подмешиваем аудио из оригинального видео (если есть). "?"-суффикс на map
    # делает аудиодорожку опциональной — если в оригинале её нет, ffmpeg не падает.
    # БЕЗ -shortest: если аудио короче видео, оно не должно резать видеотрек, иначе
    # количество кадров на выходе не сойдётся с landmarks.csv (Step 1 asserts ловят
    # это, но защита по построению лучше — кадры — это эталон).
    cmd = [
        "ffmpeg", "-y",
        "-i", str(raw_path),
        "-i", str(input_path),
        "-map", "0:v:0",
        "-map", "1:a:0?",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-c:a", "aac",
        str(output_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(
            f"ffmpeg завершился с кодом {proc.returncode}:\n{proc.stderr[-2000:]}"
        )

    try:
        raw_path.unlink()
    except OSError:
        pass

    overall_activity = round(activity_sum / activity_count, 5) if activity_count else 0.0

    # Провенанс источника БЕЗ имени файла (IMP-04 + SEC-01):
    # имя файла, поданное пользователем, может быть PII (содержать имя/фамилию).
    # Вместо него — sha256 содержимого + расширение + размер.
    _src_size = input_path.stat().st_size
    _hasher = hashlib.sha256()
    with open(input_path, "rb") as _src_f:
        for _chunk in iter(lambda: _src_f.read(65536), b""):
            _hasher.update(_chunk)
    _src_sha256 = _hasher.hexdigest()
    _src_ext = input_path.suffix.lower()

    meta = {
        "source_sha256": _src_sha256,
        "original_ext": _src_ext,
        "size_bytes": _src_size,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "fps": round(fps, 2),
        "width": width,
        "height": height,
        "total_frames": frame_idx,
        "detected_frames": detected_frames,
        "model": str(MODEL_FILE.name),
        "metrics": {
            "overall_activity": overall_activity,
        },
    }
    with open(meta_path, "w") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    return {
        "video_path": str(output_path),
        "csv_path": str(csv_path),
        "meta_path": str(meta_path),
        "fps": fps,
        "width": width,
        "height": height,
        "total_frames": frame_idx,
        "detected_frames": detected_frames,
        "metrics": {
            "overall_activity": overall_activity,
        },
    }


# ---------- Анализ звука (логика из audio_peaks.py) ----------

def analyze_audio(video_path):
    """Извлекает звук из видео и ищет кандидатов-окликов.

    Возвращает dict:
      {
        "has_audio": bool,
        "times": np.ndarray,        # секунды
        "loudness": np.ndarray,     # 0..1
        "threshold": float,
        "candidates": list[float],  # секунды
      }
    Если аудиодорожки нет — has_audio=False, остальные поля — пустые.
    """
    video_path = Path(video_path)

    empty = {
        "has_audio": False,
        "times": np.array([]),
        "loudness": np.array([]),
        "threshold": 0.0,
        "candidates": [],
    }

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = Path(tmp.name)

    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-vn",
            "-ac", "1",
            "-ar", str(AUDIO_SAMPLE_RATE),
            "-f", "wav",
            str(wav_path),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0 or not wav_path.exists() or wav_path.stat().st_size == 0:
            return empty

        try:
            sample_rate, data = wavfile.read(str(wav_path))
        except Exception:
            return empty

        if data.size == 0:
            return empty
        if data.ndim > 1:
            data = data.mean(axis=1)
        data = data.astype(np.float64)

        win = max(1, int(sample_rate * AUDIO_WINDOW_MS / 1000))
        n_windows = len(data) // win
        if n_windows < 2:
            return empty

        loudness = np.array([
            np.sqrt(np.mean(data[i * win:(i + 1) * win] ** 2))
            for i in range(n_windows)
        ])
        times = np.arange(n_windows) * (AUDIO_WINDOW_MS / 1000)

        peak_val = loudness.max()
        if peak_val <= 0:
            return empty
        loudness = loudness / (peak_val + 1e-9)

        threshold = float(loudness.mean() + 0.5 * loudness.std())
        min_gap = max(1, int(AUDIO_PEAK_MIN_GAP_S * 1000 / AUDIO_WINDOW_MS))
        peaks, _ = find_peaks(loudness, height=threshold, distance=min_gap)
        candidates = [float(times[i]) for i in peaks]

        return {
            "has_audio": True,
            "times": times,
            "loudness": loudness,
            "threshold": threshold,
            "candidates": candidates,
        }
    finally:
        try:
            wav_path.unlink()
        except OSError:
            pass


# ---------- Сигнал поворота головы из CSV ----------

def read_head_turn(csv_path):
    """Читает (times_s, head_turn) из landmarks.csv. NaN там, где сигнал отсутствует."""
    times, signal = [], []
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            times.append(float(row["timestamp_ms"]) / 1000.0)
            v = row.get("head_turn", "")
            signal.append(float(v) if v not in ("", None) else float("nan"))
    return np.array(times), np.array(signal)


def read_head_yaw_deg(csv_path):
    """Читает (times_s, head_yaw_deg) из landmarks.csv. NaN там, где лицо не найдено
    или колонки нет (старые CSV без Face Landmarker)."""
    times, signal = [], []
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            times.append(float(row["timestamp_ms"]) / 1000.0)
            v = row.get("head_yaw_deg", "")
            signal.append(float(v) if v not in ("", None) else float("nan"))
    return np.array(times), np.array(signal)


def read_wrist_speed(csv_path):
    """Читает (times_s, wrist_speed) из landmarks.csv. NaN там, где скорость не была
    посчитана (первый кадр, поза не найдена) или колонки нет (старые CSV)."""
    times, signal = [], []
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            times.append(float(row["timestamp_ms"]) / 1000.0)
            v = row.get("wrist_speed", "")
            signal.append(float(v) if v not in ("", None) else float("nan"))
    return np.array(times), np.array(signal)


def read_wrist_extension(csv_path):
    """Читает (times_s, wrist_extension) из landmarks.csv. NaN там, где рука невидима
    или нет базовой медианы (старые CSV без колонки)."""
    times, signal = [], []
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            times.append(float(row["timestamp_ms"]) / 1000.0)
            v = row.get("wrist_extension", "")
            signal.append(float(v) if v not in ("", None) else float("nan"))
    return np.array(times), np.array(signal)


def smooth_signal(a, k=HEAD_TURN_SMOOTH_K):
    """Скользящее среднее с пропуском NaN — формула из head_turn.py / latency.py."""
    a = np.asarray(a, dtype=float)
    out = a.copy()
    for i in range(len(a)):
        lo, hi = max(0, i - k // 2), min(len(a), i + k // 2 + 1)
        chunk = a[lo:hi]
        chunk = chunk[~np.isnan(chunk)]
        out[i] = chunk.mean() if len(chunk) else float("nan")
    return out


# ---------- Латентность (логика из latency.py) ----------

def measure_latencies(times, head_turn_smoothed, call_times,
                      response_window_s=RESPONSE_WINDOW_S,
                      turn_threshold=TURN_THRESHOLD):
    """Считает латентность реакции на каждый оклик.

    Возвращает:
      {
        "results": [
          {"call_t": float, "latency_s": float|None, "reaction_idx": int|None}
        ],
        "responded": int,
        "total": int,
        "response_rate": float,  # 0..1
      }
    """
    times = np.asarray(times)
    sig = np.asarray(head_turn_smoothed)

    def nearest_index(t):
        return int(np.argmin(np.abs(times - t)))

    results = []
    for call_t in call_times:
        call_t = float(call_t)
        if len(times) == 0:
            results.append({"call_t": call_t, "latency_s": None, "reaction_idx": None})
            continue
        i0 = nearest_index(call_t)
        baseline = sig[i0]
        if np.isnan(baseline):
            results.append({"call_t": call_t, "latency_s": None, "reaction_idx": None})
            continue
        end_t = call_t + response_window_s
        found = None
        for i in range(i0 + 1, len(times)):
            if times[i] > end_t:
                break
            if not np.isnan(sig[i]) and abs(sig[i] - baseline) >= turn_threshold:
                found = (float(times[i] - call_t), i)
                break
        if found is None:
            results.append({"call_t": call_t, "latency_s": None, "reaction_idx": None})
        else:
            results.append({"call_t": call_t, "latency_s": found[0], "reaction_idx": found[1]})

    responded = sum(1 for r in results if r["latency_s"] is not None)
    total = len(results)
    return {
        "results": results,
        "responded": responded,
        "total": total,
        "response_rate": (responded / total) if total else 0.0,
    }


def measure_action_latencies(times, wrist_speed_smoothed, command_times,
                             response_window_s=ACTION_WINDOW_S,
                             movement_threshold=WRIST_MOVE_THRESHOLD):
    """Латентность «команда → начало действия» по сигналу wrist_speed.

    Тонкая обёртка над measure_latencies — математика идентична:
    ищем первый кадр после команды, где |signal[i] - baseline| ≥ порога,
    в пределах окна ожидания.
    """
    return measure_latencies(
        times, wrist_speed_smoothed, command_times,
        response_window_s=response_window_s,
        turn_threshold=movement_threshold,
    )


# ---------- Распознавание речи (faster-whisper) ----------

_WHISPER_MODEL = None


def _get_whisper_model():
    """Ленивая инициализация модели faster-whisper (грузится один раз)."""
    global _WHISPER_MODEL
    if _WHISPER_MODEL is None:
        from faster_whisper import WhisperModel
        _WHISPER_MODEL = WhisperModel(
            WHISPER_MODEL_SIZE,
            device="cpu",
            compute_type="int8",
        )
    return _WHISPER_MODEL


def transcribe_calls(video_path):
    """Распознаёт речь в видео и возвращает список кандидатов-окликов.

    Возвращает список dict-ов:
      [{"start_s": float, "end_s": float, "text": str}, ...]

    Извлекает звук тем же путём, что и analyze_audio (моно 16 кГц wav через ffmpeg).
    Использует word_timestamps=True и vad_filter=True (встроенный Silero VAD).
    Кандидаты — отдельные распознанные слова (если доступны), иначе короткие сегменты.

    Если аудио нет, речи нет или модель не вернула слов — возвращает [], не падает.
    Первый запуск с указанной моделью скачает её из интернета (faster-whisper / HF).
    """
    video_path = Path(video_path)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = Path(tmp.name)

    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-vn",
            "-ac", "1",
            "-ar", str(AUDIO_SAMPLE_RATE),
            "-f", "wav",
            str(wav_path),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0 or not wav_path.exists() or wav_path.stat().st_size == 0:
            return []

        try:
            model = _get_whisper_model()
        except Exception as e:
            print(f"WARN: не удалось загрузить модель faster-whisper: {e}")
            return []

        try:
            segments, _info = model.transcribe(
                str(wav_path),
                language=WHISPER_LANGUAGE,
                word_timestamps=True,
                vad_filter=True,
            )
        except Exception as e:
            print(f"WARN: ошибка распознавания: {e}")
            return []

        candidates = []
        for seg in segments:
            words = getattr(seg, "words", None) or []
            if words:
                for w in words:
                    text = (w.word or "").strip()
                    if not text:
                        continue
                    candidates.append({
                        "start_s": float(w.start) if w.start is not None else float(seg.start),
                        "end_s": float(w.end) if w.end is not None else float(seg.end),
                        "text": text,
                    })
            else:
                text = (seg.text or "").strip()
                if text:
                    candidates.append({
                        "start_s": float(seg.start),
                        "end_s": float(seg.end),
                        "text": text,
                    })

        return candidates
    finally:
        try:
            wav_path.unlink()
        except OSError:
            pass


def group_words_into_utterances(words, gap_s=UTTERANCE_GAP_S):
    """Сгруппировать пословные результаты Whisper в фразы-высказывания.

    Каждое слово — dict с ключами start_s, end_s, text. Если пауза между концом
    предыдущего слова и началом следующего превышает gap_s — начинается новая фраза.

    Возвращает список dict-ов: {start_s, end_s, text} по одному на фразу.
    """
    out = []
    cur = []
    for w in words or []:
        if not cur:
            cur = [w]
            continue
        prev_end = cur[-1].get("end_s", cur[-1].get("start_s", 0.0))
        if w.get("start_s", 0.0) - prev_end > gap_s:
            out.append(_merge_utterance(cur))
            cur = [w]
        else:
            cur.append(w)
    if cur:
        out.append(_merge_utterance(cur))
    return out


def _merge_utterance(words):
    parts = []
    for w in words:
        t = (w.get("text") or "").strip()
        if t:
            parts.append(t)
    return {
        "start_s": float(words[0].get("start_s", 0.0)),
        "end_s": float(words[-1].get("end_s", words[-1].get("start_s", 0.0))),
        "text": " ".join(parts).strip(),
    }


# ---------- Авто-подсказка начала действия (для функционального сценария) ----------

def suggest_action_onset(times, wrist_extension_smoothed, instruction_end_s,
                         k=ACTION_K,
                         min_threshold=ACTION_MIN_THRESHOLD,
                         min_burst_frames=ACTION_MIN_BURST_FRAMES,
                         baseline_window_s=BASELINE_WINDOW_S):
    """Авто-подсказка момента начала действия по сигналу wrist_extension.

    Базовая линия — медиана сигнала за первые baseline_window_s секунд видео.
    Порог = max(baseline + k × std, min_threshold).
    Подсказка = первый момент ПОСЛЕ instruction_end_s, где сигнал держится выше порога
    подряд не менее min_burst_frames кадров (возвращается ПЕРВЫЙ кадр серии).

    Возвращает dict:
      {
        "suggested_onset_s": float | None,
        "suggested_onset_idx": int | None,
        "threshold": float,
        "baseline": float,
        "baseline_std": float,
      }
    """
    times = np.asarray(times, dtype=float)
    sig = np.asarray(wrist_extension_smoothed, dtype=float)
    n = len(times)

    if n == 0:
        return {"suggested_onset_s": None, "suggested_onset_idx": None,
                "threshold": float(min_threshold), "baseline": 0.0, "baseline_std": 0.0}

    hi = min(baseline_window_s, instruction_end_s)
    mask = (times >= 0) & (times <= hi)
    chunk = sig[mask]
    chunk = chunk[~np.isnan(chunk)]
    if len(chunk) < 3:
        mask2 = times <= instruction_end_s
        chunk = sig[mask2]
        chunk = chunk[~np.isnan(chunk)]

    if len(chunk) == 0:
        baseline = 0.0
        baseline_std = 0.0
    else:
        baseline = float(np.median(chunk))
        baseline_std = float(np.std(chunk)) if len(chunk) > 1 else 0.0

    threshold = float(max(baseline + k * baseline_std, min_threshold))

    consecutive = 0
    for i in range(n):
        if times[i] <= instruction_end_s:
            consecutive = 0
            continue
        v = sig[i]
        if not np.isnan(v) and v > threshold:
            consecutive += 1
            if consecutive >= min_burst_frames:
                onset_idx = i - min_burst_frames + 1
                return {
                    "suggested_onset_s": float(times[onset_idx]),
                    "suggested_onset_idx": int(onset_idx),
                    "threshold": threshold,
                    "baseline": baseline,
                    "baseline_std": baseline_std,
                }
        else:
            consecutive = 0

    return {
        "suggested_onset_s": None,
        "suggested_onset_idx": None,
        "threshold": threshold,
        "baseline": baseline,
        "baseline_std": baseline_std,
    }


# ---------- Тонкая обёртка для эталонной разметки: возвращает frame напрямую ----------

def suggest_action_onset_frame(times, wrist_extension_smoothed, instruction_end_s,
                                frame_min, **kwargs):
    """Тонкая обёртка над suggest_action_onset, возвращающая абсолютный frame_index
    подсказки напрямую, без round(seconds × fps) в тракте сравнения.

    Маппинг: suggest_action_onset возвращает индекс в массиве times (0-based, по
    позиции строки CSV). При сплошной нумерации CSV (read_csv_frame_range
    подтверждает это assert-ом) абсолютный кадр = frame_min + array_idx.

    suggest_action_onset в прод-флоу НЕ трогается — этот враппер вызывает его
    как есть и берёт только индексное поле suggested_onset_idx.

    Возвращает:
      {
        "auto_frame_index": int | None,
        "threshold": float,
        "baseline": float,
        "baseline_std": float,
      }
    """
    result = suggest_action_onset(
        times, wrist_extension_smoothed, instruction_end_s, **kwargs
    )
    onset_idx = result.get("suggested_onset_idx")
    if onset_idx is None:
        auto_frame = None
    else:
        auto_frame = int(frame_min) + int(onset_idx)
    return {
        "auto_frame_index": auto_frame,
        "threshold": result.get("threshold"),
        "baseline": result.get("baseline"),
        "baseline_std": result.get("baseline_std"),
    }


# ---------- (Legacy) Детектор начала действия по wrist_speed ----------

def detect_action_onset(times, signal, instruction_end_s,
                        k=ACTION_K,
                        min_threshold=ACTION_MIN_THRESHOLD,
                        min_burst_frames=ACTION_MIN_BURST_FRAMES,
                        baseline_window_s=BASELINE_WINDOW_S):
    """Найти момент начала действия после конца инструкции.

    Базовая линия = медиана сигнала в окне [instruction_end_s - baseline_window_s, instruction_end_s].
    Порог = max(baseline + k × std, min_threshold).
    Начало действия = первый момент ПОСЛЕ instruction_end_s, где сигнал держится выше порога
    подряд не менее min_burst_frames кадров. Возвращается момент ПЕРВОГО кадра серии.

    Возвращает dict:
      {
        "onset_s": float | None,
        "onset_idx": int | None,
        "threshold": float,
        "baseline": float,
        "baseline_std": float,
      }
    """
    times = np.asarray(times, dtype=float)
    sig = np.asarray(signal, dtype=float)
    n = len(times)

    if n == 0:
        return {"onset_s": None, "onset_idx": None,
                "threshold": float(min_threshold), "baseline": 0.0, "baseline_std": 0.0}

    # Базовая линия: первые baseline_window_s секунд видео (предполагаем покой в начале).
    # Это устойчивее, чем окно перед instruction_end_s — длинная инструкция часто
    # уже содержит движение и сместила бы базовую линию вверх.
    hi = min(baseline_window_s, instruction_end_s)
    mask = (times >= 0) & (times <= hi)
    chunk = sig[mask]
    chunk = chunk[~np.isnan(chunk)]
    if len(chunk) < 3:
        # Слишком мало — берём всё, что есть до конца инструкции
        mask2 = times <= instruction_end_s
        chunk = sig[mask2]
        chunk = chunk[~np.isnan(chunk)]

    if len(chunk) == 0:
        baseline = 0.0
        baseline_std = 0.0
    else:
        baseline = float(np.median(chunk))
        baseline_std = float(np.std(chunk)) if len(chunk) > 1 else 0.0

    threshold = float(max(baseline + k * baseline_std, min_threshold))

    consecutive = 0
    for i in range(n):
        if times[i] <= instruction_end_s:
            consecutive = 0
            continue
        v = sig[i]
        if not np.isnan(v) and v > threshold:
            consecutive += 1
            if consecutive >= min_burst_frames:
                onset_idx = i - min_burst_frames + 1
                return {
                    "onset_s": float(times[onset_idx]),
                    "onset_idx": int(onset_idx),
                    "threshold": threshold,
                    "baseline": baseline,
                    "baseline_std": baseline_std,
                }
        else:
            consecutive = 0

    return {
        "onset_s": None,
        "onset_idx": None,
        "threshold": threshold,
        "baseline": baseline,
        "baseline_std": baseline_std,
    }


# ============================================================================
# Покадровая разметка (Step 1: распаковка кадров и базовые помощники)
# ============================================================================
#
# Зафиксированные конвенции:
#   - Декодер — cv2.VideoCapture последовательным read(); никакого seek-а
#     на CAP_PROP_POS_FRAMES (H.264 промахивается к keyframe).
#   - Истинное число кадров — из самого цикла, не из ffprobe.
#   - Запись через cv2.imwrite(path, frame_bgr) — BGR это правильный вход.
#   - Имя файла кадра — frame_<idx:06d>.png, индекс начинается с frame_min.
#   - frame_to_seconds = (frame_index - frame_min) / fps. Первый кадр ↦ t=0.
#     timestamp_ms в CSV НЕ авторитет — это переписанная формула int(frame*1000/fps).
#   - Калибровка |manual − auto| должна быть в КАДРАХ (см. Step 4).

def frame_to_seconds(frame_index, session):
    """Единственная функция-преобразователь кадра в секунды.

    session — dict, обязаны быть поля "frame_min" (int) и "fps" (float).
    Возвращает float секунд: первый кадр клипа = 0.0.
    """
    return (int(frame_index) - int(session["frame_min"])) / float(session["fps"])


def frame_path_for(cache_dir, frame_index):
    """Единая точка маппинга frame_index -> путь к PNG."""
    return Path(cache_dir) / f"frame_{int(frame_index):06d}.png"


def read_csv_frame_range(csv_path):
    """Читает колонку frame из landmarks.csv и возвращает базовые характеристики:
      {frame_min, frame_max, row_count, contiguous}.
    contiguous=True, если множество значений frame равно range(frame_min, frame_max+1).
    """
    frames = []
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            frames.append(int(row["frame"]))
    if not frames:
        raise RuntimeError(f"CSV пуст: {csv_path}")
    fmin = min(frames)
    fmax = max(frames)
    row_count = len(frames)
    expected = set(range(fmin, fmax + 1))
    contiguous = (set(frames) == expected) and (row_count == fmax - fmin + 1)
    return {
        "frame_min": fmin,
        "frame_max": fmax,
        "row_count": row_count,
        "contiguous": contiguous,
    }


_CACHE_META_FILENAME = "cache_meta.json"


def _video_provenance(video_path):
    """Источник истины для проверки реюза кэша. Возвращает dict с mtime+size.
    sha256 НЕ берём — на 100+ MB видео слишком дорого; mtime+size ловят
    переобработку с тем же session_id (новое содержимое → другой mtime/size)."""
    st = video_path.stat()
    return {
        "size_bytes": st.st_size,
        "mtime_ns": st.st_mtime_ns,
    }


def extract_frames_to_cache(video_path, cache_dir, frame_min, expected_count, progress_cb=None):
    """Покадровая распаковка через cv2.VideoCapture последовательным read().

    Параметры:
      video_path: путь к session-видео (тот же файл, по которому считался CSV).
      cache_dir: каталог-приёмник PNG; будет очищен, если содержимое не совпадает с ожидаемым.
      frame_min: с какого индекса начинать именование PNG (= min(frame) из CSV).
      expected_count: ожидаемое число кадров = frame_max - frame_min + 1.
      progress_cb(written, total): опциональный колбэк прогресса.

    BUG-01 (Фаза 2): реюз кэша подтверждается через cache_meta.json — там
    лежат frame_min, expected_count, mtime_ns + size_bytes ИСХОДНОГО видео.
    Без совпадения этих метаданных кэш не реюзается (даже если число PNG
    случайно сошлось), кэш перераспаковывается.

    SEC-05: PNG-файлы пишутся через umask 0o077 → права 0o600 (только владелец).

    Возвращает dict: {reused: bool, frames_written: int, cache_dir: str}.
    Бросает RuntimeError с конкретными числами при расхождении frame-count.

    Гарантии (как и раньше):
      - имя файла: frame_<idx:06d>.png, idx начинается с frame_min;
      - запись через cv2.imwrite (BGR корректно сохраняется в PNG);
      - читаем тот же файл, по которому считался CSV → выравнивание PNG[N] ↔
        строка frame==N обеспечено тождеством декода, а не совпадением счётчиков.
    """
    import os as _os
    cache_dir = Path(cache_dir)
    video_path = Path(video_path)
    frame_min = int(frame_min)
    expected_count = int(expected_count)

    current_provenance = _video_provenance(video_path)
    meta_path = cache_dir / _CACHE_META_FILENAME

    # Reuse только если cache_meta.json матчит И число PNG ровно expected_count
    if cache_dir.exists() and meta_path.exists():
        try:
            saved = json.loads(meta_path.read_text())
        except Exception:
            saved = None
        if (
            isinstance(saved, dict)
            and saved.get("frame_min") == frame_min
            and saved.get("expected_count") == expected_count
            and saved.get("size_bytes") == current_provenance["size_bytes"]
            and saved.get("mtime_ns") == current_provenance["mtime_ns"]
        ):
            existing = sorted(cache_dir.glob("frame_*.png"))
            if len(existing) == expected_count:
                return {
                    "reused": True,
                    "frames_written": len(existing),
                    "cache_dir": str(cache_dir),
                }
        # Метаданные есть, но не совпали — старая распаковка, выкинуть.
        shutil.rmtree(cache_dir)
    elif cache_dir.exists():
        # Каталог есть, но cache_meta.json нет (legacy / частичная распаковка).
        # Не доверяем — стираем и распаковываем заново.
        shutil.rmtree(cache_dir)

    cache_dir.mkdir(parents=True, exist_ok=True)
    # SEC-05: ужесточаем права на сам каталог (даже если frame_cache_dir уже сделал)
    try:
        cache_dir.chmod(0o700)
    except OSError:
        pass

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Не удалось открыть видео для распаковки: {video_path}")

    # SEC-05: umask 0o077 → новые файлы получают 0o600
    _prev_umask = _os.umask(0o077)
    frames_written = 0
    try:
        idx = frame_min
        while True:
            ok, frame_bgr = cap.read()
            if not ok:
                break
            path = cache_dir / f"frame_{idx:06d}.png"
            if not cv2.imwrite(str(path), frame_bgr):
                raise RuntimeError(f"cv2.imwrite вернул False для {path}")
            # Подстраховка: даже если imwrite не уважает umask, доводим до 0o600
            try:
                path.chmod(0o600)
            except OSError:
                pass
            frames_written += 1
            idx += 1
            if progress_cb is not None:
                progress_cb(frames_written, expected_count)
    finally:
        cap.release()
        _os.umask(_prev_umask)

    if frames_written != expected_count:
        raise RuntimeError(
            f"Расхождение числа кадров: декодер записал {frames_written} PNG, "
            f"ожидалось {expected_count} (frame_min={frame_min}, "
            f"frame_max должен быть {frame_min + expected_count - 1}). "
            f"Источник видео: {video_path}"
        )

    # Пишем cache_meta.json для будущего реюза
    meta_payload = {
        "frame_min": frame_min,
        "expected_count": expected_count,
        "frame_count_written": frames_written,
        "size_bytes": current_provenance["size_bytes"],
        "mtime_ns": current_provenance["mtime_ns"],
        "video_path": str(video_path),
    }
    meta_path.write_text(json.dumps(meta_payload, indent=2))
    try:
        meta_path.chmod(0o600)
    except OSError:
        pass

    return {
        "reused": False,
        "frames_written": frames_written,
        "cache_dir": str(cache_dir),
    }
