# raulglez.me

Portal CV personal de **Raúl González** con frontend estático (Vite + Pug + TS) y backend Node.js para exponer datos, generar PDF dinámico e interactuar con IA sobre el CV.

## Estado actual

- Sitio público consume datos desde `backend/data/cv.json` por `GET /api/cv`.
- El backend genera CV en PDF en tiempo real por `GET /api/cv.pdf` usando `pdfkit`.
- Chat IA disponible por `POST /api/ai/ask` con persistencia de preguntas/respuestas.
- `cv.json` usa estructura semántica con separación de datos:
  - `contact.public` → visible en sitio.
  - `contact.private` → solo para PDF.

## Estructura

- `frontend/`: UI pública del CV.
  - `src/scripts/main.ts`: orquestador.
  - `src/scripts/modules/`: módulos (`renderers`, `accessibility`, `phone-canvas`, `observers`, `text-utils`, `chat`).
  - `index.pug`: layout + toolbar del sitio.
- `backend/`: API y exportación PDF.
  - `src/server.ts`: rutas `/api/cv`, `/api/cv.pdf`, `/api/ai/ask`, `/api/ai/questions`, `/api/ai/reindex`.
  - `src/ai.ts`: orquestación RAG + Groq + tracking de interacciones.
  - `src/pdf.ts`: generador PDF desde JSON.
  - `src/pdf.js`: bridge para modo dev con `--experimental-strip-types`.
  - `ai/rag_faiss.py`: index/query FAISS + respuesta determinista.
  - `data/interactions.sqlite`: tracking y revisión de preguntas IA.
  - `data/cv.json`: fuente de verdad del CV.
- `containers/`: imagen Docker.
- `helm/`: despliegue en Kubernetes.
- `agents/`: documentación operativa del proyecto.
- `pipelines/`: documentación de CI/CD y secretos de despliegue.

## Toolbar del sitio

La barra superior incluye:

- `Modo lectura` (switch).
- `Accesibilidad` (tamaño de fuente, tipografía OSS, paletas para daltonismo).
- `Descargar PDF` (usa `/api/cv.pdf`, no archivo estático).

Además existe un botón flotante de chat para consultar el CV:
- Requiere lead mínimo (`name`, `phone`).
- Si Groq falla, responde en modo determinista (FAISS + base validada) y lo informa explícitamente.

Existe también un **Panel IA** en la barra superior para operación/revisión:
- lista preguntas/respuestas registradas,
- permite `status`, `rating`, `reviewer_note`, `adjusted_answer`,
- incluye recarga y reindexado manual de FAISS.

## Comandos

- `just setup`: instala dependencias frontend/backend.
- `just dev`: inicia backend `:3001` + frontend `:3000` (sin abrir navegador).
- `just dev-open`: abre `http://localhost:3000`.
- `just build`: compila frontend + backend.
- `just preview`: vista previa de build.

## Nota de mantenimiento

Cuando actualices contenido del CV, modifica `backend/data/cv.json`.

- Lo público se refleja en el sitio (`/api/cv`).
- Lo privado solo se usa en el PDF (`/api/cv.pdf`).

## Variables de entorno relevantes

- `GROQ_API_KEY` (obligatoria para modo GenAI en chat).
- `GROQ_MODEL` (opcional, default: `llama-3.3-70b-versatile`).
- `GHCR_USERNAME` (secret de GitHub Actions para pull en cluster).
- `GHCR_TOKEN` (secret de GitHub Actions con permiso `read:packages`).

En Kubernetes, estas variables deben vivir en un Secret (por default `raulglez-me-env`) referenciado por Helm.

## Secretos (`sops + age`)

El repo usa cifrado de `.env` con `sops` + `age`:

- Archivo cifrado versionable: `.env.enc`
- Archivo plano local (ignorado): `.env`

Flujo recomendado:

1. `just secrets-keygen`
2. exportar `SOPS_AGE_RECIPIENTS` con la llave pública
3. crear `.env` desde `.env.example`
4. `just secrets-encrypt` (usa `--age` con `SOPS_AGE_RECIPIENTS`)
5. para usar local: `export SOPS_AGE_KEY_FILE=keys/dev.agekey && just secrets-decrypt`

Notas:
- Nunca commitear `.env` ni llaves privadas `.agekey`.
- Sí se puede versionar `.env.enc`.

## Estado de despliegue Helm

El chart `helm/raulglez-me` ya incluye:
- estrategia rolling update,
- `startupProbe` + `liveness/readiness`,
- `HPA` y `PDB`,
- `envFrom` desde Secret (`env.secretName`),
- volumen writable `/app/data` para SQLite.

El workflow `.github/workflows/deploy.yml` ahora:
- asegura namespace,
- crea/actualiza `ghcr-pull-secret` con credenciales GHCR dedicadas,
- crea/actualiza `raulglez-me-env` (`GROQ_API_KEY`, `GROQ_MODEL`),
- ejecuta `helm lint` + `helm template` antes de `helm upgrade`,
- agrega diagnóstico extendido en caso de fallo de rollout.

Documentación de CD:
- [CD.md](/Users/rafex/repository/github/rafex/raulglez.me/pipelines/CD.md)

## Nota de runtime para fallback determinista

`containers/Dockerfile` fue actualizado para soportar el fallback local:
- runtime en base Debian slim,
- `python3` + `pip`,
- copia `backend/ai`,
- instalación de `backend/ai/requirements.txt`.

## Reindexado FAISS

- `POST /api/ai/reindex`: reconstruye el índice manualmente.
- `GET /api/ai/reindex`: devuelve estado del índice.
- Invalidación automática:
  - si cambia `backend/data/cv.json`, o
  - si cambia `backend/data/interactions.sqlite`,
  entonces el índice se reconstruye en la siguiente consulta.

Pendientes abiertos están en [TODO.md](/Users/rafex/repository/github/rafex/raulglez.me/TODO.md).
