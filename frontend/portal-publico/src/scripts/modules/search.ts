/**
 * search.ts — Buscador del CV con overlay galaxy.
 *
 * Flujo al escribir:
 *   1. GET /api/search?q=… → resultados públicos del CV
 *   2. La persona completa nombre y teléfono y consulta por WebSocket /ws/chat.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SearchResult = {
  section:   string;
  sectionId: string;
  title:     string;
  snippet:   string;
  score:     number;
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Llamadas a la API ────────────────────────────────────────────────────────

async function fetchCvSearch(q: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { ok: boolean; results: SearchResult[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

type ChatContact = { name: string; phone: string };

function fetchAiAnswer(question: string, contact: ChatContact): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${location.host}/ws/chat`);
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const finish = (error?: Error, answer?: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { socket.close(); } catch { /* ya está cerrándose */ }
      if (error) reject(error);
      else resolve(answer ?? '');
    };
    timeout = setTimeout(() => finish(new Error('Tiempo de espera agotado. Intenta de nuevo.')), 65_000);

    socket.addEventListener('open', () => {
      if (settled) {
        socket.close();
        return;
      }
      socket.send(JSON.stringify({ type: 'ask', payload: { question, contact } }));
    }, { once: true });

    socket.addEventListener('message', (event) => {
      let message: { type?: string; answer?: string; message?: string };
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message.type === 'answer') finish(undefined, message.answer ?? '');
      if (message.type === 'error') finish(new Error(message.message ?? 'No fue posible consultar a la IA.'));
    });

    socket.addEventListener('error', () => finish(new Error('Error de conexión con el servidor. Intenta de nuevo.')));
    socket.addEventListener('close', () => {
      if (!settled) finish(new Error('La conexión se cerró antes de recibir la respuesta.'));
    });
  });
}

function renderAiForm(question: string): string {
  const canAsk = question.length >= 8;
  return `
    <div class="srch-ai-header">
      <span class="srch-ai-icon" aria-hidden="true">🤖</span>
      <span>Consulta a la IA</span>
    </div>
    <p class="srch-ai-consent">Para responder y guardar la interacción, comparte tu nombre y teléfono.</p>
    <form class="srch-ai-form" data-question="${esc(question)}">
      <label>Nombre
        <input name="name" autocomplete="name" maxlength="120" required>
      </label>
      <label>Teléfono
        <input name="phone" type="tel" autocomplete="tel" maxlength="20" pattern="\\+?[0-9\\s().-]{7,20}" required>
      </label>
      <button type="submit" ${canAsk ? '' : 'disabled'}>Preguntar a la IA</button>
      <p class="srch-ai-status" role="status">${canAsk ? '' : 'Escribe al menos 8 caracteres para consultar a la IA.'}</p>
    </form>`;
}

// ─── Render ───────────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, string> = {
  about:       '👤',
  experience:  '💼',
  skills:      '⚙️',
  education:   '🎓',
  conferences: '🎤',
  articles:    '📝',
  projects:    '🚀',
};

function renderCvResults(results: SearchResult[], query: string): string {
  if (!query.trim()) return '';
  if (results.length === 0) {
    return '<p class="srch-empty">Sin coincidencias en el CV para esta búsqueda.</p>';
  }

  const items = results.map((r) => {
    const icon = SECTION_ICONS[r.sectionId] ?? '🔍';
    return `
      <a class="srch-result-item" href="#${esc(r.sectionId)}" data-section="${esc(r.sectionId)}">
        <span class="srch-result-icon" aria-hidden="true">${icon}</span>
        <span class="srch-result-body">
          <span class="srch-result-badge">${esc(r.section)}</span>
          <span class="srch-result-title">${esc(r.title)}</span>
          ${r.snippet ? `<span class="srch-result-snippet">${esc(r.snippet)}</span>` : ''}
        </span>
      </a>`;
  }).join('');

  return `<div class="srch-results-list">${items}</div>`;
}

// ─── initSearch ───────────────────────────────────────────────────────────────

export function initSearch(): void {
  const toggleBtn  = document.querySelector('#search-toggle')   as HTMLButtonElement | null;
  const overlay    = document.querySelector('#search-overlay')  as HTMLElement | null;
  const backdrop   = overlay?.querySelector('.search-overlay__backdrop') as HTMLElement | null;
  const closeBtn   = document.querySelector('#search-close')    as HTMLButtonElement | null;
  const input      = document.querySelector('#srch-input')      as HTMLInputElement | null;
  const cvResults  = document.querySelector('#srch-cv-results') as HTMLElement | null;
  const aiResults  = document.querySelector('#srch-ai-results') as HTMLElement | null;

  if (!toggleBtn || !overlay || !closeBtn || !input || !cvResults || !aiResults) return;
  input.maxLength = 512;

  // ── Abrir / cerrar ──────────────────────────────────────────────────────────

  const openOverlay = (): void => {
    overlay.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => overlay.classList.add('search-overlay--visible'))
    );
    input.focus();
  };

  const closeOverlay = (): void => {
    overlay.classList.remove('search-overlay--visible');
    toggleBtn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { overlay.hidden = true; }, 260);
  };

  toggleBtn.addEventListener('click', () => (overlay.hidden ? openOverlay() : closeOverlay()));
  closeBtn.addEventListener('click', closeOverlay);
  backdrop?.addEventListener('click', closeOverlay);

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !overlay.hidden) closeOverlay();
  });

  // ── Clic en resultado: cerrar overlay + navegar a sección ──────────────────

  cvResults.addEventListener('click', (e: MouseEvent) => {
    const item = (e.target as Element).closest('.srch-result-item') as HTMLAnchorElement | null;
    if (!item) return;
    e.preventDefault();
    const sectionId = item.dataset.section ?? '';
    closeOverlay();
    if (sectionId) {
      history.pushState(null, '', `#${sectionId}`);
      setTimeout(() => {
        const target = document.querySelector(`#${sectionId}`) as HTMLElement | null;
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 280);
    }
  });

  // ── Lógica de búsqueda ──────────────────────────────────────────────────────

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSearchQuery = '';
  let lastSearchResults: SearchResult[] = [];
  let lastSearchAt = 0;
  let requestVersion = 0;
  let activeQuery = '';

  const doSearch = (q: string): void => {
    const query = q.trim();
    if (!query) {
      cvResults.innerHTML = '';
      aiResults.innerHTML = '';
      activeQuery = '';
      requestVersion++;
      return;
    }

    if (query.length > 512) {
      cvResults.innerHTML = '';
      aiResults.innerHTML = '<p class="srch-empty">La búsqueda no puede superar 512 caracteres.</p>';
      return;
    }

    const version = ++requestVersion;
    activeQuery = query;

    cvResults.innerHTML = '<p class="srch-loading">Buscando en el CV…</p>';
    aiResults.innerHTML = renderAiForm(query);

    if (query.length < 2) return;
    if (query === lastSearchQuery) {
      cvResults.innerHTML = renderCvResults(lastSearchResults, query);
      return;
    }
    lastSearchQuery = query;
    fetchCvSearch(query).then((results) => {
      if (version === requestVersion) {
        lastSearchResults = results;
        cvResults.innerHTML = renderCvResults(results, query);
      }
    });
  };

  const scheduleSearch = (q: string): void => {
    const query = q.trim();
    if (query === activeQuery && !debounceTimer) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (query !== activeQuery) {
      activeQuery = query;
      requestVersion++;
    }
    if (!query) {
      doSearch('');
      return;
    }
    if (query.length > 512) {
      doSearch(query);
      return;
    }
    cvResults.innerHTML = '<p class="srch-loading">Buscando en el CV…</p>';
    aiResults.innerHTML = '';
    const delay = Math.max(600, 3_200 - (Date.now() - lastSearchAt));
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      lastSearchAt = Date.now();
      doSearch(query);
    }, delay);
  };

  aiResults.addEventListener('submit', (event: SubmitEvent) => {
    const form = (event.target as Element).closest('.srch-ai-form') as HTMLFormElement | null;
    if (!form) return;
    event.preventDefault();

    const question = form.dataset.question ?? '';
    if (question !== activeQuery || question.length < 8) return;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const status = form.querySelector('.srch-ai-status') as HTMLElement | null;
    const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (!name || !phone || !status || !submit) return;

    submit.disabled = true;
    status.textContent = 'La IA está analizando tu búsqueda…';
    const version = requestVersion;
    fetchAiAnswer(question, { name, phone }).then((answer) => {
      if (version !== requestVersion || question !== activeQuery) return;
      aiResults.innerHTML = `
        <div class="srch-ai-header"><span class="srch-ai-icon" aria-hidden="true">🤖</span><span>Análisis de la IA</span></div>
        <p class="srch-ai-answer">${esc(answer)}</p>`;
    }).catch((error: unknown) => {
      if (version !== requestVersion || question !== activeQuery) return;
      status.textContent = error instanceof Error ? error.message : 'No fue posible consultar a la IA.';
      submit.disabled = false;
    });
  });

  input.addEventListener('input', () => {
    const q = input.value;
    scheduleSearch(q);
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      scheduleSearch(input.value);
    }
  });
}
