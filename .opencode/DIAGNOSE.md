# Diagnóstico del Proyecto

_Fecha: 2026-05-04 | Repositorio: raulglez.me_

---

## 1. Exploración

### Estructura general
- **raíz** (24 entradas): `frontend/`, `backend/`, `containers/`, `helm/`, `.github/workflows/`, `agents/`, `pipelines/`, `tasks/`, `scripts/`, `Makefile`, `justfile`
- **frontend/**: Vite + Pug + TypeScript + CSS nativo. 7 módulos TS (`renderers`, `chat`, `ai-review`, `accessibility`, `phone-canvas`, `observers`, `text-utils`). `main.ts` como orquestador
- **backend/**: Node.js (TypeScript) + Python (FAISS). `server.ts` (servidor HTTP), `ai.ts` (RAG + Groq + tracking), `pdf.ts` (PDF con pdfkit), `rag_faiss.py` (índice FAISS)
- **containers/**: Dockerfile multi-stage (3 stages: frontend build → backend build → runtime Node+Python)
- **helm/raulglez-me/**: Chart con Deployment, Service, Ingress (TLS), HPA, PDB, ServiceAccount, probes de salud
- **.github/workflows/**: `publish_container.yml` (build multi-arch → GHCR), `deploy.yml` (Helm upgrade a k3s con validación y diagnóstico)

### Lenguajes y tecnologías
- **TypeScript**: frontend (13 archivos / 1,553 LOC) + backend (4 archivos / ~400 LOC)
- **CSS**: 6 archivos / 1,543 LOC — `layout.css` monolítico de 28KB
- **Python**: `rag_faiss.py` (982 LOC) — embeddings + FAISS + respuesta determinista
- **Pug**: templates HTML compilados con Vite
- **Bash**: scripts CI/CD + justfile tasks
- **YAML**: Helm charts + GitHub Actions (10 archivos)
- **Dependencias principales**: pdfkit, sentence-transformers, faiss-cpu, numpy, vite, pug, typescript
- **Infra**: Docker, Kubernetes (k3s), Helm, GitHub Actions, GHCR, cert-manager (Let's Encrypt), nginx-ingress
- **Runtime**: Node.js LTS + Python 3 (para fallback RAG) en Debian slim

### Sistema de build / dependencias
- **Frontend**: npm — `vite` como bundler, `pug` para templates, `typescript` para tipado
  - Scripts: `dev`, `build`, `preview`
  - Proxy Vite: `/api` → `localhost:3001`
- **Backend**: npm — `tsc` para compilación, `--experimental-strip-types` para desarrollo
  - Scripts: `dev`, `build`, `start`
- **Docker**: Multi-stage con `containers/Dockerfile`, `containers/Makefile`
- **Orquestación**: `Makefile` (build targets) + `justfile` (task runner: dev, setup, docker-run, release-tag, secrets-*)
- **CI/CD**: GitHub Actions con triggers en tags `v*.*` y `workflow_dispatch`

### Puntos de entrada
- **Frontend**: `frontend/src/scripts/main.ts` → `loadCV()` → `GET /api/cv` → render 8 secciones + init módulos (chat, accessibility, ai-review, etc.)
- **Backend**: `backend/src/server.ts` → `http.createServer` → rutas REST:
  - `GET /api/cv` — vista pública (filtra `contact.private`, usa `nickname`)
  - `GET /api/cv.pdf` — PDF dinámico generado en runtime
  - `POST /api/ai/ask` — RAG + Groq + fallback determinista
  - `GET /api/ai/questions`, `PATCH /api/ai/questions/:id` — panel de revisión IA
  - `GET /api/ai/reindex`, `POST /api/ai/reindex` — gestión del índice FAISS
  - Fallback: sirve estáticos desde `public/`
- **Docker**: `containers/Dockerfile` → `CMD ["node", "dist/server.js"]` en `EXPOSE 3000`
- **CI**: tags `v*.*` disparan `publish_container.yml` (build+push) → `deploy.yml` (helm upgrade)

### Módulos y componentes clave
| Módulo | Ubicación | Responsabilidad |
|--------|-----------|----------------|
| `renderers` | `frontend/src/scripts/modules/renderers.ts` | Renderizado HTML de 8 secciones del CV |
| `chat` | `frontend/src/scripts/modules/chat.ts` | Chat flotante con captura de lead (name, phone) |
| `ai-review` | `frontend/src/scripts/modules/ai-review.ts` | Panel IA: revisar/calificar/editar respuestas |
| `accessibility` | `frontend/src/scripts/modules/accessibility.ts` | Tamaño fuente, tipografía OSS, paletas daltonismo |
| `server.ts` | `backend/src/server.ts` | Rutas REST, serveStatic, CORS implícito |
| `ai.ts` | `backend/src/ai.ts` | Orquestación RAG + Groq + fallback + SQLite tracking |
| `pdf.ts` | `backend/src/pdf.ts` | PDF desde `cv.json` con pdfkit (datos públicos + privados) |
| `rag_faiss.py` | `backend/ai/rag_faiss.py` | Embeddings, índice FAISS, query, respuesta determinista |
| `cv.json` | `backend/data/cv.json` | Fuente de verdad del CV (19KB, separación public/private) |
| `interactions.sqlite` | `backend/data/interactions.sqlite` | Trazabilidad de preguntas/respuestas IA |

### Archivos de configuración relevantes
| Archivo | Tipo | Propósito |
|---------|------|-----------|
| `.gitignore` | config | Cubre node_modules, dist, .env, secretos, worktrees, macOS |
| `containers/Dockerfile` | build | Multi-stage: frontend + backend build → runtime Node+Python |
| `.github/workflows/deploy.yml` | CI/CD | Helm deploy a k3s con lint, template, rollout check y diagnóstico |
| `.github/workflows/publish_container.yml` | CI/CD | Build multi-arch (amd64+arm64) y push a GHCR |
| `helm/raulglez-me/values.yaml` | deploy | HPA, PDB, probes, ingress TLS, securityContext, resources |
| `frontend/vite.config.ts` | build | Vite config: proxy /api → :3001, build con esbuild |
| `frontend/tsconfig.json` | config | strict, ES2022, ESNext modules, noEmit |
| `backend/tsconfig.json` | config | strict, ES2022, NodeNext modules |
| `.env.example` | config | Template: GROQ_API_KEY, GROQ_MODEL, PORT |
| `Makefile` | build | Orquestación: build, clean, lint, docker |
| `justfile` | tasks | Task runner: dev, setup, release-tag, secrets-* |

### Estado del repositorio
- **Rama activa**: `main` (HEAD: `00fbe60` — "ci(workflows): actualiza configuración de deploy")
- **Branches remotas**: main, chore/task-runner-justfile, feature/gsap-integration, fix/sass-deprecations, portal-cv, refactor/ts-webcomponents
- **Worktrees**: sin worktrees activos
- **Archivos modificados**: `.opencode/EXPLORE.md` (deleted, no staged)
- **Total**: 46 commits, 2 contribuidores, 92 archivos, ~20,834 LOC, 1.7 MB

---

## 2. Revisión de calidad

### Problemas estructurales o de diseño
- **Backend monolítico en server.ts**: servidor HTTP crudo (`http.createServer`) sin Express. No hay middleware de CORS, rate limiting, ni error handling centralizado. Para la escala actual es funcional pero no escalable.
- **Sin separación controller/service**: Las rutas están inline en `server.ts` (194 líneas). `ai.ts` (304 líneas) está bien extraído, `pdf.ts` (138 líneas) también. Estructura aceptable para el tamaño pero sin clara separación de capas.
- **Mezcla de estilos async**: `server.ts` usa `.then().catch()` (líneas 99, 123, 129) mientras `ai.ts` usa `async/await` consistentemente. Inconsistencia de estilo.
- **readCvData() síncrono**: `fs.readFileSync` se ejecuta en cada request de `/api/cv` y `/api/cv.pdf`. Para 19KB no es crítico, pero sin caché es ineficiente.

### Deuda técnica identificada
- **Uso de `any`**: `ai.ts:192` (`as any` en parse de Groq), `server.ts:32` (`toPublicCv` recibe/retorna `any`), `rebuildRagIndex`/`getRagIndexStatus` retornan `any`
- **Sin ESLint/Prettier**: No hay configuración de linting ni formateo. Sin scripts `lint`/`format` en package.json
- **Archivos bridge .js**: `backend/src/ai.js` (25B) y `backend/src/pdf.js` (26B) son bridges para `--experimental-strip-types`. Workaround frágil.
- **CSS monolítico**: `layout.css` tiene 28KB en un solo archivo
- **SQL sin ORM tipado**: Queries SQL como strings crudos. Sin Drizzle, Prisma, o Knex para type-safety

### Prácticas del lenguaje no seguidas
- ✅ TypeScript `strict: true` en ambos tsconfig
- ❌ Uso de `any` en múltiples ubicaciones del backend
- ❌ Sin JSDoc ni documentación inline en TypeScript
- ❌ Mezcla `.then().catch()` con `async/await` entre archivos
- ❌ Sin scripts de test/lint/format en package.json

### Riesgos de seguridad
| Riesgo | Severidad | Detalle |
|--------|-----------|---------|
| Sin CORS configurado | Medio | API acepta requests de cualquier origen. Para CV público es bajo riesgo, pero `/api/ai/ask` podría ser abusado |
| Sin rate limiting en `/api/ai/ask` | Alto | Sin límite de requests, un atacante podría consumir créditos de Groq |
| Sin timeout en fetch a Groq | Medio | `ai.ts:170` — `fetch` sin `AbortController`. Requests pueden quedar colgadas |
| Path traversal mitigado | Bajo | `server.ts:47` usa regex bloqueante + `path.normalize`. Correcto pero whitelist sería más seguro |
| ✅ Validación de payload | — | `validateAskPayload` en `ai.ts` valida question (≥8 chars), name, phone |
| ✅ Secretos gestionados | — | `.env` en .gitignore, `.env.enc` con sops+age, K8s Secrets |
| ✅ Dependencias con lockfile | — | `npm ci` en Dockerfile usa `package-lock.json` |

### Cobertura de tests y documentación
- ❌ **CERO tests**: Sin archivos `*.test.ts`, `*.spec.ts`, ni `__tests__/`. Ni unitarios, ni integración, ni e2e
- ❌ **Sin documentación inline**: Sin JSDoc en funciones o tipos TypeScript
- ✅ **Documentación de arquitectura excelente**: `agents/ARCHITECTURE.md`, `README.md` (129 líneas), `pipelines/CD.md`
- ❌ Sin `CHANGELOG.md` ni `CONTRIBUTING.md` (aceptable para proyecto personal)

---

## 3. Síntesis ejecutiva

### Resumen del proyecto
Portal CV personal de **Raúl González** (`raulglez.me`) con frontend estático (Vite + Pug + TypeScript + CSS nativo) y backend Node.js que sirve datos del CV desde `cv.json`, genera PDF dinámico con pdfkit, y expone un chat de IA con pipeline RAG (FAISS + Groq + fallback determinista en Python). La infraestructura usa Docker multi-arch, Helm sobre k3s, CI/CD con GitHub Actions, y secretos gestionados con sops+age.

### Estado de salud
**🟡 Amarillo** — El proyecto es funcional, está bien documentado a nivel de arquitectura y despliegue, y sigue buenas prácticas de infraestructura (CI/CD robusto, Helm probes, securityContext). Sin embargo, carece completamente de tests (0 archivos), linting, y tiene deuda técnica moderada en el backend (uso de `any`, sin rate limiting ni timeouts, sin Express).

### Top 3 fortalezas
1. **Documentación de arquitectura y despliegue excepcional** — `README.md`, `agents/ARCHITECTURE.md`, `pipelines/CD.md`, `justfile` con 148 líneas documentando cada tarea. El proyecto es fácil de entender y operar.
2. **Pipeline CI/CD robusto y bien diseñado** — Docker multi-stage, build multi-arch (amd64+arm64), Helm deploy con lint+template+rollout check, diagnóstico automático de fallos con logs y eventos de k8s.
3. **Sistema de IA con guardrails bien pensado** — Validación estricta de payload, separación de contexto público/privado, fallback determinista automático cuando Groq falla, revisión humana vía panel IA, y trazabilidad completa en SQLite.

### Top 3 riesgos o deudas
1. **CERO tests** — Sin tests unitarios, de integración ni e2e. Cualquier cambio puede romper funcionalidad crítica (CV, PDF, chat IA) sin detección. Impacto: alto.
2. **Sin rate limiting ni timeout en el endpoint de IA** — `POST /api/ai/ask` no tiene límite de requests ni timeout en la llamada a Groq. Un abuso podría consumir créditos o colgar el servidor. Impacto: alto.
3. **Sin linting ni formateo automático** — Sin ESLint/Prettier, con uso de `any` en lugares clave, y mezcla de estilos async. La deuda se acumulará. Impacto: medio.

### Próximos pasos recomendados
1. **Agregar tests unitarios para endpoints críticos** — Usar `vitest` + `supertest` para probar `GET /api/cv`, `GET /api/cv.pdf`, `POST /api/ai/ask` (con mock de Groq). Cubrir también `validateAskPayload` y la lógica de `toPublicCv`. Impacto: alto — detecta regresiones inmediatamente.
2. **Agregar rate limiting y timeout en `/api/ai/ask`** — Implementar un rate limiter simple (ej. 10 req/min por IP) y un `AbortController` con timeout de 15s en la llamada a Groq. Impacto: alto — previene abuso y cuelgues.
3. **Configurar ESLint + Prettier** — Agregar `.eslintrc.json` y `.prettierrc`, scripts `lint` y `format` en ambos package.json, y correr `eslint --fix` en todo el código. Eliminar usos de `any` con tipos explícitos. Impacto: medio — mejora mantenibilidad y previene bugs.

---

## 4. Archivos relevantes

| Archivo | Tipo | Relevancia |
|---------|------|------------|
| `frontend/src/scripts/main.ts` | entry | Punto de entrada del frontend — orquesta carga de CV e inicialización de módulos |
| `backend/src/server.ts` | entry | Servidor HTTP — 6 endpoints REST + serveStatic |
| `backend/src/ai.ts` | module | Orquestación IA — RAG, Groq, fallback, tracking SQLite (~300 LOC) |
| `backend/src/pdf.ts` | module | Generación PDF desde cv.json con pdfkit |
| `backend/ai/rag_faiss.py` | module | Índice FAISS + embeddings + respuesta determinista (982 LOC) |
| `backend/data/cv.json` | data | Fuente de verdad del CV — 19KB con estructura public/private |
| `containers/Dockerfile` | config | Build multi-stage para runtime Node+Python |
| `helm/raulglez-me/values.yaml` | config | Configuración de despliegue — HPA, PDB, probes, TLS, resources |
| `.github/workflows/deploy.yml` | CI/CD | Deploy a k3s con validación y diagnóstico de fallos |
| `.github/workflows/publish_container.yml` | CI/CD | Build multi-arch y push a GHCR |
| `.gitignore` | config | Exclusiones: node_modules, dist, .env, secretos, worktrees |
| `Makefile` | build | Orquestación de build: frontend, backend, docker, clean, lint |
| `justfile` | tasks | Task runner: dev, setup, docker-run, release-tag, secrets-* |
| `agents/ARCHITECTURE.md` | docs | Documentación de arquitectura del sistema |
| `README.md` | docs | Documentación principal: estructura, comandos, secretos, estado |
