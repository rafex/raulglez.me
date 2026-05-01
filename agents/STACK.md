# STACK.md

Base tecnológica del portal CV `raulglez.me`.

## Runtime

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Build | Node.js | LTS (lts-alpine en Docker) |
| Serve | nginx | alpine (latest stable) |
| Orquestación | Kubernetes | k3s |
| Package manager | Helm | 3.x |

## Frameworks y librerías

| Framework | Versión | Uso |
|-----------|---------|-----|
| Vite | ^5.0.0 | Bundler y dev server |
| PugJS | ^3.0.0 | Template engine para HTML |
| Sass (Dart Sass) | ^1.0.0 | Preprocesador CSS |
| Animation.css | ^4.1.1 | Animaciones CSS predefinidas |
| vite-plugin-pug | ^0.3.2 | Integración Vite ↔ Pug |

## Infraestructura

| Componente | Tecnología | Detalle |
|-----------|-----------|---------|
| Container registry | GHCR (ghcr.io) | Integrado con GitHub Actions |
| Container runtime | Docker (buildx) | Multi-arch: amd64, arm64 |
| Emulación ARM | QEMU | Setup automático en CI |
| Ingress controller | nginx-ingress | En cluster k3s |
| TLS | cert-manager + Let's Encrypt | ClusterIssuer: letsencrypt-prod |
| CI/CD | GitHub Actions | Workflows: publish_container, deploy |

## Integraciones externas

| Servicio | Propósito | Criticidad |
|----------|-----------|------------|
| GitHub Actions | CI/CD pipeline | Alta — sin esto no hay deploy automatizado |
| GHCR | Almacenar imágenes Docker | Alta — fuente de la imagen desplegada |
| Let's Encrypt | Certificados TLS | Media — cert-manager renueva automático |
| Google Fonts (opcional) | Tipografías web | Baja — solo estético |

## Restricciones

| Restricción | Motivo |
|-------------|--------|
| Sin frameworks JS (React, Vue, Angular) | El sitio es 100% estático, no necesita SPA |
| Sin dependencias de runtime pesadas | Objetivo: HTML 20KB, CSS 80KB, JS 1KB |
| Imagen Docker < 50MB | nginx:alpine base (~10MB) + assets |
| Node.js solo en etapa de build | Imagen final solo contiene nginx + archivos estáticos |
| Multi-arch obligatorio | Compatibilidad con clusters ARM (Raspberry Pi, AWS Graviton) |
