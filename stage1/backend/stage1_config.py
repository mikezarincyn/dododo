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
