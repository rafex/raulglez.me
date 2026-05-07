-- ============================================================================
-- init.sql — Schema inicial del backend portal (raulglez.me)
-- Se ejecuta al arrancar si la DB no existe.
-- Tablas: prompts (configuración IA), contacts (formulario de contacto)
-- ============================================================================

-- ─── Prompts de IA ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    UNIQUE NOT NULL,
    content     TEXT    NOT NULL,
    is_active   BOOLEAN DEFAULT FALSE,
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
);

-- Prompt por defecto (se usa si no hay otro activo)
INSERT OR IGNORE INTO prompts (name, content, is_active) VALUES (
    'default',
    'Eres un asistente que responde preguntas sobre el CV de Raúl González. Usa exclusivamente los chunks del CV proporcionados. Si no hay evidencia suficiente, di "No tengo información suficiente en el CV para responder". Responde en español, en formato Markdown.',
    TRUE
);

-- ─── Contactos ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL,
    phone         TEXT    NOT NULL,
    company       TEXT,
    purpose       TEXT    CHECK(purpose IN ('recruiting','speaking','workshop','help','quote')),
    message       TEXT,
    cv_downloaded BOOLEAN DEFAULT FALSE,
    admin_notes   TEXT,
    created_at    TEXT    DEFAULT (datetime('now'))
);

-- Índices para búsqueda y reportes
CREATE INDEX IF NOT EXISTS idx_contacts_email   ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_purpose ON contacts(purpose);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_prompts_active   ON prompts(is_active) WHERE is_active = TRUE;
