# ─── Task Runner: Portal CV raulglez.me ───
# https://github.com/casey/just
#
# Uso:
#   just dev          → inicia Vite dev server (:3000)
#   just build        → make build (compila frontend)
#   just preview      → previsualiza build de producción (:4173)
#   just docker-run   → ejecuta contenedor local (:8080)
#   just docker-build → construye imagen Docker
#   just setup        → instala dependencias por primera vez
#   just clean        → elimina artefactos
#   just lint         → valida Helm chart
#   just all          → setup + build + preview

# ─── Desarrollo ───────────────────────────────────────────

## Inicia el servidor de desarrollo Vite (hot reload en :3000)
dev:
    @echo "🚀 Iniciando Vite dev server en http://localhost:3000"
    cd frontend && npm run dev

## Previsualiza el build de producción (:4173)
preview: build
    @echo "👀 Previsualizando build en http://localhost:4173"
    cd frontend && npm run preview

# ─── Build ───────────────────────────────────────────────

## Compila el frontend (delega a Makefile)
build:
    @echo "🔨 Compilando frontend..."
    make build

## Construye la imagen Docker localmente
docker-build:
    @echo "🐳 Construyendo imagen Docker..."
    make -C containers build

# ─── Ejecución local ──────────────────────────────────────

## Ejecuta el contenedor Docker localmente (:8080)
docker-run:
    @echo "🐳 Ejecutando contenedor en http://localhost:8080"
    bash scripts/docker-run.sh

# ─── Setup ────────────────────────────────────────────────

## Instala dependencias del frontend (primer uso)
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

# ─── Full cycle ───────────────────────────────────────────

## Setup completo: instala dependencias, compila y previsualiza
all: setup build
    @echo "✅ Todo listo. Ejecuta 'just preview' para ver el resultado."
