"""Общие фикстуры pytest для dododo.

Тесты НЕ трогают реальный data/. Каждый тест получает свежую изолированную
песочницу в /tmp и monkeypatch'ит config-константы.
"""

import shutil
import sys
import tempfile
from pathlib import Path

import pytest

# Чтобы тесты импортировали engine/storage/config/app из корня репо
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# Тестовое видео (без PII в имени) — лежит в /tmp/dododo_work/_clips/
TEST_CLIP_DIR = Path("/tmp/dododo_work/_clips")
TEST_CLIP_PRIMARY = TEST_CLIP_DIR / "clip_test1.mp4"


@pytest.fixture
def sandbox(monkeypatch, tmp_path):
    """Изолированная песочница: подменяем DATA_DIR/CHILDREN_DIR/FRAME_CACHE_ROOT/WORK_DIR_ROOT
    на временные каталоги. После теста tmp_path автоматически очищается pytest.

    Возвращает dict с путями (data_dir, children_dir, cache_root, work_root).
    """
    import config
    import storage  # noqa: импортируется, чтобы patches применились ниже

    data_dir = tmp_path / "data"
    children_dir = data_dir / "children"
    cache_root = tmp_path / "frame_cache"
    work_root = tmp_path / "work"
    for d in (data_dir, children_dir, cache_root, work_root):
        d.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(config, "DATA_DIR", data_dir, raising=False)
    monkeypatch.setattr(config, "CHILDREN_DIR", children_dir, raising=False)
    monkeypatch.setattr(config, "FRAME_CACHE_ROOT", cache_root, raising=False)
    monkeypatch.setattr(config, "WORK_DIR_ROOT", work_root, raising=False)
    monkeypatch.setattr(storage, "CHILDREN_DIR", children_dir, raising=False)
    monkeypatch.setattr(storage, "FRAME_CACHE_ROOT", cache_root, raising=False)

    return {
        "data_dir": data_dir,
        "children_dir": children_dir,
        "cache_root": cache_root,
        "work_root": work_root,
        "tmp_path": tmp_path,
    }


@pytest.fixture
def pii_named_video(tmp_path):
    """Копирует тестовый клип под PII-именем (для test_safe_stem_no_pii).

    Если базового клипа на машине нет (свежий клон репо без /tmp/dododo_work/_clips/),
    тест помечается skipped — это не баг, это отсутствие тестового материала.
    """
    if not TEST_CLIP_PRIMARY.exists():
        pytest.skip(f"тестовый клип не найден: {TEST_CLIP_PRIMARY}")
    pii_path = tmp_path / "Natasha-Test-Surname.mp4"
    shutil.copy2(TEST_CLIP_PRIMARY, pii_path)
    return pii_path
