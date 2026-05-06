# Session Resume

_Sesión: 2026-05-05-desacoplamiento | Cerrada: 2026-05-06 | Agente: deepseek-v4-pro_

## Estado al cerrar

✅ **Arquitectura desacoplada en producción.** 3 servicios independientes + Mosquitto corriendo en k3s.

## Servicios en k3s

| Servicio | Imagen | Tamaño | Estado |
|----------|--------|--------|--------|
| `raulglez-frontend` | `ghcr.io/rafex/raulglez-frontend:latest` | ~80 MB | ✅ |
| `raulglez-backend` | `ghcr.io/rafex/raulglez-backend:latest` | ~180 MB | ✅ |
| `raulglez-ai` | `ghcr.io/rafex/raulglez-ai:latest` | ~2.5 GB | ✅ |
| `mosquitto` | `eclipse-mosquitto:2` | ~5 MB | ✅ |

## Endpoints verificados

| Endpoint | Modo | Estado |
|----------|------|--------|
| `GET /api/cv` | - | ✅ 10 secciones |
| `POST /api/ai/ask` | genai | ✅ Responde con datos del CV |
| Backend → AI | HTTP interno | ✅ Conectividad confirmada |

## Flujo de la arquitectura

```
Usuario → haproxy Ingress → raulglez-frontend (nginx:80)
                                │ /api/* → proxy_pass
                                ▼
                         raulglez-backend (Node.js:3000)
                                │ /api/ai/* → fetch HTTP
                                ▼
                         raulglez-ai (Node.js:3000 + Python FAISS)
```

## Bugs corregidos (10 bugs total)

| # | Bug | Fix |
|---|-----|-----|
| 1 | Imagen raulglez-me → GHCR 403 | values.yaml: raulglez.me |
| 2 | node_modules no copiado | Dockerfile: COPY node_modules |
| 3 | emptyDir borraba cv.json | mountPath: /app/data/db |
| 4 | Rutas ai.ts incorrectas | CV_JSON/DB_PATH → /app/data/ |
| 5 | Ingress nginx en cluster haproxy | className: haproxy |
| 6 | OOM sentence-transformers | RAM: 128Mi → 1Gi/2Gi |
| 7 | tag main vs latest | deploy.yml: main→latest |
| 8 | nginx no resolver DNS | proxy_pass estático + orden deploy |
| 9 | nginx Permission denied | emptyDir /var/cache/nginx |
| 10 | containerPort 3000 ≠ AI_PORT 3001 | AI_PORT=3000 + Secret |

## Commits

- `06f708c`: feat inicial — 3 Dockerfiles, workflows, ai-server.ts
- `c53b29c`: fix tag main→latest
- `7fcb4cd`: fix fullnameOverride
- `d4da3cf`: fix nginx variable proxy_pass
- `d175ee2`: fix nginx revert to static
- `12bdb00`: fix containerPort + deploy.yml + AI_SERVICE_URL en Secret

## Próximo paso

El sistema está operativo. Para cambios futuros:
- Cambios en frontend: `gh workflow run "Publish Frontend" --ref main`
- Cambios en backend: `gh workflow run "Publish Backend" --ref main`
- Cambios en AI: `gh workflow run "Publish AI" --ref main`
- Deploy completo: `gh workflow run Deploy -f tag=latest -f environment=production`
