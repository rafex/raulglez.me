// ─── Tipos ────────────────────────────────────────────────────────────────────

type A11yTheme = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'contrast';
type A11yFont  = 'source' | 'atkinson' | 'noto';
type Browser   = 'firefox' | 'chrome' | 'safari' | 'edge' | 'other';

// ─── Detección de navegador ───────────────────────────────────────────────────

function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  if (/firefox\/\d/i.test(ua))                               return 'firefox';
  if (/edg\/\d/i.test(ua))                                   return 'edge';
  if (/chrome\/\d/i.test(ua) && !/chromium/i.test(ua))      return 'chrome';
  if (/safari\/\d/i.test(ua) && !/chrome|android/i.test(ua)) return 'safari';
  return 'other';
}

// ─── Toast de instrucciones ───────────────────────────────────────────────────

let _toast: HTMLElement | null = null;
let _toastTimer: ReturnType<typeof setTimeout> | null = null;

function showReaderToast(html: string, duration = 8000): void {
  // Reutiliza el toast si ya existe
  if (_toast) {
    clearTimeout(_toastTimer!);
    _toast.remove();
  }

  const el = document.createElement('div');
  el.className = 'reader-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = html;

  // Botón de cierre
  const closeBtn = document.createElement('button');
  closeBtn.className = 'reader-toast__close';
  closeBtn.setAttribute('aria-label', 'Cerrar');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => dismissToast(el));
  el.appendChild(closeBtn);

  document.body.appendChild(el);

  // Doble rAF para que la transición CSS funcione
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.add('reader-toast--visible'))
  );

  _toast = el;
  _toastTimer = setTimeout(() => dismissToast(el), duration);
}

function dismissToast(el: HTMLElement): void {
  el.classList.remove('reader-toast--visible');
  setTimeout(() => { el.remove(); _toast = null; }, 350);
}

// ─── Lector nativo por navegador ─────────────────────────────────────────────

const READER_INSTRUCTIONS: Partial<Record<Browser, string>> = {
  chrome:
    '📖 <strong>Chrome — Modo de lectura</strong><br>' +
    'Abre el panel lateral con el ícono <strong>☰⁺</strong> junto a la barra de ' +
    'direcciones y selecciona <strong>Modo de lectura</strong>.<br>' +
    '<small>O ve a Menú ⋮ → Más herramientas → Modo de lectura.</small>',

  safari:
    '📖 <strong>Safari — Lector</strong><br>' +
    'Toca el ícono <strong>📄</strong> en la barra de direcciones ' +
    'para activar el Lector nativo de Safari.',

  edge:
    '📖 <strong>Edge — Vista de lectura</strong><br>' +
    'Presiona <kbd>F9</kbd> o ve a Menú <strong>···</strong> → ' +
    '<strong>Vista de lectura</strong> para activarla.',
};

/**
 * Intenta abrir el lector nativo del navegador.
 * - Firefox: abre `about:reader?url=…` en nueva pestaña → devuelve true.
 * - Chrome / Edge / Safari: muestra toast con instrucciones → devuelve false
 *   (el modo interno CSS se activa como fallback inmediato).
 */
function tryNativeReader(): boolean {
  const browser = detectBrowser();

  if (browser === 'firefox') {
    window.open(
      `about:reader?url=${encodeURIComponent(window.location.href)}`,
      '_blank',
      'noopener,noreferrer'
    );
    return true;
  }

  const msg = READER_INSTRUCTIONS[browser];
  if (msg) showReaderToast(msg);
  return false;
}

// ─── initAccessibility ────────────────────────────────────────────────────────

export function initAccessibility(): void {
  const root        = document.documentElement;
  const toggle      = document.querySelector('#a11y-toggle')       as HTMLButtonElement | null;
  const panel       = document.querySelector('#a11y-panel')        as HTMLElement | null;
  const fontSize    = document.querySelector('#a11y-font-size')    as HTMLInputElement | null;
  const fontSizeVal = document.querySelector('#a11y-font-size-value') as HTMLElement | null;
  const fontFamily  = document.querySelector('#a11y-font-family')  as HTMLSelectElement | null;
  const colorTheme  = document.querySelector('#a11y-color-theme')  as HTMLSelectElement | null;
  const readingSwitch = document.querySelector('#reading-switch')  as HTMLInputElement | null;

  if (!toggle || !panel || !fontSize || !fontSizeVal || !fontFamily || !colorTheme || !readingSwitch) return;

  // ── Estado de lectura ────────────────────────────────────────────────────

  const applyReadingState = (on: boolean): void => {
    root.dataset.reading = on ? 'on' : 'off';
    readingSwitch.checked = on;
    localStorage.setItem('a11y-reading', on ? 'on' : 'off');
  };

  // ── Restaurar preferencias guardadas ────────────────────────────────────

  const savedSize = Number(localStorage.getItem('a11y-font-size') ?? '100');
  const safeSize  = Number.isFinite(savedSize) ? Math.min(130, Math.max(90, savedSize)) : 100;
  fontSize.value = String(safeSize);
  fontSizeVal.textContent = `${safeSize}%`;
  root.style.setProperty('--root-font-size', `${(16 * safeSize) / 100}px`);

  const savedFont = (localStorage.getItem('a11y-font') as A11yFont | null) ?? 'source';
  root.dataset.font = savedFont;
  fontFamily.value = savedFont;

  const savedTheme = (localStorage.getItem('a11y-theme') as A11yTheme | null) ?? 'default';
  root.dataset.theme = savedTheme;
  colorTheme.value = savedTheme;

  applyReadingState(localStorage.getItem('a11y-reading') === 'on');

  // ── Eventos ──────────────────────────────────────────────────────────────

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    panel.hidden = expanded;
  });

  fontSize.addEventListener('input', () => {
    const value = Number(fontSize.value);
    fontSizeVal.textContent = `${value}%`;
    root.style.setProperty('--root-font-size', `${(16 * value) / 100}px`);
    localStorage.setItem('a11y-font-size', String(value));
  });

  fontFamily.addEventListener('change', () => {
    root.dataset.font = fontFamily.value as A11yFont;
    localStorage.setItem('a11y-font', fontFamily.value);
  });

  colorTheme.addEventListener('change', () => {
    root.dataset.theme = colorTheme.value as A11yTheme;
    localStorage.setItem('a11y-theme', colorTheme.value);
  });

  // ── Toggle modo lectura ──────────────────────────────────────────────────

  const syncReadingFromSwitch = (): void => {
    if (readingSwitch.checked) {
      const openedNative = tryNativeReader();
      if (openedNative) {
        // Firefox: página nativa abierta en nueva pestaña — esta se mantiene sin modo interno.
        applyReadingState(false);
        return;
      }
      // Chrome / Edge / Safari: toast mostrado + modo interno CSS activado.
    }
    applyReadingState(readingSwitch.checked);
  };

  readingSwitch.addEventListener('change', syncReadingFromSwitch);
  readingSwitch.addEventListener('input',  syncReadingFromSwitch);
}
