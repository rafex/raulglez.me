import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHmac, timingSafeEqual } from 'crypto';
import { isIP } from 'node:net';
import { generateCvPdfBuffer } from './pdf.js';
import { handleAdminRoute } from './admin-routes.js';
import { attachWebSocketServer } from './ws-handler.js';
import { validateContact, createContact } from './db/contacts.js';
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
const MAX_JSON_BODY_BYTES = 64 * 1024;
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

function getClientIp(req: http.IncomingMessage): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    const firstForwardedIp = forwardedFor.split(',')[0]?.trim();
    if (firstForwardedIp && isIP(firstForwardedIp)) return firstForwardedIp;
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && isIP(realIp.trim())) return realIp.trim();
  return req.socket.remoteAddress ?? 'unknown';
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
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_JSON_BODY_BYTES) throw new Error('Request body too large');
    chunks.push(buffer);
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

      const ip = getClientIp(req);
      if (!checkContactRateLimit(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Demasiadas solicitudes. Intenta en 15 minutos.' }));
        return;
      }

      // Guardar contacto en BD
      createContact(body);

      // Generar token JWT
      const token = signPdfToken({ email: body.email.trim(), phone: body.phone.trim() });
      console.log('[pdf-token] Token de descarga generado');

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, token }));
    } catch (err) {
      console.error('[cv.pdf/request] Error:', err);
      const tooLarge = String(err).includes('Request body too large');
      res.writeHead(tooLarge ? 413 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: tooLarge ? 'Solicitud demasiado grande' : 'Error interno' }));
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

      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Se requiere un token. Solicita el PDF desde el formulario.' }));
        return;
      }
      const requester = verifyPdfToken(token);
      if (!requester) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Token inválido o expirado. Solicita uno nuevo.' }));
        return;
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

      const ip = getClientIp(req);
      if (!checkContactRateLimit(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Demasiadas solicitudes. Intenta en 15 minutos.' }));
        return;
      }

      const contact = createContact(body);
      console.log(`[contact] Nuevo contacto | propósito: ${body.purpose ?? 'sin propósito'}`);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, id: contact.id }));
    } catch (err) {
      console.error('[contact] Error:', err);
      const tooLarge = String(err).includes('Request body too large');
      res.writeHead(tooLarge ? 413 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: tooLarge ? 'Solicitud demasiado grande' : 'Error interno' }));
    }
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

  if (url.startsWith('/api/ai/')) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    return;
  }

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
