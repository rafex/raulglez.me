import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  parseCookies,
  buildSetCookieHeader,
  buildClearCookieHeader,
  verifyCredentials,
  createSession,
  destroySession,
  getSession,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from './auth.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:3001';

async function aiFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, init);
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(body.error ?? `AI service error ${res.status}`);
  return body;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = process.env.PUBLIC_DIR ?? path.join(__dirname, '..', 'public');

// ─── Headers de seguridad ────────────────────────────────────────────────────

function setSecurityHeaders(res: http.ServerResponse): void {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:"
  );
}

// ─── Helpers de respuesta ─────────────────────────────────────────────────────

function jsonOk(res: http.ServerResponse, data: object): void {
  setSecurityHeaders(res);
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function jsonError(res: http.ServerResponse, status: number, error: string): void {
  setSecurityHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ ok: false, error }));
}

async function readJsonBody(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf-8') || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getClientIp(req: http.IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'unknown';
}

// ─── Middleware de autenticación ──────────────────────────────────────────────

function requireAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const cookieHeader = req.headers.cookie ?? '';
  const cookies = parseCookies(cookieHeader);
  const signedId = cookies[SESSION_COOKIE_NAME];
  if (!signedId) {
    jsonError(res, 401, 'No autenticado');
    return false;
  }
  const session = getSession(signedId);
  if (!session) {
    // Limpiar cookie inválida
    res.setHeader('Set-Cookie', buildClearCookieHeader(SESSION_COOKIE_NAME));
    jsonError(res, 401, 'Sesión expirada o inválida');
    return false;
  }
  return true;
}

// ─── Servir el HTML del admin ─────────────────────────────────────────────────

function serveAdminHtml(res: http.ServerResponse): void {
  setSecurityHeaders(res);
  const adminFile = path.join(PUBLIC_DIR, 'admin.html');
  if (fs.existsSync(adminFile)) {
    const content = fs.readFileSync(adminFile);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(content);
  } else {
    // Fallback mínimo si el frontend no está compilado
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html><html lang="es"><head><meta charset="UTF-8">
<title>Admin — raulglez.me</title></head><body>
<p style="font-family:sans-serif;padding:2rem">
Panel en construcción. Ejecuta <code>npm run build</code> en el frontend.
</p></body></html>`);
  }
}

// ─── Router principal ─────────────────────────────────────────────────────────

export async function handleAdminRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  method: string,
  url: string
): Promise<boolean> {

  // Log de diagnóstico para todas las rutas admin
  console.log(`[admin] ${method} ${url} | IP: ${getClientIp(req)} | Cookie: ${req.headers.cookie ? 'presente' : 'ausente'}`);

  // ── GET /admin y /admin/login: redirigir al SPA ────────────────────────────
  // El SPA (servido por nginx) maneja login y panel client-side.
  // El backend no tiene el HTML — redirige para que nginx lo sirva.
  if (method === 'GET' && (url === '/admin' || url === '/admin/' || url === '/admin/login' || url === '/admin/login/')) {
    setSecurityHeaders(res);
    res.writeHead(302, { Location: '/admin/' });
    res.end();
    return true;
  }

  // ── POST /admin/login ───────────────────────────────────────────────────────
  if (method === 'POST' && url === '/admin/login') {
    const ip = getClientIp(req);
    console.log(`[admin] POST /admin/login | IP: ${ip}`);

    // Leer body primero para loguear
    const body = await readJsonBody(req);
    console.log(`[admin] Login attempt | user: "${body.user}" | body keys: ${Object.keys(body).join(', ')}`);

    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      console.log(`[admin] Rate limit alcanzado para IP ${ip}`);
      jsonError(res, 429, `Demasiados intentos. Espera ${rateCheck.remaining} segundos.`);
      return true;
    }

    const { user, password } = body as { user?: string; password?: string };

    if (!user || !password) {
      console.log(`[admin] Login fallido: campos vacíos | user=${!!user} pass=${!!password}`);
      jsonError(res, 400, 'Usuario y contraseña son obligatorios');
      return true;
    }

    if (!verifyCredentials(user, password)) {
      console.log(`[admin] Credenciales inválidas para usuario "${user}"`);
      recordFailedAttempt(ip);
      jsonError(res, 401, 'Credenciales inválidas');
      return true;
    }

    console.log(`[admin] Login exitoso para "${user}"`);
    clearFailedAttempts(ip);
    const signedId = createSession(user);
    const maxAgeSec = Math.floor(SESSION_MAX_AGE_MS / 1000);
    res.setHeader('Set-Cookie', buildSetCookieHeader(SESSION_COOKIE_NAME, signedId, maxAgeSec));
    jsonOk(res, { ok: true });
    return true;
  }

  // ── POST /admin/logout ──────────────────────────────────────────────────────
  if (method === 'POST' && url === '/admin/logout') {
    const cookieHeader = req.headers.cookie ?? '';
    const cookies = parseCookies(cookieHeader);
    const signedId = cookies[SESSION_COOKIE_NAME];
    if (signedId) destroySession(signedId);
    res.setHeader('Set-Cookie', buildClearCookieHeader(SESSION_COOKIE_NAME));
    jsonOk(res, { ok: true });
    return true;
  }

  // ── GET /api/admin/questions ────────────────────────────────────────────────
  if (method === 'GET' && url.startsWith('/api/admin/questions')) {
    if (!requireAuth(req, res)) return true;
    try {
      const urlObj = new URL(url, 'http://localhost');
      const limit = Math.min(Number(urlObj.searchParams.get('limit') ?? 200), 500);
      const data = await aiFetch(`/questions?limit=${limit}`);
      jsonOk(res, { ok: true, rows: data.rows });
    } catch (err) {
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // ── PATCH /api/admin/questions/:id ──────────────────────────────────────────
  const rateMatch = url.match(/^\/api\/admin\/questions\/(\d+)$/);
  if (method === 'PATCH' && rateMatch) {
    if (!requireAuth(req, res)) return true;
    try {
      const payload = await readJsonBody(req);
      await aiFetch(`/questions/${rateMatch[1]}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });
      jsonOk(res, { ok: true });
    } catch (err) {
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // ── GET /api/admin/prompt ───────────────────────────────────────────────────
  if (method === 'GET' && url === '/api/admin/prompt') {
    if (!requireAuth(req, res)) return true;
    jsonOk(res, {
      ok: true,
      prompt: `Eres un asistente que responde preguntas sobre el CV de Raúl González.
Usa exclusivamente los chunks del CV proporcionados. Si no hay evidencia suficiente, di \"No tengo información suficiente en el CV para responder\". Responde en español, en formato Markdown.`,
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    });
    return true;
  }

  // ── GET /api/admin/reindex ──────────────────────────────────────────────────
  if (method === 'GET' && url === '/api/admin/reindex') {
    if (!requireAuth(req, res)) return true;
    try {
      const status = await aiFetch('/reindex');
      jsonOk(res, { ok: true, status });
    } catch (err) {
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // ── POST /api/admin/reindex ─────────────────────────────────────────────────
  if (method === 'POST' && url === '/api/admin/reindex') {
    if (!requireAuth(req, res)) return true;
    try {
      const result = await aiFetch('/reindex', { method: 'POST' });
      jsonOk(res, { ok: true, result });
    } catch (err) {
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // No es una ruta admin
  return false;
}
