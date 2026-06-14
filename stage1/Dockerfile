# dododo Stage 1 — single-origin container (FastAPI отдаёт /api + собранный фронт)
# + ФОНОВЫЙ ВОРКЕР обработки видео (Этап B): in-process, вызывает корневой engine.py.
#
# ВНИМАНИЕ: build context = КОРЕНЬ РЕПОЗИТОРИЯ (не stage1/), потому что воркеру
# нужны корневые engine.py / config.py / *.task, лежащие вне stage1/.
#   docker build -f stage1/Dockerfile -t dododo .
# На Railway: root/context = "." (репозиторий), Dockerfile path = stage1/Dockerfile.
# syntax=docker/dockerfile:1

# ---------- Stage 1: сборка фронта (Vite/React) ----------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
# Сначала манифесты — кэш слоёв npm ci не инвалидируется при правках src.
COPY stage1/frontend/package.json stage1/frontend/package-lock.json ./
RUN npm ci
COPY stage1/frontend/ ./
RUN npm run build      # → /app/frontend/dist (index.html + console.html + assets)

# ---------- Stage 2: python-рантайм ----------
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app/backend

# Системные библиотеки:
#  - ffmpeg     — remux загрузок (MediaRecorder fragmented mp4/webm) + извлечение wav движком;
#  - libgl1 / libglib2.0-0 — рантайм OpenCV/MediaPipe (та самая «эпопея с libGL» движка);
#  - libsm6 / libxext6 — иногда требуются OpenCV-сборкой.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg libgl1 libglib2.0-0 libsm6 libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Лёгкие зависимости веб-слоя (FastAPI/uvicorn/cryptography/multipart) — отдельным
# слоем, чтобы кэш не инвалидировался при правках ML-пинов.
COPY stage1/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Тяжёлые ML-зависимости воркера (mediapipe/opencv/scipy/faster-whisper).
COPY stage1/backend/requirements-worker.txt ./requirements-worker.txt
RUN pip install --no-cache-dir -r requirements-worker.txt

# Корневой движок + модели — как БИБЛИОТЕКА для подпроцесса воркера (не модифицируется).
# DODODO_ENGINE_ROOT указывает worker_runner.py, откуда импортировать engine/config.
COPY engine.py config.py pose_landmarker.task face_landmarker.task /app/engine/
ENV DODODO_ENGINE_ROOT=/app/engine

# ПРЕ-БЕЙК whisper-модели в образ: faster-whisper иначе скачивает её с HF-CDN при
# первом запуске (внешняя сеть в проде про детские данные + холодный старт).
# Кэшируем при сборке; в рантайме HF_HUB_OFFLINE=1 запрещает любые сетевые походы.
ENV WHISPER_MODEL_SIZE=small
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')"
ENV HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1

# Код бэкенда + собранный фронт из node-стадии.
COPY stage1/backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
ENV DODODO_FRONTEND_DIST=/app/frontend/dist

EXPOSE 8000
# Слушаем порт платформы (Railway/Render задают $PORT); по умолчанию 8000.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
