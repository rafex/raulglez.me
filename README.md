# raulglez.me

Portal CV personal de **Raúl González** — arquitectura multi-servicio con frontend estático,
backend Node.js puro, chat IA en tiempo real (WebSocket + MQTT) y panel administrativo.

## Servicios

| Servicio | Descripción | Puerto dev |
|---|---|---|
| `portal-publico` | nginx — CV + Chat IA (estático) | — |
| `portal-admin` | nginx — Panel admin interacciones IA (estático) | — |
| `backend-portal` | Node.js — `/api/cv`, `/api/cv.pdf`, WebSocket `/ws/chat`, rutas admin | `3001` |
| `backend-ia` | Node.js + Python — MQTT subscriber, RAG FAISS + Groq | `3003` |
| `mosquitto` | Eclipse Mosquitto — broker MQTT (pub/sub) | `1883` |

## Arquitectura

```
Browser
  ├─ GET /                → portal-publico (nginx, estático)
  ├─ GET /api/cv          → backend-portal
  ├─ GET /api/cv.pdf      → backend-portal
  └─ WebSocket /ws/chat   → backend-portal
                               └─ MQTT publish ai/ask → mosquitto → backend-ia
                               ← MQTT subscribe ai/response/{id} ← backend-ia
                                    └─ Python FAISS + Groq (RAG)
                                         └─ cv.json desde backend-portal (HTTP)

Browser (admin)
  ├─ GET /                → portal-admin (nginx, estático)
  ├─ GET /api/admin/questions → backend-portal (protegido por sesión)
  ├─ PATCH /api/admin/questions/:id
  ├─ GET /api/admin/prompt
  └─ GET|POST /api/admin/reindex → backend-portal → backend-ia (HTTP)
```

## Estructura del repositorio

```
frontend/
  portal-publico/         ← Vite + Pug + TypeScript (CV + Chat)
  portal-admin/           ← Vite + TypeScript (panel admin)

backend/
  javascript/
    portal/               ← Node.js puro: /api/cv, /api/cv.pdf, WS, admin
      data/cv.json        ← fuente de verdad del CV
    ia/                   ← Node.js: MQTT subscriber + orquestación RAG
  python/
    ia/                   ← Python: FAISS, sentence-transformers, rag_faiss.py

containers/
  Dockerfile.portal-publico
  Dockerfile.portal-admin
  Dockerfile.backend-portal
  Dockerfile.backend-ia   ← hereda de python-base (imagen estática ~2 GB)
  Dockerfile.python-base  ← imagen base con faiss-cpu + sentence-transformers
  nginx-portal-publico.conf
  nginx-portal-admin.conf
  nginx-main.conf
  Makefile

helm/raulglez-me/
  portal-publico/
  portal-admin/
  backend-portal/
  backend-ia/
  mosquitto/

agents/                   ← documentación operativa del proyecto
pipelines/                ← documentación CI/CD
.specnative/              ← framework SpecNative Development
```

## Desarrollo local

```bash
# Instalar dependencias de todos los componentes
just setup

# Iniciar todo en paralelo (backend-portal :3001, backend-ia :3003, portal-publico :3000)
just dev

# Solo panel admin (:3002, proxea /api/admin → :3001)
just dev-admin
```

Ver todos los comandos disponibles: [`agents/COMMANDS.md`](agents/COMMANDS.md).

## Build y contenedores

```bash
# Compilar todos los componentes
just build

# Construir todas las imágenes Docker
just docker-build

# Construir una imagen específica (desde containers/)
make -C containers portal-publico TAG=latest
```

## Variables de entorno

| Variable | Descripción | Obligatoria |
|---|---|---|
| `GROQ_API_KEY` | API key de Groq para modo GenAI | Sí (IA) |
| `GROQ_MODEL` | Modelo Groq (default: `llama-3.3-70b-versatile`) | No |
| `ADMIN_USER` | Usuario del panel admin | Sí (admin) |
| `ADMIN_PASSWORD` | Contraseña del panel admin | Sí (admin) |
| `SESSION_SECRET` | Secreto HMAC para cookie de sesión | Sí (admin) |
| `COOKIE_SECURE` | Cookie solo HTTPS (`true` en prod) | No |
| `CV_SERVICE_URL` | URL del backend-portal para backend-ia | No (default: `http://raulglez-backend-portal:3000`) |
| `MQTT_URL` | URL del broker MQTT | No (default: `mqtt://mosquitto:1883`) |

En Kubernetes, todas viven en el Secret `raulglez-me-env` referenciado por Helm.

## Secretos locales (sops + age)

```bash
just secrets-keygen     # genera keys/dev.agekey
just secrets-encrypt    # cifra .env → .env.enc (requiere SOPS_AGE_RECIPIENTS)
just secrets-decrypt    # descifra .env.enc → .env (requiere SOPS_AGE_KEY_FILE)
just secrets-edit       # edita .env.enc en línea
```

Nunca versionar `.env` ni `*.agekey`. El archivo `.env.enc` sí se puede versionar.

## Helm charts

Cada servicio tiene su propio chart en `helm/raulglez-me/<servicio>/` con:
- `values.yaml` con defaults de producción
- templates de Deployment, Service, Ingress, HPA, PDB, ServiceAccount

```bash
just lint                          # valida los 5 charts
just helm-template portal-publico  # dry-run de un chart específico
```

## CI/CD (GitHub Actions)

| Workflow | Trigger | Acción |
|---|---|---|
| `publish_frontend.yml` | push `frontend/portal-publico/**` | publica `raulglez-portal-publico` |
| `publish_portal_admin.yml` | push `frontend/portal-admin/**` | publica `raulglez-portal-admin` |
| `publish_backend.yml` | push `backend/javascript/portal/**` | publica `raulglez-backend-portal` |
| `publish_ai.yml` | push `backend/javascript/ia/**` o `backend/python/ia/**` | publica `raulglez-backend-ia` |
| `publish_python_base.yml` | push `backend/python/ia/requirements.txt` | publica imagen base Python (~2 GB) |
| `deploy_frontend.yml` | tras publish portal-publico | `helm upgrade` portal-publico |
| `deploy_portal_admin.yml` | tras publish portal-admin | `helm upgrade` portal-admin |
| `deploy_backend.yml` | tras publish backend-portal | `helm upgrade` backend-portal + mosquitto + secretos |
| `deploy_ai.yml` | tras publish backend-ia | `helm upgrade` backend-ia |

Ver detalles en [`pipelines/CD.md`](pipelines/CD.md).

## Release

```bash
# Crear y publicar tag de release (dispara Publish + Deploy)
just release-tag v1.20260506-1

# Atajo con fecha de hoy
just release-tag-today 1 1
```

## cv.json — fuente de verdad

`backend/javascript/portal/data/cv.json` contiene el CV completo:

- `contact.public` → visible en el sitio (`/api/cv`)
- `contact.private` → solo se usa en el PDF (`/api/cv.pdf`)

El backend-ia obtiene este JSON vía HTTP al arrancar (con reintentos automáticos).

## Panel admin

Accesible en `http://portal-admin/`. Funcionalidades:

- Lista interacciones del chat (pregunta, respuesta, modo, rating)
- Calificación de respuestas (1–5 estrellas, status, nota del revisor, respuesta ajustada)
- Vista del prompt del sistema IA
- Estado y reindexado manual del índice FAISS

Credenciales: variables `ADMIN_USER` / `ADMIN_PASSWORD` del Secret de Kubernetes
(o GitHub Actions secrets `ADMIN_USER` / `ADMIN_PASSWORD`).

## Documentación

| Documento | Contenido |
|---|---|
| [`agents/PRODUCT.md`](agents/PRODUCT.md) | Problema, usuarios y objetivos |
| [`agents/ARCHITECTURE.md`](agents/ARCHITECTURE.md) | Arquitectura detallada y flujos |
| [`agents/STACK.md`](agents/STACK.md) | Stack tecnológico completo |
| [`agents/COMMANDS.md`](agents/COMMANDS.md) | Comandos de desarrollo y operación |
| [`agents/DECISIONS.md`](agents/DECISIONS.md) | Decisiones técnicas tomadas |
| [`agents/CONVENTIONS.md`](agents/CONVENTIONS.md) | Convenciones de código |
| [`pipelines/CD.md`](pipelines/CD.md) | Flujo de despliegue y secretos |
| [`tasks/TODO.md`](tasks/TODO.md) | Tareas pendientes |
