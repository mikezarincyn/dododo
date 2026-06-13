"""Тесты консоли специалиста (P4): least-privilege, need-to-know, append-only лог,
no-download, доступ к видео только через MediaStore.get_for_review."""

import json

import pytest
from fastapi.testclient import TestClient

import stage1_config as cfg
from conftest import VALID_CONSENT
from main import create_app

PLAINTEXT = b"VIDEO-BYTES-" + b"x" * 200

REVIEWERS = {
    "tok_alice": {"actor_id": "ot_alice", "role": "reviewer"},
    "tok_bob": {"actor_id": "ot_bob", "role": "reviewer"},
    "tok_carol": {"actor_id": "admin_carol", "role": "admin"},
}


@pytest.fixture
def console(sandbox, monkeypatch):
    monkeypatch.setenv(cfg.REVIEWERS_JSON_ENV, json.dumps(REVIEWERS))
    import media_store
    store = media_store.get_media_store()
    app = create_app(enforce_https=False)
    client = TestClient(app)
    return {"client": client, "store": store, "sandbox": sandbox}


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


def _new_submission(store):
    return store.put(PLAINTEXT, dict(VALID_CONSENT), original_ext=".mp4")


# ---- не-reviewer не получает доступ ----

def test_no_token_denied(console):
    sid = _new_submission(console["store"])
    r = console["client"].get(f"/api/console/video/{sid}")
    assert r.status_code == 401


def test_admin_cannot_view_video(console):
    """admin — не reviewer: видео ему недоступно (least-privilege/need-to-know)."""
    sid = _new_submission(console["store"])
    r = console["client"].get(f"/api/console/video/{sid}", headers=_bearer("tok_carol"))
    assert r.status_code == 403


def test_reviewer_can_view_video(console):
    sid = _new_submission(console["store"])
    r = console["client"].get(f"/api/console/video/{sid}", headers=_bearer("tok_alice"))
    assert r.status_code == 200
    assert r.content == PLAINTEXT
    # inline, не attachment — нет скачивания.
    assert r.headers["content-disposition"] == "inline"
    assert "attachment" not in r.headers["content-disposition"]


# ---- need-to-know: второй reviewer заблокирован ----

def test_second_reviewer_denied_after_claim(console):
    sid = _new_submission(console["store"])
    assert console["client"].get(f"/api/console/video/{sid}", headers=_bearer("tok_alice")).status_code == 200
    r = console["client"].get(f"/api/console/video/{sid}", headers=_bearer("tok_bob"))
    assert r.status_code == 403


def test_admin_assign_then_only_that_reviewer(console):
    sid = _new_submission(console["store"])
    # admin назначает Бобу.
    a = console["client"].post(f"/api/console/assign/{sid}", json={"reviewer_actor": "ot_bob"}, headers=_bearer("tok_carol"))
    assert a.status_code == 200
    # Алиса не может, Боб может.
    assert console["client"].get(f"/api/console/video/{sid}", headers=_bearer("tok_alice")).status_code == 403
    assert console["client"].get(f"/api/console/video/{sid}", headers=_bearer("tok_bob")).status_code == 200


# ---- append-only лог ----

def test_each_view_writes_immutable_record(console):
    sid = _new_submission(console["store"])
    c = console["client"]
    c.get(f"/api/console/video/{sid}", headers=_bearer("tok_alice"))
    c.get(f"/api/console/video/{sid}", headers=_bearer("tok_alice"))

    audit = console["sandbox"]["data"] / "audit" / "access.log.jsonl"
    views = [
        json.loads(l) for l in audit.read_text().splitlines()
        if json.loads(l).get("event") == "get_for_review" and json.loads(l).get("submission_id") == sid
    ]
    assert len(views) == 2
    for rec in views:
        assert rec["actor"] == "ot_alice"           # actor
        assert rec["submission_id"] == sid           # video_id
        assert rec["event"] == "get_for_review"      # action
        assert rec["ts"].endswith("+00:00")          # timestamp (UTC)
    # Лог только дописывается: нет API для его правки/удаления.
    routes = {r.path for r in console["client"].app.routes}
    assert not any("audit" in p or "log" in p for p in routes)


def test_denied_access_is_logged(console):
    sid = _new_submission(console["store"])
    console["client"].get(f"/api/console/video/{sid}", headers=_bearer("tok_alice"))
    console["client"].get(f"/api/console/video/{sid}", headers=_bearer("tok_bob"))  # denied
    audit = console["sandbox"]["data"] / "audit" / "access.log.jsonl"
    events = [json.loads(l)["event"] for l in audit.read_text().splitlines()]
    assert "access_denied" in events


# ---- no download endpoint ----

def test_no_download_endpoint_exists(console):
    paths = {r.path for r in console["client"].app.routes}
    assert not any("download" in p.lower() for p in paths)


# ---- queue minimization ----

def test_queue_minimal_fields_and_scope(console):
    store = console["store"]
    sid = _new_submission(store)
    r = console["client"].get("/api/console/queue", headers=_bearer("tok_alice"))
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 1
    item = items[0]
    # Минимизация: только нужные для очереди поля, без provenance/consent/child_id.
    assert set(item.keys()) == {"submission_id", "display_code", "state", "assigned_reviewer", "created_at"}
    assert "source_sha256" not in item and "child_id" not in item


def test_queue_need_to_know_scope(console):
    store = console["store"]
    sid = _new_submission(store)
    # Алиса забирает запись.
    console["client"].get(f"/api/console/video/{sid}", headers=_bearer("tok_alice"))
    # Боб больше не видит её в своей очереди; admin — видит.
    bob_ids = {i["submission_id"] for i in console["client"].get("/api/console/queue", headers=_bearer("tok_bob")).json()["items"]}
    admin_ids = {i["submission_id"] for i in console["client"].get("/api/console/queue", headers=_bearer("tok_carol")).json()["items"]}
    assert sid not in bob_ids
    assert sid in admin_ids


# ---- feedback ----

def test_feedback_only_assigned_reviewer(console):
    store = console["store"]
    sid = _new_submission(store)
    console["client"].get(f"/api/console/video/{sid}", headers=_bearer("tok_alice"))  # Алиса claim
    # Боб не может оставить feedback.
    assert console["client"].post(f"/api/console/feedback/{sid}", json={"note": "x"}, headers=_bearer("tok_bob")).status_code == 403
    # Алиса может.
    assert console["client"].post(f"/api/console/feedback/{sid}", json={"note": "calm, engaged"}, headers=_bearer("tok_alice")).status_code == 200
    assert store.read_feedback(sid)["feedback"]["note"] == "calm, engaged"
