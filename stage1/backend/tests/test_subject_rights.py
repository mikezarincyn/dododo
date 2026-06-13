"""Права субъекта при no-retention (P5): delete, mark_reviewed_and_purge после
обратной связи, отзыв согласия до просмотра, срок хранения consent без хардкода,
excludeFromTraining-заглушка, TTL-свипер."""

import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import stage1_config as cfg
from conftest import VALID_CONSENT
from main import create_app

PLAINTEXT = b"VIDEO-" + b"z" * 300

REVIEWERS = {
    "tok_alice": {"actor_id": "ot_alice", "role": "reviewer"},
    "tok_carol": {"actor_id": "admin_carol", "role": "admin"},
}


def _enc(store, sid):
    return store._ephemeral_dir(sid) / "video.enc"


def _new(store):
    return store.put(PLAINTEXT, dict(VALID_CONSENT))


# ---------- Фасад ----------

def test_delete_removes_video_and_feedback_keeps_consent(store):
    sid = _new(store)
    consent_id = store.read_submission(sid)["consent_id"]
    store.get_for_review(sid, actor="ot_alice")
    store.save_feedback(sid, actor="ot_alice", feedback={"note": "x"})
    assert _enc(store, sid).exists()
    assert store.read_feedback(sid) is not None

    store.delete(sid)

    # Видео + связанные (feedback) удалены.
    assert not store._ephemeral_dir(sid).exists()
    assert store.read_feedback(sid) is None
    meta = store.read_submission(sid)
    assert meta["video_purged"] is True and meta["feedback_purged"] is True
    # Запись согласия пережила.
    assert store.read_consent(consent_id)["agreed"] is True


def test_mark_reviewed_and_purge_after_feedback_keeps_feedback(store):
    sid = _new(store)
    store.get_for_review(sid, actor="ot_alice")
    store.save_feedback(sid, actor="ot_alice", feedback={"note": "calm, engaged"})
    store.mark_reviewed_and_purge(sid)
    # Видео удалено, обратная связь (результат для родителя) сохранена.
    assert not store._ephemeral_dir(sid).exists()
    assert store.read_feedback(sid)["feedback"]["note"] == "calm, engaged"
    assert store.read_submission(sid)["state"] == "reviewed"


def test_withdraw_before_review_deletes_video(store):
    sid = _new(store)
    consent_id = store.read_submission(sid)["consent_id"]
    # Отзыв ДО просмотра.
    store.withdraw_consent(sid)
    # Видео удалено, недоступно для просмотра, ушло из очереди.
    assert not store._ephemeral_dir(sid).exists()
    with pytest.raises(Exception):
        store.get_for_review(sid, actor="ot_alice")
    assert sid not in {m["submission_id"] for m in store.list_pending_submissions()}
    # consent record остался и помечен withdrawn.
    c = store.read_consent(consent_id)
    assert c["withdrawn"] is True and c["withdrawn_at"]


def test_exclude_from_training_is_noop_stub(store):
    sid = _new(store)
    assert store.exclude_from_training(sid) is None  # N/A Стадия 1


# ---------- Срок хранения consent (без хардкода при TBD) ----------

def test_consent_retention_tbd_no_autopurge(store, monkeypatch):
    monkeypatch.setattr(cfg, "CONSENT_RECORD_RETENTION_DAYS", None, raising=False)
    assert cfg.consent_retention_is_tbd() is True
    store.record_consent(list(cfg.CONSENT_REQUIRED_CHECKBOX_IDS))
    # При TBD авто-очистки нет (число не захардкожено).
    assert store.purge_expired_consent() == 0


def test_consent_retention_when_configured(store, sandbox, monkeypatch):
    monkeypatch.setattr(cfg, "CONSENT_RECORD_RETENTION_DAYS", "30", raising=False)
    rec = store.record_consent(list(cfg.CONSENT_REQUIRED_CHECKBOX_IDS))
    # Состарим запись на диске.
    cf = store._consent_file(rec["consent_id"])
    data = json.loads(cf.read_text())
    data["recorded_at"] = "2000-01-01T00:00:00+00:00"
    cf.write_text(json.dumps(data))
    removed = store.purge_expired_consent(now=datetime(2026, 1, 1, tzinfo=timezone.utc))
    assert removed == 1
    assert not cf.exists()


# ---------- TTL-свипер брошенных видео ----------

def test_abandoned_video_ttl_sweeper(store):
    sid = _new(store)
    # Состарим created_at.
    sf = store._submission_file(sid)
    meta = json.loads(sf.read_text())
    meta["created_at"] = "2000-01-01T00:00:00+00:00"
    sf.write_text(json.dumps(meta))
    removed = store.purge_abandoned_videos(now=datetime(2026, 1, 1, tzinfo=timezone.utc))
    assert removed == 1
    assert not store._ephemeral_dir(sid).exists()
    assert store.read_submission(sid)["state"] == "expired"


# ---------- HTTP ----------

@pytest.fixture
def client(sandbox, monkeypatch):
    monkeypatch.setenv(cfg.REVIEWERS_JSON_ENV, json.dumps(REVIEWERS))
    import media_store
    return TestClient(create_app(enforce_https=False)), media_store.get_media_store()


def test_complete_endpoint_purges_video_after_feedback(client):
    c, store = client
    sid = _new(store)
    c.get(f"/api/console/video/{sid}", headers={"Authorization": "Bearer tok_alice"})  # claim
    r = c.post(f"/api/console/complete/{sid}", json={"note": "great session"},
               headers={"Authorization": "Bearer tok_alice"})
    assert r.status_code == 200 and r.json()["video_purged"] is True
    assert not store._ephemeral_dir(sid).exists()
    assert store.read_feedback(sid)["feedback"]["note"] == "great session"


def test_delete_endpoint_admin_only(client):
    c, store = client
    sid = _new(store)
    # reviewer не может (erasure — действие контролёра/admin).
    assert c.post(f"/api/console/delete/{sid}", headers={"Authorization": "Bearer tok_alice"}).status_code == 403
    assert c.post(f"/api/console/delete/{sid}", headers={"Authorization": "Bearer tok_carol"}).status_code == 200
    assert not store._ephemeral_dir(sid).exists()


def test_withdraw_endpoint_deletes_video(client):
    c, store = client
    sid = _new(store)
    r = c.post("/api/consent/withdraw", json={"submission_id": sid})
    assert r.status_code == 200
    # Видео больше не выдаётся (410).
    v = c.get(f"/api/console/video/{sid}", headers={"Authorization": "Bearer tok_alice"})
    assert v.status_code == 410
