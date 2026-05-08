/**
 * cookie-consent.ts — Aviso de cookies / GDPR (Directiva ePrivacy UE).
 *
 * Este sitio usa localStorage sólo para preferencias de accesibilidad
 * (tamaño de fuente, paleta, modo de lectura). Sin cookies de rastreo.
 *
 * Las preferencias de accesibilidad son "estrictamente necesarias" según el
 * Art. 5(3) de la Directiva ePrivacy, por lo que se guardan en ambas opciones.
 * La distinción "Aceptar / Solo necesarias" aplica a funciones futuras
 * (ej. analítica) y demuestra transparencia al usuario.
 */

export type ConsentLevel = 'all' | 'necessary';

const CONSENT_KEY = 'cookie-consent';

// ─── Consulta pública del nivel de consentimiento ─────────────────────────────

export function getConsentLevel(): ConsentLevel | null {
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === 'all' || val === 'necessary') return val as ConsentLevel;
    return null;
  } catch {
    return null; // modo privado o localStorage bloqueado
  }
}

export function hasFullConsent(): boolean {
  return getConsentLevel() === 'all';
}

// ─── initCookieConsent ────────────────────────────────────────────────────────

export function initCookieConsent(): void {
  const banner    = document.querySelector('#cookie-banner')  as HTMLElement | null;
  const acceptBtn = document.querySelector('#cookie-accept')  as HTMLButtonElement | null;
  const rejectBtn = document.querySelector('#cookie-reject')  as HTMLButtonElement | null;

  if (!banner || !acceptBtn || !rejectBtn) return;

  // Si ya decidió, no mostrar
  if (getConsentLevel() !== null) return;

  // Mostrar con transición slide-up
  banner.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => banner.classList.add('cookie-banner--visible'))
  );

  const dismiss = (level: ConsentLevel): void => {
    try {
      localStorage.setItem(CONSENT_KEY, level);
    } catch {
      // localStorage bloqueado (modo incógnito estricto) — ignorar silenciosamente
    }
    banner.classList.remove('cookie-banner--visible');
    window.setTimeout(() => { banner.hidden = true; }, 380);
  };

  acceptBtn.addEventListener('click', () => dismiss('all'));
  rejectBtn.addEventListener('click', () => dismiss('necessary'));
}
