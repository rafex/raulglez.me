#!/usr/bin/env bash
# ─── Portal CV raulglez.me — First-time Setup ───
# Instala dependencias del frontend y del backend
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📦 Instalando dependencias del frontend..."
cd "$PROJECT_DIR/frontend"
npm ci

echo ""
echo "📦 Instalando dependencias del backend..."
cd "$PROJECT_DIR/backend"
npm ci

echo ""
echo "✅ Dependencias instaladas."
echo "   Ejecuta 'just dev' para iniciar frontend + backend en paralelo."
echo "   Ejecuta 'just build' para compilar para producción."
