#!/usr/bin/env bash
# ─── Portal CV raulglez.me — First-time Setup ───
# Instala dependencias de todos los componentes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📦 Instalando dependencias del frontend/portal..."
cd "$PROJECT_DIR/frontend/portal"
npm ci

echo ""
echo "📦 Instalando dependencias del backend/javascript/portal..."
cd "$PROJECT_DIR/backend/javascript/portal"
npm ci

echo ""
echo "📦 Instalando dependencias del backend/javascript/ia..."
cd "$PROJECT_DIR/backend/javascript/ia"
npm ci

echo ""
echo "✅ Dependencias instaladas."
echo "   Ejecuta 'just dev' para iniciar todos los servicios en paralelo."
echo "   Ejecuta 'just build' para compilar para producción."
