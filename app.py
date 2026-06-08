import json
import time
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import streamlit as st

import storage
from config import (
    ACTION_K,
    ACTION_MIN_BURST_FRAMES,
    ACTION_MIN_THRESHOLD,
    ANNOTATORS,
    BASELINE_WINDOW_S,
    CHECKLIST_VERSIONS,
    DATA_DIR,
    DEFAULT_ANNOTATOR_ID,
    ONSET_DEFINITION_TEXT,
    ONSET_DEFINITION_VERSION,
    RESPONSE_WINDOW_S,
    STEP_FRAMES_LARGE,
    STEP_FRAMES_MEDIUM,
    TURN_THRESHOLD,
    VALID_SCENARIOS,
    WRIST_MAX_JUMP,
    WRIST_MIN_VISIBILITY,
)
from engine import (
    analyze_audio,
    extract_frames_to_cache,
    frame_path_for,
    frame_to_seconds,
    group_words_into_utterances,
    measure_latencies,
    process_video,
    read_csv_frame_range,
    read_head_turn,
    read_head_yaw_deg,
    read_wrist_extension,
    read_wrist_speed,
    smooth_signal,
    suggest_action_onset,
    suggest_action_onset_frame,
    transcribe_calls,
)

st.set_page_config(page_title="dododo — анализ видео", layout="centered")


def _inject_ds_theme():
    """Минимальная CSS-инъекция: только то, что не покрывается .streamlit/config.toml.
    Все значения — из design-system/project/tokens/*.css.

    Шрифты:
      Бандл DS не поставляет .woff2 — tokens/fonts.css сам идёт через Google Fonts
      CDN. Внешний CDN-запрос на каждую загрузку UI — сетевая зависимость и утечка
      факта использования в продукте про детские данные. Поэтому CDN отключён.
      Брендовые имена 'Poppins'/'Inter' стоят первыми в font-family — если в OS
      пользователя они установлены (редко), браузер их подхватит; иначе вернётся
      на system-ui. Когда self-hosted .woff2 будут добавлены в design-system/
      (или в .streamlit/static/), здесь добавятся @font-face — и брендовая
      типографика сразу включится без правок остального.

    Что трогаем CSS-ом:
      - цвет заголовков (navy из DS, --navy-700)
      - скруглённость кнопок (--radius-pill 9999px)
      - мягкая тень на alert-блоках (--shadow-card, --radius-md)

    Что НЕ трогаем (важно для читаемости панели разметки эталона):
      - st.image — кадр со скелетом остаётся как есть
      - st.slider, st.number_input — без переопределения цветов
      - st.code — путь к PNG читается монопространственным шрифтом штатно
      - st.radio, st.selectbox — без перекраски, чтобы калибровочный блок и
        выбор сценария/разметчика оставались максимально контрастными
    """
    st.markdown(
        """
<style>
/* Body + UI — Inter (--font-body); system-ui fallback пока .woff2 не подвезены */
html, body, [class*="css"] {
    font-family: 'Inter', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* Заголовки — Poppins 700, navy, letter-spacing 0.02em (--font-heading, --navy-700, --ls-heading) */
h1, h2, h3, h4 {
    font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-weight: 700;
    color: #0D3276;
    letter-spacing: 0.02em;
}

/* Pill-кнопки (--radius-pill, sentence-case оставляем как в наших формулировках) */
.stButton > button {
    border-radius: 9999px;
    min-height: 48px;
    padding: 0 24px;
    font-weight: 700;
}

/* Soft shadow на алёрт-блоки (--shadow-card, --radius-md) */
div[data-testid="stAlert"] {
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(13, 50, 118, 0.08);
}

/* Главная статус-строка под кадром («Кадр 270 / 507 · 00:08.967»).
   Брендовый navy + Poppins для большой одной строки. */
.ds-status-line {
    font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 1.5rem;
    font-weight: 500;
    color: #0D3276;
    letter-spacing: 0.01em;
    text-align: center;
    margin: 0.75rem 0 0.25rem 0;
}
.ds-status-line strong { font-weight: 700; }
</style>
        """,
        unsafe_allow_html=True,
    )


_inject_ds_theme()

st.title("dododo — анализ видео")
st.caption(
    "Инструмент поддержки наблюдений и коучинга родителей. "
    "Не является медицинским изделием и не заменяет очную клиническую оценку специалистом."
)

SCENARIOS = {
    "reaction_to_name": "Реакция на имя",
    "functional_task": "Функциональная задача (бытовая активность)",
}


# ============================================================================
# Тумблер режима: «Анализ видео» (существующий флоу) vs «Покадровая разметка».
# При выборе разметки рендерим панель и зовём st.stop() — существующий код
# режима «Анализ видео» ниже не выполняется. Регрессий нет, потому что в
# режиме по умолчанию ("Анализ видео") этот блок целиком пропускается.
# ============================================================================

MODES = ["Анализ видео", "Покадровая разметка"]
if "dododo_mode" not in st.session_state:
    st.session_state["dododo_mode"] = MODES[0]

st.radio("Режим", MODES, horizontal=True, key="dododo_mode")
st.divider()


def _format_timecode(seconds):
    """mm:ss.mmm. Чисто человекочитаемое представление, не для сравнений."""
    seconds = max(0.0, float(seconds))
    minutes = int(seconds // 60)
    rest = seconds - minutes * 60
    return f"{minutes:02d}:{rest:06.3f}"


if st.session_state["dododo_mode"] == "Покадровая разметка":
    st.subheader("Разметка начала движения")

    # Очистка осиротевших кэшей делается один раз за заход в режим
    if not st.session_state.get("dododo_annot_purged"):
        removed = storage.purge_orphan_frame_caches()
        st.session_state["dododo_annot_purged"] = True
        if removed:
            st.caption(f"Очищено осиротевших кэшей кадров: {removed}")

    # --- Выбор ребёнка ---
    _annot_children = storage.list_children()
    if not _annot_children:
        st.info("Нет сохранённых детей. Создайте профиль в режиме «Анализ видео».")
        st.stop()

    _annot_child_opts = [(c["id"], c["display_code"]) for c in _annot_children]
    _annot_child_idx = st.selectbox(
        "Ребёнок",
        options=list(range(len(_annot_child_opts))),
        format_func=lambda i: _annot_child_opts[i][1],
        key="dododo_annot_child_idx",
    )
    _annot_child_id = _annot_child_opts[_annot_child_idx][0]

    # --- Выбор сессии ---
    _annot_sessions = [
        s for s in storage.read_sessions(_annot_child_id)
        if s["has_video"] and s["has_csv"] and s["has_meta"]
    ]
    if not _annot_sessions:
        st.info("У этого ребёнка нет сессий с полным набором (video + csv + meta).")
        st.stop()

    _annot_sess_idx = st.selectbox(
        "Сессия",
        options=list(range(len(_annot_sessions))),
        format_func=lambda i: f"{_annot_sessions[i]['session_id'][:12]}…",
        key="dododo_annot_sess_idx",
    )
    _annot_session_id = _annot_sessions[_annot_sess_idx]["session_id"]

    # --- Открыть сессию ---
    _annot_key = f"{_annot_child_id}::{_annot_session_id}"
    _annot_loaded = st.session_state.get("dododo_annot_session")
    _annot_loaded_key = (
        f"{_annot_loaded['child_id']}::{_annot_loaded['session_id']}"
        if _annot_loaded else None
    )

    if _annot_loaded_key != _annot_key:
        if st.button("Открыть сессию", key="dododo_annot_open_btn"):
            try:
                video_path = storage.resolve_session_video_path(_annot_child_id, _annot_session_id)
                csv_path = storage.resolve_session_csv_path(_annot_child_id, _annot_session_id)
                meta_path = storage.resolve_session_meta_path(_annot_child_id, _annot_session_id)

                if not video_path.exists():
                    st.error(f"Файл видео не найден: {video_path}")
                    st.stop()
                if not csv_path.exists():
                    st.error(f"Файл landmarks.csv не найден: {csv_path}")
                    st.stop()
                if not meta_path.exists():
                    st.error(f"Файл meta.json не найден: {meta_path}")
                    st.stop()

                with open(meta_path) as f:
                    meta = json.load(f)
                fps = float(meta.get("fps", 0))
                if fps <= 0:
                    st.error(f"В meta.json нет валидного fps (fps={fps}).")
                    st.stop()
                scenario = meta.get("scenario", meta.get("scenario_key", "unknown"))

                frame_info = read_csv_frame_range(csv_path)
                if not frame_info["contiguous"]:
                    st.error(
                        f"В CSV есть пропуски кадров — степпер по позиционному "
                        f"индексу будет несогласован с абсолютным frame. "
                        f"min={frame_info['frame_min']}, max={frame_info['frame_max']}, "
                        f"строк={frame_info['row_count']}."
                    )
                    st.stop()

                expected = frame_info["frame_max"] - frame_info["frame_min"] + 1
                cache_dir = storage.frame_cache_dir(_annot_child_id, _annot_session_id)

                progress = st.progress(0.0, text="Распаковка кадров…")

                def _on_progress(written, total):
                    if total > 0:
                        progress.progress(min(written / total, 1.0),
                                          text=f"Кадр {written}/{total}")

                result = extract_frames_to_cache(
                    video_path, cache_dir,
                    frame_info["frame_min"], expected,
                    progress_cb=_on_progress,
                )
                progress.progress(1.0, text="Готово")

                # Жёсткие asserts (числа в сообщении — для трассируемости)
                if result["frames_written"] != expected:
                    raise RuntimeError(
                        f"frames_written={result['frames_written']} != "
                        f"frame_max−frame_min+1={expected}"
                    )
                if result["frames_written"] != frame_info["row_count"]:
                    raise RuntimeError(
                        f"frames_written={result['frames_written']} != "
                        f"row_count(CSV)={frame_info['row_count']}"
                    )

                st.session_state["dododo_annot_session"] = {
                    "child_id": _annot_child_id,
                    "session_id": _annot_session_id,
                    "frame_min": frame_info["frame_min"],
                    "frame_max": frame_info["frame_max"],
                    "row_count": frame_info["row_count"],
                    "fps": fps,
                    "scenario": scenario,
                    "cache_dir": result["cache_dir"],
                    "reused": result["reused"],
                    "video_path": str(video_path),
                    "csv_path": str(csv_path),
                    "meta_path": str(meta_path),
                }
                # Инициализация позиции степпера — середина клипа.
                # ВАЖНО: НЕ ставим playhead на auto-подсказку — это загрязняет эталон
                # (см. ограничение 1: разметчик не должен быть заякорён на мнении детектора).
                # Пишем И в каноническую переменную, И в widget-ключ слайдера ДО его
                # рендера (он отрендерится только на следующем прогоне, после rerun).
                _mid = (frame_info["frame_min"] + frame_info["frame_max"]) // 2
                st.session_state["dododo_step_frame_idx"] = _mid
                st.session_state["dododo_step_slider"] = _mid
                # Сбрасываем staged-отметку при открытии новой сессии — staging
                # привязан к конкретной сессии, не должен переноситься.
                st.session_state.pop("dododo_annot_staged_frame", None)

                # --- Авто-подсказка: клип-уровневое значение, считается ОДИН раз ---
                # Хранится в session_state. Если детектор пуст/упал — auto["auto_frame_index"]
                # = None, ручная разметка от этого не блокируется.
                _detector_params = {
                    "action_k": ACTION_K,
                    "action_min_threshold": ACTION_MIN_THRESHOLD,
                    "action_min_burst_frames": ACTION_MIN_BURST_FRAMES,
                    "baseline_window_s": BASELINE_WINDOW_S,
                    "wrist_min_visibility": WRIST_MIN_VISIBILITY,
                    "wrist_max_jump": WRIST_MAX_JUMP,
                }
                _auto = {
                    "auto_frame_index": None,
                    "onset_seconds": None,
                    "instruction_end_s": None,
                    "threshold": None,
                    "baseline": None,
                    "baseline_std": None,
                    "unavailable_reason": None,
                    "detector_params": _detector_params,
                }
                try:
                    try:
                        _ass = storage.read_assessment(_annot_child_id, _annot_session_id)
                    except FileNotFoundError:
                        _ass = None
                    except Exception:
                        _ass = None
                    if _ass is None:
                        _auto["unavailable_reason"] = "нет assessment.json"
                    else:
                        _instr_end = _ass.get("instruction_end_s")
                        if _instr_end is None or float(_instr_end) <= 0:
                            _auto["unavailable_reason"] = "нет instruction_end_s в assessment.json"
                        else:
                            _instr_end = float(_instr_end)
                            _t_arr, _ext = read_wrist_extension(csv_path)
                            _ext_s = smooth_signal(_ext)
                            if np.all(np.isnan(_ext_s)):
                                _auto["unavailable_reason"] = (
                                    "в landmarks.csv нет валидной колонки wrist_extension"
                                )
                            else:
                                _res = suggest_action_onset_frame(
                                    _t_arr, _ext_s, _instr_end,
                                    frame_info["frame_min"],
                                )
                                _auto["instruction_end_s"] = _instr_end
                                _auto["threshold"] = float(_res["threshold"])
                                _auto["baseline"] = float(_res["baseline"])
                                _auto["baseline_std"] = float(_res["baseline_std"])
                                if _res["auto_frame_index"] is not None:
                                    _af = int(_res["auto_frame_index"])
                                    _auto["auto_frame_index"] = _af
                                    _auto["onset_seconds"] = float(
                                        frame_to_seconds(
                                            _af,
                                            {"frame_min": frame_info["frame_min"], "fps": fps},
                                        )
                                    )
                                else:
                                    _auto["unavailable_reason"] = (
                                        "детектор не нашёл начало действия в окне"
                                    )
                except Exception as _e:
                    _auto["unavailable_reason"] = f"ошибка детектора: {_e}"

                st.session_state["dododo_annot_auto"] = _auto
                st.rerun()
            except Exception as e:
                st.error(f"Не удалось открыть сессию: {e}")
                st.stop()

    # --- Степпер: навигация по кадрам (Step 2) ---
    if _annot_loaded is not None and _annot_loaded_key == _annot_key:
        sess = _annot_loaded

        _fmin = int(sess["frame_min"])
        _fmax = int(sess["frame_max"])

        # Каноническая переменная состояния (НЕ widget-ключ). Слайдер живёт под
        # отдельным ключом dododo_step_slider; синхронизация — только через
        # on_click-колбэки кнопок и on_change-колбэк слайдера.
        if "dododo_step_frame_idx" not in st.session_state:
            st.session_state["dododo_step_frame_idx"] = (_fmin + _fmax) // 2
        if "dododo_step_slider" not in st.session_state:
            st.session_state["dododo_step_slider"] = st.session_state["dododo_step_frame_idx"]

        # Клампим возможные внешние состояния (вдруг загрузка другой сессии
        # оставила старое значение из предыдущей).
        _cur = int(st.session_state["dododo_step_frame_idx"])
        if _cur < _fmin or _cur > _fmax:
            _cur = max(_fmin, min(_fmax, _cur))
            st.session_state["dododo_step_frame_idx"] = _cur
            st.session_state["dododo_step_slider"] = _cur

        def _step_jump_cb(delta, fmin, fmax):
            cur = int(st.session_state.get("dododo_step_frame_idx", fmin))
            new = max(fmin, min(fmax, cur + int(delta)))
            st.session_state["dododo_step_frame_idx"] = new
            st.session_state["dododo_step_slider"] = new

        def _slider_changed_cb():
            v = int(st.session_state["dododo_step_slider"])
            # Клампинг на всякий случай (слайдер сам ограничен, но защитимся).
            v = max(_fmin, min(_fmax, v))
            st.session_state["dododo_step_frame_idx"] = v

        # Ряд кнопок: ⟪⟪ −L  ⟪ −M  ← −1   → +1  ⟫ +M  ⟫⟫ +L
        cols = st.columns(6)
        with cols[0]:
            st.button(
                f"⟪⟪ −{STEP_FRAMES_LARGE}",
                key="dododo_step_btn_minus_large",
                on_click=_step_jump_cb,
                args=(-STEP_FRAMES_LARGE, _fmin, _fmax),
                use_container_width=True,
            )
        with cols[1]:
            st.button(
                f"⟪ −{STEP_FRAMES_MEDIUM}",
                key="dododo_step_btn_minus_med",
                on_click=_step_jump_cb,
                args=(-STEP_FRAMES_MEDIUM, _fmin, _fmax),
                use_container_width=True,
            )
        with cols[2]:
            st.button(
                "← −1",
                key="dododo_step_btn_minus_one",
                on_click=_step_jump_cb,
                args=(-1, _fmin, _fmax),
                use_container_width=True,
            )
        with cols[3]:
            st.button(
                "+1 →",
                key="dododo_step_btn_plus_one",
                on_click=_step_jump_cb,
                args=(1, _fmin, _fmax),
                use_container_width=True,
            )
        with cols[4]:
            st.button(
                f"+{STEP_FRAMES_MEDIUM} ⟫",
                key="dododo_step_btn_plus_med",
                on_click=_step_jump_cb,
                args=(STEP_FRAMES_MEDIUM, _fmin, _fmax),
                use_container_width=True,
            )
        with cols[5]:
            st.button(
                f"+{STEP_FRAMES_LARGE} ⟫⟫",
                key="dododo_step_btn_plus_large",
                on_click=_step_jump_cb,
                args=(STEP_FRAMES_LARGE, _fmin, _fmax),
                use_container_width=True,
            )

        # Слайдер — отдельный widget-ключ, без value= (значение уже в session_state).
        st.slider(
            "Кадр",
            min_value=_fmin,
            max_value=_fmax,
            step=1,
            key="dododo_step_slider",
            on_change=_slider_changed_cb,
        )

        # Текущий индекс — берём из канона (после колбэков он уже свежий).
        cur = int(st.session_state["dododo_step_frame_idx"])
        png_path = frame_path_for(sess["cache_dir"], cur)
        if not png_path.exists():
            st.error(f"Файл кадра не найден: {png_path}")
            st.stop()

        # Все секунды считаются через frame_to_seconds, в одной точке.
        seconds = frame_to_seconds(cur, sess)
        timecode = _format_timecode(seconds)

        st.image(str(png_path))
        st.markdown(
            f'<div class="ds-status-line">'
            f"Кадр <strong>{cur}</strong> / {sess['row_count']} · "
            f"<strong>{timecode}</strong>"
            f"</div>",
            unsafe_allow_html=True,
        )
        st.caption("Скелет наложен автоматически")

        # ====================================================================
        # Эталонная разметка (movement onset)
        # ====================================================================
        st.divider()

        # --- Определение onset (видно во время разметки) ---
        is_draft = ONSET_DEFINITION_VERSION.endswith("draft0")
        st.markdown(
            f"**Определение «начало движения»** — версия `{ONSET_DEFINITION_VERSION}`:  \n"
            f"_{ONSET_DEFINITION_TEXT}_"
        )
        if is_draft:
            st.warning(
                "Версия определения — ЧЕРНОВАЯ (draft0). Эталон, размеченный сейчас, "
                "формально не является финальным `v1`. Поле `onset_definition.version` "
                "явно фиксирует это в каждой записи."
            )

        # --- Разметчик ---
        try:
            _default_annot_idx = ANNOTATORS.index(DEFAULT_ANNOTATOR_ID)
        except ValueError:
            _default_annot_idx = 0
        _annot_picked_idx = st.selectbox(
            "Разметчик",
            options=list(range(len(ANNOTATORS))),
            format_func=lambda i: ANNOTATORS[i],
            index=_default_annot_idx,
            key="dododo_annot_annotator_idx",
        )
        annotator_id = ANNOTATORS[_annot_picked_idx]

        # --- Резолв сценария ---
        meta_scenario = sess["scenario"]
        meta_scenario_valid = meta_scenario in VALID_SCENARIOS

        SENTINEL = "(не выбран — выберите явно)"
        if meta_scenario_valid:
            st.caption(f"Сценарий из meta.json: **`{meta_scenario}`**")
            _scen_options = list(VALID_SCENARIOS)
            _scen_default_idx = _scen_options.index(meta_scenario)
            _scen_picked_idx = st.selectbox(
                "Сценарий записи (для эталона)",
                options=list(range(len(_scen_options))),
                format_func=lambda i: _scen_options[i],
                index=_scen_default_idx,
                key="dododo_annot_scenario_idx",
            )
            final_scenario = _scen_options[_scen_picked_idx]
            if final_scenario != meta_scenario:
                st.warning(
                    f"⚠ Выбранный сценарий `{final_scenario}` НЕ совпадает с meta.json "
                    f"(`{meta_scenario}`). meta.json не перезаписывается; эталон "
                    "пишется с выбранным значением. Проверьте, что это намеренно."
                )
        else:
            st.warning(
                "Сценарий записи не определён — выберите ниже, иначе сохранение недоступно."
            )
            _scen_options = [SENTINEL] + list(VALID_SCENARIOS)
            _scen_picked_idx = st.selectbox(
                "Сценарий записи (для эталона) — обязателен",
                options=list(range(len(_scen_options))),
                format_func=lambda i: _scen_options[i],
                index=0,
                key="dododo_annot_scenario_idx",
            )
            picked = _scen_options[_scen_picked_idx]
            final_scenario = picked if picked != SENTINEL else None

        # --- Отметка кадра (staging) ---
        st.markdown("---")
        st.markdown("**Отметка начала движения**")

        staged = st.session_state.get("dododo_annot_staged_frame")
        if staged is not None:
            _s_sec = frame_to_seconds(int(staged), sess)
            st.success(
                f"Отмечено: кадр **{int(staged)}** · {_format_timecode(_s_sec)}"
            )
        else:
            st.info("Отметка не выставлена. Перейдите к нужному кадру и нажмите «Пометить».")

        def _mark_cb(frame_idx):
            st.session_state["dododo_annot_staged_frame"] = int(frame_idx)

        def _clear_cb():
            st.session_state.pop("dododo_annot_staged_frame", None)

        _mc1, _mc2 = st.columns([2, 1])
        with _mc1:
            st.button(
                "Пометить кадр как начало движения",
                key="dododo_annot_mark_btn",
                on_click=_mark_cb,
                args=(cur,),
                use_container_width=True,
            )
        with _mc2:
            st.button(
                "Очистить отметку",
                key="dododo_annot_clear_btn",
                on_click=_clear_cb,
                disabled=(staged is None),
                use_container_width=True,
            )

        # --- Авто-подсказка / калибровка — открывается ПОСЛЕ ручной отметки ---
        # Методологическое требование: до отметки эксперт не видит мнения детектора,
        # чтобы не якориться на его числе. Расчёт _auto_frame не двигается; меняется
        # только МОМЕНТ показа. Playhead к авто-кадру не двигается ни в каком случае.
        st.markdown("---")
        st.markdown("**Авто-подсказка (в калибровке)**")
        _auto = st.session_state.get("dododo_annot_auto", {}) or {}
        _auto_frame = _auto.get("auto_frame_index")

        if staged is None:
            st.caption(
                "Появится после вашей отметки — чтобы ваша разметка осталась независимой."
            )
        elif _auto_frame is not None:
            _manual_f = int(staged)
            _auto_f = int(_auto_frame)
            _delta = _auto_f - _manual_f  # отриц. = auto РАНЬШЕ; полож. = auto ПОЗЖЕ
            _mag = abs(_delta)
            if _delta == 0:
                _direction = "совпало кадр-в-кадр"
            elif _delta < 0:
                _direction = f"авто на **{_mag}** кадров **раньше** эксперта"
            else:
                _direction = f"авто на **{_mag}** кадров **позже** эксперта"
            _sec_diff_abs = abs(
                frame_to_seconds(_manual_f, sess) - frame_to_seconds(_auto_f, sess)
            )
            st.info(
                f"**Калибровка (в кадрах):** "
                f"manual = {_manual_f}, auto = {_auto_f}, "
                f"|Δ| = {_mag} кадр.  \n"
                f"{_direction} (≈ {_sec_diff_abs:.3f} с — только для глаз)"
            )
        else:
            st.caption(
                f"Авто-подсказка не получена: _{_auto.get('unavailable_reason') or 'нет данных'}_. "
                "Калибровку для этого клипа посчитать нельзя — это не блокирует сохранение разметки."
            )

        st.text_area(
            "Заметки разметчика",
            key="dododo_annot_notes",
            placeholder="Свободный текст (опционально)",
        )

        # --- Уже сохранённые разметки в этой сессии ---
        _ann_data = storage.read_onset_annotations(_annot_child_id, _annot_session_id)
        _ann_existing = _ann_data.get("annotations", []) if _ann_data else []

        if _ann_existing:
            st.markdown("**Уже сохранённые разметки в этой сессии:**")
            for a in _ann_existing:
                st.write(
                    f"- {a.get('annotator_id')} · "
                    f"{a.get('scenario')} · "
                    f"кадр **{a.get('frame_index')}** · "
                    f"{a.get('onset_seconds', 0):.2f} с · "
                    f"{a.get('marked_at', '')}"
                )

        # Проверка, перезатрёт ли сохранение существующую запись
        will_replace = False
        if final_scenario is not None and _ann_existing:
            for a in _ann_existing:
                if (a.get("annotator_id") == annotator_id
                    and a.get("onset_definition", {}).get("version") == ONSET_DEFINITION_VERSION
                    and a.get("scenario") == final_scenario):
                    will_replace = True
                    break
        if will_replace:
            st.warning(
                f"⚠ Уже есть запись от `{annotator_id}` по версии `{ONSET_DEFINITION_VERSION}` "
                f"для сценария `{final_scenario}`. Сохранение **перезапишет** её."
            )

        # --- Кнопка «Сохранить» ---
        save_blockers = []
        if staged is None:
            save_blockers.append("отметка не выставлена")
        if final_scenario is None:
            save_blockers.append("сценарий не выбран")

        save_disabled = bool(save_blockers)
        if save_disabled:
            st.warning("Сохранение недоступно: " + "; ".join(save_blockers))

        if st.button(
            "Сохранить отметку",
            key="dododo_annot_save_btn",
            disabled=save_disabled,
        ):
            try:
                _onset_seconds = float(frame_to_seconds(int(staged), sess))
                # Снимок авто-подсказки в МОМЕНТ сохранения. Если auto недоступна —
                # пишем null. Старые записи (Step 3 era) при upsert не трогаются,
                # потому что upsert меняет только запись с совпадающим ключом.
                _auto_snapshot = None
                if _auto_frame is not None:
                    _auto_snapshot = {
                        "frame_index": int(_auto_frame),
                        "onset_seconds": float(_auto.get("onset_seconds") or 0.0),
                        "source": "suggest_action_onset",
                        "detector_params": {
                            **(_auto.get("detector_params") or {}),
                            "instruction_end_s": _auto.get("instruction_end_s"),
                            "threshold_used": _auto.get("threshold"),
                            "baseline_used": _auto.get("baseline"),
                            "baseline_std_used": _auto.get("baseline_std"),
                        },
                    }
                annotation = {
                    "annotator_id": annotator_id,
                    "frame_index": int(staged),
                    "onset_seconds": _onset_seconds,
                    "seconds_source": "computed_fps",
                    "fps_used": float(sess["fps"]),
                    "scenario": final_scenario,
                    "marked_at": datetime.now(timezone.utc).isoformat(),
                    "onset_definition": {
                        "version": ONSET_DEFINITION_VERSION,
                        "text": ONSET_DEFINITION_TEXT,
                    },
                    "auto_suggestion_at_mark": _auto_snapshot,
                    "notes": st.session_state.get("dododo_annot_notes", ""),
                }
                path, was_replaced = storage.upsert_onset_annotation(
                    _annot_child_id, _annot_session_id,
                    session_fps=sess["fps"],
                    total_frames=sess["row_count"],
                    annotation=annotation,
                )
                if was_replaced:
                    st.success(f"Перезаписана прежняя запись от `{annotator_id}`.\n\nФайл: `{path}`")
                else:
                    st.success(f"Сохранена новая запись.\n\nФайл: `{path}`")
            except Exception as e:
                st.error(f"Не удалось сохранить: {e}")

        # --- Технические детали (закрыто по умолчанию) ---
        # Сюда уехало всё, что нужно разработчику/инженеру, но не разметчику:
        # asserts открытия сессии, точные числовые значения, формулы, путь к
        # PNG, raw-сценарий из meta.json, внутренности детектора.
        with st.expander("Технические детали", expanded=False):
            st.markdown(
                f"**Открытие сессии:** "
                f"frames_written = row_count(CSV) = (frame_max − frame_min + 1) = "
                f"**{sess['row_count']}**. "
                f"({'кэш переиспользован' if sess.get('reused') else 'кэш распакован заново'})"
            )
            st.markdown(
                f"**Кадр:** frame_index = {cur} · "
                f"диапазон {_fmin}..{_fmax} · всего {sess['row_count']} кадров · "
                f"fps = {sess['fps']:.2f}"
            )
            st.markdown(
                f"**Секунды (float):** {seconds:.6f} с "
                f"_(formula: (frame − frame_min) / fps)_"
            )
            st.markdown(f"**Сценарий из meta.json:** `{sess['scenario']}`")
            st.markdown(f"**PNG текущего кадра:** `{png_path}`")
            _auto_dbg = st.session_state.get("dododo_annot_auto", {}) or {}
            if _auto_dbg.get("auto_frame_index") is not None:
                st.markdown(
                    f"**Детектор:** instruction_end = "
                    f"{_auto_dbg.get('instruction_end_s', 0):.2f} с · "
                    f"порог = {_auto_dbg.get('threshold', 0):.4f} · "
                    f"baseline = {_auto_dbg.get('baseline', 0):.4f} · "
                    f"std = {_auto_dbg.get('baseline_std', 0):.4f}"
                )

    st.stop()


# ---------- Утилиты ----------

def _safe_stem(name):
    stem = Path(name).stem
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in stem) or "video"


def _reset_video_state():
    """Сбросить всё, что относится к текущему обработанному видео."""
    for key in list(st.session_state.keys()):
        if key.startswith("dododo_video_") or key.startswith("dododo_cand_") \
                or key.startswith("dododo_check_") or key.startswith("dododo_speech_") \
                or key.startswith("dododo_ft_") \
                or key in (
                "dododo_result", "dododo_input_path", "dododo_head_times",
                "dododo_head_signal_raw", "dododo_head_signal",
                "dododo_head_yaw_raw", "dododo_head_yaw",
                "dododo_wrist_raw", "dododo_wrist",
                "dododo_wrist_ext_raw", "dododo_wrist_ext",
                "dododo_ft_action_field", "dododo_ft_action_data",
                "dododo_audio", "dododo_speech",
                "dododo_manual_calls", "dododo_latency", "dododo_action_latency",
                "dododo_uploaded_name", "dododo_saved_session_dir",
        ):
            del st.session_state[key]


# ---------- Выбор / создание ребёнка ----------

st.subheader("Ребёнок")

children = storage.list_children()
options = [("", "(не выбран)")] + [(c["id"], c["display_code"]) for c in children]
labels = [label for _, label in options]
ids = [cid for cid, _ in options]

current_id = st.session_state.get("dododo_child_id", "")
try:
    default_idx = ids.index(current_id)
except ValueError:
    default_idx = 0

selected_idx = st.selectbox(
    "Выберите ребёнка",
    options=list(range(len(options))),
    format_func=lambda i: labels[i],
    index=default_idx,
)
selected_id = ids[selected_idx]
if selected_id != current_id:
    st.session_state["dododo_child_id"] = selected_id
    st.session_state.pop("dododo_saved_session_dir", None)

def _create_child_cb():
    """Колбэк кнопки «Создать». Модификация ключей виджетов разрешена внутри колбэков —
    он выполняется до отрисовки виджетов на следующем прогоне."""
    code = st.session_state.get("dododo_new_child_code", "")
    try:
        new_id = storage.create_child(code)
    except ValueError as e:
        st.session_state["dododo_create_child_error"] = str(e)
        return
    st.session_state["dododo_create_child_error"] = ""
    # Сразу делаем созданного ребёнка выбранным
    st.session_state["dododo_child_id"] = new_id
    # Очищаем поле ввода (тоже ключ виджета, но мы внутри колбэка — это разрешено)
    st.session_state["dododo_new_child_code"] = ""
    st.session_state.pop("dododo_saved_session_dir", None)


with st.expander("Создать нового"):
    st.text_input("Псевдоним / код (не имя)", key="dododo_new_child_code")
    st.button("Создать", key="dododo_create_child_btn", on_click=_create_child_cb)
    err = st.session_state.get("dododo_create_child_error", "")
    if err:
        st.error(err)

if st.session_state.get("dododo_child_id"):
    child = storage.read_child(st.session_state["dododo_child_id"])
    st.caption(f"Выбран: **{child['display_code']}** · id `{child['id'][:8]}…`")
else:
    st.caption("Ребёнок не выбран — выберите существующего или создайте нового.")

st.divider()

# ---------- Выбор сценария ----------

def _scenario_changed_cb():
    """Колбэк смены сценария: переносим машинный ключ в `dododo_scenario`."""
    label = st.session_state.get("dododo_scenario_widget", SCENARIOS["reaction_to_name"])
    for key, value in SCENARIOS.items():
        if value == label:
            st.session_state["dododo_scenario"] = key
            break


# По умолчанию — «Реакция на имя»
if "dododo_scenario" not in st.session_state:
    st.session_state["dododo_scenario"] = "reaction_to_name"

scenario_labels = list(SCENARIOS.values())
scenario_default_label = SCENARIOS[st.session_state["dododo_scenario"]]
st.radio(
    "Сценарий",
    options=scenario_labels,
    index=scenario_labels.index(scenario_default_label),
    key="dododo_scenario_widget",
    on_change=_scenario_changed_cb,
    horizontal=True,
)
scenario = st.session_state["dododo_scenario"]

st.divider()

# ---------- Загрузка / обработка видео ----------

uploaded = st.file_uploader("Загрузите видео", type=["mp4", "mov", "avi", "mkv"])

if uploaded is not None:
    if st.session_state.get("dododo_uploaded_name") != uploaded.name:
        _reset_video_state()
        st.session_state["dododo_uploaded_name"] = uploaded.name

if uploaded is not None and "dododo_result" not in st.session_state:
    if st.button("Обработать"):
        stamp = int(time.time())
        stem = f"{_safe_stem(uploaded.name)}_{stamp}"
        suffix = Path(uploaded.name).suffix or ".mp4"

        input_path = DATA_DIR / f"{stem}_input{suffix}"
        output_path = DATA_DIR / f"{stem}_skeleton.mp4"
        csv_path = DATA_DIR / f"{stem}_landmarks.csv"
        meta_path = DATA_DIR / f"{stem}_meta.json"

        with open(input_path, "wb") as f:
            f.write(uploaded.getbuffer())

        progress = st.progress(0.0, text="Обработка видео…")

        def on_progress(current, total):
            if total > 0:
                progress.progress(min(current / total, 1.0), text=f"Кадр {current}/{total}")

        try:
            result = process_video(
                input_path, output_path, csv_path, meta_path,
                progress_callback=on_progress,
            )
        except Exception as e:
            st.error(f"Ошибка обработки: {e}")
            st.stop()

        progress.progress(1.0, text="Готово")

        times, signal = read_head_turn(result["csv_path"])
        signal_s = smooth_signal(signal)
        _, yaw_deg = read_head_yaw_deg(result["csv_path"])
        yaw_deg_s = smooth_signal(yaw_deg)
        _, wrist = read_wrist_speed(result["csv_path"])
        wrist_s = smooth_signal(wrist)
        _, wrist_ext = read_wrist_extension(result["csv_path"])
        wrist_ext_s = smooth_signal(wrist_ext)
        audio = analyze_audio(input_path)

        # Распознавание речи — один раз при «Обработать», результат кладём в session_state
        try:
            speech_candidates = transcribe_calls(input_path)
        except Exception as e:
            st.warning(f"Не удалось выполнить распознавание речи: {e}")
            speech_candidates = []

        st.session_state["dododo_input_path"] = str(input_path)
        st.session_state["dododo_result"] = result
        st.session_state["dododo_head_times"] = times
        st.session_state["dododo_head_signal_raw"] = signal
        st.session_state["dododo_head_signal"] = signal_s
        st.session_state["dododo_head_yaw_raw"] = yaw_deg
        st.session_state["dododo_head_yaw"] = yaw_deg_s
        st.session_state["dododo_wrist_raw"] = wrist
        st.session_state["dododo_wrist"] = wrist_s
        st.session_state["dododo_wrist_ext_raw"] = wrist_ext
        st.session_state["dododo_wrist_ext"] = wrist_ext_s
        st.session_state["dododo_audio"] = audio
        st.session_state["dododo_speech"] = speech_candidates
        st.session_state["dododo_manual_calls"] = []
        st.rerun()

# ---------- Уже обработанное видео: показываем результаты ----------

if "dododo_result" in st.session_state:
    result = st.session_state["dododo_result"]

    with open(result["video_path"], "rb") as f:
        st.video(f.read())

    st.subheader("Метрики")
    activity = result["metrics"]["overall_activity"]
    detected = result["detected_frames"]
    total_frames = result["total_frames"]
    st.write(f"**Общая активность движения:** {activity}")
    st.write(f"**Поза найдена:** {detected} из {total_frames} кадров")
    st.write(f"**FPS:** {round(result['fps'], 2)} · **Размер:** {result['width']}×{result['height']}")

    times = st.session_state["dododo_head_times"]
    signal = st.session_state["dododo_head_signal_raw"]
    signal_s = st.session_state["dododo_head_signal"]
    yaw_raw = st.session_state.get("dododo_head_yaw_raw")
    yaw_s = st.session_state.get("dododo_head_yaw")
    wrist_raw = st.session_state.get("dododo_wrist_raw")
    wrist_s = st.session_state.get("dododo_wrist")

    # --- График сценария «Реакция на имя» ---
    if scenario == "reaction_to_name":
        st.subheader("Поворот головы по времени")
        if np.all(np.isnan(signal)) and (yaw_raw is None or np.all(np.isnan(yaw_raw))):
            st.info("Не удалось посчитать поворот головы (точки головы / лицо не найдены).")
        else:
            fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 7), sharex=True)

            # Верхний — Pose head_turn (без изменений: используется для латентности)
            if not np.all(np.isnan(signal)):
                ax1.plot(times, signal, color="lightblue", linewidth=1, label="Сырой")
                ax1.plot(times, signal_s, color="darkblue", linewidth=2, label="Сглаженный")
                ax1.axhline(0, color="gray", linestyle="--", linewidth=0.8, label="Взгляд в камеру")
            else:
                ax1.text(0.5, 0.5, "Нет данных Pose", ha="center", va="center", transform=ax1.transAxes)
            ax1.set_ylabel("Индекс")
            ax1.set_title("Поворот головы (Pose, индекс)")
            ax1.legend(loc="upper right")
            ax1.grid(True, alpha=0.3)

            # Нижний — Face yaw в градусах (только для сравнения, в латентности не участвует)
            if yaw_raw is not None and not np.all(np.isnan(yaw_raw)):
                ax2.plot(times, yaw_raw, color="lightsalmon", linewidth=1, label="Сырой")
                ax2.plot(times, yaw_s, color="darkred", linewidth=2, label="Сглаженный")
                ax2.axhline(0, color="gray", linestyle="--", linewidth=0.8, label="Взгляд в камеру")
            else:
                ax2.text(0.5, 0.5, "Лицо не найдено", ha="center", va="center", transform=ax2.transAxes)
            ax2.set_xlabel("Время, сек")
            ax2.set_ylabel("Yaw, °")
            ax2.set_title("Поворот головы (Face, градусы)")
            ax2.legend(loc="upper right")
            ax2.grid(True, alpha=0.3)

            fig.tight_layout()
            st.pyplot(fig)

    # --- График сценария «Функциональная задача» ---
    if scenario == "functional_task":
        st.subheader("Движение руки по времени")
        if wrist_raw is None or np.all(np.isnan(wrist_raw)):
            st.info("Не удалось посчитать движение кисти (точки запястий не найдены).")
        else:
            fig, ax = plt.subplots(figsize=(10, 4))
            ax.plot(times, wrist_raw, color="lightgreen", linewidth=1, label="Сырой")
            ax.plot(times, wrist_s, color="darkgreen", linewidth=2, label="Сглаженный")
            ax.set_xlabel("Время, сек")
            ax.set_ylabel("Скорость кисти (норм. ед./кадр)")
            ax.legend(loc="upper right")
            ax.grid(True, alpha=0.3)
            fig.tight_layout()
            st.pyplot(fig)

    # ====================================================================
    # Сценарий «Реакция на имя»: оклики → латентность поворота головы → чеклист
    # ====================================================================
    if scenario == "reaction_to_name":
        st.subheader("Реакция на имя")
        audio = st.session_state["dododo_audio"]

        if not audio["has_audio"]:
            st.info("В видео нет звуковой дорожки — кандидатов-окликов нет. "
                    "Можно добавить моменты оклика вручную ниже.")
        else:
            fig, ax = plt.subplots(figsize=(10, 4))
            ax.plot(audio["times"], audio["loudness"], color="steelblue", linewidth=1, label="Громкость")
            ax.axhline(audio["threshold"], color="gray", linestyle="--", linewidth=0.8, label="Порог")
            for t in audio["candidates"]:
                ax.axvline(t, color="red", linestyle="-", linewidth=1.2, alpha=0.6)
            if audio["candidates"]:
                cand_idx = [int(round(t * 1000 / 50)) for t in audio["candidates"]]
                cand_idx = [i for i in cand_idx if 0 <= i < len(audio["loudness"])]
                ax.scatter([audio["times"][i] for i in cand_idx],
                           [audio["loudness"][i] for i in cand_idx],
                           color="red", zorder=5, label="Кандидаты")
            ax.set_xlabel("Время, сек")
            ax.set_ylabel("Громкость (0..1)")
            ax.legend()
            ax.grid(True, alpha=0.3)
            fig.tight_layout()
            st.pyplot(fig)

        st.markdown("**Подтвердите оклики из кандидатов по громкости:**")
        candidates = audio["candidates"]
        if not candidates:
            st.caption("Кандидатов по громкости не найдено.")
        else:
            for i, t in enumerate(candidates):
                st.checkbox(f"оклик на {t:.2f} с", key=f"dododo_cand_{i}", value=False)

        st.markdown("**Подтвердите оклики из кандидатов по речи:**")
        speech = st.session_state.get("dododo_speech", []) or []
        highlight = st.text_input(
            "Подсветить кандидатов со словом",
            value="",
            key="dododo_speech_highlight",
            placeholder="например: имя ребёнка",
        ).strip().lower()
        if not speech:
            st.caption("Речевых кандидатов не найдено.")
        else:
            for i, s in enumerate(speech):
                t0 = float(s.get("start_s", 0.0))
                text = s.get("text", "").strip()
                mark = " ⭐" if highlight and highlight in text.lower() else ""
                st.checkbox(
                    f"[{t0:.2f} с] «{text}»{mark}",
                    key=f"dododo_speech_{i}",
                    value=False,
                )

        st.markdown("**Добавить оклик вручную (секунды):**")
        col1, col2 = st.columns([3, 1])
        with col1:
            manual_t = st.number_input(
                "Момент оклика",
                min_value=0.0,
                value=0.0,
                step=0.1,
                format="%.2f",
                key="dododo_manual_input",
                label_visibility="collapsed",
            )
        with col2:
            if st.button("Добавить"):
                st.session_state["dododo_manual_calls"].append(float(manual_t))
                st.rerun()

        manual_calls = st.session_state["dododo_manual_calls"]
        if manual_calls:
            st.caption("Добавлено вручную: " + ", ".join(f"{t:.2f} с" for t in manual_calls))
            if st.button("Очистить ручные оклики"):
                st.session_state["dododo_manual_calls"] = []
                st.rerun()

        if st.button("Посчитать реакции"):
            confirmed = []
            for i, t in enumerate(candidates):
                if st.session_state.get(f"dododo_cand_{i}", False):
                    confirmed.append(float(t))
            for i, s in enumerate(speech):
                if st.session_state.get(f"dododo_speech_{i}", False):
                    confirmed.append(float(s.get("start_s", 0.0)))
            confirmed.extend(manual_calls)
            confirmed = sorted(set(round(t, 3) for t in confirmed))

            if not confirmed:
                st.warning("Не выбран ни один оклик.")
            elif np.all(np.isnan(signal_s)):
                st.warning("Сигнал поворота головы пуст — расчёт невозможен.")
            else:
                lat = measure_latencies(times, signal_s, confirmed,
                                        response_window_s=RESPONSE_WINDOW_S,
                                        turn_threshold=TURN_THRESHOLD)
                st.session_state["dododo_latency"] = {
                    "confirmed_calls": confirmed,
                    "lat": lat,
                }

        if "dododo_latency" in st.session_state:
            lat = st.session_state["dododo_latency"]["lat"]
            confirmed = st.session_state["dododo_latency"]["confirmed_calls"]

            st.markdown("**Результаты:**")
            for r in lat["results"]:
                if r["latency_s"] is not None:
                    st.write(f"оклик на {r['call_t']:.1f} с → реакция через {r['latency_s']:.2f} с")
                else:
                    st.write(f"оклик на {r['call_t']:.1f} с → реакции не обнаружено")
            st.write(f"**Доля откликов:** {lat['responded']} из {lat['total']}")

            fig, ax = plt.subplots(figsize=(10, 4))
            ax.plot(times, signal_s, color="darkblue", linewidth=2, label="Поворот головы")
            ax.axhline(0, color="gray", linestyle="--", linewidth=0.8)
            ymax = np.nanmax(signal_s) if not np.all(np.isnan(signal_s)) else 1.0
            for r in lat["results"]:
                ax.axvline(r["call_t"], color="orange", linestyle="-", linewidth=2)
                ax.text(r["call_t"], ymax, f"оклик\n{r['call_t']:.1f}с",
                        color="orange", ha="center", fontsize=9, va="bottom")
                if r["reaction_idx"] is not None:
                    ridx = r["reaction_idx"]
                    ax.scatter([times[ridx]], [signal_s[ridx]], color="red", s=90, zorder=5)
                    ax.annotate(f"+{r['latency_s']:.2f}с",
                                (times[ridx], signal_s[ridx]),
                                textcoords="offset points", xytext=(8, 8), color="red")
            ax.set_xlabel("Время, сек")
            ax.set_ylabel("Индекс поворота головы")
            ax.legend()
            ax.grid(True, alpha=0.3)
            fig.tight_layout()
            st.pyplot(fig)

            # ----- Чеклист и сохранение -----
            st.divider()
            st.subheader("Чеклист «Реакция на имя»")

            YES_PART_NO = ["да", "частично", "нет"]
            ATTEMPT = ["с 1-й", "со 2-й", "с 3-й", "не было"]
            CHARACTER = ["полный разворот", "только взгляд или лёгкое движение", "нет"]
            HOLD = ["удержал", "кратковременно", "нет"]

            st.radio("Повернул голову или корпус в сторону зовущего",
                     YES_PART_NO, key="dododo_check_turn", horizontal=True)
            st.radio("Установил зрительный контакт",
                     YES_PART_NO, key="dododo_check_eye", horizontal=True)
            st.radio("С какой попытки последовал первый отклик",
                     ATTEMPT, key="dododo_check_attempt", horizontal=True)
            st.radio("Характер отклика",
                     CHARACTER, key="dododo_check_character")
            st.radio("Прервал текущее занятие, чтобы отреагировать",
                     YES_PART_NO, key="dododo_check_interrupt", horizontal=True)
            st.radio("Удержание внимания после отклика",
                     HOLD, key="dododo_check_hold", horizontal=True)
            st.select_slider("Общая оценка отклика на имя",
                             options=[0, 1, 2, 3], value=0,
                             key="dododo_check_overall")
            st.text_area("Заметки специалиста", key="dododo_check_notes",
                         placeholder="Свободный текст…")

            st.markdown(" ")
            child_id = st.session_state.get("dododo_child_id", "")
            if not child_id:
                st.warning("Чтобы сохранить запись, выберите ребёнка или создайте нового вверху страницы.")
                save_disabled = True
            else:
                save_disabled = False

            if st.button("Сохранить запись в профиль", disabled=save_disabled):
                try:
                    session_id = storage.create_session(child_id)
                    files = storage.save_session_files(
                        child_id, session_id,
                        video_src=result["video_path"],
                        csv_src=result["csv_path"],
                        meta_src=result["meta_path"],
                    )

                    checklist = {
                        "head_or_body_turn": st.session_state["dododo_check_turn"],
                        "eye_contact": st.session_state["dododo_check_eye"],
                        "first_response_attempt": st.session_state["dododo_check_attempt"],
                        "response_character": st.session_state["dododo_check_character"],
                        "interrupted_activity": st.session_state["dododo_check_interrupt"],
                        "attention_after_response": st.session_state["dododo_check_hold"],
                        "overall_score": int(st.session_state["dododo_check_overall"]),
                    }

                    assessment = {
                        "checklist_version": CHECKLIST_VERSIONS["reaction_to_name"],
                        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                        "scenario": "reaction_to_name",
                        "child_id": child_id,
                        "session_id": session_id,
                        "confirmed_calls_s": confirmed,
                        "latency": {
                            "response_window_s": RESPONSE_WINDOW_S,
                            "turn_threshold": TURN_THRESHOLD,
                            "results": lat["results"],
                            "responded": lat["responded"],
                            "total": lat["total"],
                            "response_rate": lat["response_rate"],
                        },
                        "metrics": {
                            "overall_activity": result["metrics"]["overall_activity"],
                            "detected_frames": result["detected_frames"],
                            "total_frames": result["total_frames"],
                            "fps": result["fps"],
                            "width": result["width"],
                            "height": result["height"],
                        },
                        "checklist": checklist,
                        "notes": st.session_state.get("dododo_check_notes", ""),
                    }
                    storage.save_assessment(child_id, session_id, assessment)
                    st.session_state["dododo_saved_session_dir"] = storage.session_dir(child_id, session_id)
                except Exception as e:
                    st.error(f"Ошибка сохранения: {e}")

            if "dododo_saved_session_dir" in st.session_state:
                st.success("Запись сохранена в профиль.")
                st.code(st.session_state["dododo_saved_session_dir"], language=None)

    # ====================================================================
    # Сценарий «Функциональная задача»: инструкция → начало действия → чеклист
    # ====================================================================
    if scenario == "functional_task":
        st.subheader("Функциональная задача (бытовая активность)")

        # --- Распознанные фразы (инструкция-кандидат) ---
        speech = st.session_state.get("dododo_speech", []) or []
        utterances = group_words_into_utterances(speech)

        st.markdown("**Инструкция, произнесённая в видео:**")
        SENTINEL = "(не выбрано)"
        if utterances:
            options = [SENTINEL] + [
                f"[{u['start_s']:.2f}–{u['end_s']:.2f} с] «{u['text']}»"
                for u in utterances
            ]
            st.radio(
                "Выберите фразу-инструкцию",
                options=options,
                index=1 if len(utterances) >= 1 else 0,
                key="dododo_ft_inst_choice",
            )
        else:
            st.caption("Распознанных фраз не найдено. Задайте момент конца инструкции вручную ниже.")
            st.session_state["dododo_ft_inst_choice"] = SENTINEL

        st.markdown("**Момент конца инструкции, секунды (опционально, переопределяет выбор фразы):**")
        st.number_input(
            "Момент конца инструкции (вручную)",
            min_value=0.0,
            value=0.0,
            step=0.1,
            format="%.2f",
            key="dododo_ft_inst_manual",
            label_visibility="collapsed",
            help="Оставьте 0, чтобы взять момент конца выбранной фразы.",
        )

        # --- Кнопка: посчитать авто-подсказку начала действия ---
        wrist_ext_s = st.session_state.get("dododo_wrist_ext")
        if st.button("Посчитать начало действия"):
            # Разрешаем instruction_end_s
            manual_v = float(st.session_state.get("dododo_ft_inst_manual", 0.0) or 0.0)
            chosen = st.session_state.get("dododo_ft_inst_choice", SENTINEL)
            instruction_end_s = None
            instruction_source = ""
            instruction_text = ""
            if manual_v > 0:
                instruction_end_s = manual_v
                instruction_source = "manual"
                instruction_text = ""
            elif chosen != SENTINEL and utterances:
                idx = options.index(chosen) - 1  # минус sentinel
                if 0 <= idx < len(utterances):
                    instruction_end_s = float(utterances[idx]["end_s"])
                    instruction_source = "phrase"
                    instruction_text = utterances[idx]["text"]

            if instruction_end_s is None:
                st.warning("Не задан момент конца инструкции — выберите фразу или введите время вручную.")
            elif wrist_ext_s is None or np.all(np.isnan(wrist_ext_s)):
                st.warning("Сигнал движения руки (wrist_extension) пуст — авто-подсказка невозможна.")
            else:
                suggestion = suggest_action_onset(times, wrist_ext_s, instruction_end_s)
                st.session_state["dododo_ft_action_data"] = {
                    "instruction_end_s": instruction_end_s,
                    "instruction_source": instruction_source,
                    "instruction_text": instruction_text,
                    "suggested_onset_s": suggestion["suggested_onset_s"],
                    "suggested_onset_idx": suggestion["suggested_onset_idx"],
                    "threshold": suggestion["threshold"],
                    "baseline": suggestion["baseline"],
                    "baseline_std": suggestion["baseline_std"],
                }
                # Префилл поля. Сделано ДО ренденра number_input на этом проходе,
                # потому что виджет рендерится только в ветке ниже (if action_data).
                st.session_state["dododo_ft_action_field"] = float(
                    suggestion["suggested_onset_s"] or 0.0
                )
                st.rerun()

        if "dododo_ft_action_data" in st.session_state:
            data = st.session_state["dododo_ft_action_data"]
            instruction_end_s = data["instruction_end_s"]
            suggested_onset_s = data["suggested_onset_s"]
            threshold = data["threshold"]

            # --- Поле «Момент начала действия (сек)» с префиллом авто-подсказки ---
            st.markdown("**Момент начала действия (сек):**")
            if suggested_onset_s is not None:
                st.caption(f"авто-подсказка: {suggested_onset_s:.2f} с (можно изменить)")
            else:
                st.caption("авто-подсказка недоступна — отметьте вручную")
            confirmed_field = st.number_input(
                "Момент начала действия (сек)",
                min_value=0.0,
                step=0.1,
                format="%.2f",
                key="dododo_ft_action_field",
                label_visibility="collapsed",
            )
            confirmed_onset_s = float(confirmed_field) if confirmed_field and confirmed_field > 0 else None

            # --- График: extension + линия инструкции + серая (подсказка) + зелёная (подтверждённое) ---
            fig, ax = plt.subplots(figsize=(10, 4))
            ax.plot(times, wrist_ext_s, color="darkblue", linewidth=2,
                    label="Движение руки (extension, сглаженный)")
            ax.axhline(threshold, color="gray", linestyle=":", linewidth=0.9,
                       label=f"Порог {threshold:.3f}")
            ax.axvline(instruction_end_s, color="orange", linestyle="-", linewidth=2,
                       label="Конец инструкции")

            def _y_at(t_target):
                # Значение сигнала на ближайшем кадре к t_target
                idx = int(np.argmin(np.abs(times - t_target)))
                v = wrist_ext_s[idx] if not np.isnan(wrist_ext_s[idx]) else 0.0
                return float(v)

            if suggested_onset_s is not None:
                ax.scatter([suggested_onset_s], [_y_at(suggested_onset_s)],
                           color="gray", s=80, zorder=4, label="Авто-подсказка")
            if confirmed_onset_s is not None:
                ax.scatter([confirmed_onset_s], [_y_at(confirmed_onset_s)],
                           color="green", s=110, zorder=5, label="Подтверждённое начало")
            ax.set_xlabel("Время, сек")
            ax.set_ylabel("Extension (норм. ед.)")
            ax.legend(loc="upper right")
            ax.grid(True, alpha=0.3)
            fig.tight_layout()
            st.pyplot(fig)

            # --- Результат ---
            st.markdown("**Результат:**")
            if confirmed_onset_s is not None:
                latency_s = confirmed_onset_s - instruction_end_s
                st.write(
                    f"инструкция завершена на {instruction_end_s:.1f} с → "
                    f"начало действия {confirmed_onset_s:.2f} с → "
                    f"латентность {latency_s:.2f} с"
                )
            else:
                latency_s = None
                st.write(
                    f"инструкция завершена на {instruction_end_s:.1f} с → "
                    "начало действия не отмечено"
                )

            # Определяем источник: auto_accepted, если значение в пределах 0.05с от подсказки.
            if confirmed_onset_s is None:
                action_onset_source = "none"
            elif suggested_onset_s is not None and abs(confirmed_onset_s - suggested_onset_s) <= 0.05:
                action_onset_source = "auto_accepted"
            else:
                action_onset_source = "manual"

            # ----- Чеклист и сохранение -----
            st.divider()
            st.subheader("Чеклист «Функциональная задача»")

            REACHED = ["да", "частично", "нет"]
            GRIP = ["уверенный", "неуверенный", "не удалось"]
            COMPLETED = ["полностью", "частично", "нет"]
            SMOOTH = ["плавно", "с заминками", "с большим усилием"]
            PROMPTING = ["нет", "немного", "много"]

            st.radio("Дотянулся до нужного предмета",
                     REACHED, key="dododo_ft_reached", horizontal=True)
            st.radio("Качество захвата",
                     GRIP, key="dododo_ft_grip", horizontal=True)
            st.radio("Завершил действие",
                     COMPLETED, key="dododo_ft_completed", horizontal=True)
            st.radio("Плавность движения",
                     SMOOTH, key="dododo_ft_smooth")
            st.radio("Нужна была подсказка/повтор",
                     PROMPTING, key="dododo_ft_prompting", horizontal=True)
            st.select_slider("Общая оценка выполнения",
                             options=[0, 1, 2, 3], value=0,
                             key="dododo_ft_overall")
            st.text_area("Заметки специалиста", key="dododo_ft_notes",
                         placeholder="Свободный текст…")

            st.markdown(" ")
            child_id = st.session_state.get("dododo_child_id", "")
            if not child_id:
                st.warning("Чтобы сохранить запись, выберите ребёнка или создайте нового вверху страницы.")
                save_disabled = True
            else:
                save_disabled = False

            if st.button("Сохранить запись в профиль", disabled=save_disabled,
                         key="dododo_ft_save_btn"):
                try:
                    session_id = storage.create_session(child_id)
                    files = storage.save_session_files(
                        child_id, session_id,
                        video_src=result["video_path"],
                        csv_src=result["csv_path"],
                        meta_src=result["meta_path"],
                    )

                    checklist = {
                        "reached_target": st.session_state["dododo_ft_reached"],
                        "grip_quality": st.session_state["dododo_ft_grip"],
                        "completed_action": st.session_state["dododo_ft_completed"],
                        "movement_smoothness": st.session_state["dododo_ft_smooth"],
                        "needed_prompting": st.session_state["dododo_ft_prompting"],
                        "overall_score": int(st.session_state["dododo_ft_overall"]),
                    }

                    assessment = {
                        "checklist_version": CHECKLIST_VERSIONS["functional_task"],
                        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                        "scenario": "functional_task",
                        "child_id": child_id,
                        "session_id": session_id,
                        "instruction_end_s": instruction_end_s,
                        "instruction_source": data.get("instruction_source", ""),
                        "instruction_text": data.get("instruction_text", ""),
                        "action_onset_s": confirmed_onset_s,
                        "action_onset_suggested_s": suggested_onset_s,
                        "action_onset_source": action_onset_source,
                        "action_latency_s": latency_s,
                        "params": {
                            "action_k": ACTION_K,
                            "action_min_threshold": ACTION_MIN_THRESHOLD,
                            "action_min_burst_frames": ACTION_MIN_BURST_FRAMES,
                            "baseline_window_s": BASELINE_WINDOW_S,
                            "wrist_min_visibility": WRIST_MIN_VISIBILITY,
                            "wrist_max_jump": WRIST_MAX_JUMP,
                            "threshold_used": threshold,
                            "baseline_used": data.get("baseline", 0.0),
                            "baseline_std_used": data.get("baseline_std", 0.0),
                        },
                        "metrics": {
                            "overall_activity": result["metrics"]["overall_activity"],
                            "detected_frames": result["detected_frames"],
                            "total_frames": result["total_frames"],
                            "fps": result["fps"],
                            "width": result["width"],
                            "height": result["height"],
                        },
                        "checklist": checklist,
                        "notes": st.session_state.get("dododo_ft_notes", ""),
                    }
                    storage.save_assessment(child_id, session_id, assessment)
                    st.session_state["dododo_saved_session_dir"] = storage.session_dir(child_id, session_id)
                except Exception as e:
                    st.error(f"Ошибка сохранения: {e}")

            if "dododo_saved_session_dir" in st.session_state:
                st.success("Запись сохранена в профиль.")
                st.code(st.session_state["dododo_saved_session_dir"], language=None)

    st.caption(
        f"Файлы (рабочие): {Path(result['video_path']).name} · "
        f"{Path(result['csv_path']).name} · "
        f"{Path(result['meta_path']).name}"
    )
