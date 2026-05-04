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

# ─── Full cycle ───────────────────────────────────────────

## Setup completo: instala dependencias y compila
all: setup build
    @echo "✅ Todo listo."
