"""Подпроцесс обработки одного клипа корневым движком (Этап B+).

Запускается фоновым воркером как ОТДЕЛЬНЫЙ процесс:
    python worker_runner.py <video_path> <scenario> <workdir>

Зачем подпроцесс: CPU-bound движок (MediaPipe/OpenCV/whisper) не блокирует
event loop веб-процесса, а память освобождается при выходе процесса.

Корневой engine.py вызывается КАК БИБЛИОТЕКА (не модифицируется). Все производные
артефакты пишутся в <workdir>; родитель забирает overlay.mp4 + bundle.json
(шифрует рядом с клипом — эфемерно), затем стирает <workdir> целиком (no-retention).

Вывод:
  - stdout (последняя строка): JSON {"auto_metrics":[...], "diag":{...,coverage_pct}}
    — компактные calibration-метрики (в submission, durable) + диагностика.
  - <workdir>/overlay.mp4 — видео со скелетом (движок уже рендерит).
  - <workdir>/bundle.json — БОГАТЫЙ аналитический пакет для кабинета ОТ (графики,
    события, транскрипт, латентности). Эфемерный: живёт пока живёт клип.
Всё это — только для ОТ. Метрики НЕПОДТВЕРЖДЁННЫЕ (анти-якорь; «машина не судит»).
"""

import json
import math
import os
import sys
from pathlib import Path

CALIBRATION = "calibration"  # = stage1_config.METRIC_STATE_CALIBRATION (subprocess не импортирует stage1)
_SERIES_TARGET = 150  # макс. точек на временной ряд (прорежаем для компактности пакета)


def _add_engine_to_path() -> None:
    root = os.environ.get("DODODO_ENGINE_ROOT", "")
    if root and root not in sys.path:
        sys.path.insert(0, root)


def _safe(fn, default):
    try:
        return fn()
    except Exception:  # noqa: BLE001 — любая часть может отсутствовать (нет аудио/лица/речи)
        return default


def _num(v):
    """float|None → JSON-safe (NaN/inf → None)."""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else round(f, 4)


def _downsample(times, values, target=_SERIES_TARGET):
    """Прорядить ряд до ~target точек. NaN → None. Возвращает (t[], v[])."""
    n = min(len(times), len(values))
    if n == 0:
        return [], []
    step = max(1, n // target)
    t_out, v_out = [], []
    for i in range(0, n, step):
        t_out.append(round(float(times[i]), 3))
        v_out.append(_num(values[i]))
    return t_out, v_out


def _call_times(audio, speech):
    cand = list((audio or {}).get("candidates") or [])
    return sorted({round(float(t), 3) for t in cand}
                  | {round(float(s.get("start_s", 0.0)), 3) for s in (speech or [])})


def _latencies(engine, result, call_times, scenario):
    if scenario != "name" or not call_times:
        return None
    try:
        import numpy as np
        times, signal = engine.read_head_turn(result["csv_path"])
        signal_s = engine.smooth_signal(signal)
        if np.all(np.isnan(signal_s)):
            return None
        return engine.measure_latencies(times, signal_s, call_times)
    except Exception:  # noqa: BLE001
        return None


def build_auto_metrics(result, audio, call_times, lat):
    """Компактные calibration-метрики (в submission, durable). Каждый блок защищён."""
    metrics = []
    activity = (result.get("metrics") or {}).get("overall_activity")
    if activity is not None:
        metrics.append({"label": "Overall movement activity (auto)", "value": f"{activity:.3f}",
                        "state": CALIBRATION, "domains": ["movement"]})
    det, tot = result.get("detected_frames"), result.get("total_frames")
    if tot:
        metrics.append({"label": "Pose detected (auto)", "value": f"{det}/{tot} frames", "state": CALIBRATION})
    if audio is not None:
        metrics.append({"label": "Name calls detected (auto)", "value": str(len(call_times)),
                        "state": CALIBRATION, "domains": ["communication"]})
    if lat is not None:
        metrics.append({"label": "Response to name (auto)", "value": f"{lat['responded']}/{lat['total']} calls",
                        "state": CALIBRATION, "domains": ["attention", "communication"]})
    return metrics


def _movement_peaks(times, sig):
    """Локальные максимумы сглаженного сигнала движения выше mean+std → времена пиков."""
    try:
        import numpy as np
        a = np.asarray(sig, dtype=float)
        good = a[~np.isnan(a)]
        if good.size < 3:
            return []
        thr = float(good.mean() + good.std())
        out = []
        for i in range(1, len(a) - 1):
            if np.isnan(a[i]):
                continue
            if a[i] >= thr and a[i] >= a[i - 1] and a[i] >= a[i + 1]:
                out.append(round(float(times[i]), 3))
        return out
    except Exception:  # noqa: BLE001
        return []


def _series(engine, reader, csv):
    """(times, smoothed-signal) из CSV-ридера движка → прорежённые (t[], v[])."""
    times, signal = reader(csv)
    return _downsample(times, engine.smooth_signal(signal))


def build_bundle(engine, result, scenario, audio, speech, call_times, lat):
    """Богатый эфемерный аналитический пакет для кабинета ОТ. Только сырой сигнал
    как факты — НЕ суждения. checklist_hints наполняются в Этапе 2."""
    csv = result.get("csv_path")
    fps = result.get("fps") or 0.0
    det, tot = result.get("detected_frames") or 0, result.get("total_frames") or 0
    coverage_pct = round(100.0 * det / tot, 1) if tot else None

    # Временные ряды: поворот головы и движение руки (реальные сигналы из CSV).
    ht_t, ht_v = _safe(lambda: _series(engine, engine.read_head_turn, csv), ([], []))
    wr_t, wr_v = _safe(lambda: _series(engine, engine.read_wrist_speed, csv), ([], []))

    duration_s = 0.0
    if ht_t:
        duration_s = ht_t[-1]
    elif fps and tot:
        duration_s = round(tot / fps, 2)

    bundle = {
        "version": 1,
        "scenario": scenario,
        "fps": _num(fps),
        "duration_s": _num(duration_s),
        "coverage_pct": coverage_pct,
        "series": {
            "head_turn": {"t": ht_t, "v": ht_v, "label": "Head turn"},
            "hand_movement": {"t": wr_t, "v": wr_v, "label": "Hand movement"},
        },
        "events": {
            "calls": call_times,
            "words": [{"t": round(float(s.get("start_s", 0.0)), 3),
                       "end": round(float(s.get("end_s", 0.0)), 3),
                       "text": str(s.get("text", ""))}
                      for s in (speech or [])],
            "movement_peaks": _movement_peaks(wr_t, wr_v),
        },
        "latencies": [{"call_t": _num(r.get("call_t")), "latency_s": _num(r.get("latency_s"))}
                      for r in (lat or {}).get("results", [])] if lat else [],
        "checklist_hints": {},  # Этап 2 — только обоснуемые движком подсказки
    }
    return bundle


def main() -> int:
    video_path = sys.argv[1]
    scenario = sys.argv[2] if len(sys.argv) > 2 else "name"
    workdir = Path(sys.argv[3]) if len(sys.argv) > 3 else Path(video_path).parent

    _add_engine_to_path()
    import engine  # корневой движок (как библиотека)

    out = workdir / "overlay.mp4"
    csv = workdir / "landmarks.csv"
    meta = workdir / "meta.json"

    result = engine.process_video(str(video_path), str(out), str(csv), str(meta))

    audio = _safe(lambda: engine.analyze_audio(str(video_path)), None)
    speech = _safe(lambda: engine.transcribe_calls(str(video_path)), [])
    call_times = _call_times(audio, speech)
    lat = _latencies(engine, result, call_times, scenario)

    metrics = build_auto_metrics(result, audio, call_times, lat)
    bundle = build_bundle(engine, result, scenario, audio, speech, call_times, lat)
    (workdir / "bundle.json").write_text(json.dumps(bundle), encoding="utf-8")

    det, tot = result.get("detected_frames") or 0, result.get("total_frames") or 0
    diag = {
        "fps": result.get("fps"),
        "total_frames": tot,
        "detected_frames": det,
        "coverage_pct": round(100.0 * det / tot, 1) if tot else None,
        "scenario": scenario,
        "has_overlay": out.exists(),
        "has_bundle": True,
    }
    print(json.dumps({"auto_metrics": metrics, "diag": diag}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
