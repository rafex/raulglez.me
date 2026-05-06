/**
 * chat.ts — Chat IA mediante WebSocket (/ws/chat).
 *
 * Flujo:
 *   Browser ──WebSocket──▶ /ws/chat (backend-portal)
 *   Browser ◀─WebSocket── respuesta IA (backend-portal ← MQTT ← backend-ia)
 *
 * Mensajes salientes (JSON):
 *   { type: 'ask', payload: { question, contact } }
 *   { type: 'ping' }
 *
 * Mensajes entrantes (JSON):
 *   { type: 'connected', clientId }
 *   { type: 'answer',   id, answer, mode }
 *   { type: 'error',    message }
 *   { type: 'pong' }
 */

type ChatContact = {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  positionOffer?: string;
};

type WsMessageOut =
  | { type: 'answer'; id: number; answer: string; mode: string }
  | { type: 'error'; message: string }
  | { type: 'pong' }
  | { type: 'connected'; clientId: string };

function nowLabel(): string {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function addMessage(
  list: HTMLElement,
  text: string,
  side: 'user' | 'bot',
  tone: 'normal' | 'warning' = 'normal',
): void {
  const item = document.createElement('li');
  item.className = `cv-chat__msg cv-chat__msg--${side}`;

  const time = document.createElement('div');
  time.className = 'cv-chat__time';
  time.textContent = nowLabel();

  const bubble = document.createElement('div');
  bubble.className = `cv-chat__bubble${tone === 'warning' ? ' cv-chat__bubble--warning' : ''}`;
  bubble.textContent = text;

  item.appendChild(time);
  item.appendChild(bubble);
  list.appendChild(item);
  list.scrollTop = list.scrollHeight;
}

function getContact(form: HTMLFormElement): ChatContact | null {
  const fd = new FormData(form);
  const name = String(fd.get('name') ?? '').trim();
  const phone = String(fd.get('phone') ?? '').trim();
  if (!name || !phone) return null;

  const email = String(fd.get('email') ?? '').trim();
  const company = String(fd.get('company') ?? '').trim();
  const positionOffer = String(fd.get('positionOffer') ?? '').trim();

  return {
    name,
    phone,
    email: email || undefined,
    company: company || undefined,
    positionOffer: positionOffer || undefined,
  };
}

// ─── WebSocket singleton ──────────────────────────────────────────────────────

let ws: WebSocket | null = null;
let wsReady = false;
let pendingMessages: string[] = [];

function getWsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws/chat`;
}

function connectWs(
  messages: HTMLElement,
  onConnected: () => void,
): WebSocket {
  const socket = new WebSocket(getWsUrl());

  socket.addEventListener('open', () => {
    wsReady = true;
    for (const msg of pendingMessages) socket.send(msg);
    pendingMessages = [];
    onConnected();
  });

  socket.addEventListener('close', () => {
    wsReady = false;
    ws = null;
  });

  socket.addEventListener('error', () => {
    addMessage(messages, 'Error de conexión con el servidor. Intenta de nuevo.', 'bot', 'warning');
  });

  socket.addEventListener('message', (event) => {
    let msg: WsMessageOut;
    try {
      msg = JSON.parse(event.data as string);
    } catch {
      return;
    }

    if (msg.type === 'pong' || msg.type === 'connected') return;

    if (msg.type === 'error') {
      removeLoading(messages);
      addMessage(messages, msg.message, 'bot', 'warning');
      return;
    }

    if (msg.type === 'answer') {
      removeLoading(messages);
      if (msg.mode === 'deterministic') {
        addMessage(
          messages,
          'Modo determinista activo: respuesta basada en FAISS y respuestas validadas (sin GenAI).',
          'bot',
          'warning',
        );
      }
      addMessage(messages, msg.answer, 'bot');
    }
  });

  return socket;
}

// ─── Loading ─────────────────────────────────────────────────────────────────

let loadingLi: HTMLLIElement | null = null;

function showLoading(messages: HTMLElement): void {
  loadingLi = document.createElement('li');
  loadingLi.className = 'cv-chat__msg cv-chat__msg--bot';
  loadingLi.innerHTML =
    `<div class="cv-chat__time">${nowLabel()}</div>` +
    `<div class="cv-chat__bubble cv-chat__bubble--loading">Analizando tu consulta…</div>` +
    `<div class="cv-chat__loading-legend">La IA está procesando la respuesta…</div>`;
  messages.appendChild(loadingLi);
  messages.scrollTop = messages.scrollHeight;
}

function removeLoading(messages: HTMLElement): void {
  if (loadingLi && messages.contains(loadingLi)) {
    messages.removeChild(loadingLi);
  }
  loadingLi = null;
}

// ─── Ping periódico para mantener viva la conexión ────────────────────────────

function startPing(socket: WebSocket): void {
  const interval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ping' }));
    } else {
      clearInterval(interval);
    }
  }, 30_000);
}

// ─── Inicialización del chat ──────────────────────────────────────────────────

export function initChat(): void {
  const toggle = document.querySelector('#chat-toggle') as HTMLButtonElement | null;
  const closeBtn = document.querySelector('#chat-close') as HTMLButtonElement | null;
  const windowEl = document.querySelector('#cv-chat-window') as HTMLElement | null;
  const leadForm = document.querySelector('#chat-lead-form') as HTMLFormElement | null;
  const chatForm = document.querySelector('#chat-form') as HTMLFormElement | null;
  const questionInput = document.querySelector('#chat-question') as HTMLInputElement | null;
  const messages = document.querySelector('#chat-messages') as HTMLElement | null;

  if (!toggle || !closeBtn || !windowEl || !leadForm || !chatForm || !questionInput || !messages) return;

  const setOpen = (open: boolean): void => {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    windowEl.hidden = !open;

    // Conectar WebSocket la primera vez que el usuario abre el chat
    if (open && !ws) {
      ws = connectWs(messages, () => {
        startPing(ws!);
      });
    }
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
  });

  closeBtn.addEventListener('click', () => setOpen(false));

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = questionInput.value.trim();
    if (question.length < 8) return;

    const contact = getContact(leadForm);
    if (!contact) {
      addMessage(messages, 'Completa nombre y teléfono para continuar.', 'bot', 'warning');
      return;
    }

    addMessage(messages, question, 'user');
    questionInput.value = '';
    showLoading(messages);

    const payload = JSON.stringify({
      type: 'ask',
      payload: { question, contact },
    });

    if (ws && wsReady) {
      ws.send(payload);
    } else {
      // Reconectar si la conexión se perdió
      pendingMessages.push(payload);
      if (!ws) {
        ws = connectWs(messages, () => {
          startPing(ws!);
        });
      }
    }
  });
}
