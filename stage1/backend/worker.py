"""Фоновый воркер обработки видео (in-process, общий /tmp с веб-процессом).

Этап A — каркас БЕЗ ML: «job» — заглушка (видео мгновенно становится ready).
Этап B подменит job на реальный прогон корневого engine.py (worker_runner).

Жизненный цикл (через фасад MediaStore — воркер сам ФС не трогает):
    queued --claim--> processing --job ok--> ready
                                 --job err-> failed (видео стёрто)

Сторожа no-retention, исполняются в том же цикле:
  - reclaim_stuck_processing: зависшие в processing (воркер умер/редеплой) → failed+стереть;
  - purge_abandoned_videos:   непросмотренные клипы старше TTL → стереть.

Видео НЕ хранится: на ready клип ещё жив (ОТ должен посмотреть), стирается после
разметки (save_observation → mark_reviewed_and_purge) или при failed/abandon.
"""

import asyncio
import logging

import media_store
import stage1_config as cfg

log = logging.getLogger("dododo.worker")


def fake_job(store, submission_id: str) -> None:
    """Этап A: без движка. Реальная обработка приходит в Этапе B (worker_runner)."""
    return None


def process_submission(store, submission_id: str, *, job=None) -> str:
    """Прогнать одну запись. Возвращает итоговый state ('ready' | 'failed').

    Запись уже должна быть в processing (claim сделан вызывающим). На успехе —
    ready (клип сохраняется для ОТ). На ошибке — failed (клип стирается)."""
    job = job or fake_job
    try:
        auto_metrics = job(store, submission_id)
        store.mark_ready(submission_id, auto_metrics=auto_metrics)
        return cfg.SUB_STATE_READY
    except Exception as exc:  # noqa: BLE001 — любая ошибка обработки → failed+purge
        log.exception("processing failed for submission %s", submission_id)
        try:
            store.mark_failed(submission_id, reason=type(exc).__name__)
        except Exception:  # noqa: BLE001
            log.exception("could not mark %s failed", submission_id)
        return cfg.SUB_STATE_FAILED


def run_pending(store=None, *, job=None, max_items: int = 1000) -> int:
    """Слить очередь: забрать и обработать все queued записи. Возвращает число
    обработанных. Используется фоновым циклом и тестами (синхронно, детерминированно)."""
    store = store or media_store.get_media_store()
    processed = 0
    for submission_id in store.list_queued_ids():
        if processed >= max_items:
            break
        if not store.claim_for_processing(submission_id):
            continue  # забрана/стёрта между листингом и claim
        process_submission(store, submission_id, job=job)
        processed += 1
    return processed


def sweep(store=None) -> dict:
    """Сторожа no-retention: вернуть зависшие в processing и вычистить брошенные."""
    store = store or media_store.get_media_store()
    reclaimed = store.reclaim_stuck_processing()
    abandoned = store.purge_abandoned_videos()
    return {"reclaimed": reclaimed, "abandoned": abandoned}


async def worker_loop(*, job=None, poll_seconds: int | None = None) -> None:
    """Фоновый цикл: периодически чистит сторожами и сливает очередь. CPU-bound
    job (Этап B) исполняется в треде, чтобы не блокировать event loop."""
    poll = poll_seconds or cfg.WORKER_POLL_SECONDS
    log.info("video worker started (poll=%ss)", poll)
    try:
        while True:
            try:
                await asyncio.to_thread(sweep)
                await asyncio.to_thread(run_pending, None, job=job)
            except Exception:  # noqa: BLE001 — цикл не должен падать целиком
                log.exception("worker iteration failed")
            await asyncio.sleep(poll)
    except asyncio.CancelledError:
        log.info("video worker stopped")
        raise
