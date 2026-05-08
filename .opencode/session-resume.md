# Session Resume

_Sesión: 2026-05-06-integracion-cv-articles | Cerrada: 2026-05-07 | Agente: deepseek-v4-pro_

## Estado al cerrar

Todas las tareas completadas. El portal público, el PDF, el admin panel y FAISS están alineados con el nuevo esquema de `cv.json` (campo `articles`, tipo `type` en conferencias). 4 PRs mergeados y en producción.

## Completado ✅

- PR #36: fix(admin) nginx sirve SPA en lugar de proxy a backend + feat(portal) renderArticles() y conference type badge
- PR #37: fix(admin) GET /admin/login redirige 302 al SPA (antes servía fallback vacío de 251B)
- PR #38: style(portal) CSS grid para `.articles__list` — la sección se renderizaba en el DOM pero sin layout visible
- PR #39: feat(pdf) sección Artículos + tipo de conferencia en PDF (`GET /api/cv.pdf`)
- FAISS reindexado: 443 docs, 384 dim — nuevo cv.json indexado, queries sobre artículos devuelven chunks correctos
- Backend-portal, backend-ia, portal-publico, portal-admin: todos redeployados con `rollout restart`
- Usado `just publish-*` y `just deploy-*` del Justfile para pipelines

## Pendiente / En progreso 🔄

Ninguna — todo completado.

## Archivos modificados

| Archivo | Operación | PR | Estado |
|---------|-----------|-----|--------|
| `containers/nginx-portal-admin.conf` | edit | #36 | ✅ mergeado |
| `containers/Dockerfile.portal-admin` | edit | #36 | ✅ mergeado |
| `frontend/portal-publico/src/types/cv.types.ts` | edit | #36 | ✅ mergeado |
| `frontend/portal-publico/src/scripts/modules/renderers.ts` | edit | #36 | ✅ mergeado |
| `frontend/portal-publico/src/scripts/main.ts` | edit | #36 | ✅ mergeado |
| `frontend/portal-publico/index.pug` | edit | #36 | ✅ mergeado |
| `backend/javascript/portal/src/admin-routes.ts` | edit | #37 | ✅ mergeado |
| `frontend/portal-publico/src/styles/layout.css` | edit | #38 | ✅ mergeado |
| `frontend/portal-publico/src/styles/responsive.css` | edit | #38 | ✅ mergeado |
| `backend/javascript/portal/src/pdf.ts` | edit | #39 | ✅ mergeado |

## Decisiones técnicas tomadas

- **nginx portal-admin**: `location /admin/` usa `try_files` para SPA estática; solo `POST /admin/login` y `POST /admin/logout` se proxy al backend. Dockerfile copia `dist/` a `/usr/share/nginx/html/admin/` (alineado con `base: '/admin/'` de Vite).
- **admin-routes.ts**: GET `/admin`, `/admin/`, `/admin/login` redirigen 302 a `/admin/` para que nginx sirva el SPA. El SPA maneja login client-side vía `checkSession()`.
- **CSS articles**: `.articles__list` comparte grid con `.conferences__list` (280px min, auto-fit, gap lg). Añadido a los 3 breakpoints responsive.
- **PDF articles**: tipo `CVArticle` con `{title, publication, date}`. Sección condicional `if (data.articles?.length)` entre Conferencias y Proyectos. Conferencias muestran type como `[talk]`.
- **FAISS**: auto-rebuild en primera query vía `ensure_index()` que compara mtime de cv.json y SQLite contra manifest.

## Errores no resueltos

Ninguno. El falso negativo en la verificación del PDF era por CID font encoding (hex `<hex>`) — no por falta de contenido. La sección Artículos sí está presente en el PDF.

## Próximo paso recomendado

No hay pasos pendientes. Si se requiere trabajo nuevo, identificar la iniciativa en `agents/ROADMAP.md` o crear una nueva spec en `agents/specs/`.

## Contexto para retomar

El portal (`raulglez.me`) está en producción con el nuevo cv.json integrado en todos los componentes: frontend público (articles visibles con CSS grid), PDF (`/api/cv.pdf` incluye sección Artículos), admin panel (`/admin/` sirve SPA correctamente), y FAISS indexa los nuevos campos para el chat IA. Los pipelines se disparan con `just publish-*` y `just deploy-*`. Todo cambio de código usa worktrees aislados en `.opencode/worktrees/`.
