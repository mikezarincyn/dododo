"""Этап 4 — сброс пароля: старый пароль перестаёт работать, новый работает;
токен одноразовый/истекающий; сессии инвалидируются."""

from fastapi.testclient import TestClient

import users
from main import create_app


def _c():
    return TestClient(create_app(enforce_https=False))


def test_reset_flow_old_fails_new_works(sandbox):
    users.create_user("p@x.com", "oldpassword1", "parent", "P")
    c = _c()
    req = c.post("/api/auth/reset-request", json={"email": "p@x.com"}).json()
    assert "token" in req  # demo surfaces the link/token
    assert c.post("/api/auth/reset", json={"token": req["token"], "new_password": "newpassword2"}).status_code == 200
    # old password no longer works; new one does
    assert c.post("/api/auth/login", json={"email": "p@x.com", "password": "oldpassword1"}).status_code == 401
    assert c.post("/api/auth/login", json={"email": "p@x.com", "password": "newpassword2"}).status_code == 200


def test_reset_token_is_single_use(sandbox):
    users.create_user("p@x.com", "oldpassword1", "parent", "P")
    c = _c()
    token = c.post("/api/auth/reset-request", json={"email": "p@x.com"}).json()["token"]
    assert c.post("/api/auth/reset", json={"token": token, "new_password": "newpassword2"}).status_code == 200
    # reusing the same token fails
    assert c.post("/api/auth/reset", json={"token": token, "new_password": "another3pass"}).status_code == 400


def test_reset_request_unknown_email_is_ok_without_token(sandbox):
    c = _c()
    body = c.post("/api/auth/reset-request", json={"email": "nobody@x.com"}).json()
    assert body == {"ok": True}  # no enumeration, no token


def test_reset_rejects_short_password(sandbox):
    users.create_user("p@x.com", "oldpassword1", "parent", "P")
    c = _c()
    token = c.post("/api/auth/reset-request", json={"email": "p@x.com"}).json()["token"]
    assert c.post("/api/auth/reset", json={"token": token, "new_password": "short"}).status_code == 422
