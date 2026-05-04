# ─── Portal CV raulglez.me — Build & Push ───

REGISTRY   ?= ghcr.io
OWNER      ?= rafex
IMAGE      ?= raulglez-me
TAG        ?= latest
PLATFORMS  ?= linux/amd64,linux/arm64
FULL_IMAGE  = $(REGISTRY)/$(OWNER)/$(IMAGE):$(TAG)

.PHONY: build push run clean

## Build: construye la imagen Docker multi-arch
build:
	@echo "🔨 Building $(FULL_IMAGE) for platforms: $(PLATFORMS)..."
	docker buildx build \
		--platform $(PLATFORMS) \
		--file containers/Dockerfile \
		--tag $(FULL_IMAGE) \
		--load \
		.

## Push: construye y publica la imagen en el registry
push:
	@echo "🚀 Building and pushing $(FULL_IMAGE)..."
	docker buildx build \
		--platform $(PLATFORMS) \
		--file containers/Dockerfile \
		--tag $(FULL_IMAGE) \
		--push \
		.

## Run: ejecuta el contenedor localmente en el puerto 3000
run:
	@echo "▶️  Running $(FULL_IMAGE) on http://localhost:3000"
	docker run --rm -p 3000:3000 $(FULL_IMAGE)

## Clean: elimina la imagen local
clean:
	@echo "🧹 Removing local image $(FULL_IMAGE)..."
	docker rmi $(FULL_IMAGE) 2>/dev/null || true

## Help: muestra esta ayuda
help:
	@grep '^##' Makefile | sed 's/##//'
