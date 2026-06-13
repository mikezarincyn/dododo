"""Аутентификация консоли специалиста (P4) — минимальный реестр на Стадии 1.

Bearer-token → Principal{actor_id, role}. Реестр читается из env JSON:
  DODODO_REVIEWERS_JSON = {"<token>": {"actor_id": "...", "role": "reviewer|admin"}}

TODO-FOUNDER/TODO-LAWYER: на проде заменить статический реестр на IdP/SSO с MFA
(полноценная аутентификация специалистов). Токены здесь — только для пилота ≤30 семей.
"""

import json
import os
from dataclasses import dataclass

import stage1_config as cfg


@dataclass(frozen=True)
class Principal:
    actor_id: str
    role: str


def _registry() -> dict:
    raw = os.environ.get(cfg.REVIEWERS_JSON_ENV)
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def resolve_principal(token: str | None) -> Principal | None:
    """Вернуть Principal по bearer-токену или None (неизвестный/невалидный токен)."""
    if not token:
        return None
    entry = _registry().get(token)
    if not isinstance(entry, dict):
        return None
    role = entry.get("role")
    actor_id = entry.get("actor_id")
    if role not in (cfg.ROLE_REVIEWER, cfg.ROLE_ADMIN) or not actor_id:
        return None
    return Principal(actor_id=actor_id, role=role)
