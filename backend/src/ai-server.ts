/**
 * ai-server.ts — Servicio AI standalone (puerto 3001, solo interno).
 *
 * Expone endpoints HTTP que antes residían en server.ts.
 * El backend principal (server.ts) delega a este servicio vía
 * process.env.AI_SERVICE_URL (default: http://localhost:3001).
 *
 * Esto permite empaquetar el AI en una imagen Docker separada (~2.5 GB)
 * que solo se reconstruye cuando cambia backend/ai/** o backend/src/ai.ts.
 */

import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  askCvWithTracking,
  listTrackedQuestions,
  rateTrackedQuestion,
  rebuildRagIndex,
  getRagIndexStatus,
} from './ai.js';

const PORT = Number(process.env.AI_PORT ?? 3001);

// ─── helpers ──────────────────────────────────────────────────────────

function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

// ─── router ───────────────────────────────────────────────────────────

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  // Health check
  if (method === 'GET' && url === '/health') {
    json(res, 200, { ok: true, service: 'ai' });
    return;
  }

  // POST /ask — pregunta del chat
  if (method === 'POST' && url === '/ask') {
    try {
      const payload = await readJsonBody(req);
      const result = await askCvWithTracking(payload);
      json(res, 200, { ok: true, ...result });
    } catch (err: any) {
      const status = /obligatoria|obligatorio|Payload|contact|name|phone/i.test(String(err?.message)) ? 400 : 500;
      json(res, status, { ok: false, error: String(err?.message || err) });
    }
    return;
  }

  // GET /questions — listar preguntas
  if (method === 'GET' && url === '/questions') {
    try {
      const rows = listTrackedQuestions(200);
      json(res, 200, { ok: true, rows });
    } catch (err: any) {
      json(res, 500, { ok: false, error: String(err) });
    }
    return;
  }

  // GET /reindex — estado del índice
  if (method === 'GET' && url === '/reindex') {
    try {
      const status = await getRagIndexStatus();
      json(res, 200, { ok: true, status });
    } catch (err: any) {
      json(res, 500, { ok: false, error: String(err) });
    }
    return;
  }

  // POST /reindex — forzar rebuild
  if (method === 'POST' && url === '/reindex') {
    try {
      const result = await rebuildRagIndex();
      json(res, 200, { ok: true, result });
    } catch (err: any) {
      json(res, 500, { ok: false, error: String(err) });
    }
    return;
  }

  // PATCH /questions/:id — calificar
  const rateMatch = url.match(/^\/questions\/(\d+)$/);
  if (method === 'PATCH' && rateMatch) {
    try {
      const payload = await readJsonBody(req);
      rateTrackedQuestion(Number(rateMatch[1]), payload);
      json(res, 200, { ok: true });
    } catch (err: any) {
      json(res, 500, { ok: false, error: String(err) });
    }
    return;
  }

  // 404
  json(res, 404, { ok: false, error: 'Not found' });
}

// ─── start ────────────────────────────────────────────────────────────

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`AI service running → http://localhost:${PORT}`);
});
