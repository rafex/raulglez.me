import crypto from 'node:crypto';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Session = {
  user: string;
  createdAt: number;
  lastActivity: number;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

export const SESSION_COOKIE_NAME = 'admin_sid';
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 horas
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos

// ─── Estado en memoria ────────────────────────────────────────────────────────

const sessions = new Map<string, Session>();

type FailedAttempt = { count: number; resetAt: number };
const failedAttempts = new Map<string, FailedAttempt>();

// Limpieza periódica de sesiones expiradas
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_MAX_AGE_MS) {
      sessions.delete(id);
    }
  }
  for (const [ip, attempt] of failedAttempts) {
    if (now > attempt.resetAt) {
      failedAttempts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

// ─── HMAC de cookie ───────────────────────────────────────────────────────────

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET no está configurada');
  return secret;
}

function signSessionId(sessionId: string): string {
  const hmac = crypto.createHmac('sha256', getSessionSecret());
  hmac.update(sessionId);
  return `${sessionId}.${hmac.digest('hex')}`;
}

function verifySignedSessionId(signed: string): string | null {
  const dotIndex = signed.lastIndexOf('.');
  if (dotIndex === -1) return null;
  const sessionId = signed.slice(0, dotIndex);
  const providedSig = signed.slice(dotIndex + 1);
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(sessionId)
    .digest('hex');
  try {
    const a = Buffer.from(providedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return sessionId;
  } catch {
    return null;
  }
}

// ─── Gestión de sesiones ──────────────────────────────────────────────────────

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createSession(user: string): string {
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    user,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  });
  return signSessionId(sessionId);
}

export function getSession(signedId: string): Session | null {
  const sessionId = verifySignedSessionId(signedId);
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  const now = Date.now();
  if (now - session.lastActivity > SESSION_MAX_AGE_MS) {
    sessions.delete(sessionId);
    return null;
  }
  session.lastActivity = now;
  return session;
}

export function destroySession(signedId: string): void {
  const sessionId = verifySignedSessionId(signedId);
  if (sessionId) sessions.delete(sessionId);
}

// ─── Hash de contraseña ───────────────────────────────────────────────────────

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// ─── Verificación de credenciales ─────────────────────────────────────────────

export function verifyCredentials(user: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USER ?? '';
  const adminPassword = process.env.ADMIN_PASSWORD ?? '';

  // Comparación timing-safe del usuario (padding al mismo tamaño)
  const userBuf = Buffer.alloc(256);
  const adminUserBuf = Buffer.alloc(256);
  Buffer.from(user).copy(userBuf);
  Buffer.from(adminUser).copy(adminUserBuf);
  const userMatch = crypto.timingSafeEqual(userBuf, adminUserBuf);

  // Soporte para contraseña en formato SALT:HASH o texto plano
  let passwordMatch = false;
  if (adminPassword.includes(':')) {
    // Formato PBKDF2: "SALT:HASH"
    const [salt, expectedHash] = adminPassword.split(':', 2);
    const actualHash = hashPassword(password, salt);
    const a = Buffer.from(actualHash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    try {
      passwordMatch = a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      passwordMatch = false;
    }
  } else {
    // Texto plano (comparación timing-safe)
    const passBuf = Buffer.alloc(256);
    const adminPassBuf = Buffer.alloc(256);
    Buffer.from(password).copy(passBuf);
    Buffer.from(adminPassword).copy(adminPassBuf);
    passwordMatch = crypto.timingSafeEqual(passBuf, adminPassBuf);
  }

  return userMatch && passwordMatch;
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_FAILED_ATTEMPTS) {
      return { allowed: false, remaining: Math.ceil((entry.resetAt - now) / 1000) };
    }
  }
  return { allowed: true, remaining: 0 };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(ip) ?? { count: 0, resetAt: now + LOCKOUT_DURATION_MS };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.resetAt = now + LOCKOUT_DURATION_MS;
  }
  failedAttempts.set(ip, entry);
}

export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// ─── Cookies ──────────────────────────────────────────────────────────────────

export function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    result[key] = decodeURIComponent(val);
  }
  return result;
}

export function buildSetCookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

export function buildClearCookieHeader(name: string): string {
  return `${name}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}
