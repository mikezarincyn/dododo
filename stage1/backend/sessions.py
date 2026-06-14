"""Серверные сессии: файл на сессию + HTTP-only cookie с непредсказуемым id.
Логаут удаляет файл (отзыв). TTL — SESSION_TTL_DAYS."""

import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import stage1_config as cfg

_ID_RE = re.compile(r"^[A-Za-z0-9_-]{20,64}$")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _file(session_id: str) -> Path | None:
    if not _ID_RE.match(session_id or ""):
        return None
    p = cfg.SESSIONS_DIR / f"{session_id}.json"
    try:
        p.resolve().relative_to(cfg.SESSIONS_DIR.resolve())
    except ValueError:
        return None
    return p


def create(user_id: str) -> str:
    sid = secrets.token_urlsafe(32)
    rec = {
        "id": sid,
        "user_id": user_id,
        "created_at": _now().isoformat(timespec="seconds"),
        "expires_at": (_now() + timedelta(days=cfg.SESSION_TTL_DAYS)).isoformat(timespec="seconds"),
    }
    cfg.SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    prev = os.umask(0o077)
    try:
        with open(cfg.SESSIONS_DIR / f"{sid}.json", "w", encoding="utf-8") as f:
            json.dump(rec, f)
    finally:
        os.umask(prev)
    return sid


def user_id_for(session_id: str) -> str | None:
    f = _file(session_id)
    if not f or not f.exists():
        return None
    try:
        rec = json.load(open(f, encoding="utf-8"))
        if datetime.fromisoformat(rec["expires_at"]) < _now():
            f.unlink(missing_ok=True)  # expired → purge
            return None
        return rec.get("user_id")
    except Exception:
        return None


def destroy(session_id: str) -> None:
    f = _file(session_id)
    if f:
        f.unlink(missing_ok=True)


def destroy_all_for_user(user_id: str) -> int:
    """Invalidate every session for a user (used after password reset)."""
    d = cfg.SESSIONS_DIR
    if not d.exists():
        return 0
    n = 0
    for f in d.iterdir():
        if f.suffix != ".json":
            continue
        try:
            if json.load(open(f, encoding="utf-8")).get("user_id") == user_id:
                f.unlink(missing_ok=True)
                n += 1
        except Exception:
            continue
    return n
