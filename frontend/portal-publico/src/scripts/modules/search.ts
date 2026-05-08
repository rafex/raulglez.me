/**
 * search.ts — Buscador del CV con overlay galaxy.
 *
 * Flujo al escribir:
 *   1. GET /api/search?q=… → resultados del CV → muestra con jump links
 *   2. POST /api/ai/ask    → consulta IA con contacto anónimo → muestra respuesta
 *   Ambas peticiones se lanzan en paralelo (fire & forget independientes).
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

async function fetchAiAnswer(question: string): Promise<string> {
  try {
    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        contact: { name: 'buscador', phone: '+000000000000' },
      }),
    });
    const data = (await res.json()) as { ok: boolean; answer?: string };
    return data.ok && data.answer ? data.answer : '';
  } catch {
    return '';
  }
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
  let lastAiQuery = '';

  const doSearch = (q: string): void => {
    if (!q.trim()) {
      cvResults.innerHTML = '';
      aiResults.innerHTML = '';
      return;
    }

    // Loading states
    cvResults.innerHTML = '<p class="srch-loading">Buscando en el CV…</p>';
    aiResults.innerHTML = `
      <div class="srch-ai-header">
        <span class="srch-ai-icon" aria-hidden="true">🤖</span>
        <span>La IA está analizando tu búsqueda…</span>
      </div>`;

    // 1. Búsqueda local en CV (rápida)
    fetchCvSearch(q).then((results) => {
      cvResults.innerHTML = renderCvResults(results, q);
    });

    // 2. Consulta a la IA (más lenta, contacto anónimo para trazabilidad)
    if (q !== lastAiQuery) {
      lastAiQuery = q;
      fetchAiAnswer(q).then((answer) => {
        if (answer) {
          aiResults.innerHTML = `
            <div class="srch-ai-header">
              <span class="srch-ai-icon" aria-hidden="true">🤖</span>
              <span>Análisis de la IA</span>
            </div>
            <p class="srch-ai-answer">${esc(answer)}</p>`;
        } else {
          aiResults.innerHTML = '';
        }
      });
    }
  };

  input.addEventListener('input', () => {
    const q = input.value;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!q.trim()) {
      cvResults.innerHTML = '';
      aiResults.innerHTML = '';
      return;
    }
    debounceTimer = setTimeout(() => doSearch(q), 400);
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceTimer) clearTimeout(debounceTimer);
      doSearch(input.value);
    }
  });
}
