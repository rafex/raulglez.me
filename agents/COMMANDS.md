# COMMANDS.md

Comandos operativos del proyecto `raulglez.me`.

## Setup

```bash
# Instalar dependencias de los 4 componentes JS
just setup

# O manualmente por componente:
cd frontend/portal-publico && npm ci
cd frontend/portal-admin   && npm ci
cd backend/javascript/portal && npm ci
cd backend/javascript/ia     && npm ci
```

## Desarrollo

```bash
# Todo en paralelo: backend-portal :3001, backend-ia :3003, portal-publico :3000
just dev

# Solo portal-publico (proxea /api y /ws → :3001)
just dev-frontend     # → http://localhost:3000

# Solo portal-admin (proxea /api/admin y /admin → :3001)
just dev-admin        # → http://localhost:3002

# Solo backend-portal con hot reload
just dev-backend      # → http://localhost:3001

# Solo backend-ia con hot reload
just dev-ia           # → http://localhost:3003
```

## Build

```bash
# Compilar todos los componentes
just build

# Compilar por separado
just build-frontend-publico   # Vite → frontend/portal-publico/dist/
just build-frontend-admin     # Vite → frontend/portal-admin/dist/
just build-backend-portal     # tsc → backend/javascript/portal/dist/
just build-backend-ia         # tsc → backend/javascript/ia/dist/

# Construir imágenes Docker localmente
just docker-build             # todos los servicios
make -C containers portal-publico TAG=latest
make -C containers portal-admin   TAG=latest
make -C containers backend-portal TAG=latest
make -C containers backend-ia     TAG=latest
```

## Helm

```bash
# Validar los 5 charts
just lint

# Renderizar templates (dry-run)
just helm-template portal-publico
just helm-template portal-admin
just helm-template backend-portal
just helm-template backend-ia
just helm-template mosquitto

# Instalar/actualizar en cluster (ejemplos)
helm upgrade --install raulglez-portal-publico helm/raulglez-me/portal-publico \
  --namespace mvps --set image.tag=latest --wait --timeout 2m

helm upgrade --install raulglez-backend-portal helm/raulglez-me/backend-portal \
  --namespace mvps \
  --set image.tag=latest \
  --set env.secretName=raulglez-me-env \
  --wait --timeout 2m
```

## Kubernetes

```bash
# Ver todos los pods del proyecto
kubectl -n mvps get pods

# Logs por servicio
kubectl -n mvps logs deployment/raulglez-portal-publico
kubectl -n mvps logs deployment/raulglez-portal-admin
kubectl -n mvps logs deployment/raulglez-backend-portal
kubectl -n mvps logs deployment/raulglez-backend-ia
kubectl -n mvps logs deployment/mosquitto

# Port-forward para depuración local
kubectl -n mvps port-forward svc/raulglez-backend-portal 3001:3000

# Ver eventos recientes (útil en rollout fallido)
kubectl -n mvps get events --sort-by=.metadata.creationTimestamp | tail -30
```

## Docker

```bash
# Build individual
docker build -f containers/Dockerfile.portal-publico -t raulglez-portal-publico:local .
docker build -f containers/Dockerfile.backend-portal -t raulglez-backend-portal:local .

# Ejecutar backend-portal localmente
docker run --rm -p 3001:3000 \
  -e GROQ_API_KEY=sk-... \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD=secret \
  -e SESSION_SECRET=mysecret \
  raulglez-backend-portal:local
```

## CI/CD (release manual)

```bash
# Crear tag con fecha de hoy y disparar todos los pipelines
just release-tag-today         # → v1.YYYYMMDD-1
just release-tag-today 1 2     # → v1.YYYYMMDD-2

# Tag personalizado
just release-tag v1.20260506-1
```

## Secretos locales (sops + age)

```bash
just secrets-keygen     # genera keys/dev.agekey
just secrets-encrypt    # .env → .env.enc (requiere SOPS_AGE_RECIPIENTS)
just secrets-decrypt    # .env.enc → .env (requiere SOPS_AGE_KEY_FILE)
just secrets-edit       # editar .env.enc en línea
```

## Administración del índice FAISS

```bash
# Ver estado del índice (desde el cluster)
curl http://raulglez-backend-ia:3000/reindex

# Reconstruir índice manualmente
curl -X POST http://raulglez-backend-ia:3000/reindex

# O desde el panel admin en /api/admin/reindex
```

## Previsualización de build

```bash
just preview   # compila portal-publico y lanza en http://localhost:4173
```
