"""Тесты роли «родитель» (Этап B): изоляция по parent_id, генерация
display_code без утечки имени в проф-данные, согласие, приглашения."""

import json

from fastapi.testclient import TestClient

import stage1_config as cfg
from main import create_app

ALL_REQUIRED = list(cfg.CONSENT_REQUIRED_CHECKBOX_IDS)
PA = "a" * 32  # parent A (uuid4 hex-подобный)
PB = "b" * 32  # parent B


def _client():
    return TestClient(create_app(enforce_https=False))


def _add_child(client, parent_id, first_name="Nora", month="March 2023", checked=None):
    return client.post(
        "/api/parent/children",
        json={"first_name": first_name, "birth_month": month, "checked_ids": checked or ALL_REQUIRED},
        headers={"X-Parent-Id": parent_id},
    )


def test_parent_sees_only_own_children(sandbox):
    client = _client()
    a = _add_child(client, PA, first_name="Mia")
    b = _add_child(client, PB, first_name="Tom")
    assert a.status_code == 200 and b.status_code == 200
    a_id = a.json()["child_id"]
    b_id = b.json()["child_id"]

    a_list = client.get("/api/parent/children", headers={"X-Parent-Id": PA}).json()["children"]
    b_list = client.get("/api/parent/children", headers={"X-Parent-Id": PB}).json()["children"]
    a_ids = {c["child_id"] for c in a_list}
    b_ids = {c["child_id"] for c in b_list}
    assert a_ids == {a_id}
    assert b_ids == {b_id}
    # Родитель A не видит ребёнка родителя B и наоборот.
    assert b_id not in a_ids
    assert a_id not in b_ids


def test_create_child_generates_code_and_hides_name_from_professional_data(sandbox):
    client = _client()
    r = _add_child(client, PA, first_name="Nora")
    assert r.status_code == 200
    body = r.json()
    child_id = body["child_id"]
    assert body["display_code"].startswith("CH-")

    # Parent CAN see the name (their own view).
    plist = client.get("/api/parent/children", headers={"X-Parent-Id": PA}).json()["children"]
    assert plist[0]["first_name"] == "Nora"

    # Professional child record is pseudonymous: NO name, anywhere in child.json.
    child_json = cfg.CHILDREN_DIR / child_id / "child.json"
    assert child_json.exists()
    raw = child_json.read_text(encoding="utf-8")
    assert "Nora" not in raw
    assert "first_name" not in json.loads(raw)
    assert json.loads(raw)["display_code"] == body["display_code"]

    # Name must not leak into the audit log either.
    if cfg.AUDIT_LOG_PATH.exists():
        assert "Nora" not in cfg.AUDIT_LOG_PATH.read_text(encoding="utf-8")

    # The private name lives only under PARENTS_DIR.
    prof = cfg.PARENTS_DIR / PA / f"{child_id}.json"
    assert "Nora" in prof.read_text(encoding="utf-8")


def test_create_child_requires_full_consent(sandbox):
    client = _client()
    r = _add_child(client, PA, checked=ALL_REQUIRED[:3])  # one box missing
    assert r.status_code == 422
    # No child persisted on incomplete consent.
    plist = client.get("/api/parent/children", headers={"X-Parent-Id": PA}).json()["children"]
    assert plist == []


def test_create_child_records_no_retention_consent_id(sandbox, store):
    """The no-retention attestation (review_then_delete) is part of the recorded
    consent for a parent-created child."""
    client = _client()
    r = _add_child(client, PA)
    assert r.status_code == 200
    prof = json.loads((cfg.PARENTS_DIR / PA / f"{r.json()['child_id']}.json").read_text())
    consent = store.read_consent(prof["consent_id"])
    assert "review_then_delete" in consent["checked_checkbox_ids"]
    assert consent["consent_version"] == cfg.CONSENT_VERSION


def test_parent_id_header_required(sandbox):
    client = _client()
    # Missing header → 400.
    assert client.get("/api/parent/children").status_code == 400
    # Malformed id → 400.
    assert client.get("/api/parent/children", headers={"X-Parent-Id": "nope"}).status_code == 400


def test_invites_recorded_and_scoped(sandbox):
    client = _client()
    r = client.post("/api/parent/invites", json={"contact": "maya@clinic.org"}, headers={"X-Parent-Id": PA})
    assert r.status_code == 200 and r.json()["status"] == "sent"
    a_inv = client.get("/api/parent/invites", headers={"X-Parent-Id": PA}).json()["invites"]
    b_inv = client.get("/api/parent/invites", headers={"X-Parent-Id": PB}).json()["invites"]
    assert len(a_inv) == 1 and a_inv[0]["contact"] == "maya@clinic.org"
    assert b_inv == []
