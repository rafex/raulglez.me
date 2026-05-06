# ─── Task Runner: Portal CV raulglez.me ───
# https://github.com/casey/just
#
# Uso:
#   just dev                 → inicia backend-portal (:3001) + IA (:3002) + Vite portal-publico (:3000)
#   just dev-open            → abre http://localhost:3000 en navegador
#   just dev-frontend        → solo Vite portal-publico (:3000, proxea /api y /ws → :3001)
#   just dev-admin           → solo Vite portal-admin (:3002, proxea /api/admin → :3001)
#   just dev-backend         → solo backend/javascript/portal (:3001, hot reload)
#   just dev-ia              → solo backend/javascript/ia (:3003, hot reload)
#   just build               → compila frontend y backend
#   just preview             → previsualiza portal-publico (:4173)
#   just docker-build        → construye todas las imágenes Docker
#   just setup               → instala dependencias por primera vez
#   just clean               → elimina artefactos
#   just lint                → valida todos los Helm charts
#   just all                 → setup + build
#   just release-tag v1.20260504-1   → crea y empuja tag (dispara Publish+Deploy de servicios modificados)
#   just release-tag-today 1 1        → crea tag v1.YYYYmmDD-1 y lo empuja
#   just secrets-keygen      → genera llave age local
#   just secrets-encrypt     → cifra .env → .env.enc con sops
#   just secrets-decrypt     → descifra .env.enc → .env
#   just secrets-edit        → edita .env.enc directamente con sops

# ─── Desarrollo ───────────────────────────────────────────

## Inicia backend-portal + IA + portal-publico en paralelo (desarrollo completo)
dev:
    @echo "🚀 Iniciando backend-portal :3001, IA :3003 y Vite portal-publico :3000 ..."
    just dev-backend & just dev-ia & just dev-frontend

## Abre el navegador en http://localhost:3000
dev-open:
    @echo "🌐 Abriendo navegador en http://localhost:3000"
    open http://localhost:3000

## Solo Vite portal-publico (:3000, proxea /api y /ws → backend-portal :3001)
dev-frontend:
    @echo "🖥️  Iniciando Vite portal-publico en http://localhost:3000"
    cd frontend/portal-publico && npm run dev

## Solo Vite portal-admin (:3002, proxea /api/admin y /admin → backend-portal :3001)
dev-admin:
    @echo "🛠️  Iniciando Vite portal-admin en http://localhost:3002"
    cd frontend/portal-admin && npm run dev

## Solo backend portal Node.js con hot reload (:3001)
dev-backend:
    @echo "⚙️  Iniciando backend-portal en http://localhost:3001"
    cd backend/javascript/portal && PORT=3001 npm run dev

## Solo servicio IA Node.js con hot reload (:3003)
dev-ia:
    @echo "🤖  Iniciando backend-ia en http://localhost:3003"
    cd backend/javascript/ia && AI_PORT=3003 CV_SERVICE_URL=http://localhost:3001 MQTT_URL=mqtt://localhost:1883 npm run dev

## Previsualiza el build de producción del portal-publico (:4173)
preview: build
    @echo "👀 Previsualizando portal-publico en http://localhost:4173"
    cd frontend/portal-publico && npm run preview

# ─── Build ───────────────────────────────────────────────

## Compila portal-publico, portal-admin y backends
build: build-frontend-publico build-frontend-admin build-backend-portal build-backend-ia

## Compila portal-publico
build-frontend-publico:
    @echo "🔨 Compilando portal-publico..."
    cd frontend/portal-publico && npm run build

## Compila portal-admin
build-frontend-admin:
    @echo "🔨 Compilando portal-admin..."
    cd frontend/portal-admin && npm run build

## Compila backend-portal (TypeScript → dist/)
build-backend-portal:
    @echo "🔨 Compilando backend-portal..."
    cd backend/javascript/portal && npm run build

## Compila backend-ia (TypeScript → dist/)
build-backend-ia:
    @echo "🔨 Compilando backend-ia..."
    cd backend/javascript/ia && npm run build

## Construye todas las imágenes Docker localmente
docker-build:
    @echo "🐳 Construyendo imágenes Docker..."
    make -C containers all

# ─── Ejecución local ──────────────────────────────────────

## Ejecuta el contenedor Docker localmente (:3000)
docker-run:
    @echo "🐳 Ejecutando contenedor en http://localhost:3000"
    bash scripts/docker-run.sh

# ─── Setup ────────────────────────────────────────────────

## Instala dependencias del frontend y backend
setup:
    @echo "📦 Instalando dependencias..."
    bash scripts/setup.sh

# ─── Utilidad ─────────────────────────────────────────────

## Elimina artefactos de build
clean:
    make clean

## Valida todos los Helm charts
lint:
    @echo "🔍 Validando Helm charts..."
    helm lint helm/raulglez-me/portal-publico
    helm lint helm/raulglez-me/portal-admin
    helm lint helm/raulglez-me/backend-portal
    helm lint helm/raulglez-me/backend-ia
    helm lint helm/raulglez-me/mosquitto

## Renderiza templates Helm (dry-run)
helm-template service='portal-publico':
    @echo "📋 Renderizando Helm template: {{service}}"
    helm template raulglez-{{service}} helm/raulglez-me/{{service}}/

# ─── CI/CD — GitHub Actions ──────────────────────────────
#
# Publicar imágenes (build + push a GHCR):
#   just publish-portal-publico
#   just publish-portal-admin
#   just publish-backend
#   just publish-ai
#   just publish-all
#
# Desplegar en k3s (Helm):
#   just deploy-portal-publico
#   just deploy-portal-admin
#   just deploy-backend
#   just deploy-ai
#   just deploy-all
#
# Ship = publish + deploy automático (deploy se dispara solo al completar publish):
#   just ship-portal-admin
#   just ship-ai

## Publica imagen del portal público a GHCR
publish-portal-publico:
    @echo "📦 Publicando portal-publico..."
    gh workflow run "Publish Portal Publico" --ref main

## Publica imagen del portal admin a GHCR
publish-portal-admin:
    @echo "📦 Publicando portal-admin..."
    gh workflow run "Publish Portal Admin" --ref main

## Publica imagen del backend API a GHCR
publish-backend:
    @echo "📦 Publicando backend..."
    gh workflow run "Publish Backend" --ref main

## Publica imagen del servicio IA a GHCR
publish-ai:
    @echo "📦 Publicando IA..."
    gh workflow run "Publish AI" --ref main

## Publica imagen base Python a GHCR
publish-python-base:
    @echo "📦 Publicando Python base..."
    gh workflow run "Publish Python Base" --ref main

## Publica todas las imágenes
publish-all: publish-portal-publico publish-portal-admin publish-backend publish-ai

## Despliega portal público en k3s (tag por defecto: latest)
deploy-portal-publico tag='latest':
    @echo "🚀 Desplegando portal-publico (tag={{tag}})..."
    gh workflow run "Deploy Portal Publico" -f tag="{{tag}}" --ref main

## Despliega portal admin en k3s (tag por defecto: latest)
deploy-portal-admin tag='latest':
    @echo "🚀 Desplegando portal-admin (tag={{tag}})..."
    gh workflow run "Deploy Portal Admin" -f tag="{{tag}}" --ref main

## Despliega backend API en k3s (tag por defecto: latest)
deploy-backend tag='latest':
    @echo "🚀 Desplegando backend (tag={{tag}})..."
    gh workflow run "Deploy Backend" -f tag="{{tag}}" --ref main

## Despliega servicio IA en k3s (tag por defecto: latest)
deploy-ai tag='latest':
    @echo "🚀 Desplegando IA (tag={{tag}})..."
    gh workflow run "Deploy AI" -f tag="{{tag}}" --ref main

## Despliega todos los servicios en k3s
deploy-all tag='latest':
    @echo "🚀 Desplegando todos los servicios (tag={{tag}})..."
    gh workflow run "Deploy Portal Publico" -f tag="{{tag}}" --ref main
    gh workflow run "Deploy Portal Admin" -f tag="{{tag}}" --ref main
    gh workflow run "Deploy Backend" -f tag="{{tag}}" --ref main
    gh workflow run "Deploy AI" -f tag="{{tag}}" --ref main

## Ship portal-admin: publica imagen y despliega
ship-portal-admin:
    @echo "🚢 Shipping portal-admin..."
    gh workflow run "Publish Portal Admin" --ref main
    @echo "✅ Publish disparado. Deploy se ejecutará automáticamente al completar."

## Ship IA: publica imagen y despliega
ship-ai:
    @echo "🚢 Shipping IA..."
    gh workflow run "Publish AI" --ref main
    @echo "✅ Publish disparado. Deploy se ejecutará automáticamente al completar."

## Muestra el estado de los últimos workflows
ci-status:
    @echo "📊 Últimos 10 workflow runs:"
    gh run list --limit 10

# ─── Release tags (GitHub Actions) ───────────────────────

## Crea y publica un tag (ej: just release-tag v1.20260504-1)
release-tag tag:
    @echo "{{tag}}" | grep -Eq '^v[0-9]+\.[0-9]{8}-[0-9]+$$' || (echo "❌ Tag inválido. Usa formato v#.YYYYmmDD-# (ej: v1.20260504-1)"; exit 1)
    @echo "🏷️  Creando tag {{tag}}"
    git tag "{{tag}}"
    @echo "🚀 Publicando tag {{tag}} en origin"
    git push origin "{{tag}}"
    @echo "✅ Tag publicado. GitHub Actions ejecutará Publish + Deploy de los servicios modificados."

## Crea y publica tag con formato v#.YYYYmmDD-# (ej: just release-tag-today 1 1)
release-tag-today major='1' patch='1':
    @bash -c 'set -euo pipefail; \
    tag="v{{major}}.$(date +%Y%m%d)-{{patch}}"; \
    echo "$tag" | grep -Eq "^v[0-9]+\\.[0-9]{8}-[0-9]+$" || { echo "❌ Tag inválido: $tag"; exit 1; }; \
    echo "🏷️  Creando tag $tag"; \
    git tag "$tag"; \
    echo "🚀 Publicando tag $tag en origin"; \
    git push origin "$tag"; \
    echo "✅ Tag publicado. GitHub Actions ejecutará Publish + Deploy de los servicios modificados."'

# ─── Secrets (sops + age) ────────────────────────────────

## Genera llave age local en keys/dev.agekey
secrets-keygen:
    @mkdir -p keys
    @if [ -f keys/dev.agekey ]; then echo "🔐 keys/dev.agekey ya existe"; exit 0; fi
    age-keygen -o keys/dev.agekey
    @echo "✅ Llave creada: keys/dev.agekey"
    @echo "👉 Exporta: export SOPS_AGE_RECIPIENTS=\"$$(grep '^# public key:' keys/dev.agekey | sed 's/# public key: //')\""

## Cifra .env en .env.enc usando SOPS_AGE_RECIPIENTS
secrets-encrypt:
    @test -f .env || (echo "❌ Falta .env"; exit 1)
    @test -n "$$SOPS_AGE_RECIPIENTS" || (echo "❌ Define SOPS_AGE_RECIPIENTS"; exit 1)
    sops encrypt --age "$$SOPS_AGE_RECIPIENTS" --output .env.enc .env
    @echo "✅ .env.enc actualizado"

## Descifra .env.enc a .env (usa SOPS_AGE_KEY_FILE=keys/dev.agekey)
secrets-decrypt:
    @test -f .env.enc || (echo "❌ Falta .env.enc"; exit 1)
    @test -n "$$SOPS_AGE_KEY_FILE" || (echo "❌ Define SOPS_AGE_KEY_FILE (ej: keys/dev.agekey)"; exit 1)
    sops decrypt --output .env .env.enc
    @echo "✅ .env generado (local)"

## Edita el secreto cifrado directamente
secrets-edit:
    @test -f .env.enc || (echo "❌ Falta .env.enc"; exit 1)
    @test -n "$$SOPS_AGE_KEY_FILE" || (echo "❌ Define SOPS_AGE_KEY_FILE (ej: keys/dev.agekey)"; exit 1)
    sops .env.enc

# ─── Full cycle ───────────────────────────────────────────

## Setup completo: instala dependencias y compila
all: setup build
    @echo "✅ Todo listo."
