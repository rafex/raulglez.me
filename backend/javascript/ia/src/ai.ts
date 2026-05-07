/**
 * ai.ts — Lógica RAG: FAISS + Groq + SQLite tracking.
 *
 * cv.json se obtiene vía HTTP del backend-portal al arrancar (CV_SERVICE_URL).
 * No requiere copia local en la imagen — el Dockerfile ya no copia data/.
 */

import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ─── Tipos ────────────────────────────────────────────────────────────

export type LeadContact = {
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  company?: string;
  positionOffer?: string;
};

export type AskPayload = {
  question: string;
  contact: LeadContact;
  systemPrompt?: string;
};

type RagChunk = { text: string; source: string; score: number };

type RagResult = { chunks: RagChunk[] };

export type QuestionRow = {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  company: string | null;
  position_offer: string | null;
  question: string;
  answer: string;
  context_json: string;
  status: string;
  rating: number | null;
  reviewer_note: string | null;
  adjusted_answer: string | null;
  response_mode?: string | null;
};

// ─── Rutas ────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const AI_DIR = path.join(ROOT, 'python');
const INDEX_DIR = path.join(ROOT, 'data', 'db', 'index');  // bajo PVC para persistencia
const PY_RAG_SCRIPT = path.join(ROOT, 'python', 'rag_faiss.py');

// cv.json se guarda en /tmp al arrancar (obtenido vía HTTP)
const CV_JSON_CACHE = path.join(os.tmpdir(), 'raulglez_cv.json');

// SQLite para tracking de interacciones
const DB_PATH = path.join(ROOT, 'data', 'db', 'interactions.sqlite');

// ─── cv.json: obtener del backend-portal ─────────────────────────────

const CV_SERVICE_URL = process.env.CV_SERVICE_URL ?? 'http://raulglez-backend-portal:3000';

let cvJsonReady = false;

export async function loadCvFromPortal(): Promise<void> {
  const url = `${CV_SERVICE_URL}/api/cv`;
  console.log(`[ai] Obteniendo cv.json de ${url}...`);

  let retries = 10;
  while (retries-- > 0) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.text();

      // Validar que es JSON válido
      JSON.parse(json);

      writeFileSync(CV_JSON_CACHE, json, 'utf-8');
      cvJsonReady = true;
      console.log(`[ai] cv.json cargado y en caché → ${CV_JSON_CACHE}`);
      return;
    } catch (err) {
      console.warn(`[ai] cv.json no disponible (${retries} reintentos). Error: ${err}`);
      await new Promise(r => setTimeout(r, 3_000));
    }
  }
  throw new Error(`[ai] No se pudo obtener cv.json de ${url} tras varios reintentos.`);
}

export function isCvReady(): boolean {
  return cvJsonReady;
}

// ─── SQLite ───────────────────────────────────────────────────────────

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!db) {
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS qa_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        whatsapp TEXT,
        email TEXT,
        company TEXT,
        position_offer TEXT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        context_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        rating INTEGER,
        reviewer_note TEXT,
        adjusted_answer TEXT,
        response_mode TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_qa_created_at ON qa_interactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_qa_status ON qa_interactions(status);
    `);
  }
  return db;
}

// ─── Python RAG bridge ───────────────────────────────────────────────

function runPythonJson(input: object, timeoutMs = 45_000): Promise<any> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [PY_RAG_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });
    py.on('error', reject);
    py.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`RAG script failed (${code}): ${stderr || stdout}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout || '{}'));
      } catch (e) {
        reject(new Error(`Invalid RAG JSON: ${String(e)} :: ${stdout}`));
      }
    });

    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
  });
}

async function queryRag(question: string): Promise<RagResult> {
  const result = await runPythonJson({
    action: 'query',
    cv_json_path: CV_JSON_CACHE,
    sqlite_path: DB_PATH,
    index_dir: INDEX_DIR,
    top_k: 8,
    question,
  });
  return { chunks: Array.isArray(result.chunks) ? result.chunks : [] };
}

async function deterministicFallback(question: string): Promise<string> {
  const result = await runPythonJson({
    action: 'deterministic_answer',
    cv_json_path: CV_JSON_CACHE,
    sqlite_path: DB_PATH,
    index_dir: INDEX_DIR,
    top_k: 8,
    question,
  });
  return result?.answer ?? 'No tengo evidencia suficiente en el CV para afirmarlo.';
}

// ─── Groq ─────────────────────────────────────────────────────────────

/**
 * Prompt por defecto (fallback-only).
 *
 * El prompt activo se gestiona desde el panel admin (SQLite en backend-portal)
 * y se inyecta como `systemPrompt` en el payload de `/ask`.
 * Este array solo se usa si NO se recibe `systemPrompt` en el payload.
 */
export const CV_SYSTEM_PROMPT: string[] = [
  'Eres un asistente de CV con guardrails estrictos.',
  'Responde SOLO con base en el CONTEXTO proporcionado.',
  'Si no existe evidencia suficiente, responde exactamente: "No tengo evidencia suficiente en el CV para afirmarlo."',
  'No inventes experiencia, certificaciones, años o cargos.',
  'Cita brevemente la evidencia usada con referencias (1), (2), etc.',
];

async function askGroq(question: string, chunks: RagChunk[], systemPrompt?: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY no está configurada');

  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
  console.log(`[ai] askGroq | model: ${model} | chunks: ${chunks.length} | question: "${question.substring(0, 80)}..."`);

  const sysContent = systemPrompt?.trim() || CV_SYSTEM_PROMPT.join(' ');
  const context = chunks.map((c, i) => `(${i + 1}) [${c.source}] ${c.text}`).join('\n');
  const user = `CONTEXTO:\n${context}\n\nPREGUNTA:\n${question}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 700,
      messages: [
        { role: 'system', content: sysContent },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const json = await res.json() as any;
  return json?.choices?.[0]?.message?.content?.trim()
    ?? 'No tengo evidencia suficiente en el CV para afirmarlo.';
}

// ─── API pública ──────────────────────────────────────────────────────

function validateAskPayload(payload: AskPayload): string | null {
  if (!payload || typeof payload !== 'object') return 'Payload inválido';
  if (!payload.question || payload.question.trim().length < 8)
    return 'La pregunta es obligatoria (mínimo 8 caracteres)';
  if (!payload.contact || typeof payload.contact !== 'object') return 'contact es obligatorio';
  if (!payload.contact.name?.trim()) return 'name es obligatorio';
  if (!payload.contact.phone?.trim()) return 'phone es obligatorio';
  return null;
}

export async function askCvWithTracking(
  payload: AskPayload
): Promise<{ id: number; answer: string; chunks: RagChunk[]; mode: 'genai' | 'deterministic' }> {
  const err = validateAskPayload(payload);
  if (err) throw new Error(err);

  const rag = await queryRag(payload.question.trim());

  let answer = '';
  let mode: 'genai' | 'deterministic' = 'genai';

  try {
    answer = await askGroq(payload.question.trim(), rag.chunks, payload.systemPrompt);
  } catch {
    mode = 'deterministic';
    try {
      answer = `Modo determinista activo: ${await deterministicFallback(payload.question.trim())}`;
    } catch {
      answer = 'Modo determinista activo: No tengo evidencia suficiente en el CV para afirmarlo.';
    }
  }

  const database = getDb();
  database.prepare(`
    INSERT INTO qa_interactions
      (name, phone, whatsapp, email, company, position_offer,
       question, answer, context_json, status, response_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    payload.contact.name.trim(),
    payload.contact.phone.trim(),
    payload.contact.whatsapp?.trim() || null,
    payload.contact.email?.trim() || null,
    payload.contact.company?.trim() || null,
    payload.contact.positionOffer?.trim() || null,
    payload.question.trim(),
    answer,
    JSON.stringify(rag.chunks),
    mode
  );

  const { id } = database.prepare('SELECT last_insert_rowid() AS id').get() as { id: number };
  return { id, answer, chunks: rag.chunks, mode };
}

export function listTrackedQuestions(limit = 100): QuestionRow[] {
  return getDb().prepare(`
    SELECT id, created_at, name, phone, whatsapp, email, company, position_offer,
           question, answer, context_json, status, rating, reviewer_note,
           adjusted_answer, response_mode
    FROM qa_interactions ORDER BY id DESC LIMIT ?
  `).all(limit) as QuestionRow[];
}

export function rateTrackedQuestion(
  id: number,
  payload: { rating?: number; status?: string; reviewerNote?: string; adjustedAnswer?: string }
): void {
  const rating = typeof payload.rating === 'number' ? Math.max(1, Math.min(5, payload.rating)) : null;
  getDb().prepare(`
    UPDATE qa_interactions
    SET rating         = COALESCE(?, rating),
        status         = COALESCE(?, status),
        reviewer_note  = COALESCE(?, reviewer_note),
        adjusted_answer= COALESCE(?, adjusted_answer)
    WHERE id = ?
  `).run(rating, payload.status?.trim() || null,
         payload.reviewerNote?.trim() || null,
         payload.adjustedAnswer?.trim() || null, id);
}

export async function rebuildRagIndex(): Promise<any> {
  return runPythonJson({
    action: 'build',
    cv_json_path: CV_JSON_CACHE,
    sqlite_path: DB_PATH,
    index_dir: INDEX_DIR,
  });
}

export async function getRagIndexStatus(): Promise<any> {
  return runPythonJson({
    action: 'status',
    cv_json_path: CV_JSON_CACHE,
    sqlite_path: DB_PATH,
    index_dir: INDEX_DIR,
  });
}
