# dododo Stage 1 — single-origin container (FastAPI отдаёт /api + собранный фронт).
# Build context = stage1/  (docker build -f stage1/Dockerfile stage1)
# Лёгкий образ: НИКАКОГО mediapipe/opencv/whisper — Стадия 1 без ML.
# syntax=docker/dockerfile:1

# ---------- Stage 1: сборка фронта (Vite/React) ----------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
# Сначала манифесты — кэш слоёв npm ci не инвалидируется при правках src.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build      # → /app/frontend/dist (index.html + console.html + assets)

# ---------- Stage 2: python-рантайм ----------
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app/backend

# Только лёгкие зависимости Стадии 1 (FastAPI/uvicorn/cryptography/multipart),
# НЕ корневой requirements.txt с тяжёлым ML.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Код бэкенда + собранный фронт из node-стадии.
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
ENV DODODO_FRONTEND_DIST=/app/frontend/dist

EXPOSE 8000
# Слушаем порт платформы (Railway/Render задают $PORT); по умолчанию 8000.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
