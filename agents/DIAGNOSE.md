# Diagnóstico del Proyecto

_Fecha: 2026-05-06 | Repositorio: raulglez.me_

---

## 1. Exploración

### Estructura general
Proyecto modular con separación clara de responsabilidades:

```
raulglez.me/
├── frontend/
│   ├── portal-publico/     — Sitio público (CV viewer, chat IA flotante)
│   └── portal-admin/       — Panel de administración (revisión de preguntas IA)
├── backend/
│   ├── javascript/portal/  — API backend (/api/cv, /api/cv.pdf, proxy IA)
│   ├── javascript/ia/      — Servidor IA (Groq GenAI + fallback determinista FAISS)
│   └── python/ia/          — Motor RAG con FAISS (rag_faiss.py)
├── containers/             — Dockerfiles + configs nginx
├── helm/raulglez-me/       — Chart Helm para despliegue en k3s
├── .github/workflows/      — CI/CD (publish + deploy)
├── agents/                 — Documentación SpecNative para agentes IA
├── tasks/                  — Planificación de iniciativas
└── pipelines/              — Documentación de pipelines CI/CD
```

### Lenguajes y tecnologías
| Tecnología | Archivos | Uso |
|------------|----------|-----|
| TypeScript | 19 | Frontend (Vite) + Backend (Node.js) |
| Python | 2 | Motor RAG con FAISS |
| HTML/PUG | 1 | Templates de frontend |
| Markdown | 20 | Documentación del proyecto |
| YAML | 49 | Helm charts + GitHub Actions |
| Docker | ~5 | Dockerfiles multi-servicio |
| Nginx | ~3 | Reverse proxy en frontend |
| Shell | ~5 | Scripts de utilidad |

### Sistema de build / dependencias
- **npm**: 4 proyectos Node.js independientes (`portal-publico`, `portal-admin`, `backend/javascript/ia`, `backend/javascript/portal`)
- **pip**: `backend/python/ia/requirements.txt`
- **Makefile**: Automatización en raíz y `containers/`
- **Just**: `justfile` en raíz para tareas de desarrollo
- **Helm**: Gestión de despliegues Kubernetes (`helm/raulglez-me/`)

### Puntos de entrada
| Servicio | Entry point | Runtime |
|----------|-------------|---------|
| Portal público | `frontend/portal-publico/index.html` → `src/scripts/main.ts` | Vite dev server |
| Portal admin | `frontend/portal-admin/index.html` → `src/scripts/admin.ts` | Vite dev server |
| Backend portal | `backend/javascript/portal/src/server.ts` | Node.js :3000 |
| Backend IA | `backend/javascript/ia/src/ai-server.ts` | Node.js :3000 |
| Python IA | `backend/python/ia/rag_faiss.py` | Invocado por backend IA |

### Módulos y componentes clave
```
Frontend (portal-publico, portal-admin)
    │ HTTP /api/*
    ▼
Backend JavaScript portal (server.ts:3000)
    │ API CV + CV.pdf + proxy /api/ai/*
    ▼
Backend JavaScript IA (ai-server.ts:3000)
    │ Groq API (genai) + FAISS (deterministic fallback)
    ▼
Backend Python IA (rag_faiss.py)
    │ Índice FAISS desde cv.json + SQLite
```

**Relaciones:** Frontends consumen API del backend portal. Backend portal proxy a backend IA para `/api/ai/*`. Backend IA consulta Groq o fallback local con FAISS. Mosquitto MQTT usado por backend portal. Containers dockerizan cada servicio. Helm orquesta el despliegue en k3s con Ingress haproxy.

### Archivos de configuración relevantes
| Archivo | Tipo | Propósito |
|---------|------|-----------|
| `.gitignore` | Config | Excluye `.env`, `node_modules`, `.opencode/worktrees/` |
| `containers/Dockerfile.*` | Docker | Imágenes para frontend, backend, AI |
| `.github/workflows/publish-*.yml` | CI/CD | Build y push de imágenes a GHCR |
| `.github/workflows/deploy.yml` | CI/CD | Deploy Helm a k3s |
| `helm/raulglez-me/values.yaml` | Helm | Configuración de despliegue Kubernetes |
| `tsconfig.json` (×4) | TypeScript | Config de compilación por proyecto |
| `containers/nginx-*.conf` | Nginx | Reverse proxy para frontends |
| `.env.example` | Config | Template de variables de entorno |
| `justfile` | Task runner | Tareas de desarrollo |

### Estado del repositorio
- **Rama actual:** `main`
- **Último commit:** `8638a3a` — `refactor(helm): consolida configuración de Helm en portales específicos`
- **Working directory:** Limpio, sin archivos sin trackear
- **Tamaño:** ~160 archivos, ~49,000 líneas — clasificado como **GRANDE**
- **Ramas locales:** main + 6 ramas de fix (fix/disable-legacy-deploy-trigger, fix/helm-lock-self-heal, etc.)

---

## 2. Revisión de calidad

### Problemas estructurales o de diseño
- **portal-admin monolítico:** Toda la lógica concentrada en un solo archivo `admin.ts`, mientras que `portal-publico` está bien modularizado en 9 archivos bajo `modules/`.
- **Sin duplicación visible** entre portales — son aplicaciones independientes con propósitos distintos.
- **Separación clara JS/Python** en backend — cada runtime tiene su responsabilidad bien definida.

### Deuda técnica identificada
- **Sin archivos fuente >500 líneas** — el código es mantenible en tamaño.
- **Sin TODOs/FIXMEs/HACKs** en el código fuente — no hay deuda explícita documentada.
- **Superficie limpia** — sin código comentado excesivo ni bloques muertos detectados.

### Prácticas del lenguaje no seguidas
- ❌ **Sin ESLint** configurado en ningún proyecto TypeScript.
- ❌ **Sin Prettier** configurado en ningún proyecto.
- ❌ **Solo 1 comentario JSDoc** en todo el proyecto (`chat.ts:1`) — documentación inline casi inexistente.
- ✅ **Try/catch presente** en entry points (8 bloques en admin.ts, 4 en ai.ts, 2 en ai-server.ts).
- ✅ **TypeScript correctamente configurado** con `tsconfig.json` en los 4 proyectos.

### Riesgos de seguridad
- ✅ `.gitignore` cubre correctamente `.env` y `.env.*`, permite `.env.example` y `.env.enc`.
- ✅ Sin secretos hardcodeados detectados en código fuente.
- ❌ **Dependencias con caret ranges (`^`)** en todos los `package.json` — builds no 100% reproducibles.
- ❌ **`backend/javascript/ia/package.json`** tiene `"dependencies": {}` vacío — dependencias no declaradas formalmente.
- ✅ Sin archivos sensibles expuestos en el repositorio.

### Cobertura de tests y documentación
- ❌ **CERO tests** en todo el proyecto: sin `*.test.*`, `*.spec.*`, ni directorios `__tests__/`.
- ❌ **CERO README.md** en módulos individuales: ni `portal-publico`, `portal-admin`, `backend/*`, `containers`, ni `helm` tienen README local.
- ✅ Documentación centralizada existe en raíz (`README.md`) y `agents/` (SpecNative).
- ❌ Sin JSDoc significativo en funciones exportadas.

---

## 3. Síntesis ejecutiva

### Resumen del proyecto
Sitio web portfolio personal con API de CV, chat IA con Groq + fallback determinista FAISS, generación de PDF, y panel de administración. Arquitectura moderna desacoplada en 4 servicios (frontend, backend API, backend IA, Python FAISS) contenerizados con Docker y desplegados en k3s vía Helm. Dos frontends independientes (público + admin) consumen API REST del backend.

### Estado de salud
**[🟡 Amarillo]** — Arquitectura sólida y sistema en producción funcional, pero con deficiencias importantes de ingeniería: 0% de cobertura de tests, sin herramientas de linting/formateo, y dependencias sin versiones fijas. La base técnica es buena pero frágil ante cambios.

### Top 3 fortalezas
1. **Arquitectura desacoplada bien diseñada** — 4 servicios independientes con responsabilidades claras, comunicación HTTP interna, y despliegue orquestado con Helm en k3s.
2. **CI/CD completo y funcional** — GitHub Actions para build multi-arquitectura, push a GHCR, y deploy automatizado con diagnóstico de fallos.
3. **Manejo de errores presente en entry points** — try/catch en todos los servidores y frontends, reduciendo riesgo de crashes silenciosos.

### Top 3 riesgos o deudas
1. **Cobertura de tests inexistente (0%)** — cualquier cambio en el código es un riesgo de regresión sin red de seguridad. Un refactor o nueva feature puede romper funcionalidad en producción sin detección temprana.
2. **Sin herramientas de calidad de código (ESLint/Prettier)** — 4 proyectos TypeScript sin estándar de estilo forzado. Riesgo de inconsistencias acumulativas y fricción en colaboración.
3. **Dependencias no fijadas (`^` ranges) + IA backend sin deps declaradas** — builds no son reproducibles. Una actualización automática de dependencia puede romper el servicio IA en producción.

### Próximos pasos recomendados
1. **Agregar ESLint + Prettier a los 4 proyectos TypeScript** — bajo esfuerzo, alto impacto en consistencia de código. Usar configuraciones estándar (e.g., `@typescript-eslint/recommended`).
2. **Crear suite de tests de humo para endpoints críticos** — tests de integración para `GET /api/cv`, `POST /api/ai/ask`, `GET /health`. Framework: Vitest (mismo ecosistema Vite).
3. **Fijar dependencias y declarar las faltantes** — reemplazar `^` por versiones exactas en los 4 `package.json` y declarar dependencias reales en `backend/javascript/ia/package.json`.

---

## 4. Archivos relevantes

| Archivo | Tipo | Relevancia |
|---------|------|------------|
| `frontend/portal-publico/src/scripts/main.ts` | entry | Entry point del sitio público |
| `frontend/portal-admin/src/scripts/admin.ts` | entry | Entry point del panel admin (monolítico, 8 try/catch) |
| `backend/javascript/portal/src/server.ts` | entry | API backend — endpoints CV, PDF, proxy IA |
| `backend/javascript/ia/src/ai-server.ts` | entry | Servidor IA — endpoints /ask, /reindex |
| `backend/python/ia/rag_faiss.py` | module | Motor RAG con FAISS |
| `backend/javascript/ia/package.json` | config | Dependencias vacías — requiere atención |
| `helm/raulglez-me/values.yaml` | config | Configuración de despliegue Kubernetes |
| `.github/workflows/deploy.yml` | CI/CD | Pipeline de deploy automatizado |
| `containers/Dockerfile.backend-ia` | Docker | Imagen del servicio IA (Node + Python) |
| `.gitignore` | config | Correctamente configurado para secretos |
| `agents/ARCHITECTURE.md` | docs | Documentación de arquitectura actualizada |
| `agents/DECISIONS.md` | docs | Trade-offs persistentes del proyecto |
