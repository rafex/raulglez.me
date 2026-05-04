import type {
  CVData,
  Header,
  Contact,
  ExperienceItem,
  Skills,
  Certification,
  Conference,
  Project,
} from '../types/cv.types';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHeader(data: Header): string {
  return `
    <div class="header__content">
      <h1 class="header__name">${esc(data.name)}</h1>
      <p class="header__title">${esc(data.title)}</p>
      <p class="header__role">${esc(data.role)}</p>
      <div class="header__vision"><p>${esc(data.vision)}</p></div>
    </div>`;
}

function renderAbout(text: string): string {
  return `
    <h2 class="section__title">Sobre mí</h2>
    <p class="about__text">${esc(text)}</p>`;
}

function renderExperience(items: ExperienceItem[]): string {
  const cards = items.map((item) => `
    <article class="experience__item">
      <div class="experience__dot"></div>
      <div class="experience__card">
        <h3 class="experience__role">${esc(item.role)}</h3>
        <p class="experience__meta">
          <span class="experience__company">${esc(item.company)}</span>
          <span class="experience__period">${esc(item.period)}</span>
          <span class="experience__location">${esc(item.location)}</span>
        </p>
        <ul class="experience__highlights">
          ${item.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}
        </ul>
      </div>
    </article>`).join('');

  return `
    <h2 class="section__title">Experiencia</h2>
    <div class="experience__timeline">${cards}</div>`;
}

function renderSkills(skills: Skills): string {
  const technical = skills.technical.map((s) =>
    `<span class="badge badge--technical">${esc(s)}</span>`).join('');
  const competencies = skills.competencies.map((s) =>
    `<span class="badge badge--competency">${esc(s)}</span>`).join('');

  return `
    <h2 class="section__title">Habilidades</h2>
    <div class="skills__group">
      <h3 class="skills__subtitle">Técnicas</h3>
      <div class="skills__grid">${technical}</div>
    </div>
    <div class="skills__group">
      <h3 class="skills__subtitle">Competencias</h3>
      <div class="skills__grid">${competencies}</div>
    </div>`;
}

function renderEducation(certs: Certification[]): string {
  const cards = certs.map((c) => `
    <article class="education__card">
      <p class="education__year">${esc(c.year)}</p>
      <h3 class="education__title">${esc(c.title)}</h3>
      <p class="education__code">Examen: ${esc(c.code)} — ID: ${esc(c.id)}</p>
    </article>`).join('');

  return `
    <h2 class="section__title">Certificaciones</h2>
    <div class="education__grid">${cards}</div>`;
}

function renderConferences(confs: Conference[]): string {
  const items = confs.map((c) => `
    <article class="conference__item">
      <h3 class="conference__title">${esc(c.title)}</h3>
      <p class="conference__meta">${esc(c.event)} — ${esc(c.location)}</p>
    </article>`).join('');

  return `
    <h2 class="section__title">Conferencias</h2>
    <div class="conferences__list">${items}</div>`;
}

function renderProjects(projects: Project[]): string {
  const cards = projects.map((p) => `
    <article class="project__card">
      <h3 class="project__name">
        <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.name)}</a>
      </h3>
      <p class="project__description">${esc(p.description)}</p>
    </article>`).join('');

  return `
    <h2 class="section__title">Proyectos</h2>
    <div class="projects__grid">${cards}</div>`;
}

function renderContact(contact: Contact): string {
  return `
    <h2 class="section__title">Contacto</h2>
    <div class="contact__grid">
      <div class="contact__item">
        <span class="contact__label">Teléfono</span>
        <span class="contact__value">${esc(contact.phone)}</span>
      </div>
      <div class="contact__item">
        <span class="contact__label">Email</span>
        <a class="contact__value" href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>
      </div>
      <div class="contact__item">
        <span class="contact__label">Ubicación</span>
        <span class="contact__value">${esc(contact.location)}</span>
      </div>
      <div class="contact__item">
        <span class="contact__label">Web</span>
        <a class="contact__value" href="https://${esc(contact.website)}" target="_blank" rel="noopener noreferrer">${esc(contact.website)}</a>
      </div>
    </div>`;
}

function fill(selector: string, html: string): void {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = html;
}

function observeSections(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  document.querySelectorAll('.section, .cv-header').forEach((el) => observer.observe(el));
}

async function loadCV(): Promise<void> {
  try {
    const res = await fetch('/api/cv');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: CVData = await res.json() as CVData;

    fill('.cv-header', renderHeader(data.header));
    fill('.cv-about', renderAbout(data.about));
    fill('.cv-experience', renderExperience(data.experience));
    fill('.cv-skills', renderSkills(data.skills));
    fill('.cv-education', renderEducation(data.certifications));
    fill('.cv-conferences', renderConferences(data.conferences));
    fill('.cv-projects', renderProjects(data.projects));
    fill('.cv-contact', renderContact(data.contact));

    observeSections();
  } catch (err) {
    const app = document.querySelector('#app');
    if (app) app.innerHTML = '<p class="error">Error cargando el CV. Revisa la consola.</p>';
    console.error('Failed to load CV:', err);
  }
}

loadCV();
