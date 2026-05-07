```toml
artifact_type = "task_file"
initiative    = "seo-contact-prompts"
spec_id       = "SPEC-0002"
owner         = ""
state         = "todo"
```

# TASKS: SEO, Formulario de Contacto y Prompts en Base de Datos

> _Estado: 🔄 En construcción — @plan trabajando_
> _Iniciado: 2026-05-06_
> _Tipo: feature_
> _Repo: GRANDE_

_Este archivo se actualiza progresivamente mientras @plan recopila contexto y construye el plan._

## Plan: Integración de SEO, Contacto y Gestión de Prompts

**Tipo:** feature
**Complejidad estimada:** alta (múltiples componentes afectados)
**Ramas necesarias:** 4 worktrees paralelos

### Contexto

El portal raulglez.me actual carece de:
1. **SEO on-page optimizado**: Sin anclas HTML con `id` para navegación directa a secciones
2. **Formulario de contacto profesional**: Solo hay chat IA, pero no un formulario dedicado para reclutadores, ponencias, talleres o cotizaciones
3. **Prompts en código duro**: Los prompts de IA están en `admin-routes.ts` (líneas 21-24) como constantes
4. **Protección de PDF**: El PDF se descarga sin recopilar información del solicitante
5. **Efectos visuales**: Sin animaciones al hacer scroll (AOS)

### Estado actual vs objetivo

| Aspecto | Actual | Objetivo |
|---------|--------|----------|
| Anclas HTML | ❌ Sin `id` en secciones | ✅ Cada sección con `id` único |
| AOS | ❌ No integrado | ✅ Animaciones en scroll |
| Prompts | ❌ Código duro en `admin-routes.ts` | ✅ SQLite con múltiples prompts |
| Form contacto | ❌ Solo chat IA | ✅ Formulario dedicado + admin |
| PDF download | ❌ Directo, sin formulario | ✅ Requiere email + teléfono |
| PDF metadatos | ❌ Solo nombre en `info.Title` | ✅ Incluye datos del solicitante |

### Archivos a crear

- `backend/javascript/portal/src/schema/init.sql` — Script de inicialización de tablas
- `backend/javascript/portal/src/db/prompts.ts` — CRUD de prompts desde SQLite
- `backend/javascript/portal/src/db/contacts.ts` — CRUD de contactos
- `frontend/portal-publico/src/scripts/modules/contact-form.ts` — Lógica del formulario
- `frontend/portal-publico/src/styles/contact-form.css` — Estilos del formulario
- `frontend/portal-admin/src/scripts/modules/contact-list.ts` — Panel de administración
- `frontend/portal-admin/src/styles/contact-list.css` — Estilos del panel

### Archivos a modificar

- `frontend/portal-publico/index.pug` — Agregar `id` a secciones, integrar AOS, formulario contacto
- `frontend/portal-publico/src/scripts/main.ts` — Inicializar AOS y formulario
- `frontend/portal-publico/src/styles/layout.css` — Estilos para AOS y formulario
- `backend/javascript/portal/src/server.ts` — Endpoints `/api/contact`, `/api/cv.pdf` (modificado)
- `backend/javascript/portal/src/pdf.ts` — Agregar metadatos del solicitante
- `backend/javascript/portal/src/admin-routes.ts` — Mover prompts a SQLite
- `backend/javascript/ia/src/ai.ts` — Leer prompts desde SQLite
- `backend/javascript/ia/src/ai-server.ts` — Endpoint `/api/admin/prompts` (múltiples)
- `frontend/portal-admin/src/scripts/main.ts` — Agregar panel de contactos
- `containers/Dockerfile.backend-portal` — Copiar `init.sql` al contenedor

### Pasos de implementación

#### Worktree 1: SEO y AOS (frontend)

1. **Agregar IDs a secciones en `index.pug`**
   - Modificar cada `section.section.cv-*` para incluir `id` único
   - Ejemplo: `section.section.cv-experience(id="experience")`
   - Agregar `id` a header, footer, y componentes clave

2. **Integrar AOS (Animate On Scroll)**
   - Instalar AOS: `npm install aos@next` en `frontend/portal-publico/`
   - Importar en `main.ts`: `import AOS from 'aos'; import 'aos/dist/aos.css';`
   - Inicializar: `AOS.init({ duration: 800, once: true });`
   - Agregar atributos `data-aos` a elementos clave en `renderers.ts`

3. **Agregar navegación por anclas**
   - Crear componente sticky nav en `index.pug` con links a `#experience`, `#skills`, etc.
   - Agregar smooth scroll CSS

#### Worktree 2: Schema SQL y migración de prompts

1. **Crear `backend/javascript/portal/src/schema/init.sql`**
   ```sql
   -- Tabla de prompts
   CREATE TABLE IF NOT EXISTS prompts (
     id INTEGER PRIMARY KEY,
     name TEXT UNIQUE NOT NULL,
     content TEXT NOT NULL,
     is_active BOOLEAN DEFAULT FALSE,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Insert prompt default
   INSERT INTO prompts (name, content, is_active) VALUES (
     'default',
     'Eres un asistente que responde preguntas sobre el CV de Raúl...',
     TRUE
   );
   
   -- Tabla de contactos
   CREATE TABLE IF NOT EXISTS contacts (
     id INTEGER PRIMARY KEY,
     email TEXT NOT NULL,
     phone TEXT NOT NULL,
     name TEXT,
     company TEXT,
     purpose TEXT CHECK(purpose IN ('recruiting', 'speaking', 'workshop', 'help', 'quote')),
     message TEXT,
     cv_downloaded BOOLEAN DEFAULT FALSE,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Índices
   CREATE INDEX idx_contacts_email ON contacts(email);
   CREATE INDEX idx_contacts_created ON contacts(created_at);
   ```

2. **Modificar `Dockerfile.backend-portal`**
   - Copiar `init.sql`: `COPY backend/javascript/portal/src/schema/init.sql /app/schema/`
   - Ejecutar al iniciar contenedor si base de datos no existe

3. **Crear `backend/javascript/portal/src/db/prompts.ts`**
   - Funciones: `getActivePrompt()`, `listPrompts()`, `createPrompt()`, `updatePrompt()`, `deletePrompt()`, `setActivePrompt()`
   - Usar `DatabaseSync` de `node:sqlite`

4. **Migrar prompts en `admin-routes.ts`**
   - Reemplazar `DEFAULT_PROMPT` y `currentPrompt` variable con llamadas a `getActivePrompt()`
   - Modificar endpoints `/api/admin/prompt` para soportar múltiples prompts
   - Nuevo endpoint: `GET /api/admin/prompts` (lista todos)
   - Modificar `PUT /api/admin/prompt/:id` (actualiza específico)
   - Nuevo endpoint: `POST /api/admin/prompts` (crea nuevo)

5. **Modificar `backend/javascript/ia/src/ai.ts`**
   - Leer `systemPrompt` desde `payload.systemPrompt` o fallback a prompt activo de SQLite
   - En `askCvWithTracking`, usar prompt de base de datos si no se especifica

#### Worktree 3: Formulario de contacto y restricción de PDF

1. **Crear `backend/javascript/portal/src/db/contacts.ts`**
   - Funciones: `createContact()`, `getContacts()`, `getContactById()`, `markAsCvDownloaded()`
   - Validación de email y teléfono

2. **Modificar `backend/javascript/portal/src/server.ts`**
   - Nuevo endpoint: `POST /api/contact` — recibe datos de contacto, valida, guarda en SQLite
   - Modificar `GET /api/cv.pdf` — ahora requiere `?token={jwt}` con email y teléfono
   - Nuevo endpoint: `POST /api/cv.pdf/request` — genera token JWT tras validar datos

3. **Crear `frontend/portal-publico/src/scripts/modules/contact-form.ts`**
   - Validación cliente: email requerido, teléfono requerido, formato
   - Submit a `/api/contact`
   - Mostrar confirmación

4. **Crear `frontend/portal-publico/src/styles/contact-form.css`**
   - Formulario modal o sección dedicada
   - Estilos responsive
   - Estados: loading, success, error

5. **Modificar `backend/javascript/portal/src/pdf.ts`**
   - Extender `generateCvPdfBuffer` para aceptar `requester: {email, phone}`
   - Agregar metadatos en `doc.info`:
     ```typescript
     info: {
       ...
       RequesterEmail: requester.email,
       RequesterPhone: requester.phone,
       GeneratedAt: new Date().toISOString()
     }
     ```
   - Opcional: agregar texto watermark en primera página

6. **Integrar en `frontend/portal-publico/index.pug`**
   - Sección de formulario de contacto
   - Modal para descargar PDF (requiere completar formulario primero)

#### Worktree 4: Panel de administración de contactos

1. **Crear `frontend/portal-admin/src/scripts/modules/contact-list.ts`**
   - Obtener contactos: `GET /api/admin/contacts`
   - Filtrar por propósito (recruiting, speaking, etc.)
   - Exportar a CSV

2. **Crear `frontend/portal-admin/src/styles/contact-list.css`**
   - Tabla responsive
   - Botones de acción
   - Filtros

3. **Modificar `backend/javascript/portal/src/admin-routes.ts`**
   - Nuevo endpoint: `GET /api/admin/contacts` — lista con paginación y filtros
   - Nuevo endpoint: `GET /api/admin/contacts/:id` — detalle
   - Nuevo endpoint: `PATCH /api/admin/contacts/:id` — agregar notas internas

4. **Modificar `frontend/portal-admin/src/scripts/main.ts`**
   - Importar e inicializar `contact-list.ts`
   - Agregar ruta `/admin/contacts` en el router

### Tests a escribir

- **Backend:**
  - `tests/pdf.test.ts` — verificar que PDF incluye metadatos del solicitante
  - `tests/contact.test.ts` — validación de email/teléfono, creación en SQLite
  - `tests/prompts.test.ts` — CRUD de prompts, activación/desactivación
  
- **Frontend:**
  - `tests/contact-form.test.ts` — validación cliente, submit con datos correctos
  - `tests/contact-list.test.ts` — filtrado, exportación CSV

### Riesgos

1. **JWT tokens para PDF** — tokens deben expirar (15 min) y ser firmados con `SESSION_SECRET`. Riesgo de leak si no se usa HTTPS en producción.
2. **Rate limiting** — endpoints `/api/contact` y `/api/cv.pdf/request` necesitan rate limiting para evitar spam. Actualmente no hay rate limiting global.
3. **GDPR / Privacidad** — recopilar email/teléfono requiere consentimiento explícito. Formulario debe incluir checkbox de consentimiento.
4. **Breaking change** — cambiar `/api/cv.pdf` a requerir token rompe URLs existentes. Necesitar migración suave (período de gracia con redirect).

### Criterio de aceptación

- [ ] Cada sección del CV tiene `id` único navegable
- [ ] AOS anima elementos al hacer scroll
- [ ] Prompts almacenados en SQLite, editable desde admin
- [ ] Formulario de contacto funcional con validación
- [ ] Contactos aparecen en panel admin con filtros
- [ ] Descargar PDF requiere email + teléfono válidos
- [ ] PDF incluye metadatos con datos del solicitante
- [ ] Ningún prompt en código duro (solo en SQLite)
- [ ] Tests unitarios para backend (prompts, contactos, PDF)
- [ ] Tests E2E para flujo de contacto → descarga PDF

### ToDo

<ToDo>
- [ ] Crear worktrees:
  - `git worktree add .opencode/worktrees/seo-aos -b feature/seo-aos`
  - `git worktree add .opencode/worktrees/prompts-db -b feature/prompts-db`
  - `git worktree add .opencode/worktrees/contact-form -b feature/contact-form`
  - `git worktree add .opencode/worktrees/contact-admin -b feature/contact-admin`
- [ ] @build — aplica skill `worktree` en worktree `seo-aos`: Agregar IDs y AOS
- [ ] @build — aplica skill `worktree` en worktree `prompts-db`: Schema SQL y migración
- [ ] @build — aplica skill `worktree` en worktree `contact-form`: Formulario y restricción PDF
- [ ] @build — aplica skill `worktree` en worktree `contact-admin`: Panel admin
- [ ] Tests: backend unitarios (pdf, contact, prompts)
- [ ] Tests: frontend E2E (flujo contacto → PDF)
- [ ] Review con @audit (seguridad: JWT, rate limiting, GDPR)
- [ ] /merge — integrar worktrees a main
</ToDo>

---

## Decisiones técnicas tomadas

1. **SQLite para prompts** — En lugar de PostgreSQL/Redis por simplicidad. El proyecto ya usa SQLite para tracking de interacciones. Mantenemos stack homogéneo.

2. **JWT para PDF** — En lugar de sesiones server-side. Tokens son stateless, expiran rápido (15 min), firma con `SESSION_SECRET` ya existente.

3. **AOS vs CSS custom** — AOS es ligero (~2KB), bien mantenido, y elimina necesidad de escribir IntersectionObserver custom. Instalamos v3 (next) para compatibilidad moderna.

4. **Formulario en portal-publico vs modal** — Modal evita romper layout actual. Prioridad: UX mínima invasiva.

5. **Metadatos PDF vs Watermark** — Metadatos son invisibles (más profesional). Watermark opcional si se requiere visibilidad. Empezamos con metadatos.

6. **Rate limiting** — Implementar en `auth.ts` usando mismo mecanismo de `/admin/login` (memoria). Para producción, considerar Redis.

7. **GDPR** — Formulario debe incluir checkbox: "Acepto que mis datos sean usados para contactarme sobre oportunidades profesionales". Texto claro y conciso.

---

## Preguntas abiertas para el usuario

1. **¿Qué campos adicionales en formulario de contacto?** Actualmente: nombre, email, teléfono, empresa, propósito (recruiting|speaking|workshop|help|quote), mensaje. ¿Agregar compañía, sitio web, LinkedIn?

2. **¿PDF watermark visible?** Opción A: solo metadatos (invisibles). Opción B: agregar texto pequeño en footer: "Generado para: nombre@email.com | +1234567890". ¿Cuál prefieres?

3. **¿Expiración del token JWT?** Sugerencia: 15 minutos. ¿Ajustar?

4. **¿Exportación de contactos?** ¿Quieres exportar a CSV, JSON, o integrar con CRM (API webhook)?

5. **¿Rate limiting específico?** Sugerencia: 3 intentos de descarga por IP cada 15 min. ¿Ajustar?

6. **¿Anclas específicas?** Sugerencia: `#header`, `#experience`, `#skills`, `#education`, `#conferences`, `#articles`, `#projects`, `#contact`. ¿Alguna otra?

7. **¿AOS animations?** Sugerencia: `fade-up`, `fade-left`, `zoom-in`. ¿Quieres personalizar duración/easing?

---

_Plan generado por @plan — pendiente de aprobación del usuario._
