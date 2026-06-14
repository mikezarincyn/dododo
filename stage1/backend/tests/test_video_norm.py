"""Тесты серверной нормализации (remux): fail-open, очистка temp, no-retention."""

import glob
import os
import tempfile

import stage1_config as cfg
import video_norm


def _norm_temp_dirs():
    return set(glob.glob(os.path.join(tempfile.gettempdir(), "dododo_norm_*")))


def test_disabled_returns_original(monkeypatch):
    monkeypatch.setattr(cfg, "REMUX_DISABLE", True, raising=False)
    out = video_norm.normalize(b"RAWBYTES", ".mp4")
    assert out["bytes"] == b"RAWBYTES"
    assert out["normalized"] is False
    assert out["mode"] == "disabled"


def test_fail_open_on_invalid_input_and_no_temp_leak(monkeypatch):
    """С включённым remux, но на невалидных байтах (или без ffmpeg) — оригинал
    возвращается, временные каталоги не остаются (no-retention)."""
    monkeypatch.setattr(cfg, "REMUX_DISABLE", False, raising=False)
    before = _norm_temp_dirs()
    out = video_norm.normalize(b"NOT-A-REAL-VIDEO" * 10, ".mp4")
    after = _norm_temp_dirs()
    # Garbage in → original bytes back (never raises, never corrupts the upload).
    assert out["bytes"] == b"NOT-A-REAL-VIDEO" * 10
    assert out["normalized"] is False
    assert out["mode"] in {"skip", "failed", "error"}  # skip=no ffmpeg, failed=ffmpeg rejected
    # No leftover temp working dirs.
    assert after - before == set()


def test_put_records_normalize_metadata_and_keeps_no_retention(store, sandbox, monkeypatch):
    """put() с remux (на фейковых байтах → fallback) всё равно хранит, помечает
    normalized, и no-retention держится: видео эфемерно и стирается при разметке."""
    monkeypatch.setattr(cfg, "REMUX_DISABLE", False, raising=False)
    sid = store.put(b"VIDEO-BYTES" + b"x" * 50, {"source": "test"}, original_ext=".mp4")
    meta = store.read_submission(sid)
    assert meta["normalized"] is False  # fake bytes → fallback (no ffmpeg success)
    assert "normalize_mode" in meta
    assert store._ephemeral_dir(sid).exists()  # encrypted video present pre-review
    # No-retention: purge after review deletes the bytes, submission tombstone stays.
    store.mark_reviewed_and_purge(sid)
    meta_purged = store.read_submission(sid)
    assert meta_purged["video_purged"] is True
    assert not store._ephemeral_dir(sid).exists()


def test_ffmpeg_available_is_boolean():
    assert isinstance(video_norm.ffmpeg_available(), bool)
