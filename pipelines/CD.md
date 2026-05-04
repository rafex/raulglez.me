# CD.md

Cómo llega `raulglez.me` a producción (k3s).

## Flujo de release

1. `Publish Container` publica imagen en GHCR.
2. `Deploy` toma un tag (o `latest`) y ejecuta Helm en k3s.
3. El workflow valida chart, aplica secretos y verifica rollout.

## Secrets requeridos en GitHub Actions

- `KUBE_CONFIG_DATA`: kubeconfig en base64 para acceso al cluster.
- `GHCR_USERNAME`: usuario para pull de GHCR desde cluster.
- `GHCR_TOKEN`: token con permiso `read:packages`.
- `GROQ_API_KEY`: API key de Groq para respuestas GenAI.

## Variables opcionales en GitHub Actions

- `GROQ_MODEL` (Repository Variable): modelo Groq. Default runtime: `llama-3.3-70b-versatile`.

## Secrets en Kubernetes (namespace destino)

El workflow crea/actualiza:

- `ghcr-pull-secret` (docker-registry)
- `raulglez-me-env` con:
  - `GROQ_API_KEY`
  - `GROQ_MODEL`

Helm consume `raulglez-me-env` vía `envFrom` en el Deployment.

## Rotación de `GROQ_API_KEY`

1. Generar nueva key en Groq Console.
2. Actualizar `GROQ_API_KEY` en GitHub Secrets del repo.
3. Ejecutar workflow `Deploy` (manual o por release) para re-aplicar `raulglez-me-env`.
4. Verificar en k3s:
   - rollout exitoso,
   - endpoint `POST /api/ai/ask` responde en modo `genai`.
5. Revocar key anterior en Groq Console.

## Verificación mínima post-deploy

- `GET /api/cv` responde 200.
- `GET /api/cv.pdf` descarga PDF válido.
- `POST /api/ai/ask`:
  - responde con `mode=genai` cuando Groq está disponible,
  - responde con `mode=deterministic` si Groq no está disponible.

## Notas operativas

- Si falla rollout, revisar paso `Debug rollout failure` del workflow.
- Si hay error de pull de imagen, validar `ghcr-pull-secret` y permisos del token.
- Si falla chat GenAI, validar `GROQ_API_KEY` y cuotas en Groq.
