/**
 * prompts.ts — CRUD de prompts de IA desde SQLite.
 *
 * Los prompts se almacenan en la misma DB del backend-portal.
 * init.sql crea la tabla y el prompt 'default' con is_active = TRUE.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const APP_ROOT = process.cwd();

export type PromptRow = {
  id: number;
  name: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const DB_DIR = path.join(APP_ROOT, 'data', 'db');
const DB_PATH = path.join(DB_DIR, 'app.sqlite');

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!db) {
    mkdirSync(DB_DIR, { recursive: true });
    db = new DatabaseSync(DB_PATH);

    // Ejecutar schema de inicialización desde init.sql
    const initSqlPath = path.join(APP_ROOT, 'src', 'schema', 'init.sql');
    if (existsSync(initSqlPath)) {
      const initSql = readFileSync(initSqlPath, 'utf-8');
      db.exec(initSql);
    } else {
      // Fallback: crear tabla inline si init.sql no está disponible
      db.exec(`
        CREATE TABLE IF NOT EXISTS prompts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          content TEXT NOT NULL,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO prompts (name, content, is_active) VALUES (
          'default',
          'Eres un asistente que responde preguntas sobre el CV de Raúl González. Usa exclusivamente los chunks del CV proporcionados. Si no hay evidencia suficiente, di "No tengo información suficiente en el CV para responder". Responde en español, en formato Markdown.',
          TRUE
        );
      `);
    }
  }
  return db;
}

/** Obtiene el prompt activo (el marcado con is_active = TRUE). */
export function getActivePrompt(): string {
  const row = getDb().prepare(
    'SELECT content FROM prompts WHERE is_active = TRUE LIMIT 1'
  ).get() as { content: string } | undefined;
  return row?.content ?? '';
}

/** Lista todos los prompts. */
export function listPrompts(): PromptRow[] {
  return getDb().prepare(
    'SELECT * FROM prompts ORDER BY is_active DESC, name ASC'
  ).all() as unknown as PromptRow[];
}

/** Obtiene un prompt por ID. */
export function getPromptById(id: number): PromptRow | null {
  return (getDb().prepare(
    'SELECT * FROM prompts WHERE id = ?'
  ).get(id) as unknown as PromptRow) ?? null;
}

/** Crea un nuevo prompt (no activo por defecto). */
export function createPrompt(name: string, content: string): PromptRow {
  const d = getDb();
  const info = d.prepare(
    'INSERT INTO prompts (name, content, is_active) VALUES (?, ?, FALSE)'
  ).run(name, content);
  return getPromptById(Number(info.lastInsertRowid))!;
}

/** Actualiza el contenido de un prompt. */
export function updatePrompt(id: number, content: string): boolean {
  const result = getDb().prepare(
    "UPDATE prompts SET content = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(content, id);
  return result.changes > 0;
}

/** Activa un prompt (desactiva los demás). */
export function setActivePrompt(id: number): boolean {
  const d = getDb();
  d.exec('UPDATE prompts SET is_active = FALSE');
  const result = d.prepare(
    "UPDATE prompts SET is_active = TRUE, updated_at = datetime('now') WHERE id = ?"
  ).run(id);
  return result.changes > 0;
}

/** Elimina un prompt (no permite eliminar el único activo). */
export function deletePrompt(id: number): { ok: boolean; error?: string } {
  const d = getDb();
  const p = d.prepare('SELECT is_active FROM prompts WHERE id = ?').get(id) as { is_active: boolean } | undefined;
  if (!p) return { ok: false, error: 'Prompt no encontrado' };
  if (p.is_active) {
    const count = (d.prepare(
      'SELECT COUNT(*) as c FROM prompts WHERE is_active = TRUE'
    ).get() as { c: number }).c;
    if (count <= 1) return { ok: false, error: 'No se puede eliminar el único prompt activo' };
  }
  d.prepare('DELETE FROM prompts WHERE id = ?').run(id);
  return { ok: true };
}
