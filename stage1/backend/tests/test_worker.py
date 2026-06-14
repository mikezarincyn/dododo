"""Этап A — асинхронный воркер БЕЗ ML: переходы состояний и сторожа no-retention.

queued → processing → ready → (разметка ОТ) → reviewed; ветка failed.
Видео живёт ровно до конца обработки+разметки; стирается при failed/abandon/reclaim.
Реальный движок появится в Этапе B (здесь job — заглушка / искусственный сбой)."""

from datetime import datetime, timedelta, timezone

import pytest
from conftest import VALID_CONSENT

import stage1_config as cfg
import worker

PLAINTEXT = b"VID-" + b"w" * 300


def _new(store):
    return store.put(PLAINTEXT, dict(VALID_CONSENT))


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
