"""Сквозной сценарий загрузки (Этап A): родитель загружает видео → submission
создаётся → появляется в очереди консоли → специалист смотрит и даёт feedback."""

import json

import pytest
from fastapi.testclient import TestClient

import stage1_config as cfg
from conftest import VALID_CONSENT  # noqa: F401 (используется неявно как пример)
from main import create_app

PLAINTEXT = b"VID-" + b"q" * 400
REVIEWER = {"tok_a": {"actor_id": "ot_a", "role": "reviewer"}}


@pytest.fixture
def client(sandbox, monkeypatch):
    monkeypatch.setenv(cfg.REVIEWERS_JSON_ENV, json.dumps(REVIEWER))
    import media_store
    return TestClient(create_app(enforce_https=False)), media_store.get_media_store()


def _bearer():
    return {"Authorization": "Bearer tok_a"}


def test_upload_creates_submission_and_appears_in_queue(client):
    c, _store = client
    # 1) согласие создаёт ребёнка-псевдонима и возвращает child_id
    cons = c.post(
        "/api/consent",
        json={"checked_ids": list(cfg.CONSENT_REQUIRED_CHECKBOX_IDS)},
    ).json()
    child_id = cons["child_id"]
    assert cons["display_code"].startswith("CH-")

    # 2) загрузка видео (multipart) привязана к тому же ребёнку
    r = c.post(
        "/api/submissions",
        files={"file": ("clip.mp4", PLAINTEXT, "video/mp4")},
        data={"child_id": child_id},
    )
    assert r.status_code == 200
    sid = r.json()["submission_id"]

    # 3) появилось в очереди консоли
    q = c.get("/api/console/queue", headers=_bearer()).json()["items"]
    item = next((i for i in q if i["submission_id"] == sid), None)
    assert item is not None
    assert item["display_code"].startswith("CH-")  # псевдоним, не имя

    # 4) специалист видит то же видео и оставляет feedback
    v = c.get(f"/api/console/video/{sid}", headers=_bearer())
    assert v.status_code == 200 and v.content == PLAINTEXT
    fb = c.post(f"/api/console/feedback/{sid}", json={"note": "calm, engaged"}, headers=_bearer())
    assert fb.status_code == 200


def test_upload_without_child_id_creates_pseudonym(client):
    c, store = client
    r = c.post("/api/submissions", files={"file": ("clip.webm", PLAINTEXT, "video/webm")})
    assert r.status_code == 200
    meta = store.read_submission(r.json()["submission_id"])
    assert meta["display_code"].startswith("CH-")  # без свободного ввода имени
    assert meta["state"] == "pending"
    assert meta["original_ext"] == ".webm"  # кламп по whitelist


def test_upload_clamps_dangerous_ext(client):
    c, store = client
    r = c.post("/api/submissions", files={"file": ("clip.exe", PLAINTEXT, "application/octet-stream")})
    assert store.read_submission(r.json()["submission_id"])["original_ext"] == ".mp4"


def test_upload_region_fail_closed(client, monkeypatch):
    c, _store = client
    monkeypatch.setattr(cfg, "PROVIDER_REGION", "us-east-1", raising=False)
    r = c.post("/api/submissions", files={"file": ("clip.mp4", PLAINTEXT, "video/mp4")})
    assert r.status_code == 503  # no US transfer
