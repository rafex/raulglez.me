# DECISIONS.md

Decisiones técnicas persistentes del proyecto `raulglez.me`.

---

## D001 — Vite sobre Webpack

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: Se necesitaba un bundler para generar HTML estático con Pug y Sass.

**Decisión**: Usar Vite 5 en lugar de Webpack.

**Razonamiento**:
- Configuración mínima comparado con Webpack (30 líneas vs 100+)
- Nativo ESM — más rápido en desarrollo (HMR instantáneo)
- Plugin de Pug oficial (`vite-plugin-pug`)
- Build más rápido (esbuild subyacente)

**Consecuencias**:
- Menor ecosistema de plugins que Webpack (no es relevante para este proyecto)
- Requiere Node.js moderno (LTS, ya usado en Docker)

---

## D002 — PugJS sobre HTML plano

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: El CV tiene múltiples secciones repetitivas (experiencia laboral, conferencias, proyectos).

**Decisión**: Usar PugJS como template engine en tiempo de build.

**Razonamiento**:
- Partials reutilizables sin duplicar HTML
- Mixins para componentes repetitivos (timeline items, badges)
- Sin overhead de runtime — se compila a HTML estático
- Sintaxis más limpia que HTML para estructuras anidadas

**Consecuencias**:
- Requiere plugin de Vite (`vite-plugin-pug`)
- Curva de aprendizaje para colaboradores no familiarizados con Pug
- Los partials no funcionan sin build (no se puede editar HTML directamente)

---

## D003 — Animation.css + Intersection Observer sobre librerías JS

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: Se querían animaciones sutiles en el portal sin penalizar el rendimiento.

**Decisión**: Usar Animation.css (4.1 KB) con Intersection Observer nativo en lugar de AOS, GSAP o Framer Motion.

**Razonamiento**:
- Animation.css es solo CSS — no ejecuta JS para animar
- Intersection Observer es nativo del navegador — 0 dependencias
- Animaciones scroll-triggered con 20 líneas de JS
- Sin dependencias npm adicionales de animación

**Consecuencias**:
- Animaciones más limitadas que GSAP/Framer (suficiente para un CV)
- No compatible con IE11 (no relevante en 2026)
- Requiere `prefers-reduced-motion` para accesibilidad (implementado en CSS)

---

## D004 — nginx:alpine sobre nginx estándar

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: El contenedor de producción debe ser lo más pequeño posible.

**Decisión**: Usar `nginx:alpine` como imagen base en lugar de `nginx:latest` (Debian).

**Razonamiento**:
- Imagen ~10MB vs ~50MB (5x más pequeña)
- Menor superficie de ataque (menos binarios instalados)
- Arranque más rápido en k3s
- Alpine es el estándar para imágenes mínimas

**Consecuencias**:
- `wget` no está disponible (usar `curl` en HEALTHCHECK)
- `apk` en lugar de `apt` si se necesita instalar algo
- Musl libc en lugar de glibc (no relevante para nginx)

---

## D005 — Multi-arch (amd64 + arm64)

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: El cluster k3s puede tener nodos ARM (Raspberry Pi) y AMD64.

**Decisión**: Build multi-arch con Docker buildx + QEMU.

**Razonamiento**:
- Compatibilidad con cualquier arquitectura de nodo k3s
- Mismo código, misma imagen, diferente arquitectura
- Sin costo adicional en CI (GitHub Actions runners son AMD64, QEMU emula ARM)

**Consecuencias**:
- Build más lento (emulación ARM en AMD64)
- Imagen en GHCR contiene manifiestos para ambas arquitecturas
- `docker pull` automáticamente selecciona la arquitectura correcta

---

## D006 — GHCR sobre Docker Hub

**Estado**: accepted
**Fecha**: 2026-05-01

**Contexto**: Se necesita un registry para almacenar las imágenes Docker.

**Decisión**: Usar GitHub Container Registry (GHCR) en lugar de Docker Hub.

**Razonamiento**:
- Integración nativa con GitHub Actions (GITHUB_TOKEN)
- Sin rate limiting para pulls autenticados (Docker Hub limita a 100 pulls/6h en free tier)
- Mismo lugar que el código fuente
- Gratuito para repositorios públicos

**Consecuencias**:
- Requiere `docker/login-action` con `registry: ghcr.io`
- Las imágenes son públicas (repo público)
- Tags siguen convención semver + `latest`
