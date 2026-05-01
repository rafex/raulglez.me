# COMMANDS.md

Comandos operativos del proyecto `raulglez.me`.

## Setup

```bash
# Instalar dependencias del frontend
cd frontend && npm ci

# Instalar Helm (macOS)
brew install helm
```

## Desarrollo

```bash
# Iniciar Vite dev server (hot reload)
cd frontend && npm run dev
# → http://localhost:3000

# Previsualizar build de producción
cd frontend && npm run build && npm run preview
# → http://localhost:4173
```

## Build

```bash
# Build del frontend (genera dist/)
cd frontend && npm run build

# Build de imagen Docker local
make -C containers build

# Build multi-arch y push a GHCR
make -C containers push TAG=v1.20260501

# Ejecutar contenedor localmente
make -C containers run
# → http://localhost:8080
```

## Helm

```bash
# Validar chart
helm lint helm/raulglez-me/

# Renderizar templates (sin instalar)
helm template raulglez-me helm/raulglez-me/

# Instalar/actualizar en cluster
helm upgrade --install raulglez-me helm/raulglez-me/ \
  --namespace default \
  --set image.tag=v1.20260501 \
  --wait --timeout 5m

# Ver estado del release
helm status raulglez-me

# Rollback
helm rollback raulglez-me
```

## Kubernetes

```bash
# Ver pods
kubectl get pods -l app.kubernetes.io/instance=raulglez-me

# Ver logs
kubectl logs deployment/raulglez-me

# Ver ingress
kubectl get ingress raulglez-me

# Port-forward (debugging local)
kubectl port-forward service/raulglez-me 8080:80
# → http://localhost:8080
```

## Docker

```bash
# Build local
docker build -f containers/Dockerfile.frontend -t raulglez-me:local .

# Ejecutar local
docker run --rm -p 8080:8080 raulglez-me:local

# Inspeccionar imagen
docker inspect raulglez-me:local | jq '.[0].Config.User'
# → "1001"
```

## CI/CD (manual)

```bash
# Crear tag y disparar pipeline
git tag v1.$(date +%Y%m%d)
git push origin v1.$(date +%Y%m%d)

# Deploy manual con tag específico
# Usar Actions → Deploy → Run workflow en GitHub UI
```
