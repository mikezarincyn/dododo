"""Транспортная безопасность: принудительный TLS + HSTS + базовые заголовки.

Камера в браузере (getUserMedia / capture) и так требует HTTPS. Здесь мы:
  - редиректим http→https (когда ENFORCE_HTTPS), доверяя X-Forwarded-Proto от
    обратного прокси провайдера;
  - выставляем HSTS, чтобы браузер не ходил по http после первого визита;
  - добавляем nosniff / no-referrer.

TLS-терминация — на стороне UK-прокси/балансировщика провайдера (OVHcloud-UK).
Приложение само сертификаты не держит; эти middleware — second line of defense.
"""

import base64
import secrets as _secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.responses import Response

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


class BasicGateMiddleware(BaseHTTPMiddleware):
    """App-wide демо-гейт поверх ВСЕХ роутов и статики. Пропускает, если:
      - путь в exempt (например /api/health для healthcheck платформы); ИЛИ
      - верный общий HTTP Basic (демо-логин/пароль); ИЛИ
      - валидный reviewer/admin bearer-токен (роли консоли — их токены сами
        секретны, поэтому считаются достаточными для прохождения внешнего гейта;
        проверка роли остаётся на уровне эндпоинта).
    Иначе — 401. Так и общий пароль (родитель/статика), и bearer (консоль)
    сосуществуют на одном заголовке Authorization без конфликта."""

    def __init__(self, app, *, username, password, bearer_ok=None, exempt=()):
        super().__init__(app)
        self._u = username
        self._p = password
        self._bearer_ok = bearer_ok or (lambda _t: False)
        self._exempt = set(exempt)

    async def dispatch(self, request, call_next):
        if request.url.path in self._exempt:
            return await call_next(request)
        auth = request.headers.get("authorization", "")
        if auth.startswith("Basic ") and self._basic_ok(auth[6:].strip()):
            return await call_next(request)
        if auth.startswith("Bearer ") and self._bearer_ok(auth[7:].strip()):
            return await call_next(request)
        return Response(
            "Authentication required",
            status_code=401,
            headers={"WWW-Authenticate": 'Basic realm="dododo demo"'},
        )

    def _basic_ok(self, b64: str) -> bool:
        try:
            user, _, pwd = base64.b64decode(b64).decode("utf-8").partition(":")
        except Exception:
            return False
        return _secrets.compare_digest(user, self._u) and _secrets.compare_digest(pwd, self._p)


def install_basic_gate(app, *, username, password, bearer_ok=None, exempt=()):
    app.add_middleware(
        BasicGateMiddleware,
        username=username,
        password=password,
        bearer_ok=bearer_ok,
        exempt=exempt,
    )
