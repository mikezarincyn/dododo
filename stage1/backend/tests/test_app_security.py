"""TLS-инварианты приложения (P3): http→https редирект и HSTS-заголовок."""

from fastapi.testclient import TestClient

import stage1_config as cfg
from main import create_app


def test_health_ok_and_hsts_when_not_enforcing(sandbox):
    app = create_app(enforce_https=False)
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["region"] == cfg.PROVIDER_REGION
    assert body["video_retention"] == "NONE"
    assert body["biometric_analysis"] == "OFF"
    # HSTS присутствует.
    assert "strict-transport-security" in {k.lower() for k in r.headers}


def test_http_redirected_to_https_when_enforcing(sandbox):
    app = create_app(enforce_https=True)
    client = TestClient(app, follow_redirects=False)
    r = client.get("/api/health")  # TestClient ходит по http://testserver
    assert r.status_code in (307, 308)
    assert r.headers["location"].startswith("https://")


def test_forwarded_https_not_redirected(sandbox):
    """За TLS-терминирующим прокси (X-Forwarded-Proto: https) редиректа нет."""
    app = create_app(enforce_https=True)
    client = TestClient(app, follow_redirects=False)
    r = client.get("/api/health", headers={"X-Forwarded-Proto": "https"})
    assert r.status_code == 200
