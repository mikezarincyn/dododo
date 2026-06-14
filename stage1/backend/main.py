"""FastAPI-приложение Стадии 1.

P3 закладывает каркас: принудительный TLS/HSTS + health, и делает MediaStore
доступным как зависимость. Эндпоинты загрузки (P1) и консоли специалиста (P4)
ОБЯЗАНЫ ходить в хранилище только через get_media_store() — прямых обращений к
файловой системе или SDK провайдера в роутах быть не должно.
"""

import re
from pathlib import Path

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Response,
    UploadFile,
)
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import stage1_config as cfg
from auth import Principal, resolve_principal
from media_store import (
    AccessDeniedError,
    ConsentIncompleteError,
    ConsentRequiredError,
    MediaStore,
    MediaStoreError,
    RegionNotConfiguredError,
    SubmissionNotFoundError,
    VideoUnavailableError,
    get_media_store,
)
from security import install_basic_gate, install_security


class ConsentIn(BaseModel):
    checked_ids: list[str]
    child_id: str | None = None


class FeedbackIn(BaseModel):
    note: str


class AssignIn(BaseModel):
    reviewer_actor: str


class WithdrawIn(BaseModel):
    submission_id: str


class ParentChildIn(BaseModel):
    first_name: str
    birth_month: str
    checked_ids: list[str]


class InviteIn(BaseModel):
    contact: str


class MetricIn(BaseModel):
    label: str
    value: str
    state: str  # "confirmed" | "calibration"
    score: float | None = None
    domains: list[str] | None = None


class AnnotateIn(BaseModel):
    scenario: str
    domains: list[str]
    duration: str = ""
    summary: str = ""
    notes: str = ""
    metrics: list[MetricIn]


class CareLinkIn(BaseModel):
    child_id: str
    reviewer_actor: str
    ot_name: str | None = None


# Pilot parent identity: a client-held opaque id (uuid4 hex) in the X-Parent-Id
# header. No parent IdP yet — scoping is by this id (a parent sees only its own
# children). TODO-LAWYER/FOUNDER: real verifiable parent auth before GA; until
# then this is demo-grade isolation, documented alongside verifiable-consent TODO.
_PARENT_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def require_parent(x_parent_id: str | None = Header(default=None)) -> str:
    if not x_parent_id or not _PARENT_ID_RE.match(x_parent_id):
        raise HTTPException(status_code=400, detail="valid X-Parent-Id header required")
    return x_parent_id


# Видео-MIME по расширению (для inline-воспроизведения, без attachment).
_VIDEO_MIME = {
    ".mp4": "video/mp4",
    ".m4v": "video/x-m4v",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
}


def _principal(authorization: str | None) -> Principal:
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    p = resolve_principal(token)
    if p is None:
        raise HTTPException(status_code=401, detail="authentication required")
    return p


def require_console(authorization: str | None = Header(default=None)) -> Principal:
    """Любой валидный принципал (reviewer или admin)."""
    return _principal(authorization)


def require_reviewer(authorization: str | None = Header(default=None)) -> Principal:
    p = _principal(authorization)
    if p.role != cfg.ROLE_REVIEWER:
        raise HTTPException(status_code=403, detail="reviewer role required")
    return p


def require_admin(authorization: str | None = Header(default=None)) -> Principal:
    p = _principal(authorization)
    if p.role != cfg.ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="admin role required")
    return p


def create_app(*, enforce_https: bool | None = None) -> FastAPI:
    if enforce_https is None:
        enforce_https = cfg.ENFORCE_HTTPS

    app = FastAPI(
        title="dododo Stage 1 (lean compliance)",
        description="Observations and feedback — НЕ медизделие, НЕ диагноз.",
        version="0.1.0",
    )
    install_security(app, enforce_https=enforce_https)

    @app.get("/api/health")
    def health(store: MediaStore = Depends(get_media_store)):
        # store в сигнатуре — демонстрация, что доступ к данным идёт через фасад.
        return {
            "status": "ok",
            "jurisdiction": cfg.JURISDICTION,
            "region": cfg.PROVIDER_REGION,
            "compute": cfg.PROVIDER_COMPUTE,
            "video_retention": cfg.VIDEO_RETENTION,
            "biometric_analysis": cfg.BIOMETRIC_ANALYSIS,
        }

    @app.get("/api/consent/config")
    def consent_config():
        """Какие чекбоксы показывать (стабильные id). Скрытые в Стадии 1 не
        отдаются вовсе — фронт физически не может их показать."""
        return {
            "consent_version": cfg.CONSENT_VERSION,
            "required_checkbox_ids": list(cfg.CONSENT_REQUIRED_CHECKBOX_IDS),
        }

    @app.post("/api/consent")
    def post_consent(payload: ConsentIn, store: MediaStore = Depends(get_media_store)):
        try:
            rec = store.record_consent(payload.checked_ids, child_id=payload.child_id)
        except ConsentIncompleteError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except RegionNotConfiguredError as e:
            raise HTTPException(status_code=503, detail=str(e))
        return {
            "session_id": rec["session_id"],
            "consent_id": rec["consent_id"],
            "child_id": rec["child_id"],
            "display_code": rec["display_code"],
            "consent_version": rec["consent_version"],
            "timestamp_utc": rec["timestamp_utc"],
        }

    @app.post("/api/submissions")
    async def create_submission(
        file: UploadFile = File(...),
        child_id: str | None = Form(default=None),
        scenario: str | None = Form(default=None),
        store: MediaStore = Depends(get_media_store),
    ):
        """Загрузка видео родителем → MediaStore.put → submission (pending) →
        попадает в очередь консоли. Имя ребёнка не принимается: только child_id
        (псевдоним display_code сгенерирован на шаге согласия). no-retention и
        fail-closed региона — внутри put()."""
        data = await file.read()
        ext = Path(file.filename or "").suffix
        # Согласие уже записано на шаге /api/consent; здесь привязываемся к тому же
        # ребёнку по child_id. Если child_id не передан — put() заведёт нового
        # псевдонима (display_code), без свободного ввода имени.
        consent_record = {"child_id": child_id} if child_id else {"source": "stage1_demo_upload"}
        try:
            submission_id = store.put(data, consent_record, original_ext=ext, scenario=scenario)
        except RegionNotConfiguredError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except (ConsentRequiredError, SubmissionNotFoundError) as e:
            raise HTTPException(status_code=400, detail=str(e))
        except (ValueError, MediaStoreError) as e:
            raise HTTPException(status_code=400, detail=str(e))
        return {"submission_id": submission_id}

    # ---- Родитель (P-parent): свои дети, добавление, приглашения ----

    @app.post("/api/parent/children")
    def parent_create_child(
        payload: ParentChildIn,
        parent_id: str = Depends(require_parent),
        store: MediaStore = Depends(get_media_store),
    ):
        """Родитель добавляет ребёнка: генерится псевдоним CH-XXXXXX + пишется
        согласие; имя/месяц рождения хранятся ПРИВАТНО у родителя, в проф-запись
        не попадают. Возвращаем только id + display_code (имя обратно не светим
        в проф-каналы — клиент уже знает его сам)."""
        try:
            out = store.create_parent_child(
                parent_id, payload.first_name, payload.birth_month, payload.checked_ids
            )
        except ConsentIncompleteError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except RegionNotConfiguredError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        return out

    @app.get("/api/parent/children")
    def parent_list_children(
        parent_id: str = Depends(require_parent),
        store: MediaStore = Depends(get_media_store),
    ):
        """Только свои дети (по parent_id). Чужих не отдаём."""
        return {"children": store.list_parent_children(parent_id)}

    @app.post("/api/parent/invites")
    def parent_add_invite(
        payload: InviteIn,
        parent_id: str = Depends(require_parent),
        store: MediaStore = Depends(get_media_store),
    ):
        try:
            entry = store.add_invite(parent_id, payload.contact)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        return entry

    @app.get("/api/parent/invites")
    def parent_list_invites(
        parent_id: str = Depends(require_parent),
        store: MediaStore = Depends(get_media_store),
    ):
        return {"invites": store.list_invites(parent_id)}

    @app.get("/api/parent/submissions")
    def parent_submissions(
        parent_id: str = Depends(require_parent),
        store: MediaStore = Depends(get_media_store),
    ):
        """Очередь родителя: загрузки только своих детей (scope по parent_id)."""
        my = {c["child_id"] for c in store.list_parent_children(parent_id)}
        out = []
        for cid in my:
            for m in store._submissions_for_child(cid):
                out.append({
                    "submission_id": m.get("submission_id"),
                    "display_code": m.get("display_code"),
                    "scenario": m.get("scenario"),
                    "size_bytes": m.get("size_bytes"),
                    "state": m.get("state"),
                    "video_purged": m.get("video_purged", False),
                    "created_at": m.get("created_at"),
                })
        out.sort(key=lambda m: m.get("created_at") or "")
        return {"submissions": out}

    @app.get("/api/parent/child/{child_id}/observations")
    def parent_child_observations(
        child_id: str,
        parent_id: str = Depends(require_parent),
        store: MediaStore = Depends(get_media_store),
    ):
        """Родителю — ТОЛЬКО confirmed-часть наблюдений своего ребёнка (без
        in-calibration авто-метрик). Чужого ребёнка не отдаём."""
        if not store.parent_owns_child(parent_id, child_id):
            raise HTTPException(status_code=403, detail="not your child")
        return {"observations": store.list_observations(child_id, confirmed_only=True)}

    # ---- Эрготерапевт (OT): дашборд/очередь/наблюдения/разметка по care-link ----

    def _require_linked(store: MediaStore, principal: Principal, child_id: str):
        if not store.is_care_linked(principal.actor_id, child_id):
            raise HTTPException(status_code=403, detail="no active care link with this child")

    @app.get("/api/ot/children")
    def ot_children(
        principal: Principal = Depends(require_reviewer),
        store: MediaStore = Depends(get_media_store),
    ):
        """Дашборд ОТ: дети ТОЛЬКО по активной care-link."""
        return {"children": store.ot_children(principal.actor_id)}

    @app.get("/api/ot/queue")
    def ot_queue(
        principal: Principal = Depends(require_reviewer),
        store: MediaStore = Depends(get_media_store),
    ):
        return {"items": store.ot_queue(principal.actor_id)}

    @app.get("/api/ot/child/{child_id}/observations")
    def ot_child_observations(
        child_id: str,
        principal: Principal = Depends(require_reviewer),
        store: MediaStore = Depends(get_media_store),
    ):
        _require_linked(store, principal, child_id)
        return {"observations": store.list_observations(child_id)}

    @app.get("/api/ot/child/{child_id}/progress")
    def ot_child_progress(
        child_id: str,
        principal: Principal = Depends(require_reviewer),
        store: MediaStore = Depends(get_media_store),
    ):
        _require_linked(store, principal, child_id)
        return {"progress": store.child_progress(child_id)}

    @app.post("/api/ot/annotate/{submission_id}")
    def ot_annotate(
        submission_id: str,
        payload: AnnotateIn,
        principal: Principal = Depends(require_reviewer),
        store: MediaStore = Depends(get_media_store),
    ):
        """Сохранить разметку → observation (durable), затем удалить сырое видео
        (no-retention). Доступ только при активной care-link (проверяется внутри)."""
        try:
            obs = store.save_observation(
                submission_id, principal.actor_id,
                scenario=payload.scenario,
                domains=payload.domains,
                duration=payload.duration,
                summary=payload.summary,
                notes=payload.notes,
                metrics=[m.model_dump() for m in payload.metrics],
            )
        except AccessDeniedError as e:
            raise HTTPException(status_code=403, detail=str(e))
        except VideoUnavailableError as e:
            raise HTTPException(status_code=410, detail=str(e))
        except SubmissionNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except RegionNotConfiguredError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        return obs

    @app.post("/api/console/care-links")
    def create_care_link(
        payload: CareLinkIn,
        principal: Principal = Depends(require_admin),
        store: MediaStore = Depends(get_media_store),
    ):
        """admin активирует связку OT↔ребёнок (полноценный admin-экран — далее)."""
        try:
            rec = store.create_care_link(payload.child_id, payload.reviewer_actor, ot_name=payload.ot_name)
        except SubmissionNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        return rec

    # ---- Консоль специалиста (P4) ----

    @app.get("/api/console/queue")
    def console_queue(
        principal: Principal = Depends(require_console),
        store: MediaStore = Depends(get_media_store),
    ):
        items = store.console_queue(
            principal.actor_id, is_admin=(principal.role == cfg.ROLE_ADMIN)
        )
        return {"items": items}

    @app.get("/api/console/video/{submission_id}")
    def console_video(
        submission_id: str,
        principal: Principal = Depends(require_reviewer),
        store: MediaStore = Depends(get_media_store),
    ):
        # ЕДИНСТВЕННЫЙ путь к байтам видео — MediaStore.get_for_review.
        try:
            out = store.get_for_review(submission_id, actor=principal.actor_id)
        except AccessDeniedError as e:
            raise HTTPException(status_code=403, detail=str(e))
        except VideoUnavailableError as e:
            raise HTTPException(status_code=410, detail=str(e))
        except SubmissionNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        mime = _VIDEO_MIME.get(out.get("original_ext"), "application/octet-stream")
        # inline (НЕ attachment) — нет скачивания; no-store, чтобы не кэшировалось.
        return Response(
            content=out["video_bytes"],
            media_type=mime,
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        )

    @app.post("/api/console/feedback/{submission_id}")
    def console_feedback(
        submission_id: str,
        body: FeedbackIn,
        principal: Principal = Depends(require_reviewer),
        store: MediaStore = Depends(get_media_store),
    ):
        try:
            store.save_feedback(submission_id, actor=principal.actor_id, feedback={"note": body.note})
        except AccessDeniedError as e:
            raise HTTPException(status_code=403, detail=str(e))
        except SubmissionNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        return {"ok": True}

    @app.post("/api/console/assign/{submission_id}")
    def console_assign(
        submission_id: str,
        body: AssignIn,
        principal: Principal = Depends(require_admin),
        store: MediaStore = Depends(get_media_store),
    ):
        try:
            store.assign_reviewer(submission_id, reviewer_actor=body.reviewer_actor, by_actor=principal.actor_id)
        except SubmissionNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        return {"ok": True}

    # ---- Права субъекта / жизненный цикл удаления (P5) ----

    @app.post("/api/console/complete/{submission_id}")
    def console_complete(
        submission_id: str,
        body: FeedbackIn,
        principal: Principal = Depends(require_reviewer),
        store: MediaStore = Depends(get_media_store),
    ):
        # «После обратной связи — авто-удаление видео»: сначала feedback, затем purge.
        try:
            store.save_feedback(submission_id, actor=principal.actor_id, feedback={"note": body.note})
            store.mark_reviewed_and_purge(submission_id)
        except AccessDeniedError as e:
            raise HTTPException(status_code=403, detail=str(e))
        except SubmissionNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        return {"ok": True, "video_purged": True}

    @app.post("/api/console/delete/{submission_id}")
    def console_delete(
        submission_id: str,
        principal: Principal = Depends(require_admin),
        store: MediaStore = Depends(get_media_store),
    ):
        # Право на удаление обрабатывает контролёр данных (admin).
        try:
            store.delete(submission_id)
        except SubmissionNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        return {"ok": True, "video_purged": True}

    @app.post("/api/consent/withdraw")
    def consent_withdraw(
        body: WithdrawIn,
        store: MediaStore = Depends(get_media_store),
    ):
        # TODO-parent-auth: подтвердить личность родителя перед отзывом. Пилот:
        # submission_id — неугадываемый uuid4, выданный сессии родителя (владение =
        # de-facto токен). Остаточный риск принят для пилота, требует усиления.
        try:
            store.withdraw_consent(body.submission_id)
        except SubmissionNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        return {"ok": True, "video_purged": True}

    # ---- App-wide демо-гейт (HTTP Basic поверх всего) ----
    # Включается только если задан DODODO_DEMO_PASSWORD. /api/health освобождён
    # (healthcheck платформы). Валидный reviewer/admin bearer тоже проходит гейт.
    _demo_pwd = cfg.demo_basic_password()
    if _demo_pwd:
        install_basic_gate(
            app,
            username=cfg.demo_basic_user(),
            password=_demo_pwd,
            bearer_ok=lambda token: resolve_principal(token) is not None,
            exempt=("/api/health",),
        )

    # ---- Single-origin: отдаём собранный фронт (index + console.html) ----
    # Монтируем последним, чтобы явные /api-роуты имели приоритет. Если сборки
    # ещё нет (dist отсутствует) — пропускаем, чтобы не падать в тестах/деве.
    if cfg.FRONTEND_DIST.is_dir():
        app.mount(
            "/",
            StaticFiles(directory=str(cfg.FRONTEND_DIST), html=True),
            name="frontend",
        )

    return app


app = create_app()
