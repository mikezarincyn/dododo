"""Конфигурация бэкенда Стадии 1 (mobile-web, lean compliance).

Полностью независим от корневого config.py (старый Streamlit-проект). Все значения
читаются из окружения с безопасными дефолтами. Значения, требующие решения вендора/
основателя, помечены TODO-FOUNDER; юридические — TODO-LAWYER.

Параметры сессии (master context):
  JURISDICTION=UK  VIDEO_RETENTION=NONE  PROVIDER_REGION=UK(London)
  PROVIDER_COMPUTE=OVHcloud-UK  BIOMETRIC_ANALYSIS=OFF
"""

import os
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Резидентность / провайдер (P3)
# ---------------------------------------------------------------------------
# Стадия 1 запускается СТРОГО в UK-регионе. Все данные — видео (эфемерно), запись
# согласия, аудит-лог — не покидают PROVIDER_REGION. US-вендоры запрещены.
JURISDICTION = os.environ.get("DODODO_JURISDICTION", "UK")
PROVIDER_REGION = os.environ.get("DODODO_PROVIDER_REGION", "UK(London)")
PROVIDER_COMPUTE = os.environ.get("DODODO_PROVIDER_COMPUTE", "OVHcloud-UK")

# Whitelist допустимых (НЕ-US) регионов. Фасад MediaStore работает fail-closed:
# если регион не из этого набора или помечен TBD — обработка данных запрещена,
# чтобы случайный трансфer за пределы UK/EU был физически невозможен.
# TODO-FOUNDER: при смене вендора расширять только UK/EU значениями, НЕ US.
ALLOWED_REGIONS = {"UK", "UK(London)", "EU"}

VIDEO_RETENTION = "NONE"  # несущая константа Стадии 1, не параметризуется
BIOMETRIC_ANALYSIS = "OFF"


def region_is_tbd() -> bool:
    """True, если регион/вычисление ещё не выбраны (заглушка вендора)."""
    return (
        PROVIDER_REGION.strip().upper().startswith("TBD")
        or PROVIDER_COMPUTE.strip().upper().startswith("TBD")
        or not PROVIDER_REGION.strip()
    )


# TODO-FOUNDER: если PROVIDER_COMPUTE/REGION = TBD — выбрать UK/EU-вендора (НЕ US),
# совместимого с tus (resumable upload). До выбора фасад откажет в обработке.

# ---------------------------------------------------------------------------
# Корни хранилища
# ---------------------------------------------------------------------------
# Durable (переживает удаление видео): записи согласия, метадата submission
# (без видео), append-only аудит-лог. Лежит в data-каталоге приложения.
STAGE1_DATA_ROOT = Path(
    os.environ.get(
        "DODODO_STAGE1_DATA",
        str(Path(__file__).resolve().parent.parent / "data"),
    )
)
CHILDREN_DIR = STAGE1_DATA_ROOT / "children"
# Parent-private profiles. SEPARATE from CHILDREN_DIR on purpose: child.json stays
# strictly pseudonymous (id + display_code, NO name), while a child's real first
# name + birth month + the owning parent_id live ONLY here. Professional code
# paths (console queue, get_for_review, admin) read CHILDREN_DIR / submissions —
# never PARENTS_DIR — so a child's name can never surface in a professional view.
PARENTS_DIR = STAGE1_DATA_ROOT / "parents"
# Care links: which OT (reviewer actor) may see which child. An OT sees a child
# ONLY through an active care link (red line). Pseudonymous: keyed by child_id.
CARE_LINKS_DIR = STAGE1_DATA_ROOT / "care_links"
CONSENT_DIR = STAGE1_DATA_ROOT / "consent"
SUBMISSIONS_DIR = STAGE1_DATA_ROOT / "submissions"
AUDIT_LOG_PATH = STAGE1_DATA_ROOT / "audit" / "access.log.jsonl"

# Ephemeral (зашифрованные байты видео; авто-удаляются после просмотра — P5).
# ВНЕ durable-хранилища, в системном temp: даже при сбое логики purge видео
# не попадает в долговременный data-каталог.
EPHEMERAL_MEDIA_ROOT = Path(
    os.environ.get(
        "DODODO_STAGE1_MEDIA",
        str(Path(tempfile.gettempdir()) / "dododo_stage1_media"),
    )
)

# ---------------------------------------------------------------------------
# Видео
# ---------------------------------------------------------------------------
# Нативный <input type="file" accept="video/*" capture>. iOS отдаёт .mov,
# Android — .mp4/.webm. Расширение клампится по whitelist; вне списка → .mp4.
ALLOWED_VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm"}
MAX_VIDEO_BYTES = int(os.environ.get("DODODO_MAX_VIDEO_BYTES", str(200 * 1024 * 1024)))

# --- Серверная нормализация контейнера (remux, НЕ сжатие) ---
# Браузерная запись (MediaRecorder) даёт фрагментированный mp4 / webm, который
# OpenCV-движок не всегда открывает. После загрузки переупаковываем контейнер
# (ffmpeg -c copy +faststart) — без перекодирования, без потери сигнала движения.
# Vp8/Vp9 (Android без H.264) — вынужденный транскод в H.264 (единственная потеря).
# Best-effort: при отсутствии ffmpeg или любой ошибке кладём ОРИГИНАЛ (загрузка
# не падает из-за нормализации). Временные файлы всегда удаляются (no-retention).
REMUX_DISABLE = os.environ.get("DODODO_REMUX_DISABLE") == "1"
REMUX_FORCE_CFR = os.environ.get("DODODO_REMUX_FORCE_CFR") == "1"  # тайминг движка (ресемпл fps)
REMUX_TIMEOUT_SEC = int(os.environ.get("DODODO_REMUX_TIMEOUT_SEC", "120"))

# ---------------------------------------------------------------------------
# TTL для непросмотренных (брошенных) загрузок — свипер реализуется в P5.
# VIDEO_RETENTION=NONE: просмотренное видео удаляется немедленно (P5); брошенное —
# по жёсткому пределу свипером.
# TODO-FOUNDER: подтвердить число часов. Дефолт 7 суток — уточняемый.
# ---------------------------------------------------------------------------
ABANDONED_VIDEO_TTL_HOURS = int(os.environ.get("DODODO_ABANDONED_TTL_HOURS", str(7 * 24)))

# Срок хранения МЕТАДАННЫХ согласия (P5). Consent record переживает удаление видео.
# TODO-LAWYER: определить срок хранения метаданных согласия (низкий риск, но число —
# за юристом). При TBD (env не задан) число НЕ захардкоживается: consent record не
# удаляется автоматически. = CONSENT_RECORD_RETENTION из master context (TBD-LAWYER).
CONSENT_RECORD_RETENTION_DAYS = os.environ.get("DODODO_CONSENT_RETENTION_DAYS")  # str|None


def consent_retention_is_tbd() -> bool:
    """True, если срок хранения согласия не задан (за юристом) — авто-очистки нет."""
    return not (CONSENT_RECORD_RETENTION_DAYS and CONSENT_RECORD_RETENTION_DAYS.strip())

# ---------------------------------------------------------------------------
# Шифрование at-rest (модель ключей — см. README.md, раздел «Key model»)
# ---------------------------------------------------------------------------
# Имя env-переменной с base64(32 байта) = ключ AES-256-GCM. Если не задана —
# crypto-слой генерирует ключ в памяти процесса (видео не переживает рестарт —
# безопасно при retention=NONE). Продакшн обязан задавать ключ через секрет-
# менеджер вендора в PROVIDER_REGION.
MEDIA_KEY_ENV = "DODODO_MEDIA_KEY_B64"

# ---------------------------------------------------------------------------
# display_code — псевдоним ребёнка CH-XXXXXX (порт инварианта из storage.py).
# Реальные имена детей нигде не собираются и не хранятся.
# ---------------------------------------------------------------------------
DISPLAY_CODE_PREFIX = "CH-"
DISPLAY_CODE_PATTERN = r"CH-[A-Z2-7]{6}"  # base32 без 0/1/8/9

# ---------------------------------------------------------------------------
# Развитие: домены, сценарии, состояния метрик (схема наблюдений — ОТДЕЛЬНАЯ от
# корневого engine.py; та модель не трогается). Значения портированы из дизайна
# (data.jsx DOMAINS/SCENARIOS). Reference-данные (filming guides) живут на фронте.
# ---------------------------------------------------------------------------
DOMAIN_IDS = ("attention", "communication", "movement", "regulation", "body", "independence")
SCENARIO_IDS = ("name", "freeplay", "joint", "mealtime", "imitation")
# Метрика подтверждена ОТ (counts в тренд) или ещё «в калибровке» (показывается,
# но НИКОГДА не учитывается в трендах) — несущий принцип, см. red line.
METRIC_STATE_CONFIRMED = "confirmed"
METRIC_STATE_CALIBRATION = "calibration"
METRIC_STATES = (METRIC_STATE_CONFIRMED, METRIC_STATE_CALIBRATION)

# ---------------------------------------------------------------------------
# Согласие (P1) — explicit parental consent
# ---------------------------------------------------------------------------
# Версия формулировок согласия. Повышать при ЛЮБОМ изменении текстов чекбоксов,
# чтобы по записи согласия можно было восстановить, под какой текст подписались.
CONSENT_VERSION = "stage1_consent_v1"

# Стабильные id чекбоксов — НЕ переименовывать (попадают в consent record и
# должны сопоставляться со строками i18n на фронте). 4 обязательных, активных,
# НЕ пред-проставленных. Тексты — во frontend/src/i18n (единый источник строк).
CONSENT_REQUIRED_CHECKBOX_IDS = (
    "guardian_authority",          # 1) родитель/опекун + право предоставить видео
    "specialist_review_feedback",  # 2) специалист смотрит → наблюдения, не диагноз
    "explicit_processing",         # 3) explicit consent на обработку (спец-категория)
    "review_then_delete",          # 4) просмотр → удаление; право отозвать до просмотра
)

# Зарезервированы на будущие стадии. В Стадии 1 СКРЫТЫ (не показываются и не
# принимаются сервером). id храним стабильными, чтобы добавить без миграции.
CONSENT_HIDDEN_CHECKBOX_IDS = (
    "biometric_auto_analysis",  # скрыт: BIOMETRIC_ANALYSIS=OFF
    "retention_recalibration",  # скрыт: VIDEO_RETENTION=NONE
)

# ---------------------------------------------------------------------------
# Консоль специалиста (P4) — least-privilege
# ---------------------------------------------------------------------------
# Две роли. Видео доступно ТОЛЬКО назначенному reviewer (need-to-know), не «всей
# команде». admin управляет назначениями, но видео не смотрит (минимизация).
ROLE_REVIEWER = "reviewer"
ROLE_ADMIN = "admin"

# ---------------------------------------------------------------------------
# Учётные записи (email/password) — три роли продукта.
# Пароли хранятся ТОЛЬКО хешем (stdlib scrypt, соль на пользователя), не в
# открытом виде и не в логах. PII (email) держим в USERS_DIR (durable, под
# persistent volume в проде). Сессии — серверные файлы + HTTP-only cookie.
# ---------------------------------------------------------------------------
ROLE_PARENT = "parent"
ROLE_OT = "ot"
USER_ROLES = (ROLE_PARENT, ROLE_OT, ROLE_ADMIN)
USER_STATUSES = ("active", "pending", "deactivated")

USERS_DIR = STAGE1_DATA_ROOT / "users"
SESSIONS_DIR = STAGE1_DATA_ROOT / "sessions"
RESET_TOKENS_DIR = STAGE1_DATA_ROOT / "reset_tokens"

SESSION_COOKIE = "dododo_session"
SESSION_TTL_DAYS = int(os.environ.get("DODODO_SESSION_TTL_DAYS", "30"))
RESET_TTL_MINUTES = int(os.environ.get("DODODO_RESET_TTL_MINUTES", "60"))
PASSWORD_MIN_LEN = int(os.environ.get("DODODO_PASSWORD_MIN_LEN", "8"))


def seed_admin_email():
    return os.environ.get("DODODO_ADMIN_EMAIL")


def seed_admin_password():
    return os.environ.get("DODODO_ADMIN_PASSWORD")


# Реестр учёток на Стадии 1: env с JSON-картой { "<bearer-token>": {actor_id, role} }.
# Пилот на ≤30 семей — статический реестр приемлем.
# TODO-FOUNDER/TODO-LAWYER: заменить на нормальный IdP/SSO с MFA для специалистов
# (полноценная аутентификация OT) до выхода за рамки пилота.
REVIEWERS_JSON_ENV = "DODODO_REVIEWERS_JSON"

# ---------------------------------------------------------------------------
# TLS
# ---------------------------------------------------------------------------
# Камера в браузере требует HTTPS, поэтому http→https редирект + HSTS включены
# по умолчанию. В локальной разработке выключается DODODO_ENFORCE_HTTPS=0.
ENFORCE_HTTPS = os.environ.get("DODODO_ENFORCE_HTTPS", "1") != "0"
HSTS_MAX_AGE = int(os.environ.get("DODODO_HSTS_MAX_AGE", str(63072000)))  # 2 года

# ---------------------------------------------------------------------------
# Раздача собранного фронта (single origin: FastAPI отдаёт /api + статику)
# ---------------------------------------------------------------------------
FRONTEND_DIST = Path(
    os.environ.get(
        "DODODO_FRONTEND_DIST",
        str(Path(__file__).resolve().parent.parent / "frontend" / "dist"),
    )
)

# ---------------------------------------------------------------------------
# App-wide демо-гейт (HTTP Basic поверх ВСЕХ роутов + статики).
# Если пароль не задан — гейт ВЫКЛЮЧЕН (удобно для тестов/дева). В проде задать
# DODODO_DEMO_PASSWORD. Читается из окружения «вживую», чтобы тесты могли
# включать/выключать его через monkeypatch.setenv.
# ---------------------------------------------------------------------------
def demo_basic_user() -> str:
    return os.environ.get("DODODO_DEMO_USER", "demo")


def demo_basic_password():
    return os.environ.get("DODODO_DEMO_PASSWORD")  # None → гейт выключен
