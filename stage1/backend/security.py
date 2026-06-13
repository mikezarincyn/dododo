"""Транспортная безопасность: принудительный TLS + HSTS + базовые заголовки.

Камера в браузере (getUserMedia / capture) и так требует HTTPS. Здесь мы:
  - редиректим http→https (когда ENFORCE_HTTPS), доверяя X-Forwarded-Proto от
    обратного прокси провайдера;
  - выставляем HSTS, чтобы браузер не ходил по http после первого визита;
  - добавляем nosniff / no-referrer.

TLS-терминация — на стороне UK-прокси/балансировщика провайдера (OVHcloud-UK).
Приложение само сертификаты не держит; эти middleware — second line of defense.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.responses import RedirectResponse

import stage1_config as cfg


class ForwardedHTTPSRedirectMiddleware(HTTPSRedirectMiddleware):
    """Как starlette HTTPSRedirectMiddleware, но уважает X-Forwarded-Proto:
    за TLS-терминирующим прокси scheme в ASGI может быть http, хотя клиент пришёл
    по https — тогда редиректить не нужно."""

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers") or [])
            xfp = headers.get(b"x-forwarded-proto")
            if xfp and xfp.decode("latin-1").split(",")[0].strip() == "https":
                # Клиент уже по https (TLS терминирован прокси) — пропускаем без редиректа.
                await self.app(scope, receive, send)
                return
        await super().__call__(scope, receive, send)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = (
            f"max-age={cfg.HSTS_MAX_AGE}; includeSubDomains; preload"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response


def install_security(app, *, enforce_https: bool):
    """Навесить security-middleware на FastAPI/Starlette app."""
    # Порядок: HSTS-заголовки добавляем всегда; редирект — только если включён.
    app.add_middleware(SecurityHeadersMiddleware)
    if enforce_https:
        app.add_middleware(ForwardedHTTPSRedirectMiddleware)
