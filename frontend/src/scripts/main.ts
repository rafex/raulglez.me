import type { CVData } from '../types/cv.types';
import {
  renderHeader,
  renderAbout,
  renderExperience,
  renderSkills,
  renderEducation,
  renderConferences,
  renderProjects,
  renderContact,
} from './modules/renderers';
import { initPhoneCanvas } from './modules/phone-canvas';
import { observeSections } from './modules/observers';
import { initAccessibility } from './modules/accessibility';

function fill(selector: string, html: string): void {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = html;
}

async function loadCV(): Promise<void> {
  try {
    const res = await fetch('/api/cv');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: CVData = (await res.json()) as CVData;

    fill('.cv-header', renderHeader(data.header));
    fill('.cv-about', renderAbout(data.about));
    fill('.cv-experience', renderExperience(data.experience));
    fill('.cv-skills', renderSkills(data.skills));
    fill('.cv-education', renderEducation(data.certifications));
    fill('.cv-conferences', renderConferences(data.conferences));
    fill('.cv-projects', renderProjects(data.projects));
    fill('.cv-contact', renderContact(data.contact));

    initPhoneCanvas();
    observeSections();
    initAccessibility();
  } catch (err) {
    const app = document.querySelector('#app');
    if (app) app.innerHTML = '<p class="error">Error cargando el CV. Revisa la consola.</p>';
    console.error('Failed to load CV:', err);
  }
}

loadCV();
