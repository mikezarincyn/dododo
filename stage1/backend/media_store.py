"""MediaStore — единственная точка доступа к хранилищу для Стадии 1.

Фронтенд и консоль специалиста обращаются к видео/согласиям/логу ТОЛЬКО через этот
фасад. Прямых вызовов файловой системы или SDK провайдера из роутов/UI быть не должно —
тогда Стадия 2 (облачный объект-стор + ML) подключается сменой РЕАЛИЗАЦИИ фасада, а не
переписыванием вызывающего кода.

Жизненный цикл видео (VIDEO_RETENTION=NONE):
    put() → pending → get_for_review() → in_review
          → mark_reviewed_and_purge() → reviewed (+ байты видео стёрты)
          | delete() → purged (+ байты видео стёрты)
Долговременно переживают только: запись согласия, метадата submission (без видео),
append-only аудит-лог. Все три — в PROVIDER_REGION.

Инварианты приватности портированы из корневого storage.py (выстраданы и покрыты
тестами там):
  - id = uuid4().hex (32 hex); _validate_id + _safe_under против path-traversal;
  - display_code CH-XXXXXX (авто-генерация, реальные имена не собираются);
  - провенанс через source_sha256, без имени исходного файла в путях/мете/логе;
  - кламп расширения по whitelist; права 0o700 на каталоги, 0o600 на файлы.
"""

import base64
import json
import os
import re
import secrets
import shutil
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from pathlib import Path

import crypto
import stage1_config as cfg

# --- Имя зашифрованного видео внутри эфемерного каталога submission ---
_ENC_VIDEO_NAME = "video.enc"

# --- Валидация id (порт из storage.py) ---
_ID_RE = re.compile(r"^[0-9a-f]{32}$")
_DISPLAY_CODE_RE = re.compile(rf"^{cfg.DISPLAY_CODE_PATTERN}$")


# ===========================================================================
# Ошибки
# ===========================================================================
class MediaStoreError(Exception):
    """Базовая ошибка фасада."""


class RegionNotConfiguredError(MediaStoreError):
    """Регион не выбран (TBD) или не входит в whitelist разрешённых (НЕ-US)."""


class ConsentRequiredError(MediaStoreError):
    """Видео нельзя принять без записи согласия."""


class ConsentIncompleteError(MediaStoreError):
    """Отмечены не все обязательные согласия, либо присланы скрытые/неизвестные id."""


class SubmissionNotFoundError(MediaStoreError):
    """Запись не найдена."""


class VideoUnavailableError(MediaStoreError):
    """Байты видео уже удалены (purged) или отсутствуют."""


class AccessDeniedError(MediaStoreError):
    """Least-privilege/need-to-know: запись назначена другому reviewer."""


# ===========================================================================
# Внутренние помощники (порт принципов storage.py)
# ===========================================================================
def _validate_id(value, kind):
    if not isinstance(value, str) or not _ID_RE.match(value):
        raise ValueError(
            f"невалидный {kind}: ожидался uuid4.hex (32 hex-символа), получено {value!r}"
        )


def _safe_under(base: Path, candidate: Path, kind: str):
    """Защитный пояс: итоговый путь обязан физически лежать внутри base."""
    try:
        candidate.resolve().relative_to(base.resolve())
    except ValueError:
        raise ValueError(f"путь {kind} выходит за пределы {base!r}: {candidate!r}")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _write_json_0600(path: Path, data: dict):
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


def _generate_display_code() -> str:
    """Псевдоним CH-XXXXXX (порт из storage._generate_display_code)."""
    raw = secrets.token_bytes(5)
    code = base64.b32encode(raw).decode("ascii").rstrip("=")[:6].upper()
    return f"{cfg.DISPLAY_CODE_PREFIX}{code}"


def is_valid_display_code(code) -> bool:
    return bool(code) and bool(_DISPLAY_CODE_RE.match(code))


def _clamp_ext(original_ext) -> str:
    """Кламп расширения по whitelist (BUG-02). Вне списка → .mp4."""
    ext = (original_ext or "").lower()
    if not ext.startswith("."):
        ext = "." + ext if ext else ""
    return ext if ext in cfg.ALLOWED_VIDEO_SUFFIXES else ".mp4"


def _require_region():
    """Fail-closed резидентность: запрещаем обработку вне разрешённого UK/EU-региона."""
    if cfg.region_is_tbd():
        raise RegionNotConfiguredError(
            f"PROVIDER_REGION/COMPUTE не выбраны (region={cfg.PROVIDER_REGION!r}, "
            f"compute={cfg.PROVIDER_COMPUTE!r}). Обработка данных запрещена до выбора "
            f"UK/EU-вендора. См. TODO-FOUNDER в stage1_config.py."
        )
    if cfg.PROVIDER_REGION not in cfg.ALLOWED_REGIONS:
        raise RegionNotConfiguredError(
            f"PROVIDER_REGION={cfg.PROVIDER_REGION!r} не входит в whitelist "
            f"{sorted(cfg.ALLOWED_REGIONS)} (US-трансфер запрещён)."
        )


def _read_stream_capped(video) -> bytes:
    """Прочитать bytes / путь / file-like в память с проверкой лимита размера."""
    if isinstance(video, (bytes, bytearray)):
        data = bytes(video)
    elif isinstance(video, (str, Path)):
        data = Path(video).read_bytes()
    elif hasattr(video, "read"):
        data = video.read()
        if not isinstance(data, (bytes, bytearray)):
            raise TypeError("stream.read() должен возвращать bytes")
        data = bytes(data)
    else:
        raise TypeError(f"неподдерживаемый тип video: {type(video)!r}")
    if len(data) > cfg.MAX_VIDEO_BYTES:
        raise MediaStoreError(
            f"видео {len(data)} байт превышает лимит {cfg.MAX_VIDEO_BYTES}"
        )
    return data


# ===========================================================================
# Интерфейс фасада (Стадия 2 даёт свою реализацию)
# ===========================================================================
class MediaStore(ABC):
    """Контракт хранилища. Методы (master context P3):
    put / get_for_review / delete / mark_reviewed_and_purge.
    """

    @abstractmethod
    def create_child(self) -> tuple[str, str]:
        """Создать ребёнка-псевдонима. Возвращает (child_id, display_code)."""

    @abstractmethod
    def put(self, video, consent_record: dict, *, original_ext: str = ".mp4") -> str:
        """Принять видео + запись согласия. Возвращает submission_id."""

    @abstractmethod
    def get_for_review(self, submission_id: str, actor: str) -> dict:
        """Выдать расшифрованное видео специалисту. Логирует доступ actor'а."""

    @abstractmethod
    def delete(self, submission_id: str) -> None:
        """Стереть байты видео (запись согласия сохраняется)."""

    @abstractmethod
    def mark_reviewed_and_purge(self, submission_id: str) -> None:
        """Отметить просмотренным и немедленно стереть байты видео."""

    def exclude_from_training(self, submission_id: str) -> None:
        """N/A в Стадии 1: обучающего корпуса нет — видео не хранится и в датасет
        не попадает, исключать нечего. Заглушка фасада; реальная реализация — для
        Стадии 2 (когда появится хранимый корпус и ML-обучение)."""
        _validate_id(submission_id, "submission_id")
        return None  # Стадия 1: no-op


# ===========================================================================
# Реализация Стадии 1: эфемерное хранилище без ML
# ===========================================================================
class EphemeralMediaStore(MediaStore):
    """Видео шифруется на диске только на время просмотра, затем удаляется.
    Durable — только consent record + метадата submission + аудит-лог."""

    # --- пути (через cfg.* во время вызова → monkeypatch в тестах работает) ---
    def _child_dir(self, child_id: str) -> Path:
        _validate_id(child_id, "child_id")
        p = cfg.CHILDREN_DIR / child_id
        _safe_under(cfg.CHILDREN_DIR, p, "child_dir")
        return p

    def _consent_file(self, consent_id: str) -> Path:
        _validate_id(consent_id, "consent_id")
        p = cfg.CONSENT_DIR / consent_id / "consent.json"
        _safe_under(cfg.CONSENT_DIR, p, "consent_file")
        return p

    def _submission_file(self, submission_id: str) -> Path:
        _validate_id(submission_id, "submission_id")
        p = cfg.SUBMISSIONS_DIR / submission_id / "submission.json"
        _safe_under(cfg.SUBMISSIONS_DIR, p, "submission_file")
        return p

    def _ephemeral_dir(self, submission_id: str) -> Path:
        _validate_id(submission_id, "submission_id")
        p = cfg.EPHEMERAL_MEDIA_ROOT / submission_id
        _safe_under(cfg.EPHEMERAL_MEDIA_ROOT, p, "ephemeral_dir")
        return p

    # --- аудит (append-only, без PII) ---
    def _append_audit(self, event: str, **fields):
        cfg.AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        record = {
            "ts": _now_iso(),
            "event": event,
            "region": cfg.PROVIDER_REGION,
            **fields,
        }
        prev = os.umask(0o077)
        try:
            with open(cfg.AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        finally:
            os.umask(prev)
        try:
            cfg.AUDIT_LOG_PATH.chmod(0o600)
        except OSError:
            pass

    # ------------------------------------------------------------------
    def create_child(self) -> tuple[str, str]:
        _require_region()
        existing = {c.get("display_code") for c in self._list_children()}
        display_code = None
        for _ in range(10):
            candidate = _generate_display_code()
            if candidate not in existing:
                display_code = candidate
                break
        if display_code is None:
            raise MediaStoreError("не удалось сгенерировать уникальный display_code")
        child_id = uuid.uuid4().hex
        child = {"id": child_id, "display_code": display_code, "created_at": _now_iso()}
        self._child_dir(child_id).mkdir(parents=True, exist_ok=True)
        try:
            self._child_dir(child_id).chmod(0o700)
        except OSError:
            pass
        _write_json_0600(self._child_dir(child_id) / "child.json", child)
        self._append_audit("create_child", child_id=child_id, display_code=display_code)
        return child_id, display_code

    def _list_children(self) -> list[dict]:
        if not cfg.CHILDREN_DIR.exists():
            return []
        out = []
        for d in cfg.CHILDREN_DIR.iterdir():
            cf = d / "child.json"
            if cf.is_file():
                try:
                    out.append(_read_json(cf))
                except Exception:
                    continue
        return out

    # ------------------------------------------------------------------
    def record_consent(self, checked_ids, child_id: str | None = None) -> dict:
        """Сохранить запись согласия (explicit consent) при submit consent-формы.

        Серверная проверка (defense-in-depth поверх блокировки кнопки на фронте):
        отмечены ВСЕ обязательные чекбоксы, не присланы скрытые/неизвестные id.

        Запись согласия — durable, ЕДИНСТВЕННОЕ, что переживает удаление видео.
        Содержит: id отмеченных чекбоксов, timestamp (UTC), consent_version,
        jurisdiction=UK, session_id, child_id, region.

        TODO-LAWYER: метод верификации родителя (self-attestation через чекбокс
        guardian_authority) для пилота на ≤30 семей требует подтверждения юриста
        как достаточных «разумных усилий» (verifiable parental consent). Здесь
        реализована именно self-attestation — это НЕ полный verifiable consent.
        """
        _require_region()
        checked = list(dict.fromkeys(checked_ids or []))  # dedupe, сохраняя порядок

        hidden = set(cfg.CONSENT_HIDDEN_CHECKBOX_IDS)
        if any(c in hidden for c in checked):
            raise ConsentIncompleteError(
                "скрытые в Стадии 1 чекбоксы не принимаются: "
                f"{[c for c in checked if c in hidden]}"
            )
        allowed = set(cfg.CONSENT_REQUIRED_CHECKBOX_IDS)
        unknown = [c for c in checked if c not in allowed]
        if unknown:
            raise ConsentIncompleteError(f"неизвестные id чекбоксов: {unknown}")
        missing = [c for c in cfg.CONSENT_REQUIRED_CHECKBOX_IDS if c not in checked]
        if missing:
            raise ConsentIncompleteError(f"не отмечены обязательные согласия: {missing}")

        if child_id:
            _validate_id(child_id, "child_id")
            cf = self._child_dir(child_id) / "child.json"
            if not cf.exists():
                raise SubmissionNotFoundError(f"child_id {child_id} не найден")
            display_code = _read_json(cf).get("display_code")
        else:
            child_id, display_code = self.create_child()

        consent_id = uuid.uuid4().hex
        session_id = uuid.uuid4().hex
        record = {
            "consent_id": consent_id,
            "session_id": session_id,
            "child_id": child_id,
            "display_code": display_code,
            # Канонический порядок обязательных id (все отмечены — проверено выше).
            "checked_checkbox_ids": list(cfg.CONSENT_REQUIRED_CHECKBOX_IDS),
            "consent_version": cfg.CONSENT_VERSION,
            "jurisdiction": cfg.JURISDICTION,
            "timestamp_utc": _now_iso(),
            "region": cfg.PROVIDER_REGION,
        }
        _write_json_0600(self._consent_file(consent_id), record)
        self._append_audit(
            "record_consent", consent_id=consent_id, session_id=session_id,
            child_id=child_id, consent_version=cfg.CONSENT_VERSION,
        )
        return record

    # ------------------------------------------------------------------
    def put(self, video, consent_record: dict, *, original_ext: str = ".mp4") -> str:
        _require_region()
        if not isinstance(consent_record, dict) or not consent_record:
            raise ConsentRequiredError("видео нельзя принять без записи согласия")

        # Привязка к ребёнку-псевдониму. P1 кладёт child_id в consent_record;
        # если его нет — создаём нового псевдонима (реальное имя не собирается).
        child_id = consent_record.get("child_id")
        if child_id:
            _validate_id(child_id, "child_id")
            if not self._child_dir(child_id).joinpath("child.json").exists():
                raise SubmissionNotFoundError(f"child_id {child_id} не найден")
            display_code = _read_json(self._child_dir(child_id) / "child.json").get("display_code")
        else:
            child_id, display_code = self.create_child()

        # Запись согласия — durable, переживает удаление видео.
        consent_id = uuid.uuid4().hex
        consent_payload = dict(consent_record)
        consent_payload.update({
            "consent_id": consent_id,
            "child_id": child_id,
            "recorded_at": _now_iso(),
            "region": cfg.PROVIDER_REGION,
            "jurisdiction": cfg.JURISDICTION,
        })
        _write_json_0600(self._consent_file(consent_id), consent_payload)

        # Чтение видео + провенанс (sha256 вместо имени файла).
        data = _read_stream_capped(video)
        import hashlib
        source_sha256 = hashlib.sha256(data).hexdigest()
        ext = _clamp_ext(original_ext)

        submission_id = uuid.uuid4().hex
        submission = {
            "submission_id": submission_id,
            "consent_id": consent_id,
            "child_id": child_id,
            "display_code": display_code,
            "state": "pending",
            "source_sha256": source_sha256,
            "original_ext": ext,
            "size_bytes": len(data),
            "region": cfg.PROVIDER_REGION,
            "compute": cfg.PROVIDER_COMPUTE,
            "video_purged": False,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "reviewed_by": None,
            "reviewed_at": None,
            "purged_at": None,
        }
        _write_json_0600(self._submission_file(submission_id), submission)

        # Шифруем байты видео и кладём в эфемерный каталог (AAD = submission_id).
        edir = self._ephemeral_dir(submission_id)
        edir.mkdir(parents=True, exist_ok=True)
        try:
            edir.chmod(0o700)
        except OSError:
            pass
        blob = crypto.encrypt(data, submission_id.encode("ascii"))
        enc_path = edir / _ENC_VIDEO_NAME
        prev = os.umask(0o077)
        try:
            enc_path.write_bytes(blob)
        finally:
            os.umask(prev)
        try:
            enc_path.chmod(0o600)
        except OSError:
            pass

        self._append_audit(
            "put", submission_id=submission_id, consent_id=consent_id,
            child_id=child_id, source_sha256=source_sha256, size_bytes=len(data),
        )
        return submission_id

    # ------------------------------------------------------------------
    def read_submission(self, submission_id: str) -> dict:
        path = self._submission_file(submission_id)
        if not path.exists():
            raise SubmissionNotFoundError(f"submission {submission_id} не найден")
        return _read_json(path)

    def read_consent(self, consent_id: str) -> dict:
        path = self._consent_file(consent_id)
        if not path.exists():
            raise SubmissionNotFoundError(f"consent {consent_id} не найден")
        return _read_json(path)

    def list_pending_submissions(self) -> list[dict]:
        """Очередь специалиста: записи, ждущие просмотра (видео ещё доступно)."""
        _require_region()
        if not cfg.SUBMISSIONS_DIR.exists():
            return []
        out = []
        for d in cfg.SUBMISSIONS_DIR.iterdir():
            sf = d / "submission.json"
            if not sf.is_file():
                continue
            try:
                meta = _read_json(sf)
            except Exception:
                continue
            if meta.get("state") in ("pending", "in_review") and not meta.get("video_purged"):
                out.append(meta)
        out.sort(key=lambda m: m.get("created_at", ""))
        return out

    # ------------------------------------------------------------------
    def get_for_review(self, submission_id: str, actor: str) -> dict:
        """ЕДИНСТВЕННЫЙ путь к байтам видео. Расшифровывает и отдаёт назначенному
        reviewer. Need-to-know: первый reviewer, открывший запись, «забирает» её
        (claim); другие получают AccessDeniedError. Каждый вызов пишет в аудит."""
        _require_region()
        if not isinstance(actor, str) or not actor:
            raise ValueError("actor обязателен")
        meta = self.read_submission(submission_id)
        if meta.get("video_purged"):
            raise VideoUnavailableError(f"видео {submission_id} уже удалено")

        # Least-privilege / need-to-know.
        assigned = meta.get("assigned_reviewer")
        if assigned is None:
            meta["assigned_reviewer"] = actor  # claim
        elif assigned != actor:
            self._append_audit("access_denied", submission_id=submission_id, actor=actor)
            raise AccessDeniedError(
                f"submission {submission_id} назначена другому reviewer"
            )

        enc_path = self._ephemeral_dir(submission_id) / _ENC_VIDEO_NAME
        if not enc_path.exists():
            raise VideoUnavailableError(f"байты видео {submission_id} отсутствуют")
        blob = enc_path.read_bytes()
        plaintext = crypto.decrypt(blob, submission_id.encode("ascii"))

        meta["state"] = "in_review"
        meta["reviewed_by"] = actor
        meta["updated_at"] = _now_iso()
        _write_json_0600(self._submission_file(submission_id), meta)

        self._append_audit("get_for_review", submission_id=submission_id, actor=actor)
        return {
            "submission_id": submission_id,
            "video_bytes": plaintext,
            "original_ext": meta.get("original_ext"),
            "display_code": meta.get("display_code"),
        }

    # ------------------------------------------------------------------
    def assign_reviewer(self, submission_id: str, reviewer_actor: str, by_actor: str) -> None:
        """admin назначает запись конкретному reviewer (need-to-know)."""
        _require_region()
        if not reviewer_actor:
            raise ValueError("reviewer_actor обязателен")
        meta = self.read_submission(submission_id)
        meta["assigned_reviewer"] = reviewer_actor
        meta["assigned_by"] = by_actor
        meta["updated_at"] = _now_iso()
        _write_json_0600(self._submission_file(submission_id), meta)
        self._append_audit(
            "assign_reviewer", submission_id=submission_id,
            actor=by_actor, assigned_reviewer=reviewer_actor,
        )

    def save_feedback(self, submission_id: str, actor: str, feedback: dict) -> None:
        """Сохранить обратную связь специалиста (durable). Только назначенный reviewer."""
        _require_region()
        meta = self.read_submission(submission_id)
        assigned = meta.get("assigned_reviewer")
        if assigned is not None and assigned != actor:
            self._append_audit("access_denied", submission_id=submission_id, actor=actor)
            raise AccessDeniedError(f"submission {submission_id} назначена другому reviewer")
        record = {
            "submission_id": submission_id,
            "actor": actor,
            "feedback": feedback,
            "created_at": _now_iso(),
        }
        _write_json_0600(self._submission_file(submission_id).parent / "feedback.json", record)
        self._append_audit("save_feedback", submission_id=submission_id, actor=actor)

    def read_feedback(self, submission_id: str) -> dict | None:
        path = self._submission_file(submission_id).parent / "feedback.json"
        return _read_json(path) if path.exists() else None

    def console_queue(self, actor: str, is_admin: bool) -> list[dict]:
        """Минимизированная очередь для консоли: только нужные поля.
        admin видит все активные записи; reviewer — неназначенные + свои."""
        _require_region()
        if not cfg.SUBMISSIONS_DIR.exists():
            return []
        out = []
        for d in cfg.SUBMISSIONS_DIR.iterdir():
            sf = d / "submission.json"
            if not sf.is_file():
                continue
            try:
                meta = _read_json(sf)
            except Exception:
                continue
            if meta.get("video_purged") or meta.get("state") not in ("pending", "in_review"):
                continue
            assigned = meta.get("assigned_reviewer")
            if not is_admin and assigned not in (None, actor):
                continue
            out.append({
                "submission_id": meta.get("submission_id"),
                "display_code": meta.get("display_code"),
                "state": meta.get("state"),
                "assigned_reviewer": assigned,
                "created_at": meta.get("created_at"),
            })
        out.sort(key=lambda m: m.get("created_at", ""))
        return out

    # ------------------------------------------------------------------
    def _purge_video_bytes(self, submission_id: str):
        edir = self._ephemeral_dir(submission_id)
        if edir.exists():
            shutil.rmtree(edir)

    def _purge_feedback(self, submission_id: str) -> bool:
        fb = self._submission_file(submission_id).parent / "feedback.json"
        if fb.exists():
            fb.unlink()
            return True
        return False

    def delete(self, submission_id: str) -> None:
        """Право на удаление: стереть видео И связанные производные данные (feedback).
        Запись согласия сохраняется (durable), плюс остаётся tombstone submission
        для подтверждения факта удаления."""
        _require_region()
        meta = self.read_submission(submission_id)
        self._purge_video_bytes(submission_id)
        feedback_removed = self._purge_feedback(submission_id)
        meta["state"] = "purged"
        meta["video_purged"] = True
        meta["feedback_purged"] = feedback_removed
        meta["purged_at"] = _now_iso()
        meta["updated_at"] = _now_iso()
        _write_json_0600(self._submission_file(submission_id), meta)
        self._append_audit("delete", submission_id=submission_id)

    def withdraw_consent(self, submission_id: str) -> dict:
        """Отзыв согласия. До просмотра → видео не обрабатывается и удаляется
        (исчезает из очереди, get_for_review больше недоступен). Запись согласия
        переживает и помечается withdrawn."""
        _require_region()
        meta = self.read_submission(submission_id)
        self._purge_video_bytes(submission_id)
        meta["state"] = "consent_withdrawn"
        meta["video_purged"] = True
        meta["purged_at"] = _now_iso()
        meta["updated_at"] = _now_iso()
        _write_json_0600(self._submission_file(submission_id), meta)

        consent_id = meta.get("consent_id")
        if consent_id:
            consent = self.read_consent(consent_id)
            consent["withdrawn"] = True
            consent["withdrawn_at"] = _now_iso()
            _write_json_0600(self._consent_file(consent_id), consent)
        self._append_audit("withdraw_consent", submission_id=submission_id, consent_id=consent_id)
        return meta

    def purge_abandoned_videos(self, now: datetime | None = None) -> int:
        """TTL-свипер: стирает байты непросмотренных (брошенных) видео старше
        ABANDONED_VIDEO_TTL_HOURS, чтобы видео не «доживало» до долговременного
        хранения. Запись согласия не трогается. Возвращает число вычищенных."""
        _require_region()
        if now is None:
            now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=cfg.ABANDONED_VIDEO_TTL_HOURS)
        if not cfg.SUBMISSIONS_DIR.exists():
            return 0
        removed = 0
        for d in cfg.SUBMISSIONS_DIR.iterdir():
            sf = d / "submission.json"
            if not sf.is_file():
                continue
            try:
                meta = _read_json(sf)
            except Exception:
                continue
            if meta.get("video_purged") or meta.get("state") not in ("pending", "in_review"):
                continue
            try:
                created = datetime.fromisoformat(meta.get("created_at", ""))
            except ValueError:
                continue
            if created < cutoff:
                sid = meta["submission_id"]
                self._purge_video_bytes(sid)
                meta["state"] = "expired"
                meta["video_purged"] = True
                meta["purged_at"] = _now_iso()
                meta["updated_at"] = _now_iso()
                _write_json_0600(sf, meta)
                self._append_audit("purge_abandoned", submission_id=sid)
                removed += 1
        return removed

    def purge_expired_consent(self, now: datetime | None = None) -> int:
        """Удалить записи согласия старше срока CONSENT_RECORD_RETENTION_DAYS.
        При TBD (срок не задан юристом) — НИЧЕГО не делает: число не захардкожено.
        TODO-LAWYER: определить срок хранения метаданных согласия."""
        _require_region()
        if cfg.consent_retention_is_tbd():
            return 0
        days = int(cfg.CONSENT_RECORD_RETENTION_DAYS)
        if now is None:
            now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=days)
        if not cfg.CONSENT_DIR.exists():
            return 0
        removed = 0
        for d in cfg.CONSENT_DIR.iterdir():
            cf = d / "consent.json"
            if not cf.is_file():
                continue
            try:
                rec = _read_json(cf)
                recorded = datetime.fromisoformat(rec.get("recorded_at", ""))
            except (ValueError, OSError):
                continue
            if recorded < cutoff:
                shutil.rmtree(d)
                self._append_audit("purge_consent", consent_id=rec.get("consent_id"))
                removed += 1
        return removed

    def mark_reviewed_and_purge(self, submission_id: str) -> None:
        _require_region()
        meta = self.read_submission(submission_id)
        meta["state"] = "reviewed"
        meta["reviewed_at"] = _now_iso()
        self._purge_video_bytes(submission_id)
        meta["video_purged"] = True
        meta["purged_at"] = _now_iso()
        meta["updated_at"] = _now_iso()
        _write_json_0600(self._submission_file(submission_id), meta)
        self._append_audit("mark_reviewed_and_purge", submission_id=submission_id)


# ===========================================================================
# Фабрика. Стадия 2 переопределит, какой класс возвращать.
# ===========================================================================
_default_store: MediaStore | None = None


def get_media_store() -> MediaStore:
    global _default_store
    if _default_store is None:
        _default_store = EphemeralMediaStore()
    return _default_store
