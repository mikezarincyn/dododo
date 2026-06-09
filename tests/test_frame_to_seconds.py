"""Замок Step 1/2: формула frame_to_seconds = (frame_index − frame_min) / fps.
Первый кадр клипа (frame_min) ↦ t=0. Никакого +1/fps систематического сдвига.

Эта формула — единственная точка преобразования кадра в секунды; если она
изменится случайно, поедет вся калибровка (manual vs auto, latency).
"""

import pytest


def test_first_frame_is_zero():
    """frame_min ↦ 0.0 c — главный инвариант (не 1/fps!)."""
    from engine import frame_to_seconds
    sess = {"frame_min": 1, "fps": 30.0}
    assert frame_to_seconds(1, sess) == 0.0
    sess = {"frame_min": 0, "fps": 30.0}
    assert frame_to_seconds(0, sess) == 0.0
    sess = {"frame_min": 100, "fps": 30.0}
    assert frame_to_seconds(100, sess) == 0.0


def test_formula_matches_spec():
    """t = (frame - frame_min) / fps на пограничных значениях."""
    from engine import frame_to_seconds
    sess = {"frame_min": 1, "fps": 30.0}
    # 1 секунда = 30 кадров после frame_min
    assert frame_to_seconds(31, sess) == 1.0
    # Середина клипа Natasha test1 (frame=254 при fps=30)
    assert abs(frame_to_seconds(254, sess) - (253 / 30.0)) < 1e-9
    # Конец (frame=333)
    assert abs(frame_to_seconds(333, sess) - (332 / 30.0)) < 1e-9


def test_arbitrary_fps():
    """Формула работает для произвольных fps, не только 30."""
    from engine import frame_to_seconds
    sess = {"frame_min": 1, "fps": 29.97}
    assert abs(frame_to_seconds(1, sess) - 0.0) < 1e-9
    assert abs(frame_to_seconds(31, sess) - (30 / 29.97)) < 1e-9


def test_int_or_str_id_robust():
    """frame_index приходит как int — проверяем, что приведение int() работает."""
    from engine import frame_to_seconds
    sess = {"frame_min": 1, "fps": 30.0}
    # frame_index float
    assert frame_to_seconds(1.0, sess) == 0.0
    # session content: frame_min как int
    assert frame_to_seconds(31, sess) == 1.0


def test_no_off_by_one_against_timestamp_ms():
    """timestamp_ms в CSV — это int(frame * 1000 / fps), что даёт frame=1 → 33ms,
    а НЕ 0. Наша формула должна давать 0 для frame_min — это и есть фикс
    off-by-one, который мы заложили в Step 1.
    """
    from engine import frame_to_seconds
    sess = {"frame_min": 1, "fps": 30.0}
    # timestamp_ms-формула дала бы 33ms = 0.033s
    timestamp_ms_value = int(1 * 1000 / 30.0) / 1000.0
    our_value = frame_to_seconds(1, sess)
    assert our_value == 0.0
    assert our_value != timestamp_ms_value
    assert timestamp_ms_value > 0  # подтверждаем, что у timestamp_ms сдвиг есть
