"""Замок SEC-03: child_id/session_id строго валидируются перед конкатенацией
в путь. Любая попытка path-traversal или подмены id отвергается ValueError.
"""

import pytest


VALID_HEX_ID = "0" * 32  # синтетический валидный UUID4.hex


TRAVERSAL_PAYLOADS = [
    "../../../etc/passwd",
    "../../tmp/anywhere",
    "..",
    "/etc/shadow",
    "/absolute/path",
    "session_id/with/slashes",
    "session\x00null",
    "session\nnewline",
    "session\ttab",
    "",
    "not-hex-at-all",
    "a" * 31,             # короткий
    "a" * 33,             # длинный
    "A" * 32,             # верхний регистр (валидно [0-9a-f])
    "g" * 32,             # буквы вне hex
    "z" * 32,             # буквы вне hex
    "0123456789abcdefxyz0123456789abcd",  # mixed-длина с не-hex
    None,                 # не строка
    123,                  # int
]


@pytest.mark.parametrize("payload", TRAVERSAL_PAYLOADS)
def test_session_dir_rejects_traversal(payload):
    """_session_dir отвергает любой не-UUID4.hex session_id."""
    import storage
    with pytest.raises(ValueError):
        storage._session_dir(VALID_HEX_ID, payload)


@pytest.mark.parametrize("payload", TRAVERSAL_PAYLOADS)
def test_child_dir_rejects_traversal(payload):
    """_child_dir отвергает любой не-UUID4.hex child_id."""
    import storage
    with pytest.raises(ValueError):
        storage._child_dir(payload)


@pytest.mark.parametrize("payload", TRAVERSAL_PAYLOADS)
def test_frame_cache_dir_rejects_traversal(payload):
    """frame_cache_dir отвергает оба id, выходящих за whitelist."""
    import storage
    with pytest.raises(ValueError):
        storage.frame_cache_dir(VALID_HEX_ID, payload)
    with pytest.raises(ValueError):
        storage.frame_cache_dir(payload, VALID_HEX_ID)


@pytest.mark.parametrize("payload", TRAVERSAL_PAYLOADS)
def test_prefix_rejects_traversal(payload):
    """_prefix тоже валидирует — это последний рубеж, если кто-то вызовет его напрямую."""
    import storage
    with pytest.raises(ValueError):
        storage._prefix(VALID_HEX_ID, payload)


def test_valid_uuid_accepted(sandbox):
    """Контр-проверка: валидный UUID4.hex проходит."""
    import storage
    import uuid

    cid = uuid.uuid4().hex
    sid = uuid.uuid4().hex

    # Все четыре пути должны построиться без исключений
    p1 = storage._child_dir(cid)
    p2 = storage._session_dir(cid, sid)
    p3 = storage.frame_cache_dir(cid, sid)
    p4 = storage._prefix(cid, sid)

    # И ни один не должен выйти за корневые песочницы
    assert p1.resolve().is_relative_to(sandbox["children_dir"].resolve())
    assert p2.resolve().is_relative_to(sandbox["children_dir"].resolve())
    assert p3.resolve().is_relative_to(sandbox["cache_root"].resolve())
    assert p4 == f"{cid}_{sid}_"
