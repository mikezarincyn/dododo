"""Этап 3 — саморегистрация родителя + заявка терапевта (сквозь HTTP)."""

import json

from fastapi.testclient import TestClient

import stage1_config as cfg
import users
from main import create_app

ALL_REQUIRED = list(cfg.CONSENT_REQUIRED_CHECKBOX_IDS)
ADMIN = {"Authorization": "Bearer tok_admin"}


def _app(monkeypatch):
    monkeypatch.setenv(cfg.REVIEWERS_JSON_ENV, json.dumps({"tok_admin": {"actor_id": "adm", "role": "admin"}}))
    return TestClient(create_app(enforce_https=False))


def test_parent_self_registers_active_and_sees_only_own(sandbox, monkeypatch):
    a = _app(monkeypatch)
    b = TestClient(create_app(enforce_https=False))
    assert a.post("/api/auth/register", json={"email": "a@x.com", "password": "password123", "name": "A", "role": "parent"}).json()["pending"] is False
    b.post("/api/auth/register", json={"email": "b@x.com", "password": "password123", "name": "B", "role": "parent"})
    a_child = a.post("/api/parent/children", json={"first_name": "Mia", "birth_month": "2023-03", "checked_ids": ALL_REQUIRED}).json()["child_id"]
    b.post("/api/parent/children", json={"first_name": "Tom", "birth_month": "2022-01", "checked_ids": ALL_REQUIRED})
    a_ids = {c["child_id"] for c in a.get("/api/parent/children").json()["children"]}
    assert a_ids == {a_child}  # parent A sees only their own


def test_ot_application_pending_then_approved_can_login(sandbox, monkeypatch):
    c = _app(monkeypatch)
    r = c.post("/api/auth/register", json={"email": "ot@x.com", "password": "password123", "name": "Maya", "role": "ot", "hcpc": "PH123"})
    assert r.status_code == 200 and r.json()["pending"] is True
    # cannot log in while pending
    assert c.post("/api/auth/login", json={"email": "ot@x.com", "password": "password123"}).status_code == 403
    ot = users.get_by_email("ot@x.com")
    assert ot["hcpc"] == "PH123"
    # admin approves → can log in
    c.post(f"/api/admin/users/{ot['id']}/status", json={"status": "active"}, headers=ADMIN)
    assert c.post("/api/auth/login", json={"email": "ot@x.com", "password": "password123"}).status_code == 200


def test_register_rejects_admin_role_via_public_endpoint(sandbox, monkeypatch):
    c = _app(monkeypatch)
    # public registration may only create parent or ot — never admin
    assert c.post("/api/auth/register", json={"email": "x@x.com", "password": "password123", "name": "X", "role": "admin"}).status_code == 422
