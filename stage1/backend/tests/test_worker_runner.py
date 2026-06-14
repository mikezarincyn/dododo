"""Этап 2 — честные подсказки чек-листа: worker_runner выдаёт подсказку ТОЛЬКО там,
где движок может её обосновать (turn/attempt в сценарии «реакция на имя»), иначе —
ничего (НЕ демо-значение). Чистая логика, движок не нужен."""

import worker_runner as wr


def _lat(results, responded):
    return {"results": results, "responded": responded, "total": len(results)}


def test_hint_turn_yes_and_attempt_from_first_response():
    lat = _lat([{"call_t": 1.0, "latency_s": None}, {"call_t": 3.0, "latency_s": 0.4}], responded=1)
    h = wr._checklist_hints("name", [1.0, 3.0], lat)
    assert h["turn"]["value"] == "yes"
    assert "head-turn" in h["turn"]["basis"]
    assert h["attempt"]["value"] == "2"  # first response was the 2nd call


def test_hint_turn_no_when_calls_but_no_response():
    lat = _lat([{"call_t": 1.0, "latency_s": None}], responded=0)
    h = wr._checklist_hints("name", [1.0], lat)
    assert h["turn"]["value"] == "no"
    assert h["attempt"]["value"] == "none"


def test_no_hint_for_unjustifiable_items():
    lat = _lat([{"call_t": 1.0, "latency_s": 0.3}], responded=1)
    h = wr._checklist_hints("name", [1.0], lat)
    # Only turn/attempt — never eye/character/interrupt/hold/score.
    assert set(h.keys()) <= {"turn", "attempt"}
    for forbidden in ("eye", "character", "interrupt", "hold", "score"):
        assert forbidden not in h


def test_no_hints_for_other_scenarios_or_no_calls():
    lat = _lat([{"call_t": 1.0, "latency_s": 0.3}], responded=1)
    assert wr._checklist_hints("freeplay", [1.0], lat) == {}
    assert wr._checklist_hints("name", [], lat) == {}
    assert wr._checklist_hints("name", [1.0], None) == {}


def test_attempt_omitted_when_first_response_beyond_third_call():
    results = [{"call_t": float(i), "latency_s": None} for i in range(3)] + [{"call_t": 4.0, "latency_s": 0.5}]
    h = wr._checklist_hints("name", [0.0, 1.0, 2.0, 4.0], _lat(results, responded=1))
    assert h["turn"]["value"] == "yes"
    assert "attempt" not in h  # 4th call → no matching checklist option, so no hint
