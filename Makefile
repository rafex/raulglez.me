# ─── Build Orchestration ───
# Makefile orquesta los build systems nativos. No es un task runner.
# Usa `just` para tareas de desarrollo (just dev, just docker-run, etc.)

.PHONY: build build-frontend build-backend clean docker lint

## build: compila frontend y backend
build: build-frontend build-backend

## build-frontend: compila el frontend con Vite
build-frontend:
	cd frontend && npm ci && npm run build

## build-backend: compila el backend con tsc
build-backend:
	cd backend && npm ci && npm run build

## docker: construye la imagen Docker
docker:
	make -C containers build

## clean: elimina artefactos de build
clean:
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite
	rm -rf backend/dist

## lint: valida Helm chart
lint:
	helm lint helm/raulglez-me/

## help: muestra esta ayuda
help:
	@grep '^##' Makefile | sed 's/##//'
