"""App-wide демо-гейт (Этап A): один общий HTTP Basic поверх всех роутов.
Выключен, если пароль не задан (тесты/дев). Валидный консольный bearer тоже
проходит внешний гейт (роль проверяется на эндпоинте)."""

import base64
import json

from fastapi.testclient import TestClient

import stage1_config as cfg
from main import create_app


def _basic(user, pwd):
    token = base64.b64encode(f"{user}:{pwd}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def test_no_gate_when_password_unset(sandbox, monkeypatch):
    monkeypatch.delenv("DODODO_DEMO_PASSWORD", raising=False)
    c = TestClient(create_app(enforce_https=False))
    assert c.get("/api/consent/config").status_code == 200  # гейт выключен


def test_gate_blocks_without_credentials(sandbox, monkeypatch):
    monkeypatch.setenv("DODODO_DEMO_PASSWORD", "s3cret")
    c = TestClient(create_app(enforce_https=False))
    r = c.get("/api/consent/config")
    assert r.status_code == 401
    assert "Basic" in r.headers.get("www-authenticate", "")


def test_gate_allows_correct_basic(sandbox, monkeypatch):
    monkeypatch.setenv("DODODO_DEMO_PASSWORD", "s3cret")
    c = TestClient(create_app(enforce_https=False))
    assert c.get("/api/consent/config", headers=_basic("demo", "s3cret")).status_code == 200
    assert c.get("/api/consent/config", headers=_basic("demo", "wrong")).status_code == 401


def test_gate_allows_valid_reviewer_bearer(sandbox, monkeypatch):
    monkeypatch.setenv("DODODO_DEMO_PASSWORD", "s3cret")
    monkeypatch.setenv(cfg.REVIEWERS_JSON_ENV, json.dumps({"tok_a": {"actor_id": "ot_a", "role": "reviewer"}}))
    c = TestClient(create_app(enforce_https=False))
    assert c.get("/api/console/queue", headers={"Authorization": "Bearer tok_a"}).status_code == 200
    assert c.get("/api/console/queue", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_health_is_exempt_from_gate(sandbox, monkeypatch):
    monkeypatch.setenv("DODODO_DEMO_PASSWORD", "s3cret")
    c = TestClient(create_app(enforce_https=False))
    assert c.get("/api/health").status_code == 200  # healthcheck платформы
