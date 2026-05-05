# Session Resume

_Sesión: 2026-05-04-deploy-fixes-final | Cerrada: 2026-05-05 | Agente: deepseek-v4-pro_

## Estado al cerrar

✅ **Todo funcionando en producción.** `v1.20260504-11` desplegado en k3s. Chat IA (GenAI vía Groq) responde correctamente. Ingress configurado con haproxy.

## Bugs corregidos (6 bugs raíz)

| # | Bug | Fix |
|---|-----|-----|
| 1 | Imagen `raulglez-me` (guion) rechazada por GHCR → 403 | values.yaml: `raulglez.me` (punto) |
| 2 | `node_modules` no copiado → CrashLoopBackOff | Dockerfile: `COPY node_modules` |
| 3 | emptyDir en /app/data borraba cv.json | mountPath: `/app/data/db` + rutas ajustadas |
| 4 | Rutas ai.ts: backend/data/cv.json → 404 | CV_JSON/DB_PATH → `/app/data/` |
| 5 | Ingress className: nginx en cluster haproxy → redirect loop | className: haproxy, sin TLS |
| 6 | OOM: sentence-transformers >128Mi → SIGKILL | RAM limits: 1Gi + timeout 45s |

## Tags creados

- `v1.20260504-8`: fixes #1, #2
- `v1.20260504-9`: fixes #3, #4, #5  
- `v1.20260504-10`: quita Panel IA header + RAM 512Mi
- `v1.20260504-11`: RAM 1Gi + timeout spawn Python

## Endpoints verificados

| Endpoint | Estado | Notas |
|----------|--------|-------|
| `GET /api/cv` | ✅ | 10 secciones, datos públicos |
| `GET /api/ai/reindex` | ✅ | FAISS up_to_date |
| `POST /api/ai/ask` | ✅ | GenAI mode, 3-5s/request |
| `GET /api/ai/questions` | ✅ | 0 questions (sin data aún) |

## Configuración actual

- **Imagen**: `ghcr.io/rafex/raulglez.me:v1.20260504-11`
- **RAM**: 1Gi limit, 256Mi request
- **Ingress**: haproxy, solo HTTP (TLS vía proxy host)
- **Secret**: `raulglez-me-env` con GROQ_API_KEY + GROQ_MODEL
- **FAISS**: índice en `/app/backend/ai/index/`, modelo all-MiniLM-L6-v2

## Próximo paso recomendado

El sistema está operativo. La sesión está cerrada.
