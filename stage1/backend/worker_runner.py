"""Подпроцесс обработки одного клипа корневым движком (Этап B).

Запускается фоновым воркером как ОТДЕЛЬНЫЙ процесс:
    python worker_runner.py <video_path> <scenario> <workdir>

Зачем подпроцесс: CPU-bound движок (MediaPipe/OpenCV/whisper) не блокирует
event loop веб-процесса, а память освобождается при выходе процесса.

Корневой engine.py вызывается КАК БИБЛИОТЕКА (не модифицируется). Все
производные артефакты (overlay-mp4, landmarks.csv, meta.json, wav, whisper-temp)
пишутся в <workdir>; родитель стирает <workdir> целиком (no-retention). TMPDIR
тоже указывает на <workdir>, чтобы любые NamedTemporaryFile попали туда же.

Вывод: последняя строка stdout — JSON {"auto_metrics": [...], "diag": {...}}.
Метрики — НЕПОДТВЕРЖДЁННЫЕ (state="calibration"): подсказки специалисту, в
тренды не идут (анти-якорь; «машина не судит»).
"""

import json
import os
import sys
from pathlib import Path

CALIBRATION = "calibration"  # = stage1_config.METRIC_STATE_CALIBRATION (subprocess не импортирует stage1)


def _add_engine_to_path() -> None:
    root = os.environ.get("DODODO_ENGINE_ROOT", "")
    if root and root not in sys.path:
        sys.path.insert(0, root)


def _safe(fn, default):
    try:
        return fn()
    except Exception:  # noqa: BLE001 — любая часть может отсутствовать (нет аудио/лица/речи)
        return default


def build_auto_metrics(engine, result, video_path, scenario):
    """Сопоставить вывод движка с calibration-метриками (формат observation:
    {label, value, state, domains?}). Каждый блок защищён: частичный сбой не
    валит обработку — кладём то, что удалось извлечь."""
    metrics = []

    activity = (result.get("metrics") or {}).get("overall_activity")
    if activity is not None:
        metrics.append({
            "label": "Overall movement activity (auto)",
            "value": f"{activity:.3f}",
            "state": CALIBRATION,
            "domains": ["movement"],
        })

    det, tot = result.get("detected_frames"), result.get("total_frames")
    if tot:
        metrics.append({
            "label": "Pose detected (auto)",
            "value": f"{det}/{tot} frames",
            "state": CALIBRATION,
        })

    # Аудио: кандидаты-оклики + распознанная речь → число обнаруженных зовов.
    audio = _safe(lambda: engine.analyze_audio(video_path), None)
    cand = list((audio or {}).get("candidates") or [])
    speech = _safe(lambda: engine.transcribe_calls(video_path), [])
    call_times = sorted({round(float(t), 3) for t in cand}
                        | {round(float(s.get("start_s", 0.0)), 3) for s in (speech or [])})
    if audio is not None:
        metrics.append({
            "label": "Name calls detected (auto)",
            "value": str(len(call_times)),
            "state": CALIBRATION,
            "domains": ["communication"],
        })

    # Латентность реакции — только для сценария «реакция на имя» и при наличии
    # сигнала поворота головы + хотя бы одного зова.
    if scenario == "name" and call_times:
        def _latency():
            import numpy as np
            times, signal = engine.read_head_turn(result["csv_path"])
            signal_s = engine.smooth_signal(signal)
            if np.all(np.isnan(signal_s)):
                return None
            return engine.measure_latencies(times, signal_s, call_times)
        lat = _safe(_latency, None)
        if lat is not None:
            metrics.append({
                "label": "Response to name (auto)",
                "value": f"{lat['responded']}/{lat['total']} calls",
                "state": CALIBRATION,
                "domains": ["attention", "communication"],
            })

    return metrics


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
    metrics = build_auto_metrics(engine, result, str(video_path), scenario)

    diag = {
        "fps": result.get("fps"),
        "total_frames": result.get("total_frames"),
        "detected_frames": result.get("detected_frames"),
        "scenario": scenario,
    }
    print(json.dumps({"auto_metrics": metrics, "diag": diag}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
