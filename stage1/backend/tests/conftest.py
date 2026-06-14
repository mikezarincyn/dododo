"""Фикстуры тестов бэкенда Стадии 1.

Тесты НЕ трогают реальные data-каталоги: каждый тест получает изолированную
песочницу в tmp_path и monkeypatch'ит корни stage1_config + фиксированный ключ
шифрования. Зеркалит подход корневого tests/conftest.py.
"""

import base64
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))


@pytest.fixture
def sandbox(monkeypatch, tmp_path):
    import stage1_config as cfg
    import media_store

    data = tmp_path / "data"
    media = tmp_path / "media"

    monkeypatch.setattr(cfg, "STAGE1_DATA_ROOT", data, raising=False)
    monkeypatch.setattr(cfg, "CHILDREN_DIR", data / "children", raising=False)
    monkeypatch.setattr(cfg, "PARENTS_DIR", data / "parents", raising=False)
    monkeypatch.setattr(cfg, "CARE_LINKS_DIR", data / "care_links", raising=False)
    monkeypatch.setattr(cfg, "CONSENT_DIR", data / "consent", raising=False)
    monkeypatch.setattr(cfg, "SUBMISSIONS_DIR", data / "submissions", raising=False)
    monkeypatch.setattr(cfg, "AUDIT_LOG_PATH", data / "audit" / "access.log.jsonl", raising=False)
    monkeypatch.setattr(cfg, "EPHEMERAL_MEDIA_ROOT", media, raising=False)

    # Регион по умолчанию валиден (UK(London)). Тесты резидентности переопределяют.
    # Фиксированный ключ AES-256 — round-trip детерминирован (nonce всё равно случаен).
    monkeypatch.setenv(cfg.MEDIA_KEY_ENV, base64.b64encode(bytes(range(32))).decode())

    # Remux по умолчанию выключен в тестах: песочница не зависит от ffmpeg и
    # хранит байты как есть (как было до Этапа upload). Тест video_norm включает
    # его сам, чтобы проверить fail-open/очистку temp.
    monkeypatch.setattr(cfg, "REMUX_DISABLE", True, raising=False)

    # Сброс синглтона фасада, чтобы новый стор увидел пропатченные пути.
    monkeypatch.setattr(media_store, "_default_store", None, raising=False)

    return {"data": data, "media": media, "tmp_path": tmp_path}


@pytest.fixture
def store(sandbox):
    import media_store
    return media_store.get_media_store()


# Минимальная запись согласия для P3-тестов (полная схема — в P1).
VALID_CONSENT = {
    "consent_version": "p3-test",
    "agreed": True,
}
