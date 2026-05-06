# CD.md

Cómo llega `raulglez.me` a producción (k3s).

## Servicios y workflows

| Servicio | Publish workflow | Deploy workflow | Trigger automático |
|---|---|---|---|
| `portal-publico` | `publish_frontend.yml` | `deploy_frontend.yml` | push rama `main` o tag `v*` en `frontend/portal-publico/**` |
| `portal-admin` | `publish_portal_admin.yml` | `deploy_portal_admin.yml` | push rama `main` o tag `v*` en `frontend/portal-admin/**` |
| `backend-portal` | `publish_backend.yml` | `deploy_backend.yml` | push rama `main` o tag `v*` en `backend/javascript/portal/**` |
| `backend-ia` | `publish_ai.yml` | `deploy_ai.yml` | push rama `main` o tag `v*` en `backend/javascript/ia/**` o `backend/python/ia/**` |
| Python base | `publish_python_base.yml` | — (base, no deploy directo) | push `backend/python/ia/requirements.txt` |

Cada workflow de deploy se dispara automáticamente al completarse su publish correspondiente,
o se puede ejecutar manualmente (`workflow_dispatch`) con un tag específico.

## Cómo se disparan los deploys

### Opción A — Push a `main` (cambio de código)

```
push a main (ruta relevante)
        ↓
Publish workflow → build + docker build-push
  → ghcr.io/rafex/raulglez-<servicio>:latest
        ↓
Deploy workflow (via workflow_run) → helm upgrade --install ... --set image.tag=latest
        ↓
k3s aplica el nuevo Deployment → rollout verificado
```

Solo se dispara el publish/deploy del servicio cuya ruta cambió.
Los demás servicios no se tocan.

### Opción B — Tag de release (todas las imágenes versionadas)

```bash
just release-tag v1.20260506-1   # crea y empuja el tag git
```

```
git push tag v1.20260506-1
        ↓
Todos los publish workflows se disparan (trigger: tags: ['v*'])
  → publican ghcr.io/rafex/raulglez-<servicio>:v1.20260506-1
  → y también ghcr.io/rafex/raulglez-<servicio>:latest
        ↓
Deploy workflows se disparan → despliegan la imagen con ese tag
        ↓
k3s actualiza los 4 servicios
```

**Nota**: Los paths filters se ignoran cuando el trigger es `tags: ['v*']` — todos los publish
se disparan independientemente de qué archivos cambió el tag. Esto es el comportamiento esperado
para un release completo de todas las imágenes.

### Opción C — Manual (workflow_dispatch)

Desde la UI de GitHub Actions → seleccionar workflow → "Run workflow" → ingresar el tag de imagen
(p.ej. `v1.20260506-1` o `latest`). Útil para redesplegar sin cambiar código o para rollback.

## Primer deploy (namespace vacío)

El orden importa en el primer deploy porque `deploy_backend.yml` crea el namespace `mvps`
y el Secret `raulglez-me-env` que los demás servicios necesitan.

**Orden obligatorio en el primer deploy:**

```
1. Ejecutar deploy_backend.yml (manual dispatch)
   → crea namespace mvps
   → crea Secret raulglez-me-env
   → despliega mosquitto + backend-portal

2. Ejecutar deploy_ai.yml (manual dispatch)
   → encuentra namespace mvps y Secret raulglez-me-env ya existentes
   → despliega backend-ia

3. Ejecutar deploy_frontend.yml (manual dispatch)
   → despliega portal-publico

4. Ejecutar deploy_portal_admin.yml (manual dispatch)
   → despliega portal-admin
```

A partir del segundo deploy (código ya en producción), los workflows se disparan
automáticamente en el orden correcto vía `workflow_run`, no hay dependencia de orden.

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
