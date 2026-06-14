"""Тесты роли OT (Этап C): доступ только по care-link, тренды по confirmed
(калибровка исключена), no-retention после разметки, сквозная петля parent→ot→progress."""

import json

from fastapi.testclient import TestClient

import stage1_config as cfg
import worker
from main import create_app

REVIEWERS = {
    "tok_ot": {"actor_id": "ot_a", "role": "reviewer"},
    "tok_ot2": {"actor_id": "ot_b", "role": "reviewer"},
    "tok_admin": {"actor_id": "adm", "role": "admin"},
}
ALL_REQUIRED = list(cfg.CONSENT_REQUIRED_CHECKBOX_IDS)
PA = "a" * 32
OT = {"Authorization": "Bearer tok_ot"}
OT2 = {"Authorization": "Bearer tok_ot2"}
ADMIN = {"Authorization": "Bearer tok_admin"}


def _app(monkeypatch):
    monkeypatch.setenv(cfg.REVIEWERS_JSON_ENV, json.dumps(REVIEWERS))
    return TestClient(create_app(enforce_https=False))


def _add_child(client, parent_id=PA, name="Mia"):
    r = client.post(
        "/api/parent/children",
        json={"first_name": name, "birth_month": "2023-03", "checked_ids": ALL_REQUIRED},
        headers={"X-Parent-Id": parent_id},
    )
    assert r.status_code == 200
    return r.json()["child_id"], r.json()["display_code"]


def _upload(client, child_id, scenario="name"):
    r = client.post(
        "/api/submissions",
        files={"file": ("clip.mp4", b"VIDEO-BYTES" + b"x" * 100, "video/mp4")},
        data={"child_id": child_id, "scenario": scenario},
    )
    assert r.status_code == 200
    # Async pipeline: drain the queue (fake worker, no ML) so the clip reaches
    # `ready` — only then does it become visible to the OT.
    worker.run_pending()
    return r.json()["submission_id"]


def _link(client, child_id, actor="ot_a", ot_name="Maya T."):
    r = client.post("/api/console/care-links", json={"child_id": child_id, "reviewer_actor": actor, "ot_name": ot_name}, headers=ADMIN)
    assert r.status_code == 200


def _annotate(client, submission_id, *, score=2, domains=("attention", "communication"), calibration_score=None, headers=OT):
    metrics = [
        {"label": "Overall response quality", "value": str(score), "state": "confirmed", "score": score, "domains": list(domains)},
        {"label": "Head / body turn to caller", "value": "Yes", "state": "confirmed"},
    ]
    if calibration_score is not None:
        metrics.append({"label": "Attention hold after turn", "value": "~4 s", "state": "calibration", "score": calibration_score, "domains": list(domains)})
    return client.post(
        f"/api/ot/annotate/{submission_id}",
        json={"scenario": "name", "domains": list(domains), "duration": "1:42", "summary": "turned on first call", "notes": "calm room", "metrics": metrics},
        headers=headers,
    )


# ---------- care-link gate ----------

def test_ot_without_care_link_sees_nothing(sandbox, monkeypatch):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client)
    _upload(client, child_id)
    # No link yet → empty dashboard/queue, observations forbidden.
    assert client.get("/api/ot/children", headers=OT).json()["children"] == []
    assert client.get("/api/ot/queue", headers=OT).json()["items"] == []
    assert client.get(f"/api/ot/child/{child_id}/observations", headers=OT).status_code == 403
    # After admin links → child + submission visible.
    _link(client, child_id)
    assert {c["child_id"] for c in client.get("/api/ot/children", headers=OT).json()["children"]} == {child_id}
    assert len(client.get("/api/ot/queue", headers=OT).json()["items"]) == 1


def test_other_ot_still_excluded_after_link(sandbox, monkeypatch):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client)
    _upload(client, child_id)
    _link(client, child_id, actor="ot_a")
    # ot_b has no link → sees nothing.
    assert client.get("/api/ot/children", headers=OT2).json()["children"] == []
    assert client.get("/api/ot/queue", headers=OT2).json()["items"] == []


def test_annotate_requires_care_link(sandbox, monkeypatch):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client)
    sid = _upload(client, child_id)
    # No link → annotate forbidden, video NOT purged.
    assert _annotate(client, sid).status_code == 403


# ---------- OT video streaming (Stage C player), care-link scoped ----------

def test_ot_video_streams_for_linked_ot_and_claims_review(sandbox, monkeypatch, store):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client)
    sid = _upload(client, child_id)
    _link(client, child_id)
    r = client.get(f"/api/ot/video/{sid}", headers=OT)
    assert r.status_code == 200
    assert r.content == b"VIDEO-BYTES" + b"x" * 100
    assert r.headers["content-disposition"] == "inline"
    # Opening the clip claims it for review.
    assert store.read_submission(sid)["state"] == "in_review"


def test_ot_video_forbidden_without_care_link(sandbox, monkeypatch):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client)
    sid = _upload(client, child_id)
    _link(client, child_id, actor="ot_a")
    # ot_b has no link → 403, even though the clip exists.
    assert client.get(f"/api/ot/video/{sid}", headers=OT2).status_code == 403


# ---------- OT analysis bundle + overlay (Stage 0), OT-only, care-link scoped ----------

def _store_bundle(store, sid):
    """Simulate the worker having produced the ephemeral bundle + overlay."""
    store.put_analysis(sid, {"version": 1, "series": {"head_turn": {"t": [0.0], "v": [0.2]}}, "events": {"calls": [1.0]}})
    store.put_overlay(sid, b"OVERLAY-BYTES")


def test_ot_analysis_and_overlay_for_linked_ot(sandbox, monkeypatch, store):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client)
    sid = _upload(client, child_id)
    _link(client, child_id)
    _store_bundle(store, sid)

    a = client.get(f"/api/ot/analysis/{sid}", headers=OT)
    assert a.status_code == 200 and a.json()["version"] == 1 and a.json()["events"]["calls"] == [1.0]
    o = client.get(f"/api/ot/overlay/{sid}", headers=OT)
    assert o.status_code == 200 and o.content == b"OVERLAY-BYTES"
    assert o.headers["content-disposition"] == "inline"


def test_ot_analysis_forbidden_without_care_link(sandbox, monkeypatch, store):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client)
    sid = _upload(client, child_id)
    _link(client, child_id, actor="ot_a")
    _store_bundle(store, sid)
    # ot_b not linked → 403; a non-reviewer (parent header, no principal) → 401.
    assert client.get(f"/api/ot/analysis/{sid}", headers=OT2).status_code == 403
    assert client.get(f"/api/ot/overlay/{sid}", headers=OT2).status_code == 403
    assert client.get(f"/api/ot/analysis/{sid}", headers={"X-Parent-Id": PA}).status_code == 401


def test_ot_analysis_gone_after_review(sandbox, monkeypatch, store):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client)
    sid = _upload(client, child_id)
    _link(client, child_id)
    _store_bundle(store, sid)
    assert _annotate(client, sid).status_code == 200  # → mark_reviewed_and_purge
    # Bundle + overlay purged together with the clip (no-retention) → 410.
    assert client.get(f"/api/ot/analysis/{sid}", headers=OT).status_code == 410
    assert client.get(f"/api/ot/overlay/{sid}", headers=OT).status_code == 410


# ---------- no-retention: video purged, observation kept ----------

def test_after_annotate_video_purged_observation_kept(sandbox, monkeypatch, store):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client)
    sid = _upload(client, child_id)
    _link(client, child_id)
    r = _annotate(client, sid)
    assert r.status_code == 200
    meta = store.read_submission(sid)
    assert meta["video_purged"] is True and meta["state"] == "reviewed"
    assert not store._ephemeral_dir(sid).exists()  # raw bytes gone
    obs = store.list_observations(child_id)
    assert len(obs) == 1 and obs[0]["summary"] == "turned on first call"


# ---------- red line: calibration excluded from trend ----------

def test_calibration_metric_never_counts_in_trend(sandbox, monkeypatch):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client)
    _link(client, child_id)
    # obs1 confirmed attention=2 ; obs2 confirmed attention=1 + calibration attention=3.
    s1 = _upload(client, child_id)
    assert _annotate(client, s1, score=2, domains=("attention",)).status_code == 200
    s2 = _upload(client, child_id)
    assert _annotate(client, s2, score=1, domains=("attention",), calibration_score=3).status_code == 200
    prog = client.get(f"/api/ot/child/{child_id}/progress", headers=OT).json()["progress"]
    # Confirmed went 2 → 1, so DECLINING. If the calibration 3 were counted it'd be improving.
    assert prog["attention"]["trend"] == "declining"
    assert prog["attention"]["spark"] == [2, 1]


# ---------- full loop parent → ot → progress ----------

def test_full_loop_parent_ot_progress(sandbox, monkeypatch):
    client = _app(monkeypatch)
    child_id, code = _add_child(client, name="Mia")
    sid = _upload(client, child_id)
    _link(client, child_id)
    # OT sees it queued, annotates.
    assert client.get("/api/ot/queue", headers=OT).json()["items"][0]["submission_id"] == sid
    assert _annotate(client, sid, score=2, domains=("attention", "communication")).status_code == 200
    # Queue now empty (video purged), observation present, progress computed.
    assert client.get("/api/ot/queue", headers=OT).json()["items"] == []
    ot_obs = client.get(f"/api/ot/child/{child_id}/observations", headers=OT).json()["observations"]
    assert len(ot_obs) == 1
    prog = client.get(f"/api/ot/child/{child_id}/progress", headers=OT).json()["progress"]
    assert "attention" in prog and "communication" in prog
    # Parent sees the confirmed part of the observation for their own child.
    p = client.get(f"/api/parent/child/{child_id}/observations", headers={"X-Parent-Id": PA}).json()["observations"]
    assert len(p) == 1
    assert all(m["state"] == "confirmed" for m in p[0]["metrics"])  # no calibration leaked to parent


def test_parent_cannot_read_other_childs_observations(sandbox, monkeypatch):
    client = _app(monkeypatch)
    child_id, _ = _add_child(client, parent_id=PA)
    other = client.get(f"/api/parent/child/{child_id}/observations", headers={"X-Parent-Id": "b" * 32})
    assert other.status_code == 403
