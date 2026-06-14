"""Этап 1 — email/password аутентификация: регистрация/вход/выход, хеш пароля
(не открытый), изоляция по ролям через сессию, первый админ из env,
pending/deactivated не входят."""

import json

from fastapi.testclient import TestClient

import stage1_config as cfg
import users
from main import create_app

ALL_REQUIRED = list(cfg.CONSENT_REQUIRED_CHECKBOX_IDS)


def _app():
    return create_app(enforce_https=False)


def _reg(client, email, role="parent", pw="password123", name="Test", hcpc=None):
    return client.post("/api/auth/register", json={"email": email, "password": pw, "name": name, "role": role, "hcpc": hcpc})


# ---- register / login / logout ----

def test_parent_self_register_is_active_and_logged_in(sandbox):
    c = TestClient(_app())
    r = _reg(c, "mum@example.com", "parent")
    assert r.status_code == 200 and r.json()["pending"] is False
    me = c.get("/api/auth/me")
    assert me.status_code == 200 and me.json()["user"]["email"] == "mum@example.com"
    assert me.json()["user"]["role"] == "parent"
    assert "password_hash" not in me.json()["user"]  # never exposed


def test_ot_register_is_pending_and_cannot_login(sandbox):
    c = TestClient(_app())
    r = _reg(c, "ot@clinic.org", "ot")
    assert r.status_code == 200 and r.json()["pending"] is True
    assert c.get("/api/auth/me").status_code == 401  # not logged in while pending
    login = c.post("/api/auth/login", json={"email": "ot@clinic.org", "password": "password123"})
    assert login.status_code == 403  # pending approval


def test_login_then_logout(sandbox):
    app = _app()
    users.create_user("p@example.com", "password123", "parent", "P")
    c = TestClient(app)
    assert c.post("/api/auth/login", json={"email": "p@example.com", "password": "password123"}).status_code == 200
    assert c.get("/api/auth/me").status_code == 200
    assert c.post("/api/auth/logout").status_code == 200
    assert c.get("/api/auth/me").status_code == 401


def test_wrong_password_rejected(sandbox):
    users.create_user("p@example.com", "password123", "parent", "P")
    c = TestClient(_app())
    assert c.post("/api/auth/login", json={"email": "p@example.com", "password": "nope"}).status_code == 401


# ---- password hashing ----

def test_password_stored_only_as_scrypt_hash_never_plaintext(sandbox):
    u = users.create_user("p@example.com", "SuperSecret9", "parent", "P")
    raw = (cfg.USERS_DIR / f"{u['id']}.json").read_text(encoding="utf-8")
    assert "SuperSecret9" not in raw
    assert json.loads(raw)["password_hash"].startswith("scrypt$")
    assert users.verify_password("SuperSecret9", u["password_hash"]) is True
    assert users.verify_password("wrong", u["password_hash"]) is False


def test_short_password_rejected(sandbox):
    c = TestClient(_app())
    r = _reg(c, "x@example.com", "parent", pw="short")
    assert r.status_code == 422


def test_duplicate_email_rejected(sandbox):
    c = TestClient(_app())
    assert _reg(c, "dup@example.com", "parent").status_code == 200
    assert _reg(TestClient(_app()), "DUP@example.com", "parent").status_code == 409  # case-insensitive


# ---- role isolation via session ----

def test_parent_session_sees_only_own_children(sandbox):
    app = _app()
    ca, cb = TestClient(app), TestClient(app)
    _reg(ca, "a@example.com", "parent")
    _reg(cb, "b@example.com", "parent")
    # add a child each, using the session (no X-Parent-Id header)
    payload = {"first_name": "Mia", "birth_month": "2023-03", "checked_ids": ALL_REQUIRED}
    a_child = ca.post("/api/parent/children", json=payload).json()["child_id"]
    cb.post("/api/parent/children", json={**payload, "first_name": "Tom"})
    a_list = {c["child_id"] for c in ca.get("/api/parent/children").json()["children"]}
    b_list = {c["child_id"] for c in cb.get("/api/parent/children").json()["children"]}
    assert a_list == {a_child}
    assert a_child not in b_list and len(b_list) == 1


def test_deactivated_cannot_login(sandbox):
    u = users.create_user("p@example.com", "password123", "parent", "P")
    users.set_status(u["id"], "deactivated")
    c = TestClient(_app())
    assert c.post("/api/auth/login", json={"email": "p@example.com", "password": "password123"}).status_code == 403


# ---- first admin from env ----

def test_first_admin_seeded_from_env(sandbox, monkeypatch):
    monkeypatch.setenv("DODODO_ADMIN_EMAIL", "admin@dododo.app")
    monkeypatch.setenv("DODODO_ADMIN_PASSWORD", "admin-pass-123")
    c = TestClient(_app())  # ensure_seed_admin runs in create_app
    r = c.post("/api/auth/login", json={"email": "admin@dododo.app", "password": "admin-pass-123"})
    assert r.status_code == 200 and r.json()["user"]["role"] == "admin"
    # idempotent: a second create_app doesn't create a duplicate admin
    create_app(enforce_https=False)
    assert len(users.list_users("admin")) == 1


def test_ot_session_sees_child_only_via_care_link(sandbox, store):
    """OT logs in (session) → no care-link → no children; after admin link → sees it.
    Proves the OT account id is wired as the care-link reviewer_actor."""
    app = _app()
    # parent + child
    cp = TestClient(app)
    _reg(cp, "mum@example.com", "parent")
    child_id = cp.post("/api/parent/children", json={"first_name": "Mia", "birth_month": "2023-03", "checked_ids": ALL_REQUIRED}).json()["child_id"]
    # ot account, approved
    ot = users.create_user("ot@clinic.org", "password123", "ot", "Maya", status="active")
    cot = TestClient(app)
    cot.post("/api/auth/login", json={"email": "ot@clinic.org", "password": "password123"})
    assert cot.get("/api/ot/children").json()["children"] == []  # no link yet
    store.create_care_link(child_id, ot["id"], ot_name="Maya")  # admin/seeding links by OT user id
    codes = [c["display_code"] for c in cot.get("/api/ot/children").json()["children"]]
    assert len(codes) == 1
