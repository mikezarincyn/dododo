"""Этап G — внешний демо-гейт УДАЛЁН: единственная защита теперь внутренний
email/password-вход (сессия) на уровне эндпоинтов. Здесь проверяем, что:
  - внешнего basic-гейта больше нет (DODODO_DEMO_PASSWORD ни на что не влияет);
  - но БЕЗ валидной сессии ни один защищённый эндпоинт не отдаёт данные (401/403);
  - публичные эндпоинты (health, consent-config) доступны без креденшелов.
Снимаем внешний слой, НЕ ослабляя внутренний."""

import base64

from fastapi.testclient import TestClient

from main import create_app


def _client():
    return TestClient(create_app(enforce_https=False))


def test_no_external_gate_even_if_demo_password_set(sandbox, monkeypatch):
    # Раньше это включало внешний 401-гейт. Теперь переменная игнорируется —
    # публичные роуты доступны без HTTP Basic.
    monkeypatch.setenv("DODODO_DEMO_PASSWORD", "s3cret")
    c = _client()
    assert c.get("/api/consent/config").status_code == 200
    # И никакого WWW-Authenticate/Basic-челленджа на публичном роуте.
    assert "www-authenticate" not in {k.lower() for k in c.get("/api/consent/config").headers}


def test_public_endpoints_open(sandbox):
    c = _client()
    assert c.get("/api/health").status_code == 200
    assert c.get("/api/consent/config").status_code == 200


def test_protected_endpoints_need_a_session(sandbox, monkeypatch):
    """Без сессии/принципала защищённые данные не отдаются — внутренний слой держит."""
    monkeypatch.setenv("DODODO_DEMO_PASSWORD", "s3cret")  # не должно ничего открыть
    c = _client()
    protected = [
        "/api/parent/children",
        "/api/parent/submissions",
        "/api/ot/children",
        "/api/ot/queue",
        "/api/ot/video/" + "a" * 32,
        "/api/console/queue",
        "/api/admin/overview",
    ]
    for path in protected:
        r = c.get(path)
        assert r.status_code in (401, 403), f"{path} leaked data without a session: {r.status_code}"


def test_basic_credentials_do_not_authenticate_anymore(sandbox, monkeypatch):
    """Старый demo:dododo2026 в Basic больше НЕ даёт доступ к защищённым данным."""
    monkeypatch.setenv("DODODO_DEMO_PASSWORD", "dododo2026")
    c = _client()
    basic = base64.b64encode(b"demo:dododo2026").decode()
    r = c.get("/api/parent/children", headers={"Authorization": f"Basic {basic}"})
    assert r.status_code in (401, 403)
