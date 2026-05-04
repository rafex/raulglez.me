# AGENTS.md

Este archivo define como deben operar los agentes dentro de este repo.

## Regla principal

Antes de trabajar en cualquier carpeta, leer primero su `README.md`.

## Política de secretos

- Secretos en texto plano (`.env`) son solo locales y están ignorados por git.
- El archivo compartible de secretos es `.env.enc` cifrado con `sops + age`.
- Nunca subir llaves privadas (`*.agekey`, `keys/`).
- Si un cambio requiere nueva variable sensible, actualizar `.env.example` (sin valores) y, si aplica, `.env.enc`.


## Estado actual del repo (obligatorio respetar)

- El frontend consume **solo** vista pública desde `GET /api/cv`.
- El backend genera PDF dinámico en `GET /api/cv.pdf`.
- El backend expone chat IA en `POST /api/ai/ask` con trazabilidad.
- La fuente de verdad del contenido es `backend/data/cv.json`.
- El JSON separa datos visibles por contexto:
  - `contact.public`: se puede mostrar en el sitio.
  - `contact.private`: **no** se muestra en sitio, solo en PDF.
- El frontend está modularizado en `frontend/src/scripts/modules/`.
- Existe chat flotante en frontend con captura de lead:
  - obligatorios: `name`, `phone`.
  - opcionales: `email`, `company`, `positionOffer`.
- Las interacciones de chat se almacenan en SQLite (`backend/data/interactions.sqlite`).
- Modo de respuesta IA:
  - `genai`: Groq.
  - `deterministic`: fallback local con FAISS + respuestas aprobadas.
- Existe panel de revisión IA en frontend para operación manual:
  - listar preguntas históricas,
  - actualizar `status` (`pending|approved|rejected`),
  - asignar `rating`,
  - editar `reviewer_note` y `adjusted_answer`.

## Mapa rapido

- `README.md` del root: explica la estructura del repo.
- `agents/README.md`: indice principal del contexto operativo.
- `agents/specs/README.md`: indice de specs disponibles.
- `tasks/README.md`: indice del sistema de ejecucion.
- `workflows/README.md`: procedimientos repetibles de operacion.
- `pipelines/README.md`: contexto de CI/CD del proyecto.

## Politica de contexto

- Los archivos en MAYUSCULAS son contexto para agentes.
- Los `README.md` no reemplazan el contexto; lo enrutan.
- Leer el minimo contexto suficiente para ejecutar bien la tarea.
- Actualizar siempre el documento fuente de verdad, no un resumen
  paralelo.
- Si la verdad cambia de manera persistente, actualizar el documento
  correcto antes de cerrar la tarea.

## Reglas de implementación para datos CV

- No exponer datos `private` en endpoints o render público.
- Si se agrega nueva información sensible al JSON, debe quedar en rama
  `private` o en una rama equivalente no pública.
- El PDF debe construirse desde el JSON actualizado, no desde archivos
  estáticos manuales.
- Si se agrega información a `cv.json` que alimente IA, mantenerla coherente
  con `highlight_semantic` y estructura pública/privada.

## Reglas de despliegue (estado actual)

- Helm chart `helm/raulglez-me` ya contempla:
  - `HPA`, `PDB`, `startupProbe`, estrategia rolling update.
  - `envFrom.secretRef` hacia `Values.env.secretName` (default `raulglez-me-env`).
  - volumen writable `/app/data` para SQLite (`emptyDir`).
- Secretos obligatorios de runtime:
  - `GROQ_API_KEY` en Kubernetes Secret consumido por el Deployment.
- Alinear workflows con estos secretos y evitar credenciales embebidas.
- Workflow `deploy.yml` crea/aplica:
  - `ghcr-pull-secret` usando `GHCR_USERNAME` + `GHCR_TOKEN`.
  - `raulglez-me-env` con `GROQ_API_KEY` y `GROQ_MODEL`.
- El contenedor runtime incluye Python + `backend/ai` para fallback determinista.
- API de índice FAISS:
  - `GET /api/ai/reindex`: estado del índice.
  - `POST /api/ai/reindex`: reconstrucción forzada del índice.
  - invalidación automática: si cambia `cv.json` o la SQLite, el índice se reconstruye al consultar.

## Separacion semantica de documentos

Cada documento tiene un dominio exclusivo. No duplicar informacion
entre ellos.

- `SPEC.md`: define *que* debe construirse en esta iniciativa.
  Contiene el problema, el objetivo, el alcance, los requisitos y
  los riesgos especificos de este trabajo. Su horizonte es la
  iniciativa. Cuando la spec cierra, su contenido es historia.

- `DECISIONS.md`: registra *por que el sistema es como es*.
  Contiene tradeoffs que condicionan iniciativas futuras y que
  otros agentes deben respetar. Su horizonte es el proyecto
  completo. No registra lo que se va a construir sino lo que
  ya se decidio y no debe revertirse sin razon explicita.

- `PRODUCT.md`: define *para quien y por que existe el producto*.
  No describe implementacion ni decisiones tecnicas.

- `ROADMAP.md`: define *que viene primero y por que*.
  No describe como implementar ni que decidir.

- `ARCHITECTURE.md`: describe *como esta estructurado el sistema*.
  No describe que construir ni por que se tomaron las decisiones.

- `pipelines/CI.md`: describe *que gates automaticos deben pasar*.
  No contiene comandos locales ni logica de implementacion.

- `pipelines/CD.md`: describe *como el codigo llega a produccion*.
  No contiene scripts de deploy ni credenciales.

La prueba para saber donde escribir algo:
- Si desaparece cuando la iniciativa termina → va en la spec.
- Si debe respetarse en la proxima iniciativa → va en DECISIONS.md.
- Si explica el producto → va en PRODUCT.md.
- Si orienta prioridad temporal → va en ROADMAP.md.
- Si describe estructura del sistema → va en ARCHITECTURE.md.
- Si describe gates automaticos de validacion → va en pipelines/CI.md.
- Si describe como se despliega el sistema → va en pipelines/CD.md.

## Flujo de trabajo recomendado

1. Leer el `README.md` de la carpeta actual.
2. Revisar `agents/ROADMAP.md` para confirmar que la iniciativa es
   coherente con la direccion actual del proyecto.
3. Revisar `agents/PRODUCT.md` y el contexto tecnico relevante.
4. Revisar `agents/DECISIONS.md` para respetar tradeoffs persistentes.
5. Revisar o crear un `SPEC.md` en `agents/` o en `agents/specs/`.
6. Derivar o leer las tareas correspondientes en `tasks/`.
7. Implementar y validar siguiendo `workflows/IMPLEMENTATION.md`.
8. Registrar en `agents/DECISIONS.md` si surgieron tradeoffs que
   deben persistir mas alla de esta iniciativa.
9. Actualizar trazabilidad en `agents/TRACEABILITY.md` al cerrar.
10. (Opcional) Si el proyecto usa el CLI de SpecNative, mantener
    metadata parseable consistente al actualizar specs o tareas.

## Criterio de actualizacion

- `ROADMAP.md` cambia cuando cambia la direccion del proyecto.
- `SPEC.md` cambia cuando cambia el alcance del trabajo.
- `DECISIONS.md` cambia cuando un tradeoff debe persistir mas alla
  de la iniciativa actual.
- `tasks/` cambia cuando cambia el plan ejecutable o el estado real.
- `pipelines/CI.md` cambia cuando cambia un gate o la plataforma de CI.
- `pipelines/CD.md` cambia cuando cambia un ambiente, gate de
  promocion o proceso de release.
- `TRACEABILITY.md` cambia al cerrar una iniciativa o cuando una
  decision modifica el alcance de una spec activa.

## Estados obligatorios

- Toda spec debe declarar un estado:
  `draft | active | blocked | done | superseded`
- Toda tarea debe declarar un estado:
  `todo | in_progress | blocked | done`
- Toda decision debe declarar un estado:
  `proposed | accepted | deprecated | replaced`
