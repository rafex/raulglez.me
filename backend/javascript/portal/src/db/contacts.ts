/**
 * contacts.ts — CRUD de contactos desde SQLite.
 *
 * Gestiona el formulario de contacto público y su visualización en el panel admin.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ContactPurpose = 'recruiting' | 'speaking' | 'workshop' | 'help' | 'quote';

export type ContactInput = {
  name: string;
  email: string;
  phone: string;
  company?: string;
  purpose?: ContactPurpose;
  message?: string;
};

export type ContactRow = ContactInput & {
  id: number;
  cv_downloaded: boolean;
  admin_notes: string | null;
  created_at: string;
};

const DB_DIR = path.join(__dirname, '..', 'data', 'db');
const DB_PATH = path.join(DB_DIR, 'app.sqlite');

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!db) {
    mkdirSync(DB_DIR, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    const initSqlPath = path.join(__dirname, '..', 'schema', 'init.sql');
    if (existsSync(initSqlPath)) {
      db.exec(readFileSync(initSqlPath, 'utf-8'));
    }
  }
  return db;
}

// ─── Validación ─────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

export function validateContact(data: ContactInput): { ok: boolean; error?: string } {
  if (!data.name?.trim()) return { ok: false, error: 'El nombre es obligatorio' };
  if (!data.email?.trim()) return { ok: false, error: 'El correo electrónico es obligatorio' };
  if (!EMAIL_RE.test(data.email.trim())) return { ok: false, error: 'El formato del correo no es válido' };
  if (!data.phone?.trim()) return { ok: false, error: 'El teléfono es obligatorio' };
  if (!PHONE_RE.test(data.phone.trim())) return { ok: false, error: 'El formato del teléfono no es válido' };
  if (data.purpose && !['recruiting', 'speaking', 'workshop', 'help', 'quote'].includes(data.purpose)) {
    return { ok: false, error: 'Propósito no válido' };
  }
  return { ok: true };
}

// ─── CRUD ───────────────────────────────────────────────────────────────

export function createContact(data: ContactInput): ContactRow {
  const d = getDb();
  const info = d.prepare(`
    INSERT INTO contacts (name, email, phone, company, purpose, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.name.trim(),
    data.email.trim().toLowerCase(),
    data.phone.trim(),
    data.company?.trim() ?? null,
    data.purpose ?? null,
    data.message?.trim() ?? null
  );
  return getContactById(Number(info.lastInsertRowid))!;
}

export function getContactById(id: number): ContactRow | null {
  return (getDb().prepare('SELECT * FROM contacts WHERE id = ?').get(id) as unknown as ContactRow) ?? null;
}

export function listContacts(opts?: {
  purpose?: ContactPurpose;
  limit?: number;
  offset?: number;
}): ContactRow[] {
  const limit = Math.min(opts?.limit ?? 50, 200);
  const offset = opts?.offset ?? 0;
  const d = getDb();

  if (opts?.purpose) {
    return d.prepare(
      'SELECT * FROM contacts WHERE purpose = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(opts.purpose, limit, offset) as unknown as ContactRow[];
  }
  return d.prepare(
    'SELECT * FROM contacts ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as unknown as ContactRow[];
}

export function countContacts(purpose?: ContactPurpose): number {
  const d = getDb();
  if (purpose) {
    return (d.prepare('SELECT COUNT(*) as c FROM contacts WHERE purpose = ?').get(purpose) as { c: number }).c;
  }
  return (d.prepare('SELECT COUNT(*) as c FROM contacts').get() as { c: number }).c;
}

export function markCvDownloaded(id: number): boolean {
  const result = getDb().prepare(
    'UPDATE contacts SET cv_downloaded = TRUE WHERE id = ?'
  ).run(id);
  return result.changes > 0;
}

export function addAdminNote(id: number, notes: string): boolean {
  const result = getDb().prepare(
    "UPDATE contacts SET admin_notes = ? WHERE id = ?"
  ).run(notes, id);
  return result.changes > 0;
}
