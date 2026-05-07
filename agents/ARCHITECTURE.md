# ARCHITECTURE.md

Arquitectura actual del portal CV `raulglez.me`.

## Visión general

Sistema multi-servicio con 5 componentes desplegables de forma independiente:
frontend estático (CV público + panel admin), API Node.js, servicio IA con cola de mensajes
y broker MQTT.

```
Browser (público)
  ├─ GET /             → portal-publico (nginx)
  ├─ GET /api/cv       → backend-portal
  ├─ GET /api/cv.pdf   → backend-portal
  └─ WS  /ws/chat      → backend-portal ──MQTT→ mosquitto ──MQTT→ backend-ia
                                          ←MQTT─────────── ←MQTT─────────────

Browser (admin)
  ├─ GET /             → portal-admin (nginx)
  └─ /api/admin/**     → backend-portal (sesión cookie)

backend-ia (arranque)
  └─ GET /api/cv       → backend-portal  (HTTP, con reintentos)
```

## Componentes

### `frontend/portal-publico/`
- CV completo renderizado dinámicamente desde `/api/cv`.
- Chat flotante en tiempo real via WebSocket (`/ws/chat`).
- Toolbar: modo lectura, accesibilidad, descarga PDF.
- Build: Vite + Pug + TypeScript → HTML/CSS/JS estáticos servidos por nginx.

### `frontend/portal-admin/`
- Panel administrativo protegido por sesión (login/logout).
- Lista interacciones del chat con filtrado, calificación y edición.
- Editor del prompt del sistema IA (editable en vivo, propagado al chat vía MQTT).
- Estado y reindexado manual del índice FAISS.
- Build: Vite + TypeScript → HTML/CSS/JS estáticos servidos por nginx.

### `backend/javascript/portal/` — `backend-portal`
Servicio Node.js puro (`node:http`), sin frameworks:

| Ruta | Método | Descripción |
|---|---|---|
| `/api/cv` | GET | Proyección pública de `cv.json` (oculta `contact.private`) |
| `/api/cv.pdf` | GET | PDF generado en runtime con pdfkit |
| `/ws/chat` | WebSocket | Upgrade HTTP → WS; publica a MQTT y espera respuesta |
| `/health` | GET | Health check |
| `/admin/login` | POST | Autenticación por usuario/contraseña (cookie de sesión) |
| `/admin/logout` | POST | Cierre de sesión |
| `/api/admin/questions` | GET | Lista interacciones (requiere sesión) |
| `/api/admin/questions/:id` | PATCH | Valorar interacción (requiere sesión) |
| `/api/admin/prompt` | GET | Prompt del sistema IA actual (requiere sesión) |
| `/api/admin/prompt` | PUT | Actualizar prompt en memoria (requiere sesión) |
| `/api/admin/prompt` | DELETE | Restaurar prompt al texto por defecto (requiere sesión) |
| `/api/admin/reindex` | GET/POST | Estado y rebuild FAISS vía backend-ia (requiere sesión) |

Fuente de verdad del CV: `backend/javascript/portal/data/cv.json`.

### `backend/javascript/ia/` — `backend-ia`
Servicio Node.js que actúa como subscriber MQTT y API de administración interna:

- **Al arrancar**: obtiene `cv.json` desde `backend-portal` vía HTTP (10 reintentos × 3 s).
- **MQTT subscriber** en `ai/ask`: procesa preguntas, publica respuesta en `ai/response/{correlationId}`.
- **HTTP interno** (solo cluster): `/health`, `/questions`, `/reindex`, `/questions/:id`.

Orquesta la capa Python via `spawn('python3', ['rag_faiss.py'])` con protocolo JSON por stdin/stdout.

### `backend/python/ia/` — script RAG
- `rag_faiss.py`: construye embeddings del CV + respuestas aprobadas en SQLite.
- Acciones: `build` (indexar), `query` (recuperar chunks), `deterministic_answer`, `status`.
- Modelo de embeddings: `all-MiniLM-L6-v2` (pre-descargado en la imagen base).
- Persistencia del índice: volumen PVC montado en `/app/python/index/`.

### `mosquitto`
- Eclipse Mosquitto 2 como broker MQTT.
- Tópicos: `ai/ask` (QoS 1), `ai/response/+` (QoS 1).
- Despliegue con estrategia `Recreate` y probes `tcpSocket` (no HTTP).

## Flujo del chat IA

```
1. Usuario abre el chat → portal-publico conecta WebSocket a /ws/chat
2. Usuario envía pregunta + contacto → WS mensaje { type: 'ask', payload: {...} }
3. backend-portal genera correlationId y publica en MQTT ai/ask
   → payload incluye { correlationId, question, contact, systemPrompt }
   → systemPrompt = getCurrentPrompt() del módulo admin-routes
4. backend-ia recibe el mensaje MQTT
5. Llama a Python (FAISS): recupera top-8 chunks del CV
6. Llama a Groq API con contexto RAG + systemPrompt → respuesta genai
   └─ Si systemPrompt vacío → usa CV_SYSTEM_PROMPT hardcodeado
   └─ Si Groq falla → modo determinista (Python local)
7. backend-ia publica respuesta en ai/response/{correlationId}
8. backend-portal recibe la respuesta y la envía al WebSocket correcto
9. Browser muestra la respuesta al usuario
```

Timeout de espera: 60 s. Timeout de inactividad WS: 5 min. Ping keepalive: 30 s.

## Flujo del panel admin

```
1. Admin abre portal-admin → login con ADMIN_USER/ADMIN_PASSWORD
2. backend-portal valida credenciales → cookie de sesión HttpOnly
3. Admin lista interacciones (/api/admin/questions)
4. Admin califica respuesta (PATCH /api/admin/questions/:id)
5. backend-portal actualiza SQLite en backend-ia vía HTTP interno
6. Las respuestas aprobadas se incorporan al índice FAISS en el siguiente reindexado

7. [Prompt IA] Admin edita el prompt del sistema (PUT /api/admin/prompt)
8. backend-portal actualiza currentPrompt en memoria (módulo admin-routes.ts)
9. Los siguientes mensajes de chat incluyen el nuevo systemPrompt en el payload MQTT
10. backend-ia usa el systemPrompt recibido como instrucción de sistema en la llamada Groq
11. [Reset] DELETE /api/admin/prompt restaura currentPrompt al texto predeterminado
```

## Persistencia

| Dato | Dónde | Cómo |
|---|---|---|
| `cv.json` | `backend/javascript/portal/data/cv.json` | Archivo en imagen Docker / PVC |
| Interacciones SQLite | `backend-ia:/app/data/db/interactions.sqlite` | PVC (volumen persistente) |
| Índice FAISS | `backend-ia:/app/python/index/` | PVC (mismo volumen) |

## Estrategia de imágenes Docker

```
Dockerfile.python-base   → imagen estática ~2 GB
  └─ Python 3, faiss-cpu, sentence-transformers, modelo pre-descargado
  └─ Solo se reconstruye cuando cambia requirements.txt

Dockerfile.backend-ia    → imagen delgada <200 MB adicionales
  └─ FROM python-base
  └─ Agrega Node.js + código TypeScript compilado + scripts Python
  └─ Se reconstruye en cada cambio de código (~segundos de build)
```

## Seguridad

| Riesgo | Control |
|---|---|
| Respuesta IA inventada | Prompt con guardrails + fallback determinista + revisión humana |
| Datos privados del CV expuestos | `/api/cv` filtra `contact.private`; solo aparece en PDF |
| Panel admin accesible | Cookie de sesión HttpOnly + COOKIE_SECURE=true en prod |
| Imagen IA gigante | Imagen base estática; solo código cambia en cada deploy |
| MQTT sin autenticación | Broker interno al cluster (ClusterIP), sin exposición externa |

## Despliegue (Kubernetes / k3s)

Cada servicio tiene su chart Helm independiente en `helm/raulglez-me/<servicio>/`:

| Chart | Estrategia | Recursos | Notas |
|---|---|---|---|
| `portal-publico` | RollingUpdate | 100m/128Mi | Sin secrets ni volúmenes |
| `portal-admin` | RollingUpdate | 100m/128Mi | Sin secrets ni volúmenes |
| `backend-portal` | RollingUpdate | 500m/512Mi | Secret `raulglez-me-env`, PVC db |
| `backend-ia` | Recreate | 1000m/2Gi | Secret `raulglez-me-env`, PVC db+index |
| `mosquitto` | Recreate | 100m/64Mi | Probes TCP (no HTTP) |
