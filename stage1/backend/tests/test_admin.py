"""Этап 2 — админка: создание/одобрение/деактивация людей, назначение и отзыв
care-link через API, корректные счётчики обзора."""

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


def test_admin_creates_parent_and_therapist(sandbox, monkeypatch):
    c = _app(monkeypatch)
    assert c.post("/api/admin/parents", json={"email": "p@x.com", "password": "password123", "name": "Pat"}, headers=ADMIN).status_code == 200
    assert c.post("/api/admin/therapists", json={"email": "ot@x.com", "password": "password123", "name": "Maya"}, headers=ADMIN).status_code == 200
    parents = c.get("/api/admin/parents", headers=ADMIN).json()["parents"]
    therapists = c.get("/api/admin/therapists", headers=ADMIN).json()["therapists"]
    assert [p["email"] for p in parents] == ["p@x.com"]
    assert [o["email"] for o in therapists] == ["ot@x.com"]
    assert "password_hash" not in parents[0]  # never exposed


def test_admin_approves_pending_ot_then_ot_can_login(sandbox, monkeypatch):
    c = _app(monkeypatch)
    # OT self-applies → pending
    c.post("/api/auth/register", json={"email": "ot@x.com", "password": "password123", "name": "Maya", "role": "ot"})
    ot = users.get_by_email("ot@x.com")
    assert ot["status"] == "pending"
    assert c.post("/api/auth/login", json={"email": "ot@x.com", "password": "password123"}).status_code == 403
    # admin approves
    r = c.post(f"/api/admin/users/{ot['id']}/status", json={"status": "active"}, headers=ADMIN)
    assert r.status_code == 200
    assert c.post("/api/auth/login", json={"email": "ot@x.com", "password": "password123"}).status_code == 200


def test_admin_deactivate_blocks_login(sandbox, monkeypatch):
    c = _app(monkeypatch)
    u = users.create_user("p@x.com", "password123", "parent", "P")
    assert c.post(f"/api/admin/users/{u['id']}/status", json={"status": "deactivated"}, headers=ADMIN).status_code == 200
    assert c.post("/api/auth/login", json={"email": "p@x.com", "password": "password123"}).status_code == 403


def test_assign_and_revoke_care_link_and_counts(sandbox, monkeypatch):
    c = _app(monkeypatch)
    parent = users.create_user("p@x.com", "password123", "parent", "Pat")
    ot = users.create_user("ot@x.com", "password123", "ot", "Maya")
    # parent creates a child (scoped by their account id via the header path)
    child = c.post("/api/parent/children", json={"first_name": "Mia", "birth_month": "2023-03", "checked_ids": ALL_REQUIRED},
                   headers={"X-Parent-Id": parent["id"]}).json()
    child_id = child["child_id"]

    # admin sees the child with parent name, unassigned
    rows = c.get("/api/admin/children", headers=ADMIN).json()["children"]
    assert len(rows) == 1 and rows[0]["parent_name"] == "Pat" and rows[0]["assigned"] == []

    # assign therapist → care-link active
    assert c.post("/api/admin/care-links", json={"child_id": child_id, "ot_id": ot["id"]}, headers=ADMIN).status_code == 200
    rows = c.get("/api/admin/children", headers=ADMIN).json()["children"]
    assert [a["actor_id"] for a in rows[0]["assigned"]] == [ot["id"]]
    ov = c.get("/api/admin/overview", headers=ADMIN).json()
    assert ov["parents"] == 1 and ov["therapists"] == 1 and ov["children"] == 1 and ov["active_care_links"] == 1

    # therapist child-count shows 1
    therapists = c.get("/api/admin/therapists", headers=ADMIN).json()["therapists"]
    assert therapists[0]["children"] == 1

    # revoke → unassigned, no active links
    assert c.post("/api/admin/care-links/revoke", json={"child_id": child_id, "ot_id": ot["id"]}, headers=ADMIN).status_code == 200
    rows = c.get("/api/admin/children", headers=ADMIN).json()["children"]
    assert rows[0]["assigned"] == []
    assert c.get("/api/admin/overview", headers=ADMIN).json()["active_care_links"] == 0


def test_admin_endpoints_require_admin(sandbox, monkeypatch):
    monkeypatch.setenv(cfg.REVIEWERS_JSON_ENV, json.dumps({"tok_ot": {"actor_id": "ot_a", "role": "reviewer"}}))
    c = TestClient(create_app(enforce_https=False))
    assert c.get("/api/admin/overview").status_code == 401  # no auth
    assert c.get("/api/admin/overview", headers={"Authorization": "Bearer tok_ot"}).status_code == 403  # reviewer, not admin


def test_assign_care_link_unknown_therapist_404(sandbox, monkeypatch):
    c = _app(monkeypatch)
    parent = users.create_user("p@x.com", "password123", "parent", "Pat")
    child = c.post("/api/parent/children", json={"first_name": "Mia", "birth_month": "2023-03", "checked_ids": ALL_REQUIRED},
                   headers={"X-Parent-Id": parent["id"]}).json()
    r = c.post("/api/admin/care-links", json={"child_id": child["child_id"], "ot_id": "0" * 32}, headers=ADMIN)
    assert r.status_code == 404
