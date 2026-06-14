"""Этап A — асинхронный воркер БЕЗ ML: переходы состояний и сторожа no-retention.

queued → processing → ready → (разметка ОТ) → reviewed; ветка failed.
Видео живёт ровно до конца обработки+разметки; стирается при failed/abandon/reclaim.
Реальный движок появится в Этапе B (здесь job — заглушка / искусственный сбой)."""

import json
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from conftest import VALID_CONSENT

import stage1_config as cfg
import worker

PLAINTEXT = b"VID-" + b"w" * 300


def _new(store):
    return store.put(PLAINTEXT, dict(VALID_CONSENT))


FAKE_BUNDLE = {"version": 1, "series": {"head_turn": {"t": [0.0], "v": [0.1]}}, "events": {"calls": [1.2]}}


def _fake_runner(monkeypatch, *, returncode=0, auto_metrics=None, capture=None,
                 coverage_pct=80.0, write_artifacts=True):
    """Подменить subprocess.run воркера: имитируем worker_runner без ML — пишет
    overlay.mp4 + bundle.json в workdir и печатает stdout с diag.coverage_pct."""
    payload = {"auto_metrics": auto_metrics or [], "diag": {"coverage_pct": coverage_pct}}

    def fake_run(cmd, **kwargs):
        workdir = Path(cmd[4])
        if capture is not None:
            capture["video_path"] = cmd[2]
            capture["workdir"] = cmd[4]
        if returncode == 0 and write_artifacts:
            (workdir / "overlay.mp4").write_bytes(b"OVERLAY-MP4-BYTES")
            (workdir / "bundle.json").write_text(json.dumps(FAKE_BUNDLE), encoding="utf-8")
        out = json.dumps(payload) if returncode == 0 else ""
        return types.SimpleNamespace(returncode=returncode, stdout=out, stderr="boom")

    monkeypatch.setattr(worker.subprocess, "run", fake_run)


# ---------- happy path: queued → processing → ready ----------

def test_upload_is_queued_and_invisible_until_processed(store):
    sid = _new(store)
    assert store.read_submission(sid)["state"] == cfg.SUB_STATE_QUEUED
    # queued клип НЕ доступен для разметки (ОТ видит только ready/in_review).
    assert sid not in {m["submission_id"] for m in store.list_pending_submissions() if m["state"] in cfg.SUB_STATES_AWAITING_REVIEW}
    assert store.list_queued_ids() == [sid]

    n = worker.run_pending(store)
    assert n == 1
    meta = store.read_submission(sid)
    assert meta["state"] == cfg.SUB_STATE_READY
    assert "processed_at" in meta
    # Видео сохранено для ОТ — на ready НЕ стираем.
    assert store._ephemeral_dir(sid).exists()
    assert meta["video_purged"] is False


def test_claim_is_idempotent(store):
    sid = _new(store)
    assert store.claim_for_processing(sid) is True
    assert store.read_submission(sid)["state"] == cfg.SUB_STATE_PROCESSING
    # Повторный claim уже processing-записи не проходит.
    assert store.claim_for_processing(sid) is False
    # run_pending теперь ничего не находит (нет queued).
    assert store.list_queued_ids() == []
    assert worker.run_pending(store) == 0


def test_ready_then_review_purges_video(store):
    sid = _new(store)
    worker.run_pending(store)
    # ОТ открывает (in_review) и размечает → видео стёрто, наблюдение сохранено.
    store.get_for_review(sid, actor="ot_a")
    assert store.read_submission(sid)["state"] == cfg.SUB_STATE_IN_REVIEW
    store.mark_reviewed_and_purge(sid)
    meta = store.read_submission(sid)
    assert meta["state"] == cfg.SUB_STATE_REVIEWED and meta["video_purged"] is True
    assert not store._ephemeral_dir(sid).exists()


# ---------- failure path: job raises → failed + purge ----------

def test_failed_processing_purges_video(store):
    sid = _new(store)

    def boom(_store, _sid):
        raise RuntimeError("engine exploded")

    n = worker.run_pending(store, job=boom)
    assert n == 1
    meta = store.read_submission(sid)
    assert meta["state"] == cfg.SUB_STATE_FAILED
    assert meta["video_purged"] is True
    assert meta["failed_reason"] == "RuntimeError"
    # no-retention: байты стёрты после сбоя (родитель перезаливает).
    assert not store._ephemeral_dir(sid).exists()
    # failed-клип не виден ОТ.
    assert sid not in {m["submission_id"] for m in store.list_pending_submissions()}


# ---------- watchdog: stuck-in-processing reclaim ----------

def test_reclaim_stuck_processing_marks_failed_and_purges(store):
    sid = _new(store)
    assert store.claim_for_processing(sid) is True  # processing, worker then "dies"
    assert store._ephemeral_dir(sid).exists()
    # Слишком рано — ничего не вычищаем.
    assert store.reclaim_stuck_processing(now=datetime.now(timezone.utc)) == 0
    # Через MAX_PROCESSING_MINUTES — запись возвращается в failed + видео стёрто.
    later = datetime.now(timezone.utc) + timedelta(minutes=cfg.MAX_PROCESSING_MINUTES + 1)
    assert store.reclaim_stuck_processing(now=later) == 1
    meta = store.read_submission(sid)
    assert meta["state"] == cfg.SUB_STATE_FAILED and meta["video_purged"] is True
    assert not store._ephemeral_dir(sid).exists()


# ---------- redeploy-loss path: /tmp wiped → re-upload (known debt) ----------

def test_redeploy_loss_then_reupload(store):
    """Редеплой во время обработки стирает эфемерный /tmp. Запись зависает в
    processing; сторож переводит её в failed → родитель перезаливает заново."""
    sid = _new(store)
    store.claim_for_processing(sid)
    # Симулируем потерю /tmp при редеплое.
    store._purge_video_bytes(sid)
    assert not store._ephemeral_dir(sid).exists()
    later = datetime.now(timezone.utc) + timedelta(minutes=cfg.MAX_PROCESSING_MINUTES + 1)
    assert store.reclaim_stuck_processing(now=later) == 1
    assert store.read_submission(sid)["state"] == cfg.SUB_STATE_FAILED
    # Перезалив — новая, независимая запись, проходит весь путь.
    sid2 = _new(store)
    assert sid2 != sid
    worker.run_pending(store)
    assert store.read_submission(sid2)["state"] == cfg.SUB_STATE_READY


# ---------- sweep convenience ----------

def test_sweep_reports_counts(store):
    sid = _new(store)
    store.claim_for_processing(sid)  # fresh processing → not stuck yet
    out = worker.sweep(store)
    assert set(out.keys()) == {"reclaimed", "abandoned"}
    assert out["reclaimed"] == 0 and out["abandoned"] == 0


@pytest.mark.parametrize("state_attr", ["SUB_STATE_QUEUED", "SUB_STATE_READY", "SUB_STATE_FAILED"])
def test_state_constants_exist(state_attr):
    assert isinstance(getattr(cfg, state_attr), str)


# ---------- Этап B: engine_job (движок мокнут — оркестрация + no-retention) ----------

AUTO = [
    {"label": "Overall movement activity (auto)", "value": "0.123", "state": "calibration", "domains": ["movement"]},
    {"label": "Response to name (auto)", "value": "1/2 calls", "state": "calibration", "domains": ["attention"]},
]


def test_engine_job_returns_metrics_and_cleans_workdir(store, monkeypatch):
    sid = _new(store)
    cap = {}
    _fake_runner(monkeypatch, auto_metrics=AUTO, capture=cap)

    result = worker.engine_job(store, sid)
    assert result["auto_metrics"] == AUTO
    assert result["recording_quality"] == "good"  # coverage 80% → good
    # Плейн-деривативы движка стёрты; зашифрованный клип + пакет + overlay остались.
    assert not Path(cap["workdir"]).exists()
    edir = store._ephemeral_dir(sid)
    assert (edir / "video.enc").exists()
    assert (edir / "analysis.enc").exists()
    assert (edir / "overlay.enc").exists()
    assert store.read_submission(sid).get("video_purged") is False


def test_analysis_bundle_and_overlay_round_trip(store, monkeypatch):
    sid = _new(store)
    _fake_runner(monkeypatch, auto_metrics=AUTO)
    worker.engine_job(store, sid)
    # Пакет расшифровывается обратно в тот же dict; overlay — те же байты.
    assert store.read_analysis(sid) == FAKE_BUNDLE
    assert store.read_overlay(sid) == b"OVERLAY-MP4-BYTES"


def test_bundle_and_overlay_purged_with_clip(store, monkeypatch):
    sid = _new(store)
    _fake_runner(monkeypatch, auto_metrics=AUTO)
    worker.run_pending(store, job=worker.engine_job)
    assert store.read_submission(sid)["state"] == cfg.SUB_STATE_READY
    # После разметки клип + пакет + overlay стёрты ВМЕСТЕ (no-retention).
    store.mark_reviewed_and_purge(sid)
    assert not store._ephemeral_dir(sid).exists()
    import pytest as _pt
    from media_store import VideoUnavailableError
    with _pt.raises(VideoUnavailableError):
        store.read_analysis(sid)
    with _pt.raises(VideoUnavailableError):
        store.read_overlay(sid)


def test_engine_job_via_run_pending_marks_ready_with_auto_metrics(store, monkeypatch):
    sid = _new(store)
    _fake_runner(monkeypatch, auto_metrics=AUTO, coverage_pct=20.0)

    n = worker.run_pending(store, job=worker.engine_job)
    assert n == 1
    meta = store.read_submission(sid)
    assert meta["state"] == cfg.SUB_STATE_READY
    # Авто-метрики легли на submission НЕПОДТВЕРЖДЁННЫМИ (calibration).
    assert meta["auto_metrics"] == AUTO
    assert all(m["state"] == cfg.METRIC_STATE_CALIBRATION for m in meta["auto_metrics"])
    # Грубая корзина качества съёмки для родителя (20% → low).
    assert meta["recording_quality"] == "low"


def test_engine_job_failure_purges_video(store, monkeypatch):
    sid = _new(store)
    _fake_runner(monkeypatch, returncode=1)

    n = worker.run_pending(store, job=worker.engine_job)
    assert n == 1
    meta = store.read_submission(sid)
    assert meta["state"] == cfg.SUB_STATE_FAILED and meta["video_purged"] is True
    assert not store._ephemeral_dir(sid).exists()


def test_default_job_respects_use_engine_flag(monkeypatch):
    monkeypatch.setattr(cfg, "WORKER_USE_ENGINE", True, raising=False)
    assert worker.default_job() is worker.engine_job
    monkeypatch.setattr(cfg, "WORKER_USE_ENGINE", False, raising=False)
    assert worker.default_job() is worker.fake_job
