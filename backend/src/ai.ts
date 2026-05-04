import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
import path from 'node:path';

type LeadContact = {
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  company?: string;
  positionOffer?: string;
};

type AskPayload = {
  question: string;
  contact: LeadContact;
};

type RagChunk = { text: string; source: string; score: number };

type RagResult = {
  chunks: RagChunk[];
};

type QuestionRow = {
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

const ROOT = process.cwd();
const AI_DIR = path.join(ROOT, 'backend', 'ai');
const CV_JSON = path.join(ROOT, 'backend', 'data', 'cv.json');
const DB_PATH = path.join(ROOT, 'backend', 'data', 'interactions.sqlite');
const INDEX_DIR = path.join(AI_DIR, 'index');
const PY_RAG_SCRIPT = path.join(AI_DIR, 'rag_faiss.py');

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!db) {
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
    try {
      db.exec(`ALTER TABLE qa_interactions ADD COLUMN response_mode TEXT;`);
    } catch {
      // ignore if column already exists
    }
  }
  return db;
}

function runPythonJson(input: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [PY_RAG_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    py.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    py.on('error', reject);

    py.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`RAG script failed (${code}): ${stderr || stdout}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout || '{}'));
      } catch (e) {
        reject(new Error(`Invalid RAG JSON output: ${String(e)} :: ${stdout}`));
      }
    });

    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
  });
}

async function queryRag(question: string): Promise<RagResult> {
  const payload = {
    action: 'query',
    cv_json_path: CV_JSON,
    sqlite_path: DB_PATH,
    index_dir: INDEX_DIR,
    top_k: 8,
    question,
  };

  const result = await runPythonJson(payload);
  return { chunks: Array.isArray(result.chunks) ? result.chunks : [] };
}

async function deterministicFallback(question: string): Promise<string> {
  const payload = {
    action: 'deterministic_answer',
    cv_json_path: CV_JSON,
    sqlite_path: DB_PATH,
    index_dir: INDEX_DIR,
    top_k: 8,
    question,
  };
  const result = await runPythonJson(payload);
  return result?.answer ?? 'No tengo evidencia suficiente en el CV para afirmarlo.';
}

async function askGroq(question: string, chunks: RagChunk[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no está configurada');
  }

  const context = chunks.map((c, i) => `(${i + 1}) [${c.source}] ${c.text}`).join('\n');

  const system = [
    'Eres un asistente de CV con guardrails estrictos.',
    'Responde SOLO con base en el CONTEXTO proporcionado.',
    'Si no existe evidencia suficiente, responde exactamente: "No tengo evidencia suficiente en el CV para afirmarlo."',
    'No inventes experiencia, certificaciones, años o cargos.',
    'Cita brevemente la evidencia usada con referencias (1), (2), etc.',
  ].join(' ');

  const user = `CONTEXTO:\n${context}\n\nPREGUNTA:\n${question}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 700,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq error ${res.status}: ${body}`);
  }

  const json = await res.json() as any;
  return json?.choices?.[0]?.message?.content?.trim() ?? 'No tengo evidencia suficiente en el CV para afirmarlo.';
}

function validateAskPayload(payload: AskPayload): string | null {
  if (!payload || typeof payload !== 'object') return 'Payload inválido';
  if (!payload.question || payload.question.trim().length < 8) return 'La pregunta es obligatoria (mínimo 8 caracteres)';
  if (!payload.contact || typeof payload.contact !== 'object') return 'contact es obligatorio';
  if (!payload.contact.name?.trim()) return 'name es obligatorio';
  if (!payload.contact.phone?.trim()) return 'phone es obligatorio';
  return null;
}

export async function askCvWithTracking(payload: AskPayload): Promise<{ id: number; answer: string; chunks: RagChunk[]; mode: 'genai' | 'deterministic' }> {
  const err = validateAskPayload(payload);
  if (err) throw new Error(err);

  const rag = await queryRag(payload.question.trim());
  let answer = '';
  let mode: 'genai' | 'deterministic' = 'genai';
  try {
    answer = await askGroq(payload.question.trim(), rag.chunks);
  } catch {
    mode = 'deterministic';
    try {
      const fallback = await deterministicFallback(payload.question.trim());
      answer = `Modo determinista activo (sin GenAI): ${fallback}`;
    } catch {
      answer = 'Modo determinista activo (sin GenAI): No tengo evidencia suficiente en el CV para afirmarlo.';
    }
  }

  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO qa_interactions (
      name, phone, whatsapp, email, company, position_offer,
      question, answer, context_json, status, response_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `);

  stmt.run(
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

  const idRow = database.prepare('SELECT last_insert_rowid() AS id').get() as { id: number };

  return { id: idRow.id, answer, chunks: rag.chunks, mode };
}

export function listTrackedQuestions(limit = 100): QuestionRow[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, created_at, name, phone, whatsapp, email, company, position_offer,
           question, answer, context_json, status, rating, reviewer_note, adjusted_answer
           , response_mode
    FROM qa_interactions
    ORDER BY id DESC
    LIMIT ?
  `);
  return stmt.all(limit) as QuestionRow[];
}

export function rateTrackedQuestion(id: number, payload: { rating?: number; status?: string; reviewerNote?: string; adjustedAnswer?: string }): void {
  const database = getDb();
  const rating = typeof payload.rating === 'number' ? Math.max(1, Math.min(5, payload.rating)) : null;
  const status = payload.status?.trim() || null;

  const stmt = database.prepare(`
    UPDATE qa_interactions
    SET rating = COALESCE(?, rating),
        status = COALESCE(?, status),
        reviewer_note = COALESCE(?, reviewer_note),
        adjusted_answer = COALESCE(?, adjusted_answer)
    WHERE id = ?
  `);

  stmt.run(
    rating,
    status,
    payload.reviewerNote?.trim() || null,
    payload.adjustedAnswer?.trim() || null,
    id
  );
}
