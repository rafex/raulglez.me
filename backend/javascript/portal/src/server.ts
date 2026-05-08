import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHmac, timingSafeEqual } from 'crypto';
import { generateCvPdfBuffer } from './pdf.js';
import { handleAdminRoute } from './admin-routes.js';
import { attachWebSocketServer } from './ws-handler.js';
import { validateContact, createContact, markCvDownloaded, getContactById } from './db/contacts.js';
import { getCurrentPrompt } from './admin-routes.js';
import { searchCv } from './search.js';

// backend-ia vía HTTP (para rutas de admin que no usan MQTT)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://raulglez-backend-ia:3000';

async function aiFetch(urlPath: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${AI_SERVICE_URL}${urlPath}`, init);
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(body.error ?? `AI service error ${res.status}`);
  return body;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC_DIR = process.env.PUBLIC_DIR ?? path.join(__dirname, '..', 'public');
const DATA_FILE = path.join(__dirname, '..', 'data', 'cv.json');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function readCvData(): string {
  return fs.readFileSync(DATA_FILE, 'utf-8');
}

function toPublicCv(data: any): any {
  return {
    ...data,
    header: {
      ...data.header,
      name: data.header?.nickname ?? data.header?.name ?? data.header?.fullname ?? '',
    },
    contact: {
      public: data.contact?.public ?? {},
    },
  };
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse): void {
  const rawPath = (req.url ?? '/').split('?')[0];
  const safePath = path.normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const index = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(index)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(index));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';
  const isAsset = safePath.startsWith('/assets/');

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  res.end(fs.readFileSync(filePath));
}

async function readJsonBody(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf-8') || '{}';
  return JSON.parse(raw);
}

// ─── JWT para descarga de PDF ────────────────────────────────────────────────

const PDF_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutos
const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me';

function signPdfToken(payload: { email: string; phone: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Date.now() + PDF_TOKEN_TTL_MS,
  })).toString('base64url');
  const signature = createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyPdfToken(token: string): { email: string; phone: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sigB64] = parts;

    const expectedSig = createHmac('sha256', SECRET)
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url');

    const sigBuf = Buffer.from(sigB64, 'base64url');
    const expectedBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) return null;

    return { email: payload.email, phone: payload.phone };
  } catch {
    return null;
  }
}

// ─── Rate limiting para formulario de contacto ───────────────────────────────

const contactRateMap = new Map<string, { count: number; resetAt: number }>();
const MAX_CONTACTS_PER_WINDOW = 5;
const CONTACT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function checkContactRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = contactRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    contactRateMap.set(ip, { count: 1, resetAt: now + CONTACT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_CONTACTS_PER_WINDOW) return false;
  entry.count++;
  return true;
}

// POST /api/ai/ask se maneja ahora vía WebSocket (/ws/chat).
// Esta ruta HTTP se mantiene como fallback para clientes sin WS.
const server = http.createServer(async (req, res) => {
  try {
  const method = req.method ?? 'GET';
  const url = (req.url ?? '/').split('?')[0];

  // ── Health check ─────────────────────────────────────────────────────
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', service: 'backend' }));
    return;
  }

  if (url === '/api/cv') {
    const cvData = toPublicCv(JSON.parse(readCvData()));
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(cvData));
    return;
  }

  // ── POST /api/cv.pdf/request — genera token para descargar PDF ─────────
  if (method === 'POST' && url === '/api/cv.pdf/request') {
    try {
      const body = await readJsonBody(req);
      const validation = validateContact(body);
      if (!validation.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: validation.error }));
        return;
      }

      const ip = req.socket.remoteAddress ?? 'unknown';
      if (!checkContactRateLimit(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Demasiadas solicitudes. Intenta en 15 minutos.' }));
        return;
      }

      // Guardar contacto en BD
      createContact(body);

      // Generar token JWT
      const token = signPdfToken({ email: body.email.trim(), phone: body.phone.trim() });
      console.log(`[pdf-token] Token generado para ${body.email}`);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, token }));
    } catch (err) {
      console.error('[cv.pdf/request] Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Error interno' }));
    }
    return;
  }

  // ── GET /api/cv.pdf (con token opcional) ───────────────────────────────
  if (url === '/api/cv.pdf') {
    try {
      // Verificar si viene token como query param
      const rawUrl = req.url ?? '/';
      const queryString = rawUrl.includes('?') ? rawUrl.split('?')[1] : '';
      const params = new URLSearchParams(queryString);
      const token = params.get('token');

      let requester: { email: string; phone: string } | undefined;

      if (token) {
        const decoded = verifyPdfToken(token);
        if (!decoded) {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'Token inválido o expirado. Solicita uno nuevo.' }));
          return;
        }
        requester = decoded;
        // Marcar descarga en BD (último contacto con ese email)
        // No bloqueamos si no encontramos contacto — el token es suficiente
      }

      const cvData = JSON.parse(readCvData());
      generateCvPdfBuffer(cvData, requester)
        .then((pdfBuffer) => {
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="CV-Raul-Gonzalez.pdf"',
            'Cache-Control': 'no-store',
          });
          res.end(pdfBuffer);
        })
        .catch((err) => {
          console.error('Failed generating PDF:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Error generating PDF');
        });
    } catch (err) {
      console.error('Invalid CV JSON:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Invalid CV data');
    }
    return;
  }

  // ── POST /api/contact — formulario público de contacto ─────────────────
  if (method === 'POST' && url === '/api/contact') {
    try {
      const body = await readJsonBody(req);
      const validation = validateContact(body);
      if (!validation.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: validation.error }));
        return;
      }

      const ip = req.socket.remoteAddress ?? 'unknown';
      if (!checkContactRateLimit(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Demasiadas solicitudes. Intenta en 15 minutos.' }));
        return;
      }

      const contact = createContact(body);
      console.log(`[contact] Nuevo contacto: ${body.email} — ${body.purpose ?? 'sin propósito'}`);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, id: contact.id }));
    } catch (err) {
      console.error('[contact] Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Error interno' }));
    }
    return;
  }

  if (method === 'POST' && url === '/api/ai/ask') {
    readJsonBody(req)
      .then((payload) => {
        // Inyectar prompt activo desde BD si no viene en el payload
        if (!payload.systemPrompt) {
          payload.systemPrompt = getCurrentPrompt();
        }
        return aiFetch('/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      })
      .then((result) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true, ...result }));
      })
      .catch((err) => {
        const status = /obligatoria|obligatorio|Payload|contact|name|phone/i.test(String(err?.message)) ? 400 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
      });
    return;
  }

  if (method === 'GET' && url === '/api/ai/questions') {
    aiFetch('/questions')
      .then((data) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true, rows: data.rows }));
      })
      .catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      });
    return;
  }

  if (method === 'GET' && url === '/api/ai/reindex') {
    aiFetch('/reindex')
      .then((status) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true, status }));
      })
      .catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      });
    return;
  }

  if (method === 'POST' && url === '/api/ai/reindex') {
    aiFetch('/reindex', { method: 'POST' })
      .then((result) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true, result }));
      })
      .catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      });
    return;
  }

  const rateMatch = url.match(/^\/api\/ai\/questions\/(\d+)$/);
  if (method === 'PATCH' && rateMatch) {
    readJsonBody(req)
      .then((payload) => aiFetch(`/questions/${rateMatch[1]}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }))
      .then(() => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
      })
      .catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      });
    return;
  }

  // ── GET /api/search?q=… — búsqueda en el CV ────────────────────────────────
  if (method === 'GET' && url.startsWith('/api/search')) {
    try {
      const rawUrl = req.url ?? '/';
      const qs = rawUrl.includes('?') ? rawUrl.split('?')[1] : '';
      const q = (new URLSearchParams(qs).get('q') ?? '').trim();
      if (!q) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true, results: [] }));
        return;
      }
      const cvData = JSON.parse(readCvData());
      const results = searchCv(cvData, q);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, results }));
    } catch (err) {
      console.error('[search] Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Error en búsqueda' }));
    }
    return;
  }

  // ── Rutas del panel admin (protegidas) ──────────────────────────────────────
  const handled = await handleAdminRoute(req, res, method, url);
  if (handled) return;

  serveStatic(req, res);
  } catch (err) {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
    }
  }
});

// ── WebSocket server adjunto (upgrade en /ws/chat) ───────────────────
attachWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
  console.log(`WebSocket chat → ws://localhost:${PORT}/ws/chat`);
});
