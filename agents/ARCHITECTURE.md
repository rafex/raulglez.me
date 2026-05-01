# ARCHITECTURE.md

Arquitectura del portal CV `raulglez.me`.

## Visión general

Sitio web estático de una sola página (SPA sin framework). El HTML se genera en tiempo de build con Vite + PugJS a partir de datos estructurados en JSON. Se sirve con nginx en un contenedor Docker multi-arch, y se despliega en un cluster k3s mediante Helm. El CI/CD está completamente automatizado con GitHub Actions.

```
[push tag] → GitHub Actions
                ├─ buildx multi-arch (amd64, arm64)
                ├─ push a GHCR
                └─ deploy Helm en k3s
                     ├─ nginx ingress + cert-manager (TLS)
                     └─ pod único (replicaCount: 1)
```

## Módulos principales

### `frontend/` — Build de sitio estático
- **Responsabilidad**: Generar HTML, CSS y JS estáticos
- **Input**: `src/data/cv.json` (datos estructurados del CV)
- **Output**: `dist/` con `index.html`, `assets/*.css`, `assets/*.js`
- **Tecnologías**: Vite 5, PugJS 3, Sass (Dart Sass), Animation.css 4
- **Límites**: No depende de ningún backend. Solo emite archivos estáticos.

### `containers/` — Dockerización
- **Responsabilidad**: Empaquetar el frontend para distribución
- **Input**: `frontend/dist/` (generado por Vite)
- **Output**: Imagen Docker multi-arch en GHCR
- **Componentes**: `Dockerfile.frontend` (multi-stage), `nginx/default.conf`
- **Límites**: Imagen final < 15MB. Usuario no-root (1001).

### `helm/raulglez-me/` — Despliegue en k3s
- **Responsabilidad**: Definir y gestionar los recursos Kubernetes
- **Recursos**: Deployment, Service, Ingress, ServiceAccount
- **Seguridad**: `readOnlyRootFilesystem`, `runAsNonRoot`, `drop ALL capabilities`
- **Límites**: Solo expone puerto 8080 internamente. TLS manejado por cert-manager.

### `.github/workflows/` — CI/CD
- **Responsabilidad**: Automatizar build, push y deploy
- **Triggers**: Push de tags (`vN.YYYYmmDD`), workflow_dispatch manual
- **Jobs**: `publish_container` (build + push), `deploy` (Helm upgrade)

## Flujo principal

1. **Dev local**: `cd frontend && npm run dev` → Vite dev server en `:3000`
2. **Build**: `npm run build` → `dist/`
3. **Docker**: `make -C containers build` → imagen local
4. **Tag release**: `git tag v1.20260501 && git push --tags`
5. **CI**: GitHub Actions detecta el tag → build multi-arch → push GHCR
6. **CD**: Deploy automático en k3s con `helm upgrade --install`

## Restricciones

- **Prohibido**: Frameworks JS pesados (React, Vue, Angular)
- **Prohibido**: Dependencias de runtime más allá de animate.css
- **Prohibido**: Backend, API, base de datos
- **Obligatorio**: Build multi-arch (amd64 + arm64)
- **Obligatorio**: Imagen final < 50MB
- **Obligatorio**: Ejecutar como usuario no-root

## Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| CV desactualizado | Medio | `cv.json` es la fuente de verdad; modificar y redeploy |
| Expiración de cert TLS | Alto | cert-manager con Let's Encrypt renueva automáticamente |
| Falta de espacio en nodo k3s | Bajo | Imagen pequeña (~15MB), resource limits definidos |
| GitHub Actions rate limit | Bajo | GHCR no tiene rate limiting para pulls autenticados |
