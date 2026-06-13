"""FastAPI-приложение Стадии 1.

P3 закладывает каркас: принудительный TLS/HSTS + health, и делает MediaStore
доступным как зависимость. Эндпоинты загрузки (P1) и консоли специалиста (P4)
ОБЯЗАНЫ ходить в хранилище только через get_media_store() — прямых обращений к
файловой системе или SDK провайдера в роутах быть не должно.
"""

from fastapi import Depends, FastAPI, Header, HTTPException, Response
from pydantic import BaseModel

import stage1_config as cfg
from auth import Principal, resolve_principal
from media_store import (
    AccessDeniedError,
    ConsentIncompleteError,
    MediaStore,
    RegionNotConfiguredError,
    SubmissionNotFoundError,
    VideoUnavailableError,
    get_media_store,
)
from security import install_security


class ConsentIn(BaseModel):
    checked_ids: list[str]
    child_id: str | None = None


class FeedbackIn(BaseModel):
    note: str


class AssignIn(BaseModel):
    reviewer_actor: str


class WithdrawIn(BaseModel):
    submission_id: str


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
            "display_code": rec["display_code"],
            "consent_version": rec["consent_version"],
            "timestamp_utc": rec["timestamp_utc"],
        }

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

    return app


app = create_app()
