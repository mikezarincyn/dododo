# dododo — Stage 1 backend (lean compliance)

Mobile-web пилот: родитель загружает короткое видео ребёнка → живой специалист
смотрит вручную и даёт **наблюдения и обратную связь** → видео авто-удаляется.
**НЕ медизделие, НЕ диагноз.** Без облачного ML, без долговременного хранения видео.

> Этот бэкенд независим от корневого Streamlit-проекта (`app.py`/`engine.py`/
> `storage.py`/`config.py`) и от `design-system/`. Корневой код не трогается.

## Параметры сессии (P3)

| Параметр | Значение |
|---|---|
| `JURISDICTION` | UK |
| `VIDEO_RETENTION` | **NONE** (видео не хранится) |
| `PROVIDER_REGION` | UK(London) |
| `PROVIDER_COMPUTE` | OVHcloud-UK |
| `BIOMETRIC_ANALYSIS` | OFF |

Все настраиваются через env (`DODODO_PROVIDER_REGION`, `DODODO_PROVIDER_COMPUTE`,
`DODODO_STAGE1_DATA`, `DODODO_STAGE1_MEDIA`, …) — см. `stage1_config.py`.

## Резидентность данных (нет US-трансфера)

Все данные — эфемерное видео, запись согласия, аудит-лог — живут в
`PROVIDER_REGION`. Фасад работает **fail-closed**: `media_store._require_region()`
бросает `RegionNotConfiguredError`, если регион помечен `TBD` или не входит в
whitelist `ALLOWED_REGIONS = {UK, UK(London), EU}`. Значение вне списка (в т.ч.
любой US-регион) → обработка запрещена. Так случайный трансфер за пределы UK/EU
физически невозможен на уровне кода.

> TODO-FOUNDER: при выборе/смене вендора расширять `ALLOWED_REGIONS` только UK/EU
> значениями (НЕ US), вендор должен быть совместим с tus (resumable upload).

## Транспорт (TLS)

- `ENFORCE_HTTPS=1` (дефолт): `ForwardedHTTPSRedirectMiddleware` редиректит
  http→https, уважая `X-Forwarded-Proto` от UK-прокси (TLS терминируется там).
- `SecurityHeadersMiddleware`: `Strict-Transport-Security` (HSTS, 2 года,
  `includeSubDomains; preload`), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`.
- В локальной разработке выключается `DODODO_ENFORCE_HTTPS=0`.
- Камера браузера и так требует HTTPS — это совпадает с требованием.

## At-rest шифрование — Key model

Видео лежит на диске **зашифрованным** только на время просмотра специалистом,
затем стирается (P5). Шифрование — модуль `crypto.py`:

- **Алгоритм:** AES-256-GCM (AEAD: конфиденциальность + целостность).
- **На файл:** случайный 96-битный nonce; **AAD = `submission_id`** — привязывает
  шифртекст к конкретной записи (блоб нельзя «переклеить» в другую submission).
- **Формат блоба** (`<EPHEMERAL_MEDIA_ROOT>/<submission_id>/video.enc`, права
  `0o600`): `nonce(12) || ciphertext+tag`.
- **Источник ключа** (32 байта, AES-256), по приоритету:
  1. env **`DODODO_MEDIA_KEY_B64`** = base64 от 32 случайных байт. В продакшне
     выдаётся секрет-менеджером вендора в `PROVIDER_REGION`.
  2. Если env не задана — ключ **генерируется в памяти процесса** и никуда не
     персистится. Видео становится нечитаемым после рестарта процесса. Это
     **безопасный дефолт** при `VIDEO_RETENTION=NONE` (потеря ключа = гарантия
     неизвлекаемости), но для многопроцессного/многоинстансного прода нужен общий
     ключ из env.
- **Ротация:** TODO-FOUNDER — при `retention=NONE` и короткоживущем видео влияние
  ротации минимально (старые записи быстро purge-аются); зафиксировать процедуру
  выдачи/ротации ключа на стороне вендора. TODO-LAWYER — отразить шифрование
  at-rest + регион ключа в DPIA (P6).

## MediaStore — фасад хранилища

Единственная точка доступа к видео/согласиям/логу. Фронт (P1) и консоль
специалиста (P4) ходят **только** через `get_media_store()`; прямых обращений к ФС
или SDK провайдера в роутах/UI быть не должно. Стадия 2 (облако + ML) подключается
сменой реализации `MediaStore`, не переписыванием вызывающего кода.

Контракт (`media_store.MediaStore`), реализация Стадии 1 = `EphemeralMediaStore`:

| Метод (master context) | Python | Делает |
|---|---|---|
| `put(video, consentRecord)` | `put(video, consent_record, *, original_ext)` | durable consent record + зашифрованное эфемерное видео + метадата submission (`pending`); возвращает `submission_id` |
| `getForReview(id, actor)` | `get_for_review(submission_id, actor)` | расшифровывает видео для специалиста, ставит `in_review`, пишет в аудит |
| `delete(id)` | `delete(submission_id)` | стирает байты видео (consent сохраняется), ставит `purged` |
| `markReviewedAndPurge(id)` | `mark_reviewed_and_purge(submission_id)` | `reviewed` + немедленное стирание байтов видео |

Жизненный цикл: `pending → in_review → reviewed`/`purged` (видео стёрто). Durable
переживают только: запись согласия, метадата submission (без видео), append-only
аудит-лог.

### Портированные инварианты приватности (из корневого `storage.py`)

- `id = uuid4().hex` (32 hex); `_validate_id` + `_safe_under` против path-traversal.
- `display_code` = `CH-XXXXXX` (авто-генерация; реальные имена детей не собираются).
- Провенанс через `source_sha256`; имя исходного файла нигде не участвует.
- Кламп расширения по whitelist `.mp4/.mov/.m4v/.webm`; вне списка → `.mp4`.
- Права: каталоги `0o700`, файлы `0o600`, запись под `umask 0o077`.

## Запуск

```bash
# из корня репозитория
venv/bin/uvicorn main:app --app-dir stage1/backend          # прод-режим (ENFORCE_HTTPS=1)
DODODO_ENFORCE_HTTPS=0 venv/bin/uvicorn main:app --app-dir stage1/backend --reload  # dev

# тесты
venv/bin/python -m pytest stage1/backend/tests/ -q
```

## Открытые вопросы (минимальный дефолт + TODO; не блокируют P3)

- **OT-аутентификация** (как специалист логинится) — закрывается в P4.
- **Возврат родителя за фидбеком** — канал `in-app`; механика входа — TODO.
- **Self-host шрифтов** vs CDN — решается во фронтенде; рекомендация — self-host.

## Статус acceptance (P3)

- [x] TLS принудительно (редирект+HSTS); at-rest шифрование AES-256-GCM на время обработки.
- [x] Все данные в UK-регионе; фасад fail-closed против не-UK/EU (нет US-трансфера).
- [x] MediaStore-фасад существует; доступ к данным только через него.
- [x] Модель ключей описана выше.
