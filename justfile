# ─── Task Runner: Portal CV raulglez.me ───
# https://github.com/casey/just
#
# Uso:
#   just dev              → inicia backend (:3001) + Vite (:3000) en paralelo (sin abrir navegador)
#   just dev-open         → abre http://localhost:3000 en navegador
#   just dev-frontend     → solo Vite dev server (:3000, proxea /api a :3001)
#   just dev-backend      → solo backend Node.js (:3001, hot reload)
#   just build            → compila frontend + backend
#   just preview          → previsualiza build completo (:3000)
#   just docker-run       → ejecuta contenedor local (:3000)
#   just docker-build     → construye imagen Docker
#   just setup            → instala dependencias por primera vez
#   just clean            → elimina artefactos
#   just lint             → valida Helm chart
#   just all              → setup + build
#   just release-tag v1.20260504-1   → crea y empuja tag para disparar Publish+Deploy
#   just release-tag-today 1 1        → crea tag v1.YYYYmmDD-1 y lo empuja
#   just secrets-keygen   → genera llave age local
#   just secrets-encrypt  → cifra .env → .env.enc con sops
#   just secrets-decrypt  → descifra .env.enc → .env
#   just secrets-edit     → edita .env.enc directamente con sops

# ─── Desarrollo ───────────────────────────────────────────

## Inicia backend + Vite en paralelo (desarrollo completo)
dev:
    @echo "🚀 Iniciando backend :3001 y Vite :3000 ..."
    just dev-backend & just dev-frontend

## Abre el navegador en http://localhost:3000
dev-open:
    @echo "🌐 Abriendo navegador en http://localhost:3000"
    open http://localhost:3000

## Solo Vite dev server (:3000, proxea /api → backend :3001)
dev-frontend:
    @echo "🖥️  Iniciando Vite en http://localhost:3000"
    cd frontend && npm run dev

## Solo backend Node.js con hot reload (:3001)
dev-backend:
    @echo "⚙️  Iniciando backend en http://localhost:3001"
    cd backend && PORT=3001 npm run dev

## Previsualiza el build de producción (:4173)
preview: build
    @echo "👀 Previsualizando build en http://localhost:4173"
    cd frontend && npm run preview

# ─── Build ───────────────────────────────────────────────

## Compila frontend y backend
build:
    @echo "🔨 Compilando frontend y backend..."
    make build

## Construye la imagen Docker localmente
docker-build:
    @echo "🐳 Construyendo imagen Docker..."
    make -C containers build

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

## Valida el Helm chart
lint:
    make lint

## Renderiza templates Helm (dry-run)
helm-template:
    @echo "📋 Renderizando Helm templates..."
    helm template raulglez-me helm/raulglez-me/

# ─── Release tags (GitHub Actions) ───────────────────────

## Crea y publica un tag (ej: just release-tag v1.20260504-1)
release-tag tag:
    @echo "{{tag}}" | grep -Eq '^v[0-9]+\.[0-9]{8}-[0-9]+$$' || (echo "❌ Tag inválido. Usa formato v#.YYYYmmDD-# (ej: v1.20260504-1)"; exit 1)
    @echo "🏷️  Creando tag {{tag}}"
    git tag "{{tag}}"
    @echo "🚀 Publicando tag {{tag}} en origin"
    git push origin "{{tag}}"
    @echo "✅ Tag publicado. GitHub Actions debe ejecutar Publish Container + Deploy."

## Crea y publica tag con formato v#.YYYYmmDD-# (ej: just release-tag-today 1 1)
release-tag-today major='1' patch='1':
    @bash -c 'set -euo pipefail; \
    tag="v{{major}}.$(date +%Y%m%d)-{{patch}}"; \
    echo "$tag" | grep -Eq "^v[0-9]+\\.[0-9]{8}-[0-9]+$" || { echo "❌ Tag inválido: $tag"; exit 1; }; \
    echo "🏷️  Creando tag $tag"; \
    git tag "$tag"; \
    echo "🚀 Publicando tag $tag en origin"; \
    git push origin "$tag"; \
    echo "✅ Tag publicado. GitHub Actions debe ejecutar Publish Container + Deploy."'

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
