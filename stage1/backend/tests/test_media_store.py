"""Инвариант-тесты MediaStore (P3): эфемерность, шифрование at-rest, резидентность,
отсутствие PII, права доступа."""

import json
import stat
from pathlib import Path

import pytest

from conftest import VALID_CONSENT

PLAINTEXT = b"\x00\x01FAKE-VIDEO-BYTES-\xff\xfe" + b"payload" * 100


def _ephemeral_enc(store, sid):
    return store._ephemeral_dir(sid) / "video.enc"


def test_put_then_review_roundtrip(store):
    sid = store.put(PLAINTEXT, dict(VALID_CONSENT), original_ext=".mov")
    out = store.get_for_review(sid, actor="ot_default")
    assert out["video_bytes"] == PLAINTEXT
    assert out["original_ext"] == ".mov"
    assert out["display_code"].startswith("CH-")


def test_video_encrypted_at_rest(store):
    sid = store.put(PLAINTEXT, dict(VALID_CONSENT))
    blob = _ephemeral_enc(store, sid).read_bytes()
    # На диске лежит шифртекст, не plaintext.
    assert blob != PLAINTEXT
    assert PLAINTEXT not in blob
    # И он расшифровывается обратно через фасад.
    assert store.get_for_review(sid, actor="ot_default")["video_bytes"] == PLAINTEXT


def test_wrong_aad_cannot_decrypt(store):
    """AAD = submission_id: блоб нельзя «переклеить» в другую запись."""
    import crypto
    sid = store.put(PLAINTEXT, dict(VALID_CONSENT))
    blob = _ephemeral_enc(store, sid).read_bytes()
    with pytest.raises(Exception):
        crypto.decrypt(blob, b"some-other-submission-id-00000000")


def test_mark_reviewed_and_purge_removes_bytes_keeps_consent(store, sandbox):
    sid = store.put(PLAINTEXT, dict(VALID_CONSENT))
    consent_id = store.read_submission(sid)["consent_id"]
    store.mark_reviewed_and_purge(sid)

    # Байты видео стёрты.
    assert not _ephemeral_enc(store, sid).exists()
    assert not store._ephemeral_dir(sid).exists()
    # Метадата submission осталась и помечена.
    meta = store.read_submission(sid)
    assert meta["state"] == "reviewed"
    assert meta["video_purged"] is True
    assert meta["purged_at"]
    # Запись согласия пережила удаление видео.
    assert store.read_consent(consent_id)["agreed"] is True
    # Видео больше не выдаётся на просмотр.
    with pytest.raises(Exception):
        store.get_for_review(sid, actor="ot_default")


def test_delete_removes_bytes_keeps_consent(store):
    sid = store.put(PLAINTEXT, dict(VALID_CONSENT))
    consent_id = store.read_submission(sid)["consent_id"]
    store.delete(sid)
    assert not store._ephemeral_dir(sid).exists()
    meta = store.read_submission(sid)
    assert meta["state"] == "purged"
    assert meta["video_purged"] is True
    assert store.read_consent(consent_id)  # запись согласия на месте


def test_consent_required(store):
    with pytest.raises(Exception):
        store.put(PLAINTEXT, {})  # пустое согласие
    with pytest.raises(Exception):
        store.put(PLAINTEXT, None)


def test_ext_clamped_to_whitelist(store):
    # Разрешённые — сохраняются как есть (нижним регистром).
    assert store.read_submission(store.put(PLAINTEXT, dict(VALID_CONSENT), original_ext=".WEBM"))["original_ext"] == ".webm"
    assert store.read_submission(store.put(PLAINTEXT, dict(VALID_CONSENT), original_ext=".m4v"))["original_ext"] == ".m4v"
    # Опасные/незнакомые → .mp4
    assert store.read_submission(store.put(PLAINTEXT, dict(VALID_CONSENT), original_ext=".exe"))["original_ext"] == ".mp4"
    assert store.read_submission(store.put(PLAINTEXT, dict(VALID_CONSENT), original_ext="noext"))["original_ext"] == ".mp4"


def test_no_pii_in_paths_meta_audit(store, sandbox):
    """SEC-01: имя исходного файла не участвует нигде. Провенанс — source_sha256."""
    sid = store.put(PLAINTEXT, dict(VALID_CONSENT), original_ext=".mov")
    meta = store.read_submission(sid)
    # Провенанс есть, поля имени файла — нет.
    assert "input_file" not in meta and "filename" not in meta
    assert len(meta["source_sha256"]) == 64
    # Имя зашифрованного файла — фиксированное, не производное от чего-либо.
    assert _ephemeral_enc(store, sid).name == "video.enc"
    # В аудит-логе нет ключей с именами файлов.
    audit = sandbox["data"] / "audit" / "access.log.jsonl"
    for line in audit.read_text().splitlines():
        rec = json.loads(line)
        assert "filename" not in rec and "input_file" not in rec


def test_permissions(store):
    sid = store.put(PLAINTEXT, dict(VALID_CONSENT))
    enc = _ephemeral_enc(store, sid)
    edir = store._ephemeral_dir(sid)
    assert stat.S_IMODE(enc.stat().st_mode) == 0o600
    assert stat.S_IMODE(edir.stat().st_mode) == 0o700
    sub = store._submission_file(sid)
    assert stat.S_IMODE(sub.stat().st_mode) == 0o600


def test_display_code_format(store):
    cid, code = store.create_child()
    import media_store
    assert media_store.is_valid_display_code(code)
    assert len(cid) == 32


def test_pending_queue_excludes_purged(store):
    sid1 = store.put(PLAINTEXT, dict(VALID_CONSENT))
    sid2 = store.put(PLAINTEXT, dict(VALID_CONSENT))
    store.mark_reviewed_and_purge(sid1)
    pending_ids = {m["submission_id"] for m in store.list_pending_submissions()}
    assert sid2 in pending_ids
    assert sid1 not in pending_ids


# ------- Резидентность (fail-closed) -------

def test_region_us_rejected(store, monkeypatch):
    import stage1_config as cfg
    monkeypatch.setattr(cfg, "PROVIDER_REGION", "us-east-1", raising=False)
    with pytest.raises(Exception):
        store.put(PLAINTEXT, dict(VALID_CONSENT))


def test_region_tbd_rejected(store, monkeypatch):
    import stage1_config as cfg
    monkeypatch.setattr(cfg, "PROVIDER_COMPUTE", "TBD", raising=False)
    with pytest.raises(Exception):
        store.put(PLAINTEXT, dict(VALID_CONSENT))


def test_region_uk_allowed(store, monkeypatch):
    import stage1_config as cfg
    monkeypatch.setattr(cfg, "PROVIDER_REGION", "UK(London)", raising=False)
    sid = store.put(PLAINTEXT, dict(VALID_CONSENT))
    assert store.read_submission(sid)["region"] == "UK(London)"
