# ─── Stage 1: Build frontend ───
FROM node:lts-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Build backend ───
FROM node:lts-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# ─── Stage 3: Runtime ───
FROM node:lts-alpine AS runtime

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

COPY --from=backend-builder --chown=appuser:appgroup /app/backend/dist ./dist
COPY --from=backend-builder --chown=appuser:appgroup /app/backend/data ./data
COPY --from=frontend-builder --chown=appuser:appgroup /app/frontend/dist ./public

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/cv > /dev/null || exit 1

CMD ["node", "dist/server.js"]
