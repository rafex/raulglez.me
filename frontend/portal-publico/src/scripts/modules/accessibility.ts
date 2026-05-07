type A11yTheme = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'contrast';
type A11yFont = 'source' | 'atkinson' | 'noto';

export function initAccessibility(): void {
  const root = document.documentElement;
  const toggle = document.querySelector('#a11y-toggle') as HTMLButtonElement | null;
  const panel = document.querySelector('#a11y-panel') as HTMLElement | null;
  const fontSize = document.querySelector('#a11y-font-size') as HTMLInputElement | null;
  const fontSizeValue = document.querySelector('#a11y-font-size-value') as HTMLElement | null;
  const fontFamily = document.querySelector('#a11y-font-family') as HTMLSelectElement | null;
  const colorTheme = document.querySelector('#a11y-color-theme') as HTMLSelectElement | null;
  const readingSwitch = document.querySelector('#reading-switch') as HTMLInputElement | null;

  if (!toggle || !panel || !fontSize || !fontSizeValue || !fontFamily || !colorTheme || !readingSwitch) return;

  const tryOpenNativeReaderView = (): boolean => {
    const isFirefox = /firefox/i.test(navigator.userAgent);
    if (!isFirefox) return false;
    const readerUrl = `about:reader?url=${encodeURIComponent(window.location.href)}`;
    window.open(readerUrl, '_blank', 'noopener,noreferrer');
    return true;
  };

  const applyReadingState = (on: boolean): void => {
    root.dataset.reading = on ? 'on' : 'off';
    readingSwitch.checked = on;
    localStorage.setItem('a11y-reading', on ? 'on' : 'off');
  };

  const savedSize = Number(localStorage.getItem('a11y-font-size') ?? '100');
  const safeSize = Number.isFinite(savedSize) ? Math.min(130, Math.max(90, savedSize)) : 100;
  fontSize.value = String(safeSize);
  fontSizeValue.textContent = `${safeSize}%`;
  root.style.setProperty('--root-font-size', `${(16 * safeSize) / 100}px`);

  const savedFont = (localStorage.getItem('a11y-font') as A11yFont | null) ?? 'source';
  root.dataset.font = savedFont;
  fontFamily.value = savedFont;

  const savedTheme = (localStorage.getItem('a11y-theme') as A11yTheme | null) ?? 'default';
  root.dataset.theme = savedTheme;
  colorTheme.value = savedTheme;

  const savedReading = localStorage.getItem('a11y-reading') === 'on';
  applyReadingState(savedReading);

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    panel.hidden = expanded;
  });

  fontSize.addEventListener('input', () => {
    const value = Number(fontSize.value);
    fontSizeValue.textContent = `${value}%`;
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

  const syncReadingFromSwitch = (): void => {
    if (readingSwitch.checked) {
      const openedNative = tryOpenNativeReaderView();
      if (openedNative) {
        // Mantiene este sitio sin modo interno cuando se abre lector nativo.
        applyReadingState(false);
        return;
      }
    }
    applyReadingState(readingSwitch.checked);
  };

  readingSwitch.addEventListener('change', syncReadingFromSwitch);
  readingSwitch.addEventListener('input', syncReadingFromSwitch);
}
