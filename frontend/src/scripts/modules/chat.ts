type ChatContact = {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  positionOffer?: string;
};

type AskResponse = {
  ok: boolean;
  answer?: string;
  mode?: 'genai' | 'deterministic';
  error?: string;
};

function nowLabel(): string {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function addMessage(list: HTMLElement, text: string, side: 'user' | 'bot', tone: 'normal' | 'warning' = 'normal'): void {
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
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
  });

  closeBtn.addEventListener('click', () => setOpen(false));

  chatForm.addEventListener('submit', async (event) => {
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

    const loading = document.createElement('li');
    loading.className = 'cv-chat__msg cv-chat__msg--bot';
    loading.innerHTML = '<div class="cv-chat__time">'+nowLabel()+'</div><div class="cv-chat__bubble">Consultando...</div>';
    messages.appendChild(loading);
    messages.scrollTop = messages.scrollHeight;

    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, contact }),
      });
      const body = (await response.json()) as AskResponse;

      loading.remove();

      if (!response.ok || !body.ok || !body.answer) {
        addMessage(messages, body.error ?? 'No fue posible responder en este momento.', 'bot', 'warning');
        return;
      }

      if (body.mode === 'deterministic') {
        addMessage(messages, 'Modo determinista activo: respuesta basada en FAISS y respuestas validadas (sin GenAI).', 'bot', 'warning');
      }

      addMessage(messages, body.answer, 'bot');
    } catch {
      loading.remove();
      addMessage(messages, 'Error de conexión. Intenta nuevamente.', 'bot', 'warning');
    }
  });
}
