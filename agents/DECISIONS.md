# DECISIONS.md

Decisiones técnicas persistentes del proyecto `raulglez.me`.

---

## D001 — Vite sobre Webpack

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: Se necesitaba un bundler para generar HTML estático con Pug y TypeScript.

**Decisión**: Usar Vite 5 en lugar de Webpack.

**Razonamiento**:
- Configuración mínima (30 líneas vs 100+).
- Nativo ESM — HMR instantáneo en desarrollo.
- Plugin de Pug (`vite-plugin-pug`) y TypeScript soportados de fábrica.
- Build más rápido (esbuild subyacente).

**Consecuencias**:
- Requiere Node.js LTS (ya usado en Docker).
- Menor ecosistema de plugins que Webpack (no relevante para este proyecto).

---

## D002 — PugJS sobre HTML plano

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: El CV tiene múltiples secciones repetitivas. Se usa solo en `portal-publico`.

**Decisión**: Usar PugJS como template engine en tiempo de build.

**Razonamiento**:
- Sin overhead de runtime — se compila a HTML estático.
- Script `render-pug.mjs` + Vite: flujo de build simple.
- `portal-admin` usa HTML plano directamente (no necesita partials).

**Consecuencias**:
- Los partials no funcionan sin build.
- Curva de aprendizaje para colaboradores no familiarizados con Pug.

---

## D003 — CSS nativo + Intersection Observer sobre librerías JS

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: Se querían animaciones sutiles sin penalizar el rendimiento.

**Decisión**: CSS transitions con clase `is-visible` activada por `IntersectionObserver` nativo.

**Razonamiento**:
- 0 dependencias npm adicionales.
- Animaciones scroll-triggered con ~20 líneas de JS.
- Siempre incluye `prefers-reduced-motion` para accesibilidad.

**Consecuencias**:
- Animaciones más limitadas que GSAP/Framer (suficiente para un CV).

---

## D004 — nginx:alpine como base para frontends

**Estado**: accepted
**Fecha**: 2026-05-01

**Decisión**: Usar `nginx:alpine` como imagen base para `portal-publico` y `portal-admin`.

**Razonamiento**:
- Imagen ~10 MB vs ~50 MB (Debian).
- Menor superficie de ataque.
- UID 101 (usuario nginx) para ejecutar sin root.

**Consecuencias**:
- Directorios de caché en `/tmp/nginx` (escritura sin root).
- `apk` en lugar de `apt` si se necesita instalar algo.

---

## D005 — Node.js puro sin frameworks (backend-portal)

**Estado**: accepted
**Fecha**: 2026-05-01

**Decisión**: Usar solo `node:http` (sin Express, Fastify, Hono, etc.) en `backend-portal`.

**Razonamiento**:
- El número de rutas es pequeño y estable.
- Sin overhead de middleware ni bootstrapping.
- Dependencias: solo `pdfkit`, `ws`, `mqtt` — sin framework HTTP.
- Total control sobre el ciclo de vida de request/response.

**Consecuencias**:
- Routing manual con `if (method && url)`.
- Sin middleware de terceros para parsing, CORS, sesiones — todo implementado explícitamente.
- Más verboso que Express para rutas complejas, aceptable para este tamaño.

---

## D006 — GHCR sobre Docker Hub

**Estado**: accepted
**Fecha**: 2026-05-01

**Decisión**: Usar GitHub Container Registry (GHCR) en lugar de Docker Hub.

**Razonamiento**:
- Integración nativa con `GITHUB_TOKEN` (sin secrets adicionales para push).
- Sin rate limiting para pulls autenticados.
- Mismo lugar que el código fuente.

**Consecuencias**:
- Requiere `docker/login-action` con `registry: ghcr.io`.
- Imágenes públicas (repo público).

---

## D007 — Multi-servicio con Helm charts independientes

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: El sistema creció de 1 a 5 componentes desplegables.

**Decisión**: Un chart Helm por servicio en `helm/raulglez-me/<servicio>/`, cada uno con su `values.yaml`.

**Razonamiento**:
- Deploys independientes: cambiar `portal-publico` no toca `backend-ia`.
- `values.yaml` por servicio elimina flags `--set` en los workflows.
- La plantilla base compartida (`helm/raulglez-me/templates/`) sirve de herencia.
- Failfast granular: el rollout de un servicio no bloquea a los demás.

**Consecuencias**:
- 5 `helm upgrade --install` en los workflows en lugar de 1.
- El chart raíz (`helm/raulglez-me/`) actúa como librería de templates, no se instala directo.

---

## D008 — WebSocket + MQTT sobre HTTP polling para chat IA

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: El chat IA requería comunicación asíncrona con tiempo de espera variable (5–60 s).

**Decisión**: WebSocket (`/ws/chat`) en el browser + MQTT pub/sub entre backend-portal y backend-ia.

**Razonamiento**:
- WebSocket elimina el polling HTTP (ineficiente con latencias largas).
- MQTT desacopla el portal de la IA: el portal solo publica y escucha; la IA puede reiniciarse sin afectar el portal.
- `correlationId` = `${clientId}-${Date.now()}` permite enrutar respuestas al WS correcto.
- Mosquitto (Eclipse) es la implementación MQTT más simple y estable para k3s.

**Consecuencias**:
- El portal necesita mantener el cliente MQTT singleton activo.
- Hay un timeout de 60 s en el lado portal para evitar fugas de `pendingRequests`.
- Si Mosquitto se reinicia, los mensajes en vuelo se pierden (QoS 1 garantiza entrega una vez conectado).
- El proxy nginx debe soportar WebSocket upgrade (header `Upgrade: websocket`).

---

## D009 — Imagen base Python estática para backend-ia

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: La imagen con `faiss-cpu` + `sentence-transformers` + modelo descargado pesa ~2 GB. Un rebuild completo tardaba 15–30 min y causaba timeouts en k3s.

**Decisión**: Separar en dos imágenes:
1. `Dockerfile.python-base` — imagen estática con todas las deps Python y el modelo pre-descargado. Solo se reconstruye cuando cambia `requirements.txt`.
2. `Dockerfile.backend-ia` — hereda de `python-base`, agrega solo el código (segundos de build).

**Razonamiento**:
- El modelo (`all-MiniLM-L6-v2`) y las libs Python son inmutables entre deploys.
- Separar la capa pesada de la capa de código reduce el rebuild a < 1 min.
- `publish_python_base.yml` solo se dispara cuando cambia `requirements.txt`.

**Consecuencias**:
- Hay dos imágenes que gestionar en GHCR.
- `Dockerfile.backend-ia` usa `ARG PYTHON_BASE_TAG` para versionar la base.
- Si el modelo cambia, hay que actualizar manualmente `requirements.txt` o el Dockerfile base.

---

## D010 — cv.json obtenido en runtime por backend-ia (no en imagen)

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: Con la separación multi-servicio, `cv.json` pertenece al portal. Incluirlo en la imagen del IA duplicaría la fuente de verdad y requeriría rebuild de IA al cambiar el CV.

**Decisión**: `backend-ia` obtiene `cv.json` vía `GET /api/cv` al arrancar, con 10 reintentos × 3 s. Se cachea en `/tmp/raulglez_cv.json`.

**Razonamiento**:
- Única fuente de verdad en `backend/javascript/portal/data/cv.json`.
- Cambiar el CV solo dispara el rebuild de `backend-portal`, no de `backend-ia`.
- El caché en `/tmp` es suficiente: el archivo se recarga solo al reiniciar el pod.

**Consecuencias**:
- `backend-ia` necesita que `backend-portal` esté disponible antes de poder responder.
- El `startupProbe` de backend-ia tiene 15 min de margen para permitir el arranque de la IA.
- Si `backend-portal` no responde tras 10 reintentos, `backend-ia` falla y k3s lo reinicia.

---

## D011 — `node:sqlite` nativo sobre better-sqlite3

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: Se necesitaba SQLite en Node.js para tracking de interacciones.

**Decisión**: Usar el módulo nativo `node:sqlite` (Node.js 22+) en lugar de `better-sqlite3`.

**Razonamiento**:
- Sin compilación nativa (no requiere `node-gyp`, Python, binding.gyp).
- Elimina la complejidad de rebuild en diferentes arquitecturas.
- API síncrona compatible con el patrón de uso en `ai.ts`.

**Consecuencias**:
- Requiere Node.js 22+. `lts-alpine` ya incluye Node 22.
- API ligeramente diferente a `better-sqlite3` (misma semántica, diferente import).

---

## D012 — Dos portales separados (publico y admin) sobre uno combinado

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: El portal original combinaba el CV público y el panel admin en un mismo Vite build (dos entry points).

**Decisión**: Separar en `frontend/portal-publico/` y `frontend/portal-admin/` como proyectos Vite independientes.

**Razonamiento**:
- Deploys independientes: el panel admin puede actualizarse sin tocar el portal público.
- Tamaños de bundle separados: el admin tiene muchas dependencias de tabla/modal que no deben afectar el CV.
- `portal-admin` lleva `noindex/nofollow` en el HTML y no necesita Pug.
- Seguridad clara: el nginx del admin solo proxea rutas `/api/admin/` y `/admin/`.

**Consecuencias**:
- `scripts/setup.sh` y `justfile` instalan/buildean 2 proyectos frontend.
- `variables.css` se duplica en `portal-admin/` (copia, no symlink — para independencia total).
- Dos Dockerfiles nginx y dos configuraciones nginx independientes.
