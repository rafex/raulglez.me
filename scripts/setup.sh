#!/usr/bin/env bash
# ─── Portal CV raulglez.me — First-time Setup ───
# Instala dependencias del frontend
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📦 Instalando dependencias del frontend..."
cd "$PROJECT_DIR/frontend"
npm ci

echo ""
echo "✅ Dependencias instaladas."
echo "   Ejecuta 'just dev' para iniciar el servidor de desarrollo."
echo "   Ejecuta 'just build' para compilar para producción."
