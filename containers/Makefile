# ─── raulglez.me — Build local de imágenes por componente ───

REGISTRY  ?= ghcr.io
OWNER     ?= rafex
TAG       ?= latest

.PHONY: all portal backend-portal backend-ia clean help

## all: construye los 3 componentes
all: portal backend-portal backend-ia

## portal: frontend nginx (~80 MB)
portal:
	@echo "🔨 Building raulglez-portal:$(TAG)..."
	docker build \
		--file containers/Dockerfile.portal \
		--tag $(REGISTRY)/$(OWNER)/raulglez-portal:$(TAG) \
		.

## backend-portal: API Node.js (~180 MB)
backend-portal:
	@echo "🔨 Building raulglez-backend-portal:$(TAG)..."
	docker build \
		--file containers/Dockerfile.backend-portal \
		--tag $(REGISTRY)/$(OWNER)/raulglez-backend-portal:$(TAG) \
		.

## backend-ia: Node.js + Python FAISS (~2.5 GB)
backend-ia:
	@echo "🔨 Building raulglez-backend-ia:$(TAG)..."
	docker build \
		--file containers/Dockerfile.backend-ia \
		--tag $(REGISTRY)/$(OWNER)/raulglez-backend-ia:$(TAG) \
		.

## clean: elimina las imágenes locales
clean:
	@echo "🧹 Removing local images..."
	docker rmi $(REGISTRY)/$(OWNER)/raulglez-portal:$(TAG) 2>/dev/null || true
	docker rmi $(REGISTRY)/$(OWNER)/raulglez-backend-portal:$(TAG) 2>/dev/null || true
	docker rmi $(REGISTRY)/$(OWNER)/raulglez-backend-ia:$(TAG) 2>/dev/null || true

## help: muestra esta ayuda
help:
	@grep '^##' containers/Makefile | sed 's/## /  /'
