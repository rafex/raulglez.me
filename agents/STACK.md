# STACK.md

Base tecnológica del portal CV `raulglez.me`.

## Servicios y runtime

| Servicio | Runtime | Base Docker |
|---|---|---|
| `portal-publico` | nginx alpine | `nginx:alpine` (~10 MB) |
| `portal-admin` | nginx alpine | `nginx:alpine` (~10 MB) |
| `backend-portal` | Node.js LTS | `node:lts-alpine` |
| `backend-ia` | Node.js LTS + Python 3 | `python-base` (imagen propia ~2 GB) |
| `mosquitto` | Eclipse Mosquitto 2 | `eclipse-mosquitto:2` |

## Frontend (`portal-publico` y `portal-admin`)

| Herramienta | Versión | Uso |
|---|---|---|
| Vite | ^5.0.0 | Bundler y dev server |
| TypeScript | ^5.0.0 | Tipado estático |
| PugJS | ^3.0.4 | Template engine para HTML (solo portal-publico) |
| vite-plugin-pug | ^0.4.0 | Integración Vite ↔ Pug (portal-publico) |
| CSS nativo | — | Animaciones, layout, accesibilidad |

Estructura de estilos: `variables.css → base.css → layout.css → animations.css → responsive.css → main.css`.

Animaciones: CSS transitions + `IntersectionObserver` nativo (clase `is-visible`).
Sin frameworks JS (React, Vue, etc.) — HTML estático renderizado desde `/api/cv` en runtime.

## Backend Portal (`backend/javascript/portal/`)

| Herramienta | Versión | Uso |
|---|---|---|
| Node.js | LTS | Runtime |
| TypeScript | ^5.0.0 | Compilación (target: ES2022, module: NodeNext) |
| pdfkit | ^0.17.2 | Generación de PDF dinámico |
| ws | ^8.18.1 | WebSocket server (noServer + upgrade) |
| mqtt | ^5.15.1 | Cliente MQTT (publisher + subscriber en ws-handler) |

Solo módulos nativos de Node.js para HTTP: `node:http`, `node:fs`, `node:path`, `node:crypto`.

## Backend IA (`backend/javascript/ia/`)

| Herramienta | Versión | Uso |
|---|---|---|
| Node.js | LTS | Runtime |
| TypeScript | ^5.0.0 | Compilación |
| mqtt | ^5.x | Subscriber MQTT (`ai/ask`), publisher (`ai/response/{id}`) |
| `node:sqlite` | nativo (Node 22+) | Base de datos SQLite de interacciones |

## Backend Python (`backend/python/ia/`)

| Herramienta | Versión | Uso |
|---|---|---|
| Python | 3.x | Runtime del script RAG |
| faiss-cpu | latest | Índice vectorial y búsqueda de similitud |
| sentence-transformers | latest | Generación de embeddings (`all-MiniLM-L6-v2`) |
| Groq API | REST | Generación de respuestas GenAI (llama-3.3-70b-versatile) |

El script `rag_faiss.py` se comunica con Node.js por stdin/stdout (protocolo JSON).

## Mensajería

| Componente | Tecnología | Descripción |
|---|---|---|
| Broker | Eclipse Mosquitto 2 | MQTT broker en ClusterIP (interno) |
| Protocolo | MQTT 3.1.1 | QoS 1 (at-least-once) |
| Tópico entrada | `ai/ask` | Portal publica, backend-ia subscribe |
| Tópico salida | `ai/response/{correlationId}` | Backend-ia publica, portal recibe |
| WebSocket | `ws` library (noServer) | Browser ↔ backend-portal en `/ws/chat` |

## Infraestructura

| Componente | Tecnología | Detalle |
|---|---|---|
| Container registry | GHCR (ghcr.io) | Integrado con GitHub Actions |
| Container runtime | Docker (buildx) | amd64 — nginx/Node/Python |
| Orquestación | Kubernetes k3s | 5 charts Helm independientes |
| Ingress controller | HAProxy | `className: haproxy` en values.yaml |
| TLS | cert-manager + Let's Encrypt | ClusterIssuer: letsencrypt-prod |
| CI/CD | GitHub Actions | 10 workflows (5 publish + 5 deploy) |

## Integraciones externas

| Servicio | Propósito | Criticidad |
|---|---|---|
| Groq API | Respuestas GenAI (LLM) | Alta — sin key activa, cae a modo determinista |
| GitHub Actions | CI/CD pipeline | Alta — sin esto no hay deploy automatizado |
| GHCR | Almacenar imágenes Docker | Alta — fuente de imágenes en cluster |
| Let's Encrypt | Certificados TLS | Media — cert-manager renueva automático |

## Restricciones

| Restricción | Motivo |
|---|---|
| Sin frameworks JS en frontend | HTML estático desde API, no SPA |
| Node.js puro (sin Express) | Simplicidad — el backend es pequeño y controlado |
| `node:sqlite` nativo | Eliminar dependencia de `better-sqlite3` (compilación nativa) |
| Imagen Python como base estática | Evitar rebuild de 2 GB por cambios de código |
| Mosquitto sin auth externa | Broker interno al cluster, no expuesto a internet |
| MQTT QoS 1 | Garantía de entrega sin complejidad de QoS 2 |
| `Recreate` en backend-ia y mosquitto | Estado persistente (SQLite + índice FAISS) — sin rolling update |
