"""Учётные записи email/password для трёх ролей (parent | ot | admin).

Пароли хранятся ТОЛЬКО хешем (stdlib scrypt, соль на пользователя) — никогда в
открытом виде и не в логах. Хранилище — durable JSON под USERS_DIR (в проде на
persistent volume). Email уникален (lower-case). user.id = uuid4().hex (32 hex),
что совместимо с media_store._validate_id, поэтому parent.id можно использовать
как parent_id напрямую.
"""

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import uuid
from datetime import datetime, timezone
from pathlib import Path

import stage1_config as cfg

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_SCRYPT_N, _SCRYPT_R, _SCRYPT_P = 16384, 8, 1


# ---- helpers (self-contained; mirror media_store's 0600 pattern) ----
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _write_json_0600(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    prev = os.umask(0o077)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    finally:
        os.umask(prev)
    try:
        path.chmod(0o600)
    except OSError:
        pass


def _read_json(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---- password hashing (scrypt) ----
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=32)
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algo, n, r, p, salt_b64, hash_b64 = encoded.split("$")
        if algo != "scrypt":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=int(n), r=int(r), p=int(p), dklen=len(expected))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# ---- errors ----
class UserError(Exception):
    pass


class EmailTakenError(UserError):
    pass


# ---- store ----
def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _user_file(user_id: str) -> Path:
    if not re.match(r"^[0-9a-f]{32}$", user_id or ""):
        raise UserError("bad user id")
    return cfg.USERS_DIR / f"{user_id}.json"


def _all_users() -> list[dict]:
    d = cfg.USERS_DIR
    if not d.exists():
        return []
    out = []
    for f in d.iterdir():
        if f.suffix == ".json" and f.is_file():
            try:
                out.append(_read_json(f))
            except Exception:
                continue
    return out


def get_by_email(email: str) -> dict | None:
    el = normalize_email(email)
    for u in _all_users():
        if u.get("email_lower") == el:
            return u
    return None


def get_by_id(user_id: str) -> dict | None:
    try:
        f = _user_file(user_id)
    except UserError:
        return None
    return _read_json(f) if f.exists() else None


def create_user(email: str, password: str, role: str, name: str, *, status: str = "active",
                self_registered: bool = False, hcpc: str | None = None) -> dict:
    el = normalize_email(email)
    if not _EMAIL_RE.match(el):
        raise UserError("invalid email")
    if role not in cfg.USER_ROLES:
        raise UserError("invalid role")
    if status not in cfg.USER_STATUSES:
        raise UserError("invalid status")
    if not password or len(password) < cfg.PASSWORD_MIN_LEN:
        raise UserError(f"password must be at least {cfg.PASSWORD_MIN_LEN} characters")
    if get_by_email(el):
        raise EmailTakenError("email already registered")
    user = {
        "id": uuid.uuid4().hex,
        "email": el,
        "email_lower": el,
        "password_hash": hash_password(password),
        "role": role,
        "status": status,
        "name": (name or "").strip() or el,
        "hcpc": (hcpc or "").strip() or None,
        "self_registered": bool(self_registered),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    _write_json_0600(_user_file(user["id"]), user)
    return user


def _save(user: dict) -> dict:
    user["updated_at"] = _now_iso()
    _write_json_0600(_user_file(user["id"]), user)
    return user


def set_status(user_id: str, status: str) -> dict:
    if status not in cfg.USER_STATUSES:
        raise UserError("invalid status")
    u = get_by_id(user_id)
    if not u:
        raise UserError("user not found")
    u["status"] = status
    return _save(u)


def set_password(user_id: str, new_password: str) -> dict:
    u = get_by_id(user_id)
    if not u:
        raise UserError("user not found")
    if not new_password or len(new_password) < cfg.PASSWORD_MIN_LEN:
        raise UserError(f"password must be at least {cfg.PASSWORD_MIN_LEN} characters")
    u["password_hash"] = hash_password(new_password)
    return _save(u)


def list_users(role: str | None = None) -> list[dict]:
    users = _all_users()
    if role:
        users = [u for u in users if u.get("role") == role]
    users.sort(key=lambda u: u.get("created_at", ""))
    return users


def public_view(user: dict) -> dict:
    """User without the password hash — safe for API responses."""
    return {k: v for k, v in user.items() if k not in ("password_hash", "email_lower")}


def ensure_seed_admin() -> None:
    """Create the first admin from env if no admin exists yet. Password from env only."""
    if any(u.get("role") == cfg.ROLE_ADMIN for u in _all_users()):
        return
    email, pw = cfg.seed_admin_email(), cfg.seed_admin_password()
    if not email or not pw:
        return
    try:
        create_user(email, pw, cfg.ROLE_ADMIN, name="Admin", status="active")
    except UserError:
        pass
