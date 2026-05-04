# ARCHITECTURE.md

Arquitectura actual del portal CV `raulglez.me`.

## Visión general

Aplicación web con frontend estático (Vite + Pug + TypeScript) y backend Node.js.
El backend sirve contenido público del CV, genera PDF dinámico y expone chat IA con trazabilidad.

```
Usuario
  ├─ GET /            -> frontend (estático)
  ├─ GET /api/cv      -> vista pública de cv.json
  ├─ GET /api/cv.pdf  -> PDF dinámico
  └─ POST /api/ai/ask -> RAG + GenAI (con fallback determinista)
```

## Componentes

### `frontend/`
- Renderizado de secciones CV, accesibilidad, modo lectura y toolbar.
- Chat flotante para preguntas sobre el CV.
- Panel IA para revisión operativa de interacciones (`status`, `rating`, `reviewer_note`, `adjusted_answer`).

### `backend/`
- `GET /api/cv`: proyección pública (oculta rama `contact.private`).
- `GET /api/cv.pdf`: PDF generado en runtime desde `backend/data/cv.json`.
- `POST /api/ai/ask`: orquesta RAG + Groq.
- `GET /api/ai/questions`, `PATCH /api/ai/questions/:id`: revisión de interacciones.
- `GET /api/ai/reindex`, `POST /api/ai/reindex`: estado y rebuild de índice.

### `RAG local` (`backend/ai/rag_faiss.py`)
- Construye embeddings de `cv.json` + respuestas aprobadas en SQLite.
- Guarda índice FAISS y metadatos.
- Soporta consulta y respuesta determinista.
- Invalidación automática de índice cuando cambia:
  - `backend/data/cv.json`,
  - `backend/data/interactions.sqlite`.

### Persistencia
- `backend/data/cv.json`: fuente de verdad del CV.
- `backend/data/interactions.sqlite`: preguntas, respuestas, revisión humana y trazabilidad.

## Flujo IA

1. Frontend envía pregunta + lead (`name`, `phone` obligatorios) a `POST /api/ai/ask`.
2. Backend consulta contexto vía FAISS.
3. Si Groq responde: modo `genai`.
4. Si Groq falla: modo `deterministic` con evidencia local.
5. Se guarda interacción en SQLite (`response_mode`, `status`, `rating`, `adjusted_answer`, etc.).

## Despliegue

- Contenedor Docker multi-stage con runtime Node + Python (para fallback RAG).
- Helm chart `helm/raulglez-me` despliega:
  - Deployment, Service, Ingress, ServiceAccount,
  - HPA, PDB, probes de salud,
  - `envFrom` para secretos (`raulglez-me-env`),
  - volumen writable `/app/data` (SQLite).

## Riesgos y controles

| Riesgo | Control |
|---|---|
| Respuesta IA no confiable | Guardrail estricto + fallback determinista + revisión humana |
| Exposición de datos privados | Endpoint público filtra `contact.private` |
| Índice desactualizado | Invalidación automática + endpoint de reindexado manual |
| Fallo de despliegue | `helm lint/template`, rollout checks, debug de eventos/logs |
