"""Тесты записи согласия (P1): explicit consent, серверная блокировка, поля записи."""

import json

import pytest
from fastapi.testclient import TestClient

import stage1_config as cfg
from main import create_app

ALL_REQUIRED = list(cfg.CONSENT_REQUIRED_CHECKBOX_IDS)


# ---------- Фасад ----------

def test_record_consent_has_all_fields(store, sandbox):
    rec = store.record_consent(ALL_REQUIRED)
    assert set(rec["checked_checkbox_ids"]) == set(ALL_REQUIRED)
    assert rec["consent_version"] == cfg.CONSENT_VERSION
    assert rec["jurisdiction"] == "UK"
    assert rec["region"] == cfg.PROVIDER_REGION
    assert rec["session_id"] and len(rec["session_id"]) == 32
    assert rec["timestamp_utc"].endswith("+00:00")  # UTC
    # Запись лежит на диске durable и читается обратно.
    on_disk = store.read_consent(rec["consent_id"])
    assert on_disk["consent_version"] == cfg.CONSENT_VERSION


def test_record_consent_requires_all_four(store):
    for i in range(len(ALL_REQUIRED)):
        partial = ALL_REQUIRED[:i] + ALL_REQUIRED[i + 1:]  # любая одна не отмечена
        with pytest.raises(Exception):
            store.record_consent(partial)


def test_record_consent_rejects_hidden_ids(store):
    for hidden in cfg.CONSENT_HIDDEN_CHECKBOX_IDS:
        with pytest.raises(Exception):
            store.record_consent(ALL_REQUIRED + [hidden])


def test_record_consent_rejects_unknown_ids(store):
    with pytest.raises(Exception):
        store.record_consent(ALL_REQUIRED + ["something_made_up"])


def test_required_ids_exclude_hidden():
    req = set(cfg.CONSENT_REQUIRED_CHECKBOX_IDS)
    hidden = set(cfg.CONSENT_HIDDEN_CHECKBOX_IDS)
    assert len(req) == 4
    assert req.isdisjoint(hidden)


# ---------- HTTP ----------

def test_consent_config_endpoint_hides_biometric_and_retention(sandbox):
    client = TestClient(create_app(enforce_https=False))
    cfg_resp = client.get("/api/consent/config").json()
    ids = cfg_resp["required_checkbox_ids"]
    assert len(ids) == 4
    assert "biometric_auto_analysis" not in ids
    assert "retention_recalibration" not in ids


def test_post_consent_ok(sandbox):
    client = TestClient(create_app(enforce_https=False))
    r = client.post("/api/consent", json={"checked_ids": ALL_REQUIRED})
    assert r.status_code == 200
    body = r.json()
    assert body["session_id"] and body["display_code"].startswith("CH-")
    assert body["consent_version"] == cfg.CONSENT_VERSION


def test_post_consent_incomplete_rejected(sandbox):
    client = TestClient(create_app(enforce_https=False))
    r = client.post("/api/consent", json={"checked_ids": ALL_REQUIRED[:3]})
    assert r.status_code == 422
