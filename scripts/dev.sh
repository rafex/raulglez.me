#!/usr/bin/env bash
# ─── Portal CV raulglez.me — Dev Server ───
# Inicia el servidor de desarrollo Vite en http://localhost:3000
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR/frontend"

echo "🚀 Iniciando Vite dev server..."
echo "   → http://localhost:3000"
echo "   Presiona Ctrl+C para detener"
echo ""

npm run dev
