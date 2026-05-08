import type { CVData } from '../types/cv.types';
import {
  renderHeader,
  renderAbout,
  renderExperience,
  renderSkills,
  renderEducation,
  renderConferences,
  renderArticles,
  renderProjects,
  renderContact,
} from './modules/renderers';
import { initPhoneCanvas } from './modules/phone-canvas';
import { observeSections } from './modules/observers';
import { initAccessibility } from './modules/accessibility';
import { configureSemanticHighlights } from './modules/text-utils';
import { initChat } from './modules/chat';
import { initAiReviewPanel } from './modules/ai-review';
import { initContactForm, initPdfModal } from './modules/contact-form';
import { initSearch } from './modules/search';
import { initCookieConsent } from './modules/cookie-consent';

// AOS cargado vía CDN en index.pug — se expone como window.AOS
declare const AOS: any;

function fill(selector: string, html: string): void {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = html;
}

function hideLoader(): void {
  const loader = document.querySelector('#page-loader') as HTMLElement | null;
  if (!loader) return;
  loader.classList.add('is-hidden');
  window.setTimeout(() => {
    loader.remove();
  }, 450);
}

// ─── Jump links ───────────────────────────────────────────────────────────────

function scrollToHash(hash: string): void {
  if (!hash) return;
  const target = document.querySelector(hash) as HTMLElement | null;
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showCopiedTooltip(anchor: HTMLElement): void {
  anchor.classList.add('section__anchor--copied');
  window.setTimeout(() => anchor.classList.remove('section__anchor--copied'), 1800);
}

function initJumpLinks(): void {
  // Scroll to hash present in URL on page load
  if (window.location.hash) {
    window.setTimeout(() => scrollToHash(window.location.hash), 80);
  }

  // React to browser back/forward hash changes
  window.addEventListener('hashchange', () => scrollToHash(window.location.hash));

  // Delegate clicks on all .section__anchor elements
  document.addEventListener('click', (e: MouseEvent) => {
    const anchor = (e.target as Element).closest('.section__anchor') as HTMLAnchorElement | null;
    if (!anchor) return;

    e.preventDefault();
    const sectionId = anchor.dataset.section ?? '';
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;

    // Update address bar without triggering native scroll
    history.pushState(null, '', `#${sectionId}`);
    scrollToHash(`#${sectionId}`);

    // Copy link to clipboard
    navigator.clipboard.writeText(url).then(() => {
      showCopiedTooltip(anchor);
    }).catch(() => {
      // Clipboard not available (e.g. non-secure context) — silently skip
    });
  });
}

async function loadCV(): Promise<void> {
  try {
    const res = await fetch('/api/cv');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: CVData = (await res.json()) as CVData;
    configureSemanticHighlights(data);

    fill('.cv-header', renderHeader(data.header));
    fill('.cv-about', renderAbout(data.about, data.education ?? []));
    fill('.cv-experience', renderExperience(data.experience));
    fill('.cv-skills', renderSkills(data.skills));
    fill('.cv-education', renderEducation(data.certifications));
    fill('.cv-conferences', renderConferences(data.conferences));
    if (data.articles?.length) {
      fill('.cv-articles', renderArticles(data.articles));
    }
    fill('.cv-projects', renderProjects(data.projects));
    fill('.cv-contact', renderContact(data.contact));

    initPhoneCanvas();
    observeSections();
    initAccessibility();
    initChat();
    initAiReviewPanel();
    initContactForm();
    initPdfModal();

    // Inicializar AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
      AOS.init({ duration: 800, once: true, offset: 60 });
    }

    hideLoader();
    initJumpLinks();
    initSearch();
  } catch (err) {
    const app = document.querySelector('#app');
    if (app) app.innerHTML = '<p class="error">Error cargando el CV. Revisa la consola.</p>';
    console.error('Failed to load CV:', err);
    hideLoader();
  }
}

// Aviso de cookies — antes de cargar el CV para que aparezca de inmediato
initCookieConsent();
loadCV();
