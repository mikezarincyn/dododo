# dododo — заметки для будущих сессий Claude

Этот файл загружается в каждую сессию. Краткие правила, чтобы не делать
противоречащих текущим решениям шагов.

## Дизайн-система

В репо лежит **handoff-бандл** дизайн-системы:

```
design-system/
├── README.md                      ← инструкции для агента (не модифицировать)
├── chats/chat1.md                 ← transcript заказа
└── project/
    ├── styles.css                 ← глобальная точка входа (только @import)
    ├── readme.md, SKILL.md
    ├── tokens/                    ← colors, typography, spacing, fonts, base
    ├── components/                ← React-примитивы (для веб-фронтенда)
    ├── ui_kits/                   ← website + mobile app — полные экраны
    ├── guidelines/                ← specimen-карточки
    ├── assets/, uploads/          ← логотип, confetti SVG, скриншоты
    ├── _ds_manifest.json          ← манифест компилятора
    ├── _ds_bundle.js              ← runtime библиотеки компонент
    └── _adherence.oxlintrc.json   ← конфиг линта (только JS/TS)
```

**Содержимое `design-system/` не модифицировать руками** — это внешний handoff-артефакт.
Изменения в дизайне приходят через обновление бандла, а не правки in-place.

### Что применено к текущему Streamlit-приложению

Применено **частично**, поскольку DS рассчитана на веб-фронтенд (HTML/CSS/JS),
а Streamlit — Python + ограниченная нативная тема:

1. **`.streamlit/config.toml`** — нативная тема Streamlit с цветами из
   `tokens/colors.css` (`primaryColor`, `backgroundColor`, `textColor`, `font`).
2. **`_inject_ds_theme()` в `app.py`** — мини-CSS-инъекция, значения только
   из токенов: брендовые имена шрифтов в font-family + system-ui fallback
   (см. ниже про шрифты), navy-цвет заголовков `#0D3276`, pill-кнопки
   `border-radius: 9999px`, мягкая тень `0 8px 24px rgba(13,50,118,0.08)`
   на alert-блоках.

**Никаких хаков поверх Streamlit-внутренних селекторов.** При обновлении
Streamlit инъекция не должна сломаться, потому что трогает только
публичные и стабильные `data-testid` и `.stButton`.

### Сознательно отложено — НЕ «доделывать» как забытое

**`secondaryBackgroundColor` (мятный `#DCF3EA` из `--green-100`)**
сознательно НЕ ставится в `config.toml`. Streamlit раскрашивает им
`text_input`, `select`, `sidebar` — а на этих элементах живёт **панель
покадровой разметки эталона** (выбор разметчика, выбор сценария,
ручной ввод момента начала действия). Цветной фон под элементами, на
которых специалист принимает решения по контрасту, бьёт по читаемости.

Подключим только когда:
- (а) разметка пройдёт первую серию реальных клипов;
- (б) проверим контраст на чек-листе разметчика на брендовом фоне.

Будущему агенту: если увидишь, что в `config.toml` нет
`secondaryBackgroundColor` — это **не упущение**, не добавляй.

### Шрифты — self-host, не CDN

Бандл DS (`design-system/`) НЕ поставляет `.woff2` файлов; `tokens/fonts.css`
содержит только `@import` от Google Fonts CDN. **В Streamlit-приложении
CDN отключён**: внешний запрос на каждую загрузку UI — сетевая зависимость
и утечка факта использования к третьей стороне в продукте про детские
данные (Фаза 2 — спец-категория GDPR).

Текущее состояние: `_inject_ds_theme` ставит `'Inter'`/`'Poppins'` первыми
в `font-family`, но без `@font-face`. Если у пользователя в OS установлены
эти шрифты — браузер их использует; иначе откатится на `system-ui`.

**Когда self-hosted .woff2 будут добавлены** (в `design-system/project/assets/fonts/`
или в `.streamlit/static/`):
- добавить `@font-face` правила в `_inject_ds_theme` с локальными `url(...)`;
- остальной CSS не трогать — он уже ссылается на `'Inter'`/`'Poppins'`.

### Что НЕ применять к Streamlit

- Не подключать `_ds_bundle.js` — это React-runtime, в Python не работает.
- Не запускать `oxlint` против `app.py`/`engine.py` — он линтит JS/TS,
  не Python.
- Не переписывать `app.py` в произвольную HTML-вёрстку «ради дизайна» —
  это сломает Streamlit-механику виджетов и логику `session_state`.
- Не добавлять confetti/sparkle/логотип в Streamlit-флоу — это для
  веб-фронтенда (Фазы 1).
- Не добавлять JS-зависимости (`npm`, `package.json`) в Python-проект.

### Для будущего веб-фронтенда (Фаза 1)

Когда будет FastAPI+JS-фронтенд, DS применяется **полностью**:

- Точка входа: `design-system/project/styles.css` (импортирует все
  `tokens/*.css` и `base.css`).
- Компоненты — копируются/реимплементируются из `components/` (Button,
  Badge, Card, CheckItem, ProgressBar, Input, Logo).
- UI kit'ы (`ui_kits/website/`, `ui_kits/app/`) — образцы экранов.
- Линт-гейт: `_adherence.oxlintrc.json` поверх React-кода.
- Шрифты Inter+Poppins: либо CDN, либо self-host через `@font-face`
  (для офлайн-режима).

## Прочие правила проекта

- **Псевдонимизация:** `child_id`/`session_id` — UUID4.hex; `display_code`
  — псевдоним/код, не настоящее имя. Никаких реальных имён детей нигде
  в коде, путях, логах, meta.
- **`onset_definition.version`** сейчас `"movement_onset_draft0"` —
  черновая, ждёт формулировки OT. Не повышать в `v1` без согласования.
- **Расчётный слой неприкосновенен:** `engine.py`, `storage.py`,
  степпер (`app.py` блок «Покадровая разметка»), `frame_to_seconds`,
  `extract_frames_to_cache`, upsert разметок — менять только с явной
  командой и тестами.
- **TODO-2:** в session-папке хранится только overlay-видео; чистого
  `source.mp4` нет; `timestamp_ms` — вычисленный, не реальный PTS.
  Правка прод-пайплайна, отложена.
- **TODO-3:** автоматический тест `frames(video) == rows(csv)` после
  ffmpeg-мокса — отложен.
- **`.gitignore` отсутствует** — до первого `git init` создать с
  исключениями: `data/`, `venv/`, `*.task`, `__pycache__/`, `.DS_Store`,
  `*.mp4`, `*.MOV`, `*.wav`, и **бандл DS целиком тоже** (`design-system/`)
  если решено держать его как привязку к версии бандла без git-следа.
- **Формулировки UI — нейтральные, недиагностические.** Дисклеймер в
  верхней части `app.py` оставлять как есть.
