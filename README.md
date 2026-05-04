# raulglez.me

Portal CV personal de **Raúl González** con frontend estático (Vite + Pug + TS) y backend Node.js para exponer datos y generar PDF dinámico.

## Estado actual

- Sitio público consume datos desde `backend/data/cv.json` por `GET /api/cv`.
- El backend genera CV en PDF en tiempo real por `GET /api/cv.pdf` usando `pdfkit`.
- `cv.json` usa estructura semántica con separación de datos:
  - `contact.public` → visible en sitio.
  - `contact.private` → solo para PDF.

## Estructura

- `frontend/`: UI pública del CV.
  - `src/scripts/main.ts`: orquestador.
  - `src/scripts/modules/`: módulos (`renderers`, `accessibility`, `phone-canvas`, `observers`, `text-utils`).
  - `index.pug`: layout + toolbar del sitio.
- `backend/`: API y exportación PDF.
  - `src/server.ts`: rutas `/api/cv` y `/api/cv.pdf`.
  - `src/pdf.ts`: generador PDF desde JSON.
  - `src/pdf.js`: bridge para modo dev con `--experimental-strip-types`.
  - `data/cv.json`: fuente de verdad del CV.
- `containers/`: imagen Docker.
- `helm/`: despliegue en Kubernetes.
- `agents/`: documentación operativa del proyecto.

## Toolbar del sitio

La barra superior incluye:

- `Modo lectura` (switch).
- `Accesibilidad` (tamaño de fuente, tipografía OSS, paletas para daltonismo).
- `Descargar PDF` (usa `/api/cv.pdf`, no archivo estático).

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

