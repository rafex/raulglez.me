#!/usr/bin/env bash
# ─── Portal CV raulglez.me — Docker Run ───
# Construye y ejecuta el contenedor localmente en http://localhost:8080
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

IMAGE="raulglez-me:local"
PORT="${PORT:-8080}"

echo "🐳 Construyendo imagen Docker ($IMAGE)..."
cd "$PROJECT_DIR"
docker build -f containers/Dockerfile.frontend -t "$IMAGE" .

echo ""
echo "▶️  Ejecutando contenedor en http://localhost:$PORT"
echo "   Presiona Ctrl+C para detener"
echo ""

docker run --rm -p "$PORT":8080 "$IMAGE"
