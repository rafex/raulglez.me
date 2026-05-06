# ─── raulglez.me — Build local de imágenes por componente ───

REGISTRY  ?= ghcr.io
OWNER     ?= rafex
TAG       ?= latest

.PHONY: all portal-publico portal-admin backend-portal backend-ia clean help

## all: construye los 4 componentes desplegables
all: portal-publico portal-admin backend-portal backend-ia

## portal-publico: frontend público CV + Chat (~80 MB)
portal-publico:
	@echo "🔨 Building raulglez-portal-publico:$(TAG)..."
	docker build \
		--file containers/Dockerfile.portal-publico \
		--tag $(REGISTRY)/$(OWNER)/raulglez-portal-publico:$(TAG) \
		.

## portal-admin: panel administrativo (~80 MB)
portal-admin:
	@echo "🔨 Building raulglez-portal-admin:$(TAG)..."
	docker build \
		--file containers/Dockerfile.portal-admin \
		--tag $(REGISTRY)/$(OWNER)/raulglez-portal-admin:$(TAG) \
		.

## backend-portal: API Node.js — cv.json, PDF, WebSocket, admin (~180 MB)
backend-portal:
	@echo "🔨 Building raulglez-backend-portal:$(TAG)..."
	docker build \
		--file containers/Dockerfile.backend-portal \
		--tag $(REGISTRY)/$(OWNER)/raulglez-backend-portal:$(TAG) \
		.

## backend-ia: Node.js + Python FAISS + Groq (~2.5 GB con python-base)
backend-ia:
	@echo "🔨 Building raulglez-backend-ia:$(TAG)..."
	docker build \
		--file containers/Dockerfile.backend-ia \
		--tag $(REGISTRY)/$(OWNER)/raulglez-backend-ia:$(TAG) \
		.

## clean: elimina las imágenes locales
clean:
	@echo "🧹 Removing local images..."
	docker rmi $(REGISTRY)/$(OWNER)/raulglez-portal-publico:$(TAG) 2>/dev/null || true
	docker rmi $(REGISTRY)/$(OWNER)/raulglez-portal-admin:$(TAG) 2>/dev/null || true
	docker rmi $(REGISTRY)/$(OWNER)/raulglez-backend-portal:$(TAG) 2>/dev/null || true
	docker rmi $(REGISTRY)/$(OWNER)/raulglez-backend-ia:$(TAG) 2>/dev/null || true

## help: muestra esta ayuda
help:
	@grep '^##' containers/Makefile | sed 's/## /  /'
