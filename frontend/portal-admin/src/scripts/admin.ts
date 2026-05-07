// ─── Tipos ────────────────────────────────────────────────────────────────────

type QuestionRow = {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  company: string | null;
  position_offer: string | null;
  question: string;
  answer: string;
  context_json: string;
  status: string;
  rating: number | null;
  reviewer_note: string | null;
  adjusted_answer: string | null;
  response_mode: string | null;
};

// ─── Estado global ────────────────────────────────────────────────────────────

let currentEditId: number | null = null;
let currentRating: number | null = null;
let allRows: QuestionRow[] = [];

// ─── Utilidades ───────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function show(id: string): void {
  const e = el(id);
  if (e) e.hidden = false;
}

function hide(id: string): void {
  const e = el(id);
  if (e) e.hidden = true;
}

function setText(id: string, text: string): void {
  const e = el(id);
  if (e) e.textContent = text;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
  };
  const cls = map[status] ?? 'badge-pending';
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  };
  return `<span class="badge ${cls}">${labels[status] ?? status}</span>`;
}

function modeBadge(mode: string | null): string {
  if (!mode) return '—';
  return mode === 'genai'
    ? '<span class="badge badge-genai">GenAI</span>'
    : '<span class="badge badge-det">Determinista</span>';
}

function starsHtml(rating: number | null): string {
  if (!rating) return '—';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/questions?limit=1');
    console.log('[admin] checkSession status:', res.status);
    return res.status !== 401;
  } catch (e) {
    console.error('[admin] checkSession error:', e);
    return false;
  }
}

async function login(user: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password }),
    });
    const data = await res.json() as any;
    return { ok: data.ok === true, error: data.error };
  } catch {
    return { ok: false, error: 'Error de conexión' };
  }
}

async function logout(): Promise<void> {
  await fetch('/admin/logout', { method: 'POST' });
  showLoginScreen();
}

// ─── Navegación ───────────────────────────────────────────────────────────────

function showLoginScreen(): void {
  console.log('[admin] showLoginScreen()');
  hide('admin-panel');
  show('login-screen');
  el<HTMLInputElement>('login-user').value = '';
  el<HTMLInputElement>('login-password').value = '';
  hide('login-error');
}

function showAdminPanel(): void {
  console.log('[admin] showAdminPanel()');
  hide('login-screen');
  show('admin-panel');
  const panelEl = document.getElementById('admin-panel');
  console.log('[admin] admin-panel hidden:', panelEl?.hidden, 'display:', panelEl ? getComputedStyle(panelEl).display : 'N/A');
  loadInteractions();
}

function activateSection(name: string): void {
  const sections = ['interactions', 'prompt', 'faiss'];
  for (const s of sections) {
    const section = document.getElementById(`section-${s}`);
    if (section) section.hidden = s !== name;
    const nav = document.querySelector(`.nav-item[data-section="${s}"]`);
    if (nav) nav.classList.toggle('active', s === name);
  }
  if (name === 'prompt') loadPrompt();
  if (name === 'faiss') loadFaissStatus();
}

// ─── Interacciones ────────────────────────────────────────────────────────────

async function loadInteractions(): Promise<void> {
  show('interactions-loading');
  hide('interactions-table-wrap');
  hide('interactions-empty');

  try {
    const res = await fetch('/api/admin/questions?limit=500');
    if (res.status === 401) { showLoginScreen(); return; }
    const data = await res.json() as any;
    allRows = data.rows ?? [];
    renderTable();
  } catch {
    setText('interactions-loading', 'Error al cargar interacciones.');
  }
}

function renderTable(): void {
  hide('interactions-loading');
  const filter = (el<HTMLSelectElement>('filter-status')).value;
  const filtered = filter ? allRows.filter(r => r.status === filter) : allRows;

  if (filtered.length === 0) {
    show('interactions-empty');
    hide('interactions-table-wrap');
    return;
  }

  hide('interactions-empty');
  show('interactions-table-wrap');

  const tbody = el<HTMLTableSectionElement>('interactions-body');
  tbody.innerHTML = filtered.map(row => `
    <tr data-id="${row.id}">
      <td>${row.id}</td>
      <td class="nowrap">${formatDate(row.created_at)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.company ?? '—')}</td>
      <td class="question-cell" title="${escapeHtml(row.question)}">${escapeHtml(truncate(row.question, 60))}</td>
      <td>${statusBadge(row.status)}</td>
      <td class="stars">${starsHtml(row.rating)}</td>
      <td>${modeBadge(row.response_mode)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="window.__openDetail(${row.id})">Ver / Editar</button>
      </td>
    </tr>
  `).join('');
}

function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Modal de detalle ─────────────────────────────────────────────────────────

function openDetail(id: number): void {
  const row = allRows.find(r => r.id === id);
  if (!row) return;
  currentEditId = id;
  currentRating = row.rating ?? null;

  setText('modal-id', `#${id}`);
  setText('d-name', row.name);
  setText('d-phone', row.phone);
  setText('d-whatsapp', row.whatsapp ?? '—');
  setText('d-email', row.email ?? '—');
  setText('d-company', row.company ?? '—');
  setText('d-position', row.position_offer ?? '—');
  setText('d-date', formatDate(row.created_at));
  setText('d-mode', row.response_mode ?? '—');

  el('d-question').textContent = row.question;
  el('d-answer').textContent = row.answer;

  (el<HTMLSelectElement>('edit-status')).value = row.status;
  (el<HTMLTextAreaElement>('edit-note')).value = row.reviewer_note ?? '';
  (el<HTMLTextAreaElement>('edit-adjusted')).value = row.adjusted_answer ?? '';
  (el<HTMLInputElement>('edit-rating')).value = row.rating?.toString() ?? '';

  updateStars(row.rating ?? 0);
  hide('modal-error');
  show('detail-modal');
}

function updateStars(val: number): void {
  currentRating = val || null;
  el<HTMLInputElement>('edit-rating').value = val > 0 ? val.toString() : '';
  document.querySelectorAll('#star-row .star').forEach((btn) => {
    const starVal = Number((btn as HTMLElement).dataset['val']);
    btn.classList.toggle('active', starVal <= val);
  });
}

function closeModal(): void {
  hide('detail-modal');
  currentEditId = null;
  currentRating = null;
}

async function saveDetail(): Promise<void> {
  if (currentEditId === null) return;
  const payload: Record<string, unknown> = {
    status: (el<HTMLSelectElement>('edit-status')).value,
    reviewerNote: (el<HTMLTextAreaElement>('edit-note')).value.trim() || null,
    adjustedAnswer: (el<HTMLTextAreaElement>('edit-adjusted')).value.trim() || null,
  };
  if (currentRating !== null) payload['rating'] = currentRating;

  try {
    const res = await fetch(`/api/admin/questions/${currentEditId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) { showLoginScreen(); return; }
    const data = await res.json() as any;
    if (!data.ok) throw new Error(data.error);
    closeModal();
    await loadInteractions();
  } catch (err) {
    const errEl = el('modal-error');
    errEl.textContent = String(err);
    errEl.hidden = false;
  }
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

async function loadPrompt(): Promise<void> {
  show('prompt-loading');
  hide('prompt-content');

  try {
    const res = await fetch('/api/admin/prompt');
    if (res.status === 401) { showLoginScreen(); return; }
    const data = await res.json() as any;
    hide('prompt-loading');

    setText('prompt-model', data.model ?? '—');
    const list = el<HTMLOListElement>('prompt-list');
    const lines: string[] = data.prompt ?? [];
    list.innerHTML = lines.map(l => `<li>${escapeHtml(l)}</li>`).join('');

    show('prompt-content');
  } catch {
    setText('prompt-loading', 'Error al cargar el prompt.');
  }
}

// ─── FAISS ────────────────────────────────────────────────────────────────────

async function loadFaissStatus(): Promise<void> {
  show('faiss-loading');
  hide('faiss-content');

  try {
    const res = await fetch('/api/admin/reindex');
    if (res.status === 401) { showLoginScreen(); return; }
    const data = await res.json() as any;
    hide('faiss-loading');
    el('faiss-status').textContent = JSON.stringify(data.status ?? data, null, 2);
    show('faiss-content');
  } catch {
    setText('faiss-loading', 'Error al cargar estado FAISS.');
  }
}

async function triggerReindex(): Promise<void> {
  const btn = el<HTMLButtonElement>('reindex-btn');
  const msg = el('reindex-msg');
  btn.disabled = true;
  btn.textContent = '⏳ Reindexando…';
  msg.hidden = true;

  try {
    const res = await fetch('/api/admin/reindex', { method: 'POST' });
    if (res.status === 401) { showLoginScreen(); return; }
    const data = await res.json() as any;
    msg.textContent = data.ok ? '✅ Índice reconstruido correctamente.' : `❌ Error: ${data.error}`;
    msg.className = `reindex-msg ${data.ok ? 'success' : 'error'}`;
    msg.hidden = false;
    if (data.ok) await loadFaissStatus();
  } catch (err) {
    msg.textContent = `❌ Error de conexión: ${err}`;
    msg.className = 'reindex-msg error';
    msg.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Reindexar';
  }
}

// ─── Inicialización ───────────────────────────────────────────────────────────

// Exponer openDetail globalmente para uso desde el HTML generado
(window as any).__openDetail = openDetail;

async function init(): Promise<void> {
  // Determinar si hay sesión activa
  const authed = await checkSession();
  if (authed) {
    showAdminPanel();
  } else {
    showLoginScreen();
  }

  // Formulario de login
  el('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = (el<HTMLInputElement>('login-user')).value.trim();
    const password = (el<HTMLInputElement>('login-password')).value;
    const btn = el<HTMLButtonElement>('login-btn');
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    hide('login-error');

    const result = await login(user, password);
    console.log('[admin] login result:', result);

    if (result.ok) {
      showAdminPanel();
    } else {
      const errEl = el('login-error');
      errEl.textContent = result.error ?? 'Credenciales inválidas';
      errEl.hidden = false;
    }
    btn.disabled = false;
    btn.textContent = 'Entrar';
  });

  // Logout
  el('logout-btn').addEventListener('click', logout);

  // Navegación sidebar
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      activateSection((btn as HTMLElement).dataset['section'] ?? 'interactions');
    });
  });

  // Filtro de estado
  el('filter-status').addEventListener('change', renderTable);

  // Botón actualizar
  el('refresh-btn').addEventListener('click', loadInteractions);

  // Modal
  el('modal-close-btn').addEventListener('click', closeModal);
  el('modal-cancel-btn').addEventListener('click', closeModal);
  el('modal-save-btn').addEventListener('click', saveDetail);
  el('detail-modal').addEventListener('click', (e) => {
    if (e.target === el('detail-modal')) closeModal();
  });

  // Estrellas
  document.querySelectorAll('#star-row .star').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number((btn as HTMLElement).dataset['val']);
      updateStars(currentRating === val ? 0 : val);
    });
  });

  // FAISS
  el('reindex-btn').addEventListener('click', triggerReindex);
}

init();
