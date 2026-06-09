"""Замок Step 3: upsert_onset_annotation по ключу (annotator_id, definition.version,
scenario) — повторная отметка тем же ключом ЗАМЕНЯЕТ старую запись, не плодит.
Другой annotator или другая версия определения или другой сценарий — это
ОТДЕЛЬНАЯ запись."""

from datetime import datetime, timezone

import pytest


def _make_annotation(annotator_id, scenario, frame_index, notes="", version="movement_onset_draft0"):
    return {
        "annotator_id": annotator_id,
        "frame_index": int(frame_index),
        "onset_seconds": frame_index / 30.0,
        "seconds_source": "computed_fps",
        "fps_used": 30.0,
        "scenario": scenario,
        "marked_at": datetime.now(timezone.utc).isoformat(),
        "onset_definition": {"version": version, "text": "test"},
        "auto_suggestion_at_mark": None,
        "notes": notes,
    }


def test_upsert_first_then_replace_same_key(sandbox):
    """Первый upsert → новая запись (replaced=False).
    Повторный upsert тем же ключом → замена (replaced=True), запись одна."""
    import storage

    cid, _ = storage.create_child()
    sid = storage.create_session(cid)

    ann1 = _make_annotation("ot_anna", "functional_task", 100, notes="first")
    _, replaced1 = storage.upsert_onset_annotation(
        cid, sid, session_fps=30.0, total_frames=333, annotation=ann1
    )
    assert replaced1 is False

    ann2 = _make_annotation("ot_anna", "functional_task", 200, notes="updated")
    _, replaced2 = storage.upsert_onset_annotation(
        cid, sid, session_fps=30.0, total_frames=333, annotation=ann2
    )
    assert replaced2 is True

    data = storage.read_onset_annotations(cid, sid)
    assert len(data["annotations"]) == 1
    # Запись заменилась ЦЕЛИКОМ — старые поля не протекают
    rec = data["annotations"][0]
    assert rec["frame_index"] == 200
    assert rec["notes"] == "updated"


def test_upsert_different_annotator_adds_record(sandbox):
    """Другой annotator при том же определении/сценарии → НОВАЯ запись."""
    import storage

    cid, _ = storage.create_child()
    sid = storage.create_session(cid)

    storage.upsert_onset_annotation(
        cid, sid, session_fps=30.0, total_frames=333,
        annotation=_make_annotation("ot_anna", "functional_task", 100)
    )
    storage.upsert_onset_annotation(
        cid, sid, session_fps=30.0, total_frames=333,
        annotation=_make_annotation("ot_mike", "functional_task", 110)
    )

    data = storage.read_onset_annotations(cid, sid)
    assert len(data["annotations"]) == 2
    ids = sorted(a["annotator_id"] for a in data["annotations"])
    assert ids == ["ot_anna", "ot_mike"]


def test_upsert_different_scenario_adds_record(sandbox):
    """Тот же annotator+определение, другой сценарий → НОВАЯ запись (ключ матча scenario)."""
    import storage

    cid, _ = storage.create_child()
    sid = storage.create_session(cid)

    storage.upsert_onset_annotation(
        cid, sid, session_fps=30.0, total_frames=333,
        annotation=_make_annotation("ot_anna", "functional_task", 100)
    )
    storage.upsert_onset_annotation(
        cid, sid, session_fps=30.0, total_frames=333,
        annotation=_make_annotation("ot_anna", "reaction_to_name", 50)
    )

    data = storage.read_onset_annotations(cid, sid)
    assert len(data["annotations"]) == 2
    scenarios = sorted(a["scenario"] for a in data["annotations"])
    assert scenarios == ["functional_task", "reaction_to_name"]


def test_upsert_different_definition_version_adds_record(sandbox):
    """Тот же annotator+сценарий, но другая версия определения → НОВАЯ запись."""
    import storage

    cid, _ = storage.create_child()
    sid = storage.create_session(cid)

    storage.upsert_onset_annotation(
        cid, sid, session_fps=30.0, total_frames=333,
        annotation=_make_annotation("ot_anna", "functional_task", 100,
                                    version="movement_onset_draft0")
    )
    storage.upsert_onset_annotation(
        cid, sid, session_fps=30.0, total_frames=333,
        annotation=_make_annotation("ot_anna", "functional_task", 100,
                                    version="movement_onset_v1")
    )

    data = storage.read_onset_annotations(cid, sid)
    assert len(data["annotations"]) == 2
    versions = sorted(a["onset_definition"]["version"] for a in data["annotations"])
    assert versions == ["movement_onset_draft0", "movement_onset_v1"]
