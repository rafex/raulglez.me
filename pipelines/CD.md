# CD.md

Cómo llega `raulglez.me` a producción (k3s).

## Servicios y workflows

| Servicio | Publish workflow | Deploy workflow | Trigger automático |
|---|---|---|---|
| `portal-publico` | `publish_frontend.yml` | `deploy_frontend.yml` | tag `v*` o `workflow_dispatch` |
| `portal-admin` | `publish_portal_admin.yml` | `deploy_portal_admin.yml` | tag `v*` o `workflow_dispatch` |
| `backend-portal` | `publish_backend.yml` | `deploy_backend.yml` | tag `v*` o `workflow_dispatch` |
| `backend-ia` | `publish_ai.yml` | `deploy_ai.yml` | tag `v*` o `workflow_dispatch` |
| Python base | `publish_python_base.yml` | — (base, no deploy directo) | push `backend/python/ia/requirements.txt` |

Cada workflow de deploy se dispara automáticamente al completarse su publish correspondiente (`workflow_run`),
o se puede ejecutar manualmente (`workflow_dispatch`) con un tag específico.

> **Importante**: los publish workflows ya NO se disparan con `push` a `main`. Para desplegar un cambio
> de código hay que crear un tag de release o disparar el workflow manualmente.

## Cómo se disparan los deploys

### Opción A — Tag de release (todas las imágenes versionadas)

```bash
just release-tag v1.20260506-1   # crea y empuja el tag git
```

```
git push origin v1.20260506-1
        ↓
Todos los publish workflows se disparan (trigger: tags: ['v*'])
  → publican ghcr.io/rafex/raulglez-<servicio>:v1.20260506-1
  → y también ghcr.io/rafex/raulglez-<servicio>:latest
        ↓
Deploy workflows se disparan → despliegan la imagen con ese tag
        ↓
k3s actualiza los cuatro servicios en `raulglez-me`
```

**Nota**: Cuando el trigger es `tags: ['v*']`, todos los publish workflows se disparan
independientemente de qué archivos cambió el tag. Esto es el comportamiento esperado
para un release completo de todas las imágenes.

Los deploy workflows tienen grupos de concurrencia con `cancel-in-progress: false`
para serializar deploys y evitar condiciones de carrera en Helm (`release: already exists`).

### Opción B — Publish manual desde `main` (cambio de código sin tag)

Para desplegar código nuevo en un servicio específico sin crear un tag de release:

```bash
# Publicar desde main; al terminar con éxito, Deploy se activa automáticamente
just publish-portal-publico
just publish-portal-admin
just publish-backend
just publish-ai
```

Cada comando usa `workflow_dispatch --ref main`. El publish ejecuta sus gates y publica la
imagen `latest`; solo si termina correctamente, el workflow de deploy del servicio la instala.

Cada publish workflow tiene un grupo de concurrencia con `cancel-in-progress: true`
para evitar ejecuciones duplicadas si se dispara varias veces en rápida sucesión.

### Opción C — Manual (workflow_dispatch)

Desde GitHub Actions → seleccionar workflow → "Run workflow". Para publicar, seleccionar la
ref `main`; para redesplegar o hacer rollback, seleccionar el tag de imagen existente. Un deploy
manual no construye la imagen: el tag indicado debe estar publicado previamente en GHCR.

El workflow `Deploy Full System (legacy)` también es manual. Despliega los charts actuales de
Mosquitto, backend-portal, backend-ia, portal-publico y portal-admin en `raulglez-me`, usando el
mismo tag de imagen para los cuatro servicios.

## Primer deploy (namespace vacío)

El orden importa en el primer deploy porque `deploy_backend.yml` crea el namespace `raulglez-me`
y el Secret `raulglez-me-env` que los demás servicios necesitan.

**Orden obligatorio en el primer deploy:**

```
1. Ejecutar deploy_backend.yml (manual dispatch)
   → crea namespace raulglez-me
   → crea Secret raulglez-me-env
   → despliega mosquitto + backend-portal

2. Ejecutar deploy_ai.yml (manual dispatch)
   → encuentra namespace raulglez-me y Secret raulglez-me-env ya existentes
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
| `GHCR_USERNAME` | Usuario con permiso de lectura de paquetes para el secret `ghcr-pull-secret` del workflow full redeploy |
| `GHCR_TOKEN` | Token con permiso de lectura de paquetes para GHCR |
| `GROQ_API_KEY` | API key de Groq para el servicio IA |
| `ADMIN_USER` | Usuario del panel administrativo |
| `ADMIN_PASSWORD` | Contraseña del panel administrativo |
| `SESSION_SECRET` | Secreto HMAC para firmar la cookie de sesión (mín. 32 chars) |

## Variables opcionales en GitHub Actions

| Variable | Default | Descripción |
|---|---|---|
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Modelo Groq |

## Secrets en Kubernetes

El workflow `deploy_backend.yml` crea/actualiza el Secret `raulglez-me-env` en el namespace `raulglez-me`:

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

Todos los recursos se crean en el namespace `raulglez-me` (definido en `env.K3S_NAMESPACE`).

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
kubectl -n raulglez-me port-forward svc/raulglez-backend-ia 3003:3000
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
helm -n raulglez-me history raulglez-backend-portal

# Rollback a revisión anterior
helm -n raulglez-me rollback raulglez-backend-portal

# O hacer rollback manual del Deployment
kubectl -n raulglez-me rollout undo deployment/raulglez-backend-portal
```

## Diagnóstico de fallos en rollout

El workflow de deploy incluye un step `Debug rollout failure` que se activa si falla:
```
kubectl -n raulglez-me get deploy,rs,pods,svc -o wide
kubectl -n raulglez-me get events --sort-by=.metadata.creationTimestamp | tail -80
```

Causas comunes:

| Síntoma | Causa probable |
|---|---|
| Pod en `ImagePullBackOff` | imagen no publicada o tag incorrecto |
| Pod en `CrashLoopBackOff` | error de arranque; revisar `kubectl logs` |
| `backend-ia` en `OOMKilled` | modelo FAISS requiere más memoria (ajustar `resources.limits.memory`) |
| `backend-ia` startup timeout | `startupProbe` falló; la IA tardó > 15 min en cargar |
| Chat no responde | Mosquitto no disponible; verificar `kubectl -n raulglez-me get pod -l app=mosquitto` |

## Notas sobre la imagen Python base

`publish_python_base.yml` se dispara cuando cambia `backend/python/ia/requirements.txt` o
`containers/Dockerfile.python-base`. Para forzar la reconstrucción (p.ej., nuevo modelo),
usar `workflow_dispatch`.

El tag de la imagen base se referencia en `Dockerfile.backend-ia` con `ARG PYTHON_BASE_TAG`.
Si se publica una nueva base, actualizar ese ARG y re-publicar `backend-ia`.
