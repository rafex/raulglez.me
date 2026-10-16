## Active

- [blocked] Revisar logs históricos de acceso a `/api/ai/questions`, `/api/ai/questions/:id`, `/api/ai/reindex` y `/api/cv.pdf`; el contexto GKE requiere renovar autenticación de `gcloud`.

## Completed

- [x] Portal CV raulglez.me — PR #1 merged (40 archivos, 4367 líneas)
- [x] Herramientas de desarrollo — PR #2 merged (justfile + Makefile + scripts)
- [x] Mitigar exposición de rutas IA y PDF; límites del chat/formularios y pruebas de regresión.

## Commands

```bash
just dev          # Inicia Vite dev server → http://localhost:3000
just preview      # Previsualiza build de producción → http://localhost:4173
just setup        # Instala dependencias (primer uso)
just build        # Compila el frontend
just docker-run   # Ejecuta contenedor local → http://localhost:8080
just docker-build # Construye imagen Docker
just lint         # Valida Helm chart
just helm-template # Renderiza templates Helm
```

## History

| Date | Plan | Status |
|------|------|--------|
| 2026-05-01 | tasks/PLAN-2026-05-01.md | ✅ completado |
| 2026-05-01 | task-runner-justfile | ✅ completado |
