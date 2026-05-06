# CONVENTIONS.md

Convenciones de desarrollo del portal CV `raulglez.me`.

## Estructura de directorios

```
frontend/
  portal-publico/               ← CV público + Chat IA
    index.pug                   ← layout principal (compilado a index.html en build)
    scripts/render-pug.mjs      ← compila pug → html antes de vite
    public/images/              ← assets estáticos (copiados tal cual en build)
    src/
      scripts/
        main.ts                 ← orquestador: fetch /api/cv + render + observers
        modules/
          chat.ts               ← WebSocket /ws/chat
          renderers.ts          ← funciones de renderizado por sección
          observers.ts          ← IntersectionObserver (clase is-visible)
          accessibility.ts      ← toolbar de accesibilidad
          phone-canvas.ts       ← canvas decorativo
          text-utils.ts         ← utilidades de texto
          ai-review.ts          ← integración con panel IA (futuro)
      styles/
        variables.css           ← design tokens
        base.css                ← reset + estilos base
        layout.css              ← secciones del CV
        animations.css          ← transiciones + is-visible
        responsive.css          ← media queries
        main.css                ← entry point (importa todos)
      types/
        cv.types.ts             ← tipos TypeScript del CV

  portal-admin/                 ← Panel administrativo
    index.html                  ← entry point (HTML directo, sin Pug)
    src/
      scripts/
        admin.ts                ← toda la lógica del panel admin
      styles/
        admin.css               ← estilos del panel
        variables.css           ← copia de los design tokens

backend/
  javascript/
    portal/                     ← Node.js puro
      src/
        server.ts               ← http.createServer + rutas
        ws-handler.ts           ← WebSocket + MQTT publisher
        admin-routes.ts         ← rutas /admin/* y /api/admin/*
        pdf.ts                  ← generador PDF con pdfkit
      data/
        cv.json                 ← fuente de verdad del CV
    ia/                         ← Node.js + MQTT
      src/
        ai-server.ts            ← arranque: loadCvFromPortal + MQTT sub + HTTP admin
        ai.ts                   ← RAG: Python bridge, Groq, SQLite tracking
  python/
    ia/
      rag_faiss.py              ← script RAG: build/query/status/deterministic_answer
      requirements.txt          ← faiss-cpu, sentence-transformers

containers/
  Dockerfile.portal-publico
  Dockerfile.portal-admin
  Dockerfile.backend-portal
  Dockerfile.backend-ia
  Dockerfile.python-base        ← imagen estática con deps pesadas
  nginx-portal-publico.conf     ← proxy /api/ y /ws/ → backend-portal
  nginx-portal-admin.conf       ← proxy /api/admin/ y /admin/ → backend-portal
  nginx-main.conf               ← config nginx con pid en /tmp (UID 101)
  Makefile
```

## Naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Servicios Kubernetes | kebab-case con prefijo `raulglez-` | `raulglez-backend-portal` |
| Imágenes Docker | kebab-case con prefijo `raulglez-` | `raulglez-portal-publico` |
| Charts Helm | kebab-case | `portal-publico`, `backend-ia` |
| Archivos TypeScript | camelCase | `ws-handler.ts`, `ai-server.ts` |
| Módulos frontend | camelCase | `chat.ts`, `renderers.ts` |
| Clases CSS | BEM-like | `cv-chat__bubble--warning` |
| IDs HTML | kebab-case | `#chat-toggle`, `#cv-chat-window` |
| Tópicos MQTT | slash separado | `ai/ask`, `ai/response/{correlationId}` |
| Variables de entorno | UPPER_SNAKE_CASE | `GROQ_API_KEY`, `MQTT_URL` |

## TypeScript

- Target: `ES2022`, module: `NodeNext` (backend), `ESNext`/bundler (frontend).
- `strict: true` en todos los proyectos.
- Sin `any` explícito; usar tipos o `unknown` + narrowing.
- Imports con extensión `.js` en backend (NodeNext ESM).
- `node:` prefix en imports de módulos nativos Node.js (`node:http`, `node:crypto`).

## Estilos CSS

- Variables de design tokens en `variables.css` (no hardcodear colores ni tamaños).
- Animaciones por `IntersectionObserver` → clase `is-visible` → CSS transition.
- Siempre incluir `@media (prefers-reduced-motion: reduce)` en animaciones.
- No usar librerías JS de animación (GSAP, AOS, Framer) — solo CSS nativo.

## Comunicación WebSocket / MQTT

- Mensajes WebSocket siempre en JSON con campo `type` discriminante.
- `correlationId` = `${clientId}-${Date.now()}` (no usar UUID aleatorio para correlación).
- MQTT QoS 1 para mensajes de chat (garantía de entrega).
- Timeouts explícitos: 60 s para respuesta IA, 5 min para inactividad WS.

## Backend Node.js

- Sin frameworks (no Express, no Fastify) — solo `node:http`.
- Rutas como `if (method === 'X' && url === '/ruta')` en `handleRequest`.
- `readJsonBody` siempre con manejo de error y valor default `'{}'`.
- Errores HTTP: siempre JSON con `{ ok: false, error: string }`.

## cv.json

- `contact.public` → visible en `/api/cv` (web pública).
- `contact.private` → solo en `/api/cv.pdf` (nunca en respuestas HTTP).
- Modificar solo en `backend/javascript/portal/data/cv.json`.
- El backend-ia lo obtiene en runtime, no en imagen Docker.

## Commits

- Formato: Conventional Commits
  - `feat:` nueva funcionalidad
  - `fix:` corrección de bug
  - `refactor:` reestructuración sin cambio de comportamiento
  - `ci:` workflows y CI/CD
  - `docs:` documentación
  - `chore:` mantenimiento (deps, config)
- Un commit = un propósito lógico.
- Mensajes en español o inglés, consistentes dentro del PR.

## Testing

- Build verification: `just build` debe completar sin errores TypeScript.
- Helm lint: `just lint` debe pasar en los 5 charts.
- YAML lint: workflows de GitHub Actions deben ser YAML válido.
- Manual: inspección visual en `just dev` y `just preview`.
- No hay test suite automatizado todavía — se agrega cuando el proyecto lo justifique.

## Documentación

- `agents/*.md` — contexto operativo del proyecto (arquitectura, stack, decisiones).
- `README.md` — índice y guía rápida de inicio.
- `pipelines/CD.md` — flujo de despliegue y secretos.
- `tasks/TODO.md` — tareas activas.
- No duplicar información entre documentos.
- Al tomar una decisión técnica relevante, registrarla en `agents/DECISIONS.md`.
