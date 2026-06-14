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
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import media_store
import stage1_config as cfg

log = logging.getLogger("dododo.worker")

_RUNNER = str(Path(__file__).resolve().parent / "worker_runner.py")


def fake_job(store, submission_id: str) -> None:
    """Этап A: без движка. Реальная обработка приходит в Этапе B (worker_runner)."""
    return None


def engine_job(store, submission_id: str) -> list:
    """Этап B: прогнать клип корневым движком в подпроцессе и вернуть
    НЕПОДТВЕРЖДЁННЫЕ (calibration) авто-метрики.

    no-retention: расшифрованный клип и ВСЕ производные движка (overlay, csv,
    meta, wav, whisper-temp) живут в одном workdir под /tmp и стираются в finally.
    Сам зашифрованный клип НЕ трогаем — он нужен ОТ для просмотра; стирается
    после разметки (mark_reviewed_and_purge) или при сбое (mark_failed)."""
    meta = store.read_submission(submission_id)
    scenario = meta.get("scenario") or "name"
    payload = store.decrypt_for_worker(submission_id)
    ext = payload.get("original_ext") or ".mp4"

    workdir = Path(tempfile.mkdtemp(prefix="dododo_proc_"))
    try:
        video_path = workdir / f"input{ext}"
        video_path.write_bytes(payload["video_bytes"])
        # Освобождаем расшифрованные байты из памяти как можно раньше.
        del payload

        env = dict(os.environ)
        env["DODODO_ENGINE_ROOT"] = cfg.ENGINE_ROOT
        # Любые временные файлы движка (wav, whisper) — внутрь workdir.
        env["TMPDIR"] = env["TEMP"] = env["TMP"] = str(workdir)

        proc = subprocess.run(
            [sys.executable, _RUNNER, str(video_path), scenario, str(workdir)],
            capture_output=True, text=True,
            timeout=cfg.WORKER_JOB_TIMEOUT_SEC, env=env,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"worker_runner rc={proc.returncode}: {proc.stderr[-500:]}")
        line = (proc.stdout or "").strip().splitlines()[-1] if proc.stdout.strip() else "{}"
        return json.loads(line).get("auto_metrics", [])
    finally:
        # no-retention: стереть расшифрованный клип + все деривативы движка.
        shutil.rmtree(workdir, ignore_errors=True)


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


def default_job():
    """Реальный движок в проде (Этап B), заглушка — когда движок выключен."""
    return engine_job if cfg.WORKER_USE_ENGINE else fake_job


async def worker_loop(*, job=None, poll_seconds: int | None = None) -> None:
    """Фоновый цикл: периодически чистит сторожами и сливает очередь. CPU-bound
    job (Этап B) исполняется в треде, чтобы не блокировать event loop."""
    poll = poll_seconds or cfg.WORKER_POLL_SECONDS
    if job is None:
        job = default_job()
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
