"""Одноразовые токены сброса пароля (короткий TTL). Демо: ссылку показываем на
экране (в проде она будет уходить письмом). Токен файловый, удаляется при
использовании или истечении."""

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


def _file(token: str) -> Path | None:
    if not _ID_RE.match(token or ""):
        return None
    p = cfg.RESET_TOKENS_DIR / f"{token}.json"
    try:
        p.resolve().relative_to(cfg.RESET_TOKENS_DIR.resolve())
    except ValueError:
        return None
    return p


def create(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    rec = {"user_id": user_id, "expires_at": (_now() + timedelta(minutes=cfg.RESET_TTL_MINUTES)).isoformat(timespec="seconds")}
    cfg.RESET_TOKENS_DIR.mkdir(parents=True, exist_ok=True)
    prev = os.umask(0o077)
    try:
        with open(cfg.RESET_TOKENS_DIR / f"{token}.json", "w", encoding="utf-8") as f:
            json.dump(rec, f)
    finally:
        os.umask(prev)
    return token


def consume(token: str) -> str | None:
    """Return the user_id for a valid token and DELETE it (one-time use)."""
    f = _file(token)
    if not f or not f.exists():
        return None
    try:
        rec = json.load(open(f, encoding="utf-8"))
    except Exception:
        f.unlink(missing_ok=True)
        return None
    f.unlink(missing_ok=True)
    try:
        if datetime.fromisoformat(rec["expires_at"]) < _now():
            return None
    except Exception:
        return None
    return rec.get("user_id")
