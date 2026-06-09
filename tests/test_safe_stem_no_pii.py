"""Замок SEC-01/IMP-04: оригинальное имя видеофайла НЕ должно попадать в
хранимые артефакты (пути session-папки, meta.json), даже если оно содержит PII.

Тестирует:
- _clamp_video_suffix корректно нормализует расширения по whitelist
- process_video в meta.json пишет только source_sha256/original_ext/size_bytes,
  без поля input_file
- save_session_files сохраняет файлы с префиксом <child_id>_<session_id>_
  и НЕ использует оригинальный stem
- BUG-02: расширение .exe → .mp4
"""

import json
import shutil
from pathlib import Path

import pytest


def test_clamp_video_suffix_whitelist():
    """BUG-02: расширения вне whitelist клампятся в .mp4."""
    from app import _clamp_video_suffix
    # Разрешённые — возвращаются как есть (нижним регистром)
    assert _clamp_video_suffix("video.mp4") == ".mp4"
    assert _clamp_video_suffix("VIDEO.MOV") == ".mov"
    assert _clamp_video_suffix("clip.AVI") == ".avi"
    assert _clamp_video_suffix("clip.mkv") == ".mkv"
    # Опасные/незнакомые расширения → .mp4
    # Path("video.mp4.exe").suffix → ".exe" (берётся ПОСЛЕДНИЙ компонент)
    # → не в whitelist → клампим в .mp4
    assert _clamp_video_suffix("video.mp4.exe") == ".mp4"
    assert _clamp_video_suffix("video.exe") == ".mp4"
    assert _clamp_video_suffix("clip.weird") == ".mp4"
    # Файл без расширения тоже → .mp4
    assert _clamp_video_suffix("noext") == ".mp4"


def test_meta_json_no_input_file_field(sandbox, pii_named_video):
    """IMP-04: meta.json не должен содержать поле input_file.
    Вместо него — source_sha256 + original_ext + size_bytes."""
    from engine import process_video

    work = sandbox["tmp_path"] / "work"
    work.mkdir(exist_ok=True)
    out_v = work / "skel.mp4"
    out_c = work / "lm.csv"
    out_m = work / "meta.json"

    process_video(pii_named_video, out_v, out_c, out_m)

    meta = json.loads(out_m.read_text())
    assert "input_file" not in meta, f"input_file всё ещё в meta: {meta.get('input_file')}"
    # Заменители провенанса должны быть на месте
    assert "source_sha256" in meta
    assert "original_ext" in meta
    assert "size_bytes" in meta
    # sha256 — это 64 hex символа
    assert len(meta["source_sha256"]) == 64
    assert all(c in "0123456789abcdef" for c in meta["source_sha256"])
    assert meta["original_ext"] in {".mp4", ".mov", ".avi", ".mkv"}
    assert isinstance(meta["size_bytes"], int) and meta["size_bytes"] > 0


def test_save_session_files_no_original_name(sandbox, pii_named_video):
    """SEC-01: ни имя файла в session-папке, ни содержимое meta.json
    не должны содержать оригинальное PII-имя."""
    import storage
    from engine import process_video

    # Обработка
    work = sandbox["work_root"] / "abc"
    work.mkdir(parents=True, exist_ok=True)
    input_copy = work / f"input{pii_named_video.suffix.lower()}"
    shutil.copy2(pii_named_video, input_copy)
    out_v = work / "skeleton.mp4"
    out_c = work / "landmarks.csv"
    out_m = work / "meta.json"
    process_video(input_copy, out_v, out_c, out_m)

    # Сохранение
    cid, _ = storage.create_child()
    sid = storage.create_session(cid)
    storage.save_session_files(
        cid, sid,
        video_src=out_v, csv_src=out_c, meta_src=out_m,
        input_src=input_copy,
    )

    session_dir = Path(storage.session_dir(cid, sid))
    pii_marker = "natasha"  # из PII-имени в нашем фикстуре

    # 1) ни одно имя файла в session-папке не содержит маркера
    for f in session_dir.iterdir():
        assert pii_marker not in f.name.lower(), f"PII в имени файла: {f.name}"

    # 2) ни один файл (text-based) в session-папке не содержит маркера
    for f in session_dir.iterdir():
        if f.suffix in {".json", ".csv"}:
            content = f.read_text(errors="replace").lower()
            assert pii_marker not in content, f"PII в содержимом {f.name}"


def test_safe_stem_function_removed():
    """Фаза 1 удалила _safe_stem — мёртвый код после нового тракта."""
    import app
    assert not hasattr(app, "_safe_stem"), "_safe_stem должен быть удалён"
