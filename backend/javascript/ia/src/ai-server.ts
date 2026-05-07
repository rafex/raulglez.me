/**
 * ai-server.ts — Servicio IA standalone.
 *
 * Comunicación:
 *   MQTT subscribe  ai/ask                       ← pregunta del usuario (desde portal)
 *   MQTT publish    ai/response/{correlationId}  → respuesta al portal
 *
 * HTTP (admin/health — acceso interno):
 *   GET  /health          → estado del servicio + cvReady
 *   GET  /questions       → listar interacciones
 *   GET  /reindex         → estado índice FAISS
 *   POST /reindex         → forzar rebuild
 *   PATCH /questions/:id  → valorar respuesta
 *
 * Al arrancar obtiene cv.json del backend-portal vía HTTP (CV_SERVICE_URL).
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import mqtt from 'mqtt';
import {
  loadCvFromPortal,
  isCvReady,
  askCvWithTracking,
  listTrackedQuestions,
  rateTrackedQuestion,
  rebuildRagIndex,
  getRagIndexStatus,
} from './ai.js';

const PORT = Number(process.env.AI_PORT ?? 3000);
const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://mosquitto:1883';
const MQTT_TOPIC_ASK = 'ai/ask';
const MQTT_TOPIC_RESPONSE_PREFIX = 'ai/response/';

// ─── MQTT subscriber ──────────────────────────────────────────────────

function startMqttSubscriber(): void {
  const client = mqtt.connect(MQTT_URL, {
    clientId: `backend-ia-${randomUUID().substring(0, 8)}`,
    clean: true,
    reconnectPeriod: 3_000,
    connectTimeout: 15_000,
  });

  client.on('connect', () => {
    console.log(`[ai-server] MQTT conectado: ${MQTT_URL}`);
    client.subscribe(MQTT_TOPIC_ASK, { qos: 1 }, (err) => {
      if (err) console.error('[ai-server] Error suscripción MQTT:', err);
      else console.log(`[ai-server] Suscrito a "${MQTT_TOPIC_ASK}"`);
    });
  });

  client.on('error', (err: Error) => {
    console.error('[ai-server] Error MQTT:', err.message);
  });

  client.on('message', async (topic: string, message: Buffer) => {
    if (topic !== MQTT_TOPIC_ASK) return;

    let parsed: { correlationId: string; question: string; contact: Record<string, string> };
    try {
      parsed = JSON.parse(message.toString());
    } catch (e) {
      console.error('[ai-server] Mensaje MQTT inválido:', String(e));
      return;
    }

    const { correlationId, question, contact } = parsed;
    if (!correlationId) {
      console.error('[ai-server] Mensaje sin correlationId, ignorando');
      return;
    }

    const responseTopic = `${MQTT_TOPIC_RESPONSE_PREFIX}${correlationId}`;
    console.log(`[ai-server] [${correlationId}] pregunta: "${question?.substring(0, 60)}..."`);

    try {
      if (!isCvReady()) await loadCvFromPortal();

      const result = await askCvWithTracking({ question, contact: contact as any });

      client.publish(responseTopic, JSON.stringify({
        ok: true,
        id: result.id,
        answer: result.answer,
        mode: result.mode,
      }), { qos: 1 });

      console.log(`[ai-server] [${correlationId}] respuesta enviada modo=${result.mode}`);
    } catch (err: any) {
      console.error(`[ai-server] [${correlationId}] error:`, err.message);
      client.publish(responseTopic, JSON.stringify({
        ok: false,
        error: String(err?.message || err),
      }), { qos: 1 });
    }
  });
}

// ─── HTTP server (admin/health — interno) ─────────────────────────────

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const rawUrl = req.url ?? '/';
  const method = req.method ?? 'GET';
  const urlObj = new URL(rawUrl, 'http://localhost');
  const pathname = urlObj.pathname;

  if (method === 'GET' && pathname === '/health') {
    json(res, 200, { ok: true, service: 'backend-ia', cvReady: isCvReady() });
    return;
  }

  if (method === 'GET' && pathname === '/questions') {
    try {
      const limit = Math.min(Number(urlObj.searchParams.get('limit') ?? 200), 500);
      json(res, 200, { ok: true, rows: listTrackedQuestions(limit) });
    } catch (err: any) {
      json(res, 500, { ok: false, error: String(err) });
    }
    return;
  }

  if (method === 'GET' && pathname === '/reindex') {
    try {
      json(res, 200, { ok: true, status: await getRagIndexStatus() });
    } catch (err: any) {
      json(res, 500, { ok: false, error: String(err) });
    }
    return;
  }

  if (method === 'POST' && pathname === '/reindex') {
    try {
      json(res, 200, { ok: true, result: await rebuildRagIndex() });
    } catch (err: any) {
      json(res, 500, { ok: false, error: String(err) });
    }
    return;
  }

  const rateMatch = pathname.match(/^\/questions\/(\d+)$/);
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

  json(res, 404, { ok: false, error: 'Not found' });
}

// ─── Arranque ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[ai-server] Iniciando...');
  await loadCvFromPortal();
  startMqttSubscriber();

  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`[ai-server] HTTP interno → http://localhost:${PORT}`);
    console.log(`[ai-server] MQTT suscrito → ${MQTT_URL} topic="${MQTT_TOPIC_ASK}"`);
  });
}

main().catch((err) => {
  console.error('[ai-server] Error fatal:', err);
  process.exit(1);
});
