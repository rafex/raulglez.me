/**
 * contact-form.ts — Formulario de contacto público y modal de descarga de PDF.
 *
 * - Contact form: POST /api/contact
 * - PDF modal: POST /api/cv.pdf/request → obtiene token → descarga /api/cv.pdf?token=...
 */

type ContactPayload = {
  name: string;
  email: string;
  phone: string;
  company?: string;
  purpose?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

// ─── Utilidades ──────────────────────────────────────────────────────────

function showFeedback(el: HTMLElement, msg: string, type: 'success' | 'error' | 'loading'): void {
  el.textContent = msg;
  el.className = `contact-form__feedback contact-form__feedback--${type}`;
  el.setAttribute('role', 'alert');
}

function clearFeedback(el: HTMLElement): void {
  el.textContent = '';
  el.className = 'contact-form__feedback';
  el.removeAttribute('role');
}

function setButtonLoading(btn: HTMLButtonElement, loading: boolean): void {
  btn.disabled = loading;
  btn.textContent = loading ? 'Enviando...' : btn.dataset.originalText ?? btn.textContent;
  if (!loading) btn.textContent = btn.dataset.originalText ?? btn.textContent;
}

// ─── Formulario de contacto ──────────────────────────────────────────────

export function initContactForm(): void {
  const form = document.getElementById('contact-me-form') as HTMLFormElement | null;
  const feedback = document.getElementById('contact-form-feedback') as HTMLElement | null;
  if (!form || !feedback) return;

  const submitBtn = form.querySelector('.contact-form__submit') as HTMLButtonElement | null;
  if (submitBtn) submitBtn.dataset.originalText = submitBtn.textContent ?? 'Enviar mensaje';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback(feedback);

    // Validación
    const name = (document.getElementById('contact-name') as HTMLInputElement)?.value.trim();
    const email = (document.getElementById('contact-email') as HTMLInputElement)?.value.trim();
    const phone = (document.getElementById('contact-phone') as HTMLInputElement)?.value.trim();
    const consent = (document.getElementById('contact-consent') as HTMLInputElement)?.checked;

    if (!name || !email || !phone) {
      showFeedback(feedback, 'Nombre, correo y teléfono son obligatorios.', 'error');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      showFeedback(feedback, 'El formato del correo no es válido.', 'error');
      return;
    }
    if (!PHONE_RE.test(phone)) {
      showFeedback(feedback, 'El formato del teléfono no es válido.', 'error');
      return;
    }
    if (!consent) {
      showFeedback(feedback, 'Debes aceptar el consentimiento de privacidad.', 'error');
      return;
    }

    const payload: ContactPayload = {
      name,
      email,
      phone,
      company: (document.getElementById('contact-company') as HTMLInputElement)?.value.trim() || undefined,
      purpose: (document.getElementById('contact-purpose') as HTMLSelectElement)?.value || undefined,
      message: (document.getElementById('contact-message') as HTMLTextAreaElement)?.value.trim() || undefined,
    };

    if (submitBtn) setButtonLoading(submitBtn, true);
    showFeedback(feedback, 'Enviando...', 'loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Error del servidor');
      }

      showFeedback(feedback, '✅ ¡Mensaje enviado! Te contactaré pronto.', 'success');
      form.reset();
    } catch (err: any) {
      showFeedback(feedback, `❌ ${err.message || 'Error al enviar. Intenta de nuevo.'}`, 'error');
    } finally {
      if (submitBtn) setButtonLoading(submitBtn, false);
    }
  });
}

// ─── Modal de descarga de PDF ─────────────────────────────────────────────

export function initPdfModal(): void {
  const modal = document.getElementById('pdf-modal') as HTMLElement | null;
  const trigger = document.getElementById('download-trigger') as HTMLButtonElement | null;
  const closeBtn = document.getElementById('pdf-modal-close') as HTMLButtonElement | null;
  const form = document.getElementById('pdf-download-form') as HTMLFormElement | null;
  const feedback = document.getElementById('pdf-download-feedback') as HTMLElement | null;

  if (!modal || !trigger || !form || !feedback) return;

  const submitBtn = form.querySelector('.pdf-download-form__submit') as HTMLButtonElement | null;
  if (submitBtn) submitBtn.dataset.originalText = submitBtn.textContent ?? 'Descargar CV (PDF)';

  // Abrir modal
  trigger.addEventListener('click', () => {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    clearFeedback(feedback);
  });

  // Cerrar modal
  const closeModal = () => {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  };

  closeBtn?.addEventListener('click', closeModal);
  modal.querySelector('.pdf-modal__overlay')?.addEventListener('click', closeModal);

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Submit del formulario de PDF
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback(feedback);

    const email = (document.getElementById('pdf-email') as HTMLInputElement)?.value.trim();
    const phone = (document.getElementById('pdf-phone') as HTMLInputElement)?.value.trim();
    const consent = (document.getElementById('pdf-consent') as HTMLInputElement)?.checked;

    if (!email || !phone) {
      showFeedback(feedback, 'Correo y teléfono son obligatorios.', 'error');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      showFeedback(feedback, 'El formato del correo no es válido.', 'error');
      return;
    }
    if (!PHONE_RE.test(phone)) {
      showFeedback(feedback, 'El formato del teléfono no es válido.', 'error');
      return;
    }
    if (!consent) {
      showFeedback(feedback, 'Debes aceptar compartir tus datos.', 'error');
      return;
    }

    if (submitBtn) setButtonLoading(submitBtn, true);
    showFeedback(feedback, 'Generando PDF...', 'loading');

    try {
      // 1. Obtener token JWT
      const tokenRes = await fetch('/api/cv.pdf/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'CV Download', email, phone }),
      });
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.ok) {
        throw new Error(tokenData.error ?? 'Error al solicitar el PDF');
      }

      showFeedback(feedback, '✅ PDF listo. La descarga iniciará en breve...', 'success');
      form.reset();

      // 2. Descargar PDF
      setTimeout(() => {
        window.location.href = `/api/cv.pdf?token=${encodeURIComponent(tokenData.token)}`;
      }, 500);
    } catch (err: any) {
      showFeedback(feedback, `❌ ${err.message || 'Error. Intenta de nuevo.'}`, 'error');
    } finally {
      if (submitBtn) setButtonLoading(submitBtn, false);
    }
  });
}
