import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const here = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.resolve(here, '..');
let child;
let baseUrl;
let testWorkDir;

async function freePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close((err) => err ? reject(err) : resolve()));
  return port;
}

before(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  testWorkDir = mkdtempSync(path.join(os.tmpdir(), 'raulglez-security-test-'));
  child = spawn(process.execPath, [path.join(portalRoot, 'dist/server.js')], {
    cwd: testWorkDir,
    env: {
      ...process.env,
      PORT: String(port),
      MQTT_URL: 'mqtt://127.0.0.1:1',
      ADMIN_USER: 'security-test-admin',
      ADMIN_PASSWORD: 'security-test-password',
      SESSION_SECRET: 'security-test-session-secret-at-least-32-chars',
    },
    stdio: 'ignore',
  });

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Portal exited during startup with ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for the portal backend');
});

after(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
  if (testWorkDir) rmSync(testWorkDir, { recursive: true, force: true });
});

test('public AI interaction and reindex aliases are not available', async () => {
  const cases = [
    ['GET', '/api/ai/questions'],
    ['PATCH', '/api/ai/questions/1', { rating: 5, status: 'approved' }],
    ['GET', '/api/ai/reindex'],
    ['POST', '/api/ai/reindex'],
    ['POST', '/api/ai/ask', { question: '¿Qué experiencia tiene?', contact: {} }],
    ['GET', '/api/ai/unrecognized'],
  ];

  for (const [method, pathname, body] of cases) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    assert.equal(response.status, 404, `${method} ${pathname}`);
  }
});

test('question and reindex administration routes still require a session', async () => {
  for (const [method, pathname] of [
    ['GET', '/api/admin/questions'],
    ['PATCH', '/api/admin/questions/1'],
    ['GET', '/api/admin/reindex'],
    ['POST', '/api/admin/reindex'],
  ]) {
    const response = await fetch(`${baseUrl}${pathname}`, { method });
    assert.equal(response.status, 401, `${method} ${pathname}`);
  }
});

test('public CV projection excludes private contact details', async () => {
  const response = await fetch(`${baseUrl}/api/cv`);
  assert.equal(response.status, 200);
  const cv = await response.json();
  assert.equal(Object.hasOwn(cv.contact ?? {}, 'private'), false);
});

test('PDF download requires the token issued by the public request flow', async () => {
  const unauthorized = await fetch(`${baseUrl}/api/cv.pdf`);
  assert.equal(unauthorized.status, 401);

  const requestResponse = await fetch(`${baseUrl}/api/cv.pdf/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      phone: '+525512345678',
      purpose: 'recruiting',
    }),
  });
  assert.equal(requestResponse.status, 200);
  const requestData = await requestResponse.json();
  assert.equal(typeof requestData.token, 'string');

  const pdfResponse = await fetch(`${baseUrl}/api/cv.pdf?token=${encodeURIComponent(requestData.token)}`);
  assert.equal(pdfResponse.status, 200);
  assert.match(pdfResponse.headers.get('content-type') ?? '', /application\/pdf/);
});

test('public WebSocket chat remains available for ping and pong', async () => {
  const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws/chat`);
  try {
    const connected = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for WebSocket connection')), 3000);
      socket.once('error', reject);
      socket.once('message', (raw) => {
        clearTimeout(timer);
        resolve(JSON.parse(raw.toString()));
      });
    });
    assert.equal(connected.type, 'connected');

    const pong = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for WebSocket pong')), 3000);
      socket.once('message', (raw) => {
        clearTimeout(timer);
        resolve(JSON.parse(raw.toString()));
      });
    });
    socket.send(JSON.stringify({ type: 'ping' }));
    assert.deepEqual(await pong, { type: 'pong' });
  } finally {
    socket.close();
  }
});

test('public contact endpoint rejects oversized data without storing it', async () => {
  const longCompanyResponse = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      phone: '+525512345678',
      company: 'x'.repeat(121),
    }),
  });
  assert.equal(longCompanyResponse.status, 400);

  const oversizedResponse = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: `{"message":"${'x'.repeat(70_000)}"}`,
  });
  assert.equal(oversizedResponse.status, 413);
});
