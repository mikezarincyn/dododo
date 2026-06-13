"""Порт инварианта SEC-03 из корневого test_path_traversal.py на MediaStore.

Любой submission_id, отличный от uuid4.hex (32 hex), отвергается ДО склейки в путь —
закрывает path-traversal через подмену id из внешнего источника (URL/импорт)."""

import pytest

BAD_IDS = [
    "../etc/passwd",
    "..",
    "../../",
    "/etc/shadow",
    "a/b",
    "a\\b",
    "\x00",
    "abc\x00def",
    "" ,
    "g" * 32,            # не-hex символы
    "0" * 31,            # короче 32
    "0" * 33,            # длиннее 32
    "ABCDEF0123456789ABCDEF0123456789",  # верхний регистр (hex regex — нижний)
    "../" + "0" * 29,
    "%2e%2e%2f",
    "0" * 32 + "/../x",
]


@pytest.mark.parametrize("bad", BAD_IDS)
def test_get_for_review_rejects_bad_id(store, bad):
    with pytest.raises(ValueError):
        store.get_for_review(bad, actor="ot_default")


@pytest.mark.parametrize("bad", BAD_IDS)
def test_delete_rejects_bad_id(store, bad):
    with pytest.raises(ValueError):
        store.delete(bad)


@pytest.mark.parametrize("bad", BAD_IDS)
def test_mark_reviewed_rejects_bad_id(store, bad):
    with pytest.raises(ValueError):
        store.mark_reviewed_and_purge(bad)


@pytest.mark.parametrize("bad", BAD_IDS)
def test_read_submission_rejects_bad_id(store, bad):
    with pytest.raises(ValueError):
        store.read_submission(bad)
