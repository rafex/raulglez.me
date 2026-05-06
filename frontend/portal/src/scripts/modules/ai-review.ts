type ReviewRow = {
  id: number;
  created_at: string;
  name: string;
  question: string;
  answer: string;
  adjusted_answer: string | null;
  status: string;
  rating: number | null;
  reviewer_note: string | null;
  response_mode?: string | null;
};

function fmtDate(raw: string): string {
  const d = new Date(raw + 'Z');
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('es-MX');
}

function stars(value: number | null): string {
  const v = value ?? 0;
  return [1, 2, 3, 4, 5].map((n) => (n <= v ? '★' : '☆')).join('');
}

async function loadRows(list: HTMLElement): Promise<void> {
  const response = await fetch('/api/ai/questions');
  const body = await response.json() as { ok: boolean; rows?: ReviewRow[] };
  if (!response.ok || !body.ok) throw new Error('No fue posible cargar preguntas');

  const rows = body.rows ?? [];
  list.innerHTML = rows.map((r) => `
    <li class="ai-review-item" data-id="${r.id}">
      <div class="ai-review-item__meta">#${r.id} · ${fmtDate(r.created_at)} · ${r.name} · ${r.response_mode ?? 'n/a'}</div>
      <p><strong>Pregunta:</strong> ${r.question}</p>
      <p><strong>Respuesta:</strong> ${r.adjusted_answer ?? r.answer}</p>
      <div class="ai-review-item__controls">
        <select class="ai-status">
          <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>pending</option>
          <option value="approved" ${r.status === 'approved' ? 'selected' : ''}>approved</option>
          <option value="rejected" ${r.status === 'rejected' ? 'selected' : ''}>rejected</option>
        </select>
        <select class="ai-rating">
          <option value="">Sin rating</option>
          ${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${r.rating === n ? 'selected' : ''}>${n} (${stars(n)})</option>`).join('')}
        </select>
        <button type="button" class="ai-save">Guardar</button>
      </div>
      <textarea class="ai-note" rows="2" placeholder="Nota del revisor">${r.reviewer_note ?? ''}</textarea>
      <textarea class="ai-adjusted" rows="3" placeholder="Respuesta ajustada">${r.adjusted_answer ?? ''}</textarea>
    </li>
  `).join('');
}

async function saveItem(item: HTMLElement): Promise<void> {
  const id = Number(item.dataset.id);
  const status = (item.querySelector('.ai-status') as HTMLSelectElement).value;
  const ratingValue = (item.querySelector('.ai-rating') as HTMLSelectElement).value;
  const reviewerNote = (item.querySelector('.ai-note') as HTMLTextAreaElement).value.trim();
  const adjustedAnswer = (item.querySelector('.ai-adjusted') as HTMLTextAreaElement).value.trim();

  await fetch(`/api/ai/questions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      rating: ratingValue ? Number(ratingValue) : undefined,
      reviewerNote: reviewerNote || undefined,
      adjustedAnswer: adjustedAnswer || undefined,
    }),
  });
}

async function loadIndexStatus(statusEl: HTMLElement): Promise<void> {
  const response = await fetch('/api/ai/reindex');
  const body = await response.json() as { ok: boolean; status?: { status?: { index_state?: { reason?: string; rebuilt?: boolean } } } };
  if (!response.ok || !body.ok) {
    statusEl.textContent = 'Estado de índice no disponible';
    return;
  }

  const reason = body.status?.status?.index_state?.reason ?? 'unknown';
  const rebuilt = body.status?.status?.index_state?.rebuilt ? 'sí' : 'no';
  statusEl.textContent = `Índice FAISS: ${reason} · rebuilt=${rebuilt}`;
}

export function initAiReviewPanel(): void {
  const toggle = document.querySelector('#ai-review-toggle') as HTMLButtonElement | null;
  const panel = document.querySelector('#ai-review-panel') as HTMLElement | null;
  const list = document.querySelector('#ai-review-list') as HTMLElement | null;
  const reloadBtn = document.querySelector('#ai-review-reload') as HTMLButtonElement | null;
  const reindexBtn = document.querySelector('#ai-review-reindex') as HTMLButtonElement | null;
  const statusEl = document.querySelector('#ai-index-status') as HTMLElement | null;

  if (!toggle || !panel || !list || !reloadBtn || !reindexBtn || !statusEl) return;

  const refreshAll = async (): Promise<void> => {
    await Promise.all([loadRows(list), loadIndexStatus(statusEl)]);
  };

  toggle.addEventListener('click', async () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
    if (open) {
      await refreshAll();
    }
  });

  reloadBtn.addEventListener('click', async () => {
    await refreshAll();
  });

  reindexBtn.addEventListener('click', async () => {
    reindexBtn.disabled = true;
    reindexBtn.textContent = 'Reindexando...';
    try {
      await fetch('/api/ai/reindex', { method: 'POST' });
      await refreshAll();
    } finally {
      reindexBtn.disabled = false;
      reindexBtn.textContent = 'Reindexar FAISS';
    }
  });

  list.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('ai-save')) return;
    const item = target.closest('.ai-review-item') as HTMLElement | null;
    if (!item) return;
    target.setAttribute('disabled', 'true');
    target.textContent = 'Guardando...';
    try {
      await saveItem(item);
      target.textContent = 'Guardado';
      window.setTimeout(() => {
        target.textContent = 'Guardar';
        target.removeAttribute('disabled');
      }, 900);
    } catch {
      target.textContent = 'Error';
      target.removeAttribute('disabled');
    }
  });
}
