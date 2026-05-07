# Diagnóstico del Proyecto

_Fecha: 2026-05-06 | Repositorio: raulglez.me_

---

## 1. Exploración

### Estructura general

Monorepo organizado por capa funcional:
- `agents/` — contexto operativo para agentes IA (arquitectura, stack, decisiones, roadmap, specs)
- `backend/` — dos microservicios Node.js (`portal`, `ia`) + Python IA (`python/ia/`)
- `containers/` — Dockerfiles (5) + configuraciones Nginx
- `frontend/` — dos SPAs: `portal-publico` (CV público) y `portal-admin` (panel revisión IA)
- `helm/raulglez-me/` — Helm umbrella chart con 5 subcharts (backend-portal, backend-ia, portal-publico, portal-admin, mosquitto)
- `pipelines/` — documentación CI/CD
- `.github/workflows/` — 11 workflows (publish_* y deploy_*)
- `scripts/` — utilidades shell
- `tasks/` — tareas ejecutables (SpecNative)

### Lenguajes y tecnologías

| Lenguaje | Archivos | LOC | Propósito |
|----------|----------|-----|-----------|
| TypeScript | 19 | 3,114 | Backend (Node.js nativo), Frontend (Pug + Vite) |
| Python | 2 | 982 | IA: FAISS RAG, embeddings con sentence-transformers |
| CSS | 8 | 2,255 | Estilos nativos sin preprocesador |
| YAML | 49 | 2,355 | Helm charts, CI/CD workflows |
| Shell | 3 | 69 | Scripts de utilidad |
| Markdown | 22 | 19,106 | Documentación del proyecto (agents/, pipelines/, etc.) |

**Stack:** Node.js http nativo (sin Express), Vite + Pug + TypeScript, PDFKit, MQTT (mosquitto), Groq API, FAISS (faiss-cpu), SQLite, Docker, Kubernetes (k3s), Helm, GitHub Actions + GHCR.

### Sistema de build / dependencias

- **npm** — 5 `package.json` independientes (portal-publico, portal-admin, backend-portal, backend-ia, backend/javascript)
- **pip** — `backend/python/ia/requirements.txt` (faiss-cpu, sentence-transformers, numpy)
- **Docker** — 5 Dockerfiles multi-stage, imagen base Python separada (`raulglez-python-base`)
- **Helm** — umbrella chart con 5 subcharts, despliegue en k3s
- **Justfile** — 275 líneas, 60+ comandos documentados (dev, build, publish, deploy, secrets, release)
- **Makefile** — complementario al Justfile

### Puntos de entrada

| Entry point | Tecnología | Puerto | Descripción |
|-------------|------------|--------|-------------|
| `GET /api/cv` | Node.js | :3000 | JSON del CV (público) |
| `GET /api/cv.pdf` | Node.js + PDFKit | :3000 | PDF dinámico desde cv.json |
| `POST /api/ai/ask` | MQTT → Node.js IA → Groq/FAISS | :3000 | Chat IA con trazabilidad |
| `GET /admin/` | SPA (Vite) + nginx | :80/:443 | Panel admin de revisión IA |
| `GET /admin/login` | Node.js → 302 redirect | :3000 | Auth admin con sesión |
| `WS /ws` | WebSocket + MQTT | :3000 | Canal en tiempo real |
| `GET /health` | Node.js | :3000 | Health check backend-portal |
| `GET /health` | Node.js IA | :3000 | Health check backend-ia |

### Módulos y componentes clave

```
┌──────────────────────────────────────────────────────────┐
│  portal-publico (Vite SPA)      portal-admin (Vite SPA)  │
│  nginx sirve estáticos          nginx sirve estáticos     │
└──────────────┬──────────────────────┬────────────────────┘
               │ HTTP                 │ HTTP
               ▼                      ▼
┌──────────────────────────────────────────────────────────┐
│  backend-portal (Node.js :3000)                          │
│  • GET /api/cv, /api/cv.pdf                              │
│  • POST /api/ai/ask → MQTT → backend-ia                  │
│  • POST /admin/login, GET /admin/...                     │
│  • WebSocket /ws ↔ MQTT                                  │
└──────────┬───────────────────────┬───────────────────────┘
           │ HTTP (AI_SERVICE_URL) │ MQTT (mosquitto:1883)
           ▼                       ▼
┌──────────────────────────────────────────────────────────┐
│  backend-ia (Node.js :3000 + Python)                     │
│  • MQTT subscribe ai/ask → Groq API / FAISS fallback     │
│  • Python rag_faiss.py: FAISS index, embeddings           │
│  • SQLite: interactions.sqlite (trazabilidad chat)        │
│  • HTTP: /health, /questions, /reindex                    │
└──────────────────────────────────────────────────────────┘
```

Relaciones: portal-publico → backend-portal (HTTP) → backend-ia (MQTT + HTTP). Portal-admin → nginx (SPA) + backend-portal (HTTP auth). backend-ia obtiene cv.json en runtime desde backend-portal (HTTP).

### Archivos de configuración relevantes

| Archivo | Tipo | Relevancia |
|---------|------|------------|
| `.gitignore` | config | Ignora node_modules, dist, .env, keys/, worktrees, artifacts |
| `containers/Dockerfile.*` (5) | build | Multi-stage, no-root, HEALTHCHECK |
| `containers/nginx-portal-*.conf` (2) | config | Reverse proxy + SPA routing |
| `helm/raulglez-me/` (38 YAML) | deploy | HPA, PDB, Ingress, ServiceAccount, startupProbe |
| `.github/workflows/` (11) | CI/CD | publish_* y deploy_* por componente |
| `justfile` (275 líneas) | tasks | 60+ comandos documentados |
| `backend/data/cv.json` | data | Fuente de verdad del contenido CV |
| `.env.example` | config | Plantilla de variables de entorno |

### Estado del repositorio

- **Rama activa:** `main`
- **Último commit:** `a22041f` — "ci: los publish solo se disparan por tag o workflow_dispatch" (2026-05-06)
- **Commits totales:** 126
- **Ramas:** 60 (27 locales, muchas fix/* antiguas)
- **Archivos modificados sin commit:** `.opencode/session-resume.md` (1 archivo)
- **Worktrees activos:** solo el principal (main)
- **Tamaño:** 168 archivos, 63,364 líneas, 31.96 MB — clasificación **GRANDE**

---

## 2. Revisión de calidad

### Problemas estructurales o de diseño

- **Backend con http nativo de Node.js** — sin framework (Express/Fastify). Válido para el tamaño actual, pero las rutas crecerán en complejidad (admin-routes.ts, server.ts, auth.ts ya suman ~500 líneas). Recomendable evaluar migración a Express o Hono si el backend crece.
- **11 workflows de CI/CD** — publish_* y deploy_* duplicados por componente. Podrían consolidarse con GitHub Actions matrix strategies o reusable workflows.
- **CSS sin preprocesador** — `layout.css` (1403 líneas) y `responsive.css` en CSS nativo. Sin variables reutilizables cross-file más allá de custom properties.

### Deuda técnica identificada

| Archivo | Líneas | Problema |
|---------|--------|----------|
| `frontend/portal-publico/src/styles/layout.css` | 1,403 | CSS monolítico, sin módulos |
| `frontend/portal-publico/src/scripts/modules/renderers.ts` | 226 | Función `renderHeader()` con HTML hardcodeado (teléfono, canvas). Acoplamiento presentación/datos |
| `backend/javascript/portal/src/pdf.ts` | 148 | Tipos duplicados de `cv.types.ts` del frontend (CVItem, CVCert, etc.) |
| `backend/javascript/ia/src/ai.ts` | ~500+ | Lógica de IA + MQTT + HTTP + Python child_process en un solo archivo |
| `justfile` | 275 | 60+ comandos — bien documentado pero difícil de navegar |

### Prácticas del lenguaje no seguidas

- **TypeScript:** Sin `strict: true` verificado en todos los `tsconfig.json`. Sin ESLint ni Prettier configurados.
- **Python:** `rag_faiss.py` importa `faiss` dentro de try/except (correcto), pero `sentence_transformers` se importa dentro de una función (carga perezosa correcta, aunque el patrón podría documentarse).
- **Shell:** Scripts en `scripts/` sin `shellcheck` ni validación automatizada.

### Riesgos de seguridad

| Riesgo | Severidad | Detalle |
|--------|-----------|---------|
| Sin rate limiting | 🟡 Media | Endpoints `/api/ai/ask` y `/admin/login` sin protección contra fuerza bruta |
| Dependencias con caret (^) | 🟡 Media | `typescript ^5.0.0`, `vite ^5.0.0` — builds no 100% reproducibles |
| MD5 en fallback de embedding | 🟢 Baja | `rag_faiss.py` usa MD5 para hash determinista (no criptográfico), pero scanners pueden marcarlo |
| Sin CSP headers | 🟡 Media | No se detectaron Content-Security-Policy headers en nginx ni backend |

**Sin hallazgos críticos:** No hay secretos en código (todos vía `process.env`), `.env` ignorado en `.gitignore`, claves age no commiteadas, `.env.enc` cifrado con sops.

### Cobertura de tests y documentación

| Componente | Tests | Documentación |
|------------|-------|---------------|
| backend-portal | ❌ 0 tests | ✅ JSDoc parcial, ARCHITECTURE.md actualizada |
| backend-ia | ❌ 0 tests | ✅ JSDoc parcial, flujo documentado |
| portal-publico | ❌ 0 tests | ✅ Tipos definidos (cv.types.ts) |
| portal-admin | ❌ 0 tests | ✅ Estructura clara |
| Python IA | ❌ 0 tests | ✅ Docstrings parciales |
| Helm charts | ✅ `helm lint` en CI | ✅ values.yaml documentados |
| CI/CD | ✅ `gh actions validate` | ✅ pipelines/CD.md |
| Documentación agents/ | N/A | ✅ Completa (9 archivos) |

**Conclusión:** Documentación excelente. Cobertura de tests: **0%**. Este es el riesgo técnico más grave.

---

## 3. Síntesis ejecutiva

### Resumen del proyecto

**raulglez.me** es un portal web personal con CV interactivo, chat IA y panel administrativo. Arquitectura de microservicios desplegada en k3s: backend-portal (API + PDF + WebSocket), backend-ia (chat con Groq API + FAISS RAG local), portal-publico (SPA con Pug/TypeScript/CSS nativo) y portal-admin (panel de revisión de preguntas IA). Comunicación interna vía MQTT + HTTP. CI/CD con GitHub Actions + GHCR + Helm.

### Estado de salud

**🟡 Amarillo** — El proyecto está en producción, funcional y bien documentado, pero tiene **dos riesgos estructurales**: (1) ausencia total de tests automatizados, y (2) 60 ramas acumuladas con deuda de mantenimiento git. La arquitectura es sólida, los Dockerfiles son seguros, y no hay secretos expuestos.

### Top 3 fortalezas

1. **Documentación excepcional** — agents/ completo (9 archivos de contexto), Justfile con 60+ comandos documentados, pipelines/CD.md, ARCHITECTURE.md, DECISIONS.md. Cualquier desarrollador o agente IA puede entender el sistema en minutos.
2. **Arquitectura limpia y segura** — microservicios bien separados, comunicación MQTT + HTTP, Dockerfiles multi-stage con usuarios no-root y HEALTHCHECK, Helm charts con HPA/PDB/startupProbe, secretos gestionados con sops + age.
3. **RAG local resiliente** — fallback determinista con FAISS cuando Groq API no está disponible. Indexado automático al detectar cambios en cv.json. Endpoints de administración para reindexado manual.

### Top 3 riesgos o deudas

1. **Cobertura de tests: 0%** — Ni un solo test automatizado en ningún componente. Cualquier cambio en backend (PDF, auth, rutas admin) o frontend (renderers, tipos) se despliega sin validación automática. Riesgo alto de regresiones.
2. **60 ramas sin limpiar** — 27 ramas locales de fixes ya mergeados que contaminan el namespace git. Dificulta navegación y aumenta riesgo de trabajar en rama equivocada.
3. **CSS monolítico (1,403 líneas) sin tooling** — `layout.css` crecerá con nuevas secciones. Sin preprocesador ni linting CSS, el riesgo de especificidad conflictiva y código muerto aumenta.

### Próximos pasos recomendados

1. **Agregar tests unitarios para backend** — priorizar `pdf.ts` (generación PDF), `auth.ts` (login/sesión), `admin-routes.ts` (CRUD de preguntas). Usar Vitest (ya que el proyecto usa Vite) con `node:test` como alternativa cero-dependencias. Impacto: alto. Esfuerzo: medio.
2. **Limpiar ramas obsoletas** — eliminar ramas locales y remotas de fixes ya mergeados. Ejecutar `git branch --merged main | grep -v main | xargs git branch -d` para locales, y equivalente para remotas. Impacto: medio. Esfuerzo: bajo.
3. **Agregar ESLint + Prettier** — configurar linting para TypeScript en los 4 componentes. Crea un `.eslintrc.json` base compartido. Impacto: medio (consistencia de código). Esfuerzo: bajo.

---

## 4. Archivos relevantes

| Archivo | Tipo | Relevancia |
|---------|------|------------|
| `backend/data/cv.json` | data | Fuente de verdad del contenido CV — alimenta API, PDF, IA |
| `backend/javascript/portal/src/server.ts` | entry | Entry point principal del backend (239 líneas) |
| `backend/javascript/portal/src/pdf.ts` | module | Generación PDF dinámico (148 líneas, sin tests) |
| `backend/javascript/portal/src/auth.ts` | module | Autenticación admin con sesión (sin tests) |
| `backend/javascript/ia/src/ai-server.ts` | entry | Servicio IA — MQTT + HTTP (197 líneas) |
| `backend/javascript/ia/src/ai.ts` | module | Lógica IA: Groq, FAISS, Python child_process, SQLite |
| `backend/python/ia/rag_faiss.py` | module | FAISS RAG: embeddings, index, búsqueda (243 líneas) |
| `frontend/portal-publico/src/scripts/modules/renderers.ts` | module | Renderizado HTML del CV (226 líneas) |
| `frontend/portal-publico/src/styles/layout.css` | style | CSS principal (1,403 líneas) |
| `frontend/portal-publico/src/types/cv.types.ts` | types | Tipos TypeScript del CV — fuente de tipos compartida |
| `containers/Dockerfile.backend-ia` | build | Dockerfile más complejo: multi-stage + Python base |
| `helm/raulglez-me/Chart.yaml` | deploy | Umbrella chart principal |
| `.github/workflows/deploy.yml` | CI/CD | Workflow de deploy principal |
| `justfile` | tasks | 275 líneas, 60+ comandos documentados |
| `agents/ARCHITECTURE.md` | docs | Documento de arquitectura — entry point para entender el sistema |
| `agents/DECISIONS.md` | docs | Trade-offs persistentes que constrainen iniciativas futuras |
