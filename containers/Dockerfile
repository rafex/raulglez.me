# ─── Stage 1: Build frontend ───
FROM node:lts-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Build backend ───
FROM node:lts-slim AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# ─── Stage 3: Runtime ───
FROM node:lts-slim AS runtime

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      curl \
      ca-certificates \
      libgomp1 && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m -s /usr/sbin/nologin appuser

WORKDIR /app

COPY --from=backend-builder --chown=appuser:appgroup /app/backend/dist ./dist
COPY --from=backend-builder --chown=appuser:appgroup /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=appuser:appgroup /app/backend/data/ ./data/
RUN mkdir -p /app/data/db && chown appuser:appgroup /app/data/db
COPY --from=backend-builder --chown=appuser:appgroup /app/backend/ai ./backend/ai
COPY --from=frontend-builder --chown=appuser:appgroup /app/frontend/dist ./public

RUN pip3 install --break-system-packages --no-cache-dir -r /app/backend/ai/requirements.txt

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:3000/api/cv > /dev/null || exit 1

CMD ["node", "dist/server.js"]
