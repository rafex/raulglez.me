import http from 'node:http';
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
import {
  getActivePrompt,
  listPrompts,
  getPromptById,
  createPrompt,
  updatePrompt,
  setActivePrompt,
  deletePrompt,
} from './db/prompts.js';
import {
  listContacts,
  getContactById,
  countContacts,
  markCvDownloaded,
  addAdminNote,
} from './db/contacts.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://raulglez-backend-ia:3000';

export function getCurrentPrompt(): string {
  return getActivePrompt();
}

async function aiFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, init);
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(body.error ?? `AI service error ${res.status}`);
  return body;
}

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
    res.setHeader('Set-Cookie', buildClearCookieHeader(SESSION_COOKIE_NAME));
    jsonError(res, 401, 'Sesión expirada o inválida');
    return false;
  }
  return true;
}

// ─── Router principal ─────────────────────────────────────────────────────────

export async function handleAdminRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  method: string,
  url: string
): Promise<boolean> {

  console.log(`[admin] ${method} ${url} | IP: ${getClientIp(req)} | Cookie: ${req.headers.cookie ? 'presente' : 'ausente'}`);

  // ── GET /admin y /admin/login: redirigir al SPA ────────────────────────────
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
    try {
      const signedId = createSession(user);
      const maxAgeSec = Math.floor(SESSION_MAX_AGE_MS / 1000);
      res.setHeader('Set-Cookie', buildSetCookieHeader(SESSION_COOKIE_NAME, signedId, maxAgeSec));
      jsonOk(res, { ok: true });
    } catch (err) {
      console.error('[admin] Error al crear sesión:', err);
      jsonError(res, 500, 'Error interno al crear la sesión. Verifica SESSION_SECRET.');
    }
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
      console.error('[admin] GET /api/admin/questions error:', err);
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // ── PATCH /api/admin/questions/:id ──────────────────────────────────────────
  const questionsMatch = url.match(/^\/api\/admin\/questions\/(\d+)$/);
  if (method === 'PATCH' && questionsMatch) {
    if (!requireAuth(req, res)) return true;
    try {
      const payload = await readJsonBody(req);
      await aiFetch(`/questions/${questionsMatch[1]}`, {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Prompts v2 — múltiples prompts en SQLite
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GET /api/admin/prompts — listar todos ───────────────────────────────────
  if (method === 'GET' && url === '/api/admin/prompts') {
    if (!requireAuth(req, res)) return true;
    try {
      const prompts = listPrompts();
      jsonOk(res, { ok: true, prompts, model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile' });
    } catch (err) {
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // ── GET /api/admin/prompt — prompt activo (compatibilidad v1) ───────────────
  if (method === 'GET' && url === '/api/admin/prompt') {
    if (!requireAuth(req, res)) return true;
    try {
      const prompt = getActivePrompt();
      jsonOk(res, { ok: true, prompt, model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile' });
    } catch (err) {
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // ── POST /api/admin/prompts — crear nuevo ───────────────────────────────────
  if (method === 'POST' && url === '/api/admin/prompts') {
    if (!requireAuth(req, res)) return true;
    try {
      const body = await readJsonBody(req);
      const name = body.name?.trim();
      const content = body.content?.trim();
      if (!name) { jsonError(res, 400, 'El nombre del prompt es obligatorio'); return true; }
      if (!content) { jsonError(res, 400, 'El contenido del prompt no puede estar vacío'); return true; }
      const row = createPrompt(name, content);
      jsonOk(res, { ok: true, prompt: row });
    } catch (err: any) {
      if (String(err).includes('UNIQUE')) {
        jsonError(res, 409, 'Ya existe un prompt con ese nombre');
      } else {
        jsonError(res, 500, String(err));
      }
    }
    return true;
  }

  // ── PATCH /api/admin/prompts/:id — actualizar contenido ─────────────────────
  const promptUpdateMatch = url.match(/^\/api\/admin\/prompts\/(\d+)$/);
  if (method === 'PATCH' && promptUpdateMatch) {
    if (!requireAuth(req, res)) return true;
    try {
      const id = Number(promptUpdateMatch[1]);
      const body = await readJsonBody(req);

      // Si viene action=activate, activar este prompt
      if (body.action === 'activate') {
        const ok = setActivePrompt(id);
        if (!ok) { jsonError(res, 404, 'Prompt no encontrado'); return true; }
        jsonOk(res, { ok: true });
        return true;
      }

      // Si viene action=delete, eliminar
      if (body.action === 'delete') {
        const result = deletePrompt(id);
        if (!result.ok) { jsonError(res, 400, result.error ?? 'Error al eliminar'); return true; }
        jsonOk(res, { ok: true });
        return true;
      }

      // Por defecto, actualizar contenido
      const content = body.content?.trim();
      if (!content) { jsonError(res, 400, 'El contenido no puede estar vacío'); return true; }
      const ok = updatePrompt(id, content);
      if (!ok) { jsonError(res, 404, 'Prompt no encontrado'); return true; }
      jsonOk(res, { ok: true });
    } catch (err) {
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // ── PUT /api/admin/prompt — actualizar prompt activo (compatibilidad v1) ────
  if (method === 'PUT' && url === '/api/admin/prompt') {
    if (!requireAuth(req, res)) return true;
    try {
      const body = await readJsonBody(req);
      const newContent = body.prompt?.trim();
      if (!newContent) {
        jsonError(res, 400, 'El prompt no puede estar vacío');
        return true;
      }
      // Actualizar el prompt activo (si hay uno) o crear uno
      const prompts = listPrompts();
      const active = prompts.find(p => p.is_active);
      if (active) {
        updatePrompt(active.id, newContent);
      } else if (prompts.length > 0) {
        updatePrompt(prompts[0].id, newContent);
        setActivePrompt(prompts[0].id);
      } else {
        createPrompt('default', newContent).id && setActivePrompt(createPrompt('default', newContent).id);
      }
      console.log('[admin] Prompt actualizado vía PUT (compatibilidad v1)');
      jsonOk(res, { ok: true });
    } catch (err) {
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Contactos — panel de administración
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GET /api/admin/contacts — listar con filtros ────────────────────────────
  if (method === 'GET' && url.startsWith('/api/admin/contacts') && !url.match(/^\/api\/admin\/contacts\/(\d+)$/)) {
    if (!requireAuth(req, res)) return true;
    try {
      const urlObj = new URL(url, 'http://localhost');
      const purpose = urlObj.searchParams.get('purpose') || undefined;
      const limit = Math.min(Number(urlObj.searchParams.get('limit') ?? 50), 200);
      const offset = Number(urlObj.searchParams.get('offset') ?? 0);
      const contacts = listContacts({ purpose: purpose as any, limit, offset });
      const total = countContacts(purpose as any);
      jsonOk(res, { ok: true, contacts, total, limit, offset });
    } catch (err) {
      console.error('[admin] GET /api/admin/contacts error:', err);
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // ── GET /api/admin/contacts/:id — detalle de contacto ───────────────────────
  const contactDetailMatch = url.match(/^\/api\/admin\/contacts\/(\d+)$/);
  if (method === 'GET' && contactDetailMatch) {
    if (!requireAuth(req, res)) return true;
    try {
      const contact = getContactById(Number(contactDetailMatch[1]));
      if (!contact) { jsonError(res, 404, 'Contacto no encontrado'); return true; }
      jsonOk(res, { ok: true, contact });
    } catch (err) {
      jsonError(res, 500, String(err));
    }
    return true;
  }

  // ── PATCH /api/admin/contacts/:id — agregar notas internas ──────────────────
  if (method === 'PATCH' && contactDetailMatch) {
    if (!requireAuth(req, res)) return true;
    try {
      const body = await readJsonBody(req);
      const id = Number(contactDetailMatch[1]);

      if (body.cv_downloaded === true) {
        markCvDownloaded(id);
      }
      if (body.admin_notes !== undefined) {
        addAdminNote(id, String(body.admin_notes).trim());
      }
      const contact = getContactById(id);
      if (!contact) { jsonError(res, 404, 'Contacto no encontrado'); return true; }
      jsonOk(res, { ok: true, contact });
    } catch (err) {
      jsonError(res, 500, String(err));
    }
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
