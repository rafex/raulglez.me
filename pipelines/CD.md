# CD.md

Cómo llega `raulglez.me` a producción (k3s).

## Servicios y workflows

| Servicio | Publish workflow | Deploy workflow | Trigger automático |
|---|---|---|---|
| `portal-publico` | `publish_frontend.yml` | `deploy_frontend.yml` | push `frontend/portal-publico/**` |
| `portal-admin` | `publish_portal_admin.yml` | `deploy_portal_admin.yml` | push `frontend/portal-admin/**` |
| `backend-portal` | `publish_backend.yml` | `deploy_backend.yml` | push `backend/javascript/portal/**` |
| `backend-ia` | `publish_ai.yml` | `deploy_ai.yml` | push `backend/javascript/ia/**` o `backend/python/ia/**` |
| Python base | `publish_python_base.yml` | — (base, no deploy directo) | push `backend/python/ia/requirements.txt` |

Cada workflow de deploy se dispara automáticamente al completarse su publish correspondiente,
o se puede ejecutar manualmente (`workflow_dispatch`) con un tag específico.

## Flujo de release

```
1. push a main en rutas relevantes
        ↓
2. Publish workflow → build → docker build-push → ghcr.io/rafex/raulglez-<servicio>:latest
        ↓
3. Deploy workflow → kubectl configure → helm upgrade --install
        ↓
4. k3s aplica el nuevo Deployment → rollout verificado
```

Para release con tag específico:
```bash
just release-tag v1.20260506-1   # crea y empuja el tag
# Los workflows leen el tag y publican con ese tag + latest
```

## Secrets requeridos en GitHub Actions

| Secret | Descripción |
|---|---|
| `KUBE_CONFIG_DATA` | kubeconfig en base64 para acceso al cluster k3s |
| `GROQ_API_KEY` | API key de Groq para el servicio IA |
| `ADMIN_USER` | Usuario del panel administrativo |
| `ADMIN_PASSWORD` | Contraseña del panel administrativo |
| `SESSION_SECRET` | Secreto HMAC para firmar la cookie de sesión (mín. 32 chars) |

## Variables opcionales en GitHub Actions

| Variable | Default | Descripción |
|---|---|---|
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Modelo Groq |

## Secrets en Kubernetes

El workflow `deploy_backend.yml` crea/actualiza el Secret `raulglez-me-env` en el namespace `mvps`:

```yaml
GROQ_API_KEY: <secrets.GROQ_API_KEY>
GROQ_MODEL: <vars.GROQ_MODEL>
AI_SERVICE_URL: http://raulglez-backend-ia:3000
AI_PORT: "3000"
ADMIN_USER: <secrets.ADMIN_USER>
ADMIN_PASSWORD: <secrets.ADMIN_PASSWORD>
SESSION_SECRET: <secrets.SESSION_SECRET>
COOKIE_SECURE: "true"
```

Helm consume `raulglez-me-env` vía `envFrom` en los Deployments de `backend-portal` y `backend-ia`.

## Namespace de despliegue

Todos los recursos se crean en el namespace `mvps` (definido en `env.K3S_NAMESPACE`).

## Verificación post-deploy

### Portal público
```bash
curl -I https://raulglez.me/
curl -s https://raulglez.me/api/cv | jq '.header.name'
curl -I https://raulglez.me/api/cv.pdf
```

### Chat IA (WebSocket)
```bash
# Desde el navegador: abrir devtools → Network → WS → conectar a wss://raulglez.me/ws/chat
# Esperar mensaje { type: 'connected', clientId: '...' }
```

### Backend-ia (interno)
```bash
kubectl -n mvps port-forward svc/raulglez-backend-ia 3003:3000
curl http://localhost:3003/health
# → { ok: true, service: 'backend-ia', cvReady: true }
```

### Panel admin
```bash
# Acceder al panel admin y verificar login con ADMIN_USER/ADMIN_PASSWORD
```

## Rotación de secrets

### GROQ_API_KEY

1. Generar nueva key en Groq Console.
2. Actualizar `GROQ_API_KEY` en GitHub Secrets del repo.
3. Re-ejecutar `deploy_backend.yml` (manual dispatch) para actualizar `raulglez-me-env`.
4. Verificar que `backend-portal` y `backend-ia` muestran `mode=genai` en respuestas.
5. Revocar la key anterior en Groq Console.

### ADMIN_USER / ADMIN_PASSWORD / SESSION_SECRET

1. Actualizar los secrets en GitHub.
2. Re-ejecutar `deploy_backend.yml`.
3. Las sesiones activas se invalidan automáticamente (SESSION_SECRET nuevo).

### KUBE_CONFIG_DATA

1. Regenerar kubeconfig en el cluster k3s.
2. Codificar: `base64 -w0 ~/.kube/config`.
3. Actualizar `KUBE_CONFIG_DATA` en GitHub Secrets.

## Rollback

```bash
# Ver historial de un release
helm -n mvps history raulglez-backend-portal

# Rollback a revisión anterior
helm -n mvps rollback raulglez-backend-portal

# O hacer rollback manual del Deployment
kubectl -n mvps rollout undo deployment/raulglez-backend-portal
```

## Diagnóstico de fallos en rollout

El workflow de deploy incluye un step `Debug rollout failure` que se activa si falla:
```
kubectl -n mvps get deploy,rs,pods,svc -o wide
kubectl -n mvps get events --sort-by=.metadata.creationTimestamp | tail -80
```

Causas comunes:

| Síntoma | Causa probable |
|---|---|
| Pod en `ImagePullBackOff` | imagen no publicada o tag incorrecto |
| Pod en `CrashLoopBackOff` | error de arranque; revisar `kubectl logs` |
| `backend-ia` en `OOMKilled` | modelo FAISS requiere más memoria (ajustar `resources.limits.memory`) |
| `backend-ia` startup timeout | `startupProbe` falló; la IA tardó > 15 min en cargar |
| Chat no responde | Mosquitto no disponible; verificar `kubectl -n mvps get pod -l app=mosquitto` |

## Notas sobre la imagen Python base

`publish_python_base.yml` solo se dispara cuando cambia `backend/python/ia/requirements.txt`.
Si se necesita forzar la reconstrucción (p.ej., nuevo modelo), modificar cualquier línea de
ese archivo o usar `workflow_dispatch`.

El tag de la imagen base se referencia en `Dockerfile.backend-ia` con `ARG PYTHON_BASE_TAG`.
Si se publica una nueva base, actualizar ese ARG y re-publicar `backend-ia`.
