# TODO

Estado: `active`

## Pendiente inmediato

- [x] Ajustar `containers/Dockerfile` para runtime de fallback determinista:
  - incluir `python3` en imagen final,
  - copiar `backend/ai/`,
  - instalar dependencias de `backend/ai/requirements.txt`.
- [x] Crear `Secret` de Kubernetes para variables de app (`raulglez-me-env`) y documentar comando:
  - `GROQ_API_KEY` (obligatoria),
  - `GROQ_MODEL` (opcional).
- [x] Endurecer `.github/workflows/deploy.yml`:
  - usar `GHCR_USERNAME` + `GHCR_TOKEN` para `ghcr-pull-secret`,
  - validar namespace/release antes de deploy,
  - agregar bloque de diagnóstico en fallo (describe/logs/events).
- [x] Verificar despliegue real en k3s con:
  - `helm lint`,
  - `helm template`,
  - `helm upgrade --install`,
  - prueba funcional de `/api/ai/ask` en modo GenAI ✅ y fallback determinista.
  - **Desplegado**: `v1.20260504-11`. Bugs corregidos: nombre imagen GHCR (raulglez-me→raulglez.me), node_modules faltante, emptyDir borraba cv.json, rutas ai.ts, Ingress haproxy, RAM 1Gi para FAISS/OOM. Panel IA removido del header público.

## Pendiente funcional (producto)

- [x] Panel de revisión de preguntas IA:
  - listar preguntas/respuestas guardadas,
  - calificar (`rating`) y aprobar/rechazar (`status`),
  - editar `adjusted_answer`.
- [x] Reindexado controlado FAISS:
  - endpoint/script para reconstruir índice al cambiar `cv.json`,
  - estrategia de invalidación de índice.

## Pendiente de documentación

- [x] Actualizar `agents/ARCHITECTURE.md` con:
  - flujo de chat IA (GenAI + fallback),
  - uso de SQLite + FAISS.
- [x] Actualizar `pipelines/CD.md` con:
  - secrets requeridos en GitHub Actions y Kubernetes,
  - procedimiento de rotación de `GROQ_API_KEY`.
