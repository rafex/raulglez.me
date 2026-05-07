/**
 * contact-list.ts — Panel de administración de contactos.
 *
 * Obtiene contactos vía GET /api/admin/contacts (requiere sesión admin).
 * Permite filtrar por propósito y agregar notas internas.
 */

type Contact = {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  purpose: string | null;
  message: string | null;
  cv_downloaded: boolean;
  admin_notes: string | null;
  created_at: string;
};

type ContactListResponse = {
  ok: boolean;
  contacts: Contact[];
  total: number;
  limit: number;
  offset: number;
  error?: string;
};

const PURPOSE_LABELS: Record<string, string> = {
  recruiting: '🎯 Reclutamiento',
  speaking: '🎤 Ponencia',
  workshop: '🏫 Taller',
  help: '💡 Ayuda técnica',
  quote: '💰 Cotización',
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'Z');
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export async function initContactList(container: HTMLElement): Promise<void> {
  const currentPurpose = new URLSearchParams(window.location.search).get('purpose') || '';

  container.innerHTML = `
    <div class="contact-list">
      <div class="contact-list__header">
        <h2>📋 Contactos recibidos</h2>
        <div class="contact-list__filters">
          <select id="contact-purpose-filter" class="contact-list__filter">
            <option value="">Todos los propósitos</option>
            <option value="recruiting" ${currentPurpose === 'recruiting' ? 'selected' : ''}>🎯 Reclutamiento</option>
            <option value="speaking" ${currentPurpose === 'speaking' ? 'selected' : ''}>🎤 Ponencia</option>
            <option value="workshop" ${currentPurpose === 'workshop' ? 'selected' : ''}>🏫 Taller</option>
            <option value="help" ${currentPurpose === 'help' ? 'selected' : ''}>💡 Ayuda técnica</option>
            <option value="quote" ${currentPurpose === 'quote' ? 'selected' : ''}>💰 Cotización</option>
          </select>
          <button id="contact-export-csv" class="contact-list__export">Exportar CSV</button>
        </div>
      </div>
      <div id="contact-list-body" class="contact-list__body">Cargando...</div>
      <div id="contact-list-footer" class="contact-list__footer"></div>
    </div>
  `;

  const filterSelect = document.getElementById('contact-purpose-filter') as HTMLSelectElement;
  filterSelect?.addEventListener('change', () => {
    const p = filterSelect.value;
    const url = new URL(window.location.href);
    if (p) url.searchParams.set('purpose', p);
    else url.searchParams.delete('purpose');
    window.history.replaceState({}, '', url.toString());
    loadContacts(p);
  });

  document.getElementById('contact-export-csv')?.addEventListener('click', () => exportCsv(currentPurpose));

  await loadContacts(currentPurpose);
}

async function loadContacts(purpose: string): Promise<void> {
  const body = document.getElementById('contact-list-body');
  const footer = document.getElementById('contact-list-footer');
  if (!body || !footer) return;

  body.innerHTML = '<p class="contact-list__loading">Cargando contactos...</p>';

  try {
    const params = new URLSearchParams({ limit: '100' });
    if (purpose) params.set('purpose', purpose);

    const res = await fetch(`/api/admin/contacts?${params.toString()}`);
    const data: ContactListResponse = await res.json();

    if (!res.ok || !data.ok) {
      body.innerHTML = `<p class="contact-list__error">Error: ${data.error || 'No autorizado'}</p>`;
      return;
    }

    if (data.contacts.length === 0) {
      body.innerHTML = '<p class="contact-list__empty">No hay contactos aún.</p>';
      footer.innerHTML = '';
      return;
    }

    body.innerHTML = `
      <table class="contact-list__table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Propósito</th>
            <th>CV</th>
            <th>Notas</th>
          </tr>
        </thead>
        <tbody>
          ${data.contacts.map(c => `
            <tr data-id="${c.id}">
              <td class="contact-list__date">${formatDate(c.created_at)}</td>
              <td>${escHtml(c.name)}${c.company ? `<br><small>${escHtml(c.company)}</small>` : ''}</td>
              <td><a href="mailto:${escHtml(c.email)}">${escHtml(c.email)}</a></td>
              <td><a href="tel:${escHtml(c.phone)}">${escHtml(c.phone)}</a></td>
              <td>${c.purpose ? PURPOSE_LABELS[c.purpose] ?? c.purpose : '—'}</td>
              <td>${c.cv_downloaded ? '✅' : '—'}</td>
              <td class="contact-list__notes-cell">
                <span class="contact-list__notes-text">${c.admin_notes ? escHtml(c.admin_notes) : '—'}</span>
                <button class="contact-list__notes-edit" data-id="${c.id}" data-notes="${escAttr(c.admin_notes ?? '')}">✏️</button>
              </td>
            </tr>
            ${c.message ? `<tr class="contact-list__message-row"><td colspan="7"><em>Mensaje:</em> ${escHtml(c.message)}</td></tr>` : ''}
          `).join('')}
        </tbody>
      </table>
    `;

    footer.innerHTML = `<span>Total: ${data.total} contacto(s)</span>`;

    // Bind note editing
    body.querySelectorAll('.contact-list__notes-edit').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number((btn as HTMLElement).dataset.id);
        const currentNotes = (btn as HTMLElement).dataset.notes || '';
        const notes = prompt('Notas internas:', currentNotes);
        if (notes === null) return;

        try {
          const res = await fetch(`/api/admin/contacts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_notes: notes }),
          });
          const d = await res.json();
          if (!res.ok || !d.ok) throw new Error(d.error);
          await loadContacts(purpose);
        } catch (err: any) {
          alert('Error al guardar nota: ' + (err.message || 'Desconocido'));
        }
      });
    });
  } catch (err: any) {
    body.innerHTML = `<p class="contact-list__error">Error de red: ${err.message}</p>`;
  }
}

async function exportCsv(purpose: string): Promise<void> {
  try {
    const params = new URLSearchParams({ limit: '500' });
    if (purpose) params.set('purpose', purpose);

    const res = await fetch(`/api/admin/contacts?${params.toString()}`);
    const data: ContactListResponse = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error);

    const header = 'Nombre,Email,Teléfono,Empresa,Propósito,Mensaje,CV Descargado,Fecha\n';
    const rows = data.contacts.map(c =>
      [c.name, c.email, c.phone, c.company ?? '', c.purpose ?? '', c.message ?? '', c.cv_downloaded ? 'Sí' : 'No', formatDate(c.created_at)]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contactos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    alert('Error al exportar: ' + (err.message || 'Desconocido'));
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
