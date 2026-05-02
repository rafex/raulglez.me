# ─── Build Orchestration ───
# Makefile orquesta los build systems nativos. No es un task runner.
# Usa `just` para tareas de desarrollo (just dev, just docker-run, etc.)

.PHONY: build clean docker lint

## build: compila el frontend con Vite
build:
	cd frontend && npm ci && npm run build

## docker: construye la imagen Docker
docker:
	make -C containers build

## clean: elimina artefactos de build
clean:
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite

## lint: valida Helm chart
lint:
	helm lint helm/raulglez-me/

## help: muestra esta ayuda
help:
	@grep '^##' Makefile | sed 's/##//'
