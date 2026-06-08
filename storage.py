"""Фасад хранилища dododo.

Весь доступ к диску проходит через этот модуль — структуру папок и формат
файлов можно потом заменить на базу данных, не трогая app.py/engine.py.
"""

import json
import shutil
import uuid
from datetime import datetime
from pathlib import Path

from config import (
    CHILDREN_DIR,
    FRAME_CACHE_ROOT,
    ONSET_ANNOTATIONS_FILENAME,
    ONSET_SCHEMA_VERSION,
)


# ---------- Внутренние помощники ----------

def _child_dir(child_id):
    return CHILDREN_DIR / child_id


def _child_file(child_id):
    return _child_dir(child_id) / "child.json"


def _sessions_dir(child_id):
    return _child_dir(child_id) / "sessions"


def _session_dir(child_id, session_id):
    return _sessions_dir(child_id) / session_id


def _prefix(child_id, session_id):
    return f"{child_id}_{session_id}_"


def _resolve_session_file(child_id, session_id, suffix):
    """Вернуть путь к файлу записи: сначала ищем префиксованное имя, потом старое без префикса.

    suffix — это «хвост» имени, например «video.mp4», «landmarks.csv», «meta.json», «assessment.json».
    """
    sd = _session_dir(child_id, session_id)
    new_path = sd / f"{_prefix(child_id, session_id)}{suffix}"
    if new_path.exists():
        return new_path
    legacy = sd / suffix
    return legacy


def _now():
    return datetime.now().isoformat(timespec="seconds")


def _write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------- Дети ----------

def create_child(display_code):
    """Создать ребёнка с псевдонимом display_code. Возвращает child_id."""
    display_code = (display_code or "").strip()
    if not display_code:
        raise ValueError("display_code пустой")

    child_id = uuid.uuid4().hex
    child = {
        "id": child_id,
        "display_code": display_code,
        "created_at": _now(),
    }
    _child_dir(child_id).mkdir(parents=True, exist_ok=True)
    _sessions_dir(child_id).mkdir(parents=True, exist_ok=True)
    _write_json(_child_file(child_id), child)
    return child_id


def list_children():
    """Список всех детей: [{id, display_code, created_at}, ...], отсортирован по дате."""
    if not CHILDREN_DIR.exists():
        return []
    children = []
    for d in CHILDREN_DIR.iterdir():
        if not d.is_dir():
            continue
        cf = d / "child.json"
        if cf.exists():
            try:
                children.append(_read_json(cf))
            except Exception:
                continue
    children.sort(key=lambda c: c.get("created_at", ""))
    return children


def read_child(child_id):
    """Профиль ребёнка."""
    return _read_json(_child_file(child_id))


# ---------- Записи (sessions) ----------

def create_session(child_id):
    """Создать пустую запись (session) для ребёнка. Возвращает session_id."""
    if not _child_file(child_id).exists():
        raise ValueError(f"Ребёнок {child_id} не найден")
    session_id = uuid.uuid4().hex
    _session_dir(child_id, session_id).mkdir(parents=True, exist_ok=True)
    return session_id


def save_session_files(child_id, session_id, video_src, csv_src, meta_src):
    """Скопировать видео, landmarks.csv и meta.json в папку записи.

    Файлы получают префикс «<child_id>_<session_id>_». В meta.json дополнительно
    подмешиваются поля child_id и session_id (их во входном meta нет, потому что
    process_video не знает про session).

    Возвращает dict с путями к итоговым файлам.
    """
    sd = _session_dir(child_id, session_id)
    sd.mkdir(parents=True, exist_ok=True)

    prefix = _prefix(child_id, session_id)
    video_dst = sd / f"{prefix}video.mp4"
    csv_dst = sd / f"{prefix}landmarks.csv"
    meta_dst = sd / f"{prefix}meta.json"

    shutil.copy2(str(video_src), str(video_dst))
    shutil.copy2(str(csv_src), str(csv_dst))

    # meta.json — копируем и обогащаем child_id/session_id
    try:
        meta_data = _read_json(Path(meta_src))
    except Exception:
        meta_data = {}
    meta_data["child_id"] = child_id
    meta_data["session_id"] = session_id
    _write_json(meta_dst, meta_data)

    return {
        "video_path": str(video_dst),
        "csv_path": str(csv_dst),
        "meta_path": str(meta_dst),
    }


def save_assessment(child_id, session_id, assessment):
    """Записать assessment.json. assessment — самодостаточный dict, не требующий видео.

    Имя файла — «<child_id>_<session_id>_assessment.json».
    """
    sd = _session_dir(child_id, session_id)
    sd.mkdir(parents=True, exist_ok=True)
    path = sd / f"{_prefix(child_id, session_id)}assessment.json"
    _write_json(path, assessment)
    return str(path)


def read_sessions(child_id):
    """Список записей ребёнка: [{session_id, dir, has_video, has_assessment, ...}].

    Проверка наличия файлов: сперва префиксованные имена, fallback — старые без префикса.
    """
    sd = _sessions_dir(child_id)
    if not sd.exists():
        return []
    out = []
    for d in sd.iterdir():
        if not d.is_dir():
            continue
        session_id = d.name
        prefix = _prefix(child_id, session_id)
        out.append({
            "session_id": session_id,
            "dir": str(d),
            "has_video": (d / f"{prefix}video.mp4").exists() or (d / "video.mp4").exists(),
            "has_csv": (d / f"{prefix}landmarks.csv").exists() or (d / "landmarks.csv").exists(),
            "has_meta": (d / f"{prefix}meta.json").exists() or (d / "meta.json").exists(),
            "has_assessment": (d / f"{prefix}assessment.json").exists() or (d / "assessment.json").exists(),
        })
    out.sort(key=lambda s: s["session_id"])
    return out


def read_assessment(child_id, session_id):
    """Прочитать assessment.json конкретной записи (с fallback на старое имя)."""
    return _read_json(_resolve_session_file(child_id, session_id, "assessment.json"))


def session_dir(child_id, session_id):
    """Публичный аксессор к пути папки записи (для показа пользователю)."""
    return str(_session_dir(child_id, session_id))


# ---------- Резолверы файлов сессии (для покадровой панели) ----------

def resolve_session_video_path(child_id, session_id):
    """Путь к session-видео с fallback на legacy-имя."""
    return _resolve_session_file(child_id, session_id, "video.mp4")


def resolve_session_csv_path(child_id, session_id):
    return _resolve_session_file(child_id, session_id, "landmarks.csv")


def resolve_session_meta_path(child_id, session_id):
    return _resolve_session_file(child_id, session_id, "meta.json")


# ---------- Эфемерный кэш кадров (вне data/, в системном temp) ----------

def frame_cache_dir(child_id, session_id):
    """Каталог PNG-кэша для сессии. Лежит вне data/children/... — это эфемерные
    производные данные (изображения детей), они не должны переживать удаление
    исходного видео."""
    FRAME_CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    return FRAME_CACHE_ROOT / f"{child_id}_{session_id}"


def clear_frame_cache(child_id, session_id):
    """Полностью удалить PNG-кэш конкретной сессии."""
    d = FRAME_CACHE_ROOT / f"{child_id}_{session_id}"
    if d.exists():
        shutil.rmtree(d)


def purge_orphan_frame_caches():
    """Удалить каталоги в FRAME_CACHE_ROOT, у которых нет соответствующей
    session-папки на диске (например, видео сессии было удалено).

    Возвращает число удалённых каталогов.
    """
    if not FRAME_CACHE_ROOT.exists():
        return 0

    # Строим множество валидных <child_id>_<session_id>
    valid = set()
    if CHILDREN_DIR.exists():
        for child_dir in CHILDREN_DIR.iterdir():
            if not child_dir.is_dir():
                continue
            cid = child_dir.name
            sessions_dir = child_dir / "sessions"
            if not sessions_dir.exists():
                continue
            for sess in sessions_dir.iterdir():
                if sess.is_dir():
                    valid.add(f"{cid}_{sess.name}")

    removed = 0
    for d in FRAME_CACHE_ROOT.iterdir():
        if not d.is_dir():
            continue
        if d.name not in valid:
            shutil.rmtree(d)
            removed += 1
    return removed


# ============================================================================
# onset_annotations.json — самодостаточный эталон разметки (Step 3)
# ============================================================================
#
# Файл переживает удаление видео: внутри есть child_id, session_id, fps,
# total_frames и per-annotation полное содержимое (frame_index, onset_seconds,
# fps_used, scenario, onset_definition.{version,text}, marked_at, notes).
#
# Upsert-ключ: (annotator_id, onset_definition.version, scenario) в пределах
# сессии. Замена — полная: новые frame_index, onset_seconds, marked_at,
# auto_suggestion_at_mark, notes. Старые поля прежней записи не сохраняются.

def read_onset_annotations(child_id, session_id):
    """Прочитать onset_annotations.json (с fallback на legacy-имя без префикса).
    Возвращает dict или None, если файла нет."""
    path = _resolve_session_file(child_id, session_id, ONSET_ANNOTATIONS_FILENAME)
    if not path.exists():
        return None
    return _read_json(path)


def write_onset_annotations(child_id, session_id, data):
    """Записать файл по префиксованному имени. Возвращает строку пути."""
    sd = _session_dir(child_id, session_id)
    sd.mkdir(parents=True, exist_ok=True)
    path = sd / f"{_prefix(child_id, session_id)}{ONSET_ANNOTATIONS_FILENAME}"
    _write_json(path, data)
    return str(path)


def upsert_onset_annotation(child_id, session_id, *,
                            session_fps, total_frames, annotation):
    """Загрузить (или создать) файл разметок и записать `annotation`,
    заменив предыдущую запись с тем же ключом `(annotator_id,
    onset_definition.version, scenario)`.

    Параметры:
      session_fps: float — из meta.json (= источник секунд этой сессии).
      total_frames: int — row_count из CSV (единственный источник истины
                          по числу кадров).
      annotation: dict — полностью сформированная одна запись по схеме
                         (см. файл-докстринг выше).

    Возвращает (path_str, was_replaced_bool).
    """
    existing = read_onset_annotations(child_id, session_id)
    if existing is None:
        data = {
            "schema_version": ONSET_SCHEMA_VERSION,
            "child_id": child_id,
            "session_id": session_id,
            "fps": float(session_fps),
            "total_frames": int(total_frames),
            "annotations": [],
        }
    else:
        data = existing
        # Поля сессии обновляем под текущие значения (CSV/meta — авторитет на
        # этот момент). schema_version поддерживаем.
        data["schema_version"] = ONSET_SCHEMA_VERSION
        data["child_id"] = child_id
        data["session_id"] = session_id
        data["fps"] = float(session_fps)
        data["total_frames"] = int(total_frames)
        data.setdefault("annotations", [])

    key = (
        annotation.get("annotator_id"),
        annotation.get("onset_definition", {}).get("version"),
        annotation.get("scenario"),
    )

    new_anns = []
    replaced = False
    for a in data["annotations"]:
        a_key = (
            a.get("annotator_id"),
            a.get("onset_definition", {}).get("version"),
            a.get("scenario"),
        )
        if a_key == key and not replaced:
            # Полная замена — не сохраняем старые поля
            new_anns.append(annotation)
            replaced = True
        else:
            new_anns.append(a)
    if not replaced:
        new_anns.append(annotation)
    data["annotations"] = new_anns

    path = write_onset_annotations(child_id, session_id, data)
    return path, replaced
