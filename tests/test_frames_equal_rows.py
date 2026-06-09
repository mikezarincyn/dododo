"""Замок TODO-3: после process_video число кадров muxed-видео ОБЯЗАНО совпадать
с числом строк в landmarks.csv. Это защита от возврата `-shortest` (когда аудио
обрезает видео по короткому потоку, и кадры теряются).

Этот замок ПОЙМАЛ реальный дефект в Step 5 — теперь он стоит постоянно.
"""

import csv
import subprocess
from pathlib import Path

import pytest


def _muxed_frame_count(video_path):
    """ffprobe -count_frames для точного счёта кадров на выходе."""
    r = subprocess.run(
        [
            "ffprobe", "-v", "error", "-count_frames",
            "-select_streams", "v:0",
            "-show_entries", "stream=nb_read_frames",
            "-of", "default=nokey=1:noprint_wrappers=1",
            str(video_path),
        ],
        capture_output=True, text=True,
    )
    return int(r.stdout.strip())


def _csv_row_count(csv_path):
    with open(csv_path) as f:
        next(csv.reader(f))  # header
        return sum(1 for _ in csv.reader(f))


def test_process_video_frames_equal_rows(sandbox, pii_named_video):
    """frames(muxed video) == rows(csv) == total_frames из API."""
    from engine import process_video

    work = sandbox["work_root"] / "frames-eq-rows"
    work.mkdir(parents=True, exist_ok=True)
    out_v = work / "skeleton.mp4"
    out_c = work / "landmarks.csv"
    out_m = work / "meta.json"

    result = process_video(pii_named_video, out_v, out_c, out_m)

    csv_rows = _csv_row_count(out_c)
    video_frames = _muxed_frame_count(out_v)

    assert csv_rows == result["total_frames"], (
        f"CSV rows ({csv_rows}) != API total_frames ({result['total_frames']})"
    )
    assert video_frames == result["total_frames"], (
        f"video frames ({video_frames}) != API total_frames ({result['total_frames']}). "
        f"Это может означать возврат -shortest в ffmpeg-моксе."
    )
    assert video_frames == csv_rows, (
        f"video frames ({video_frames}) != CSV rows ({csv_rows})"
    )


def test_no_shortest_flag_in_ffmpeg_cmd():
    """Дополнительная статическая защита: исходник engine.py не должен содержать -shortest
    в ffmpeg-команде мокса. Грубая, но эффективная — если кто-то вернёт флаг,
    тест провалится до того, как сломается прод."""
    src = Path(__file__).parent.parent / "engine.py"
    text = src.read_text()
    # Ищем строку списка-cmd внутри функции process_video — после "ffmpeg", "-y", "-i"
    # Берём конкретный участок: блок ffmpeg-мокса.
    # Проверяем, что нет элемента "-shortest" в массиве команды.
    # Грубое правило: подстрока '"-shortest"' не должна встречаться вообще.
    assert '"-shortest"' not in text, (
        "флаг -shortest вернулся в ffmpeg-команду — это режет видео по короткому "
        "(аудио) потоку и ломает frames==rows. См. Step 5 / TODO-3."
    )
