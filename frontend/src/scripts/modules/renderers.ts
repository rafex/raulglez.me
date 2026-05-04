import type {
  Header,
  Contact,
  ExperienceItem,
  Skills,
  Certification,
  Conference,
  Project,
} from '../../types/cv.types';
import { esc, highlightSemantic } from './text-utils';

export function renderHeader(data: Header): string {
  return `
    <div class="content">
      <h1 class="header__name">${esc(data.name)}</h1>
      ${data.title ? `<p class="header__title">${esc(data.title)}</p>` : ''}
      <p class="header__role">${esc(data.role)}</p>
      <div class="header__vision"><p>${esc(data.vision)}</p></div>
    </div>
    <div class="phone-canvas" aria-label="Vista previa en teléfono">
      <canvas class="phone-canvas__el" width="360" height="760"></canvas>
      <img class="phone-canvas__source" src="/images/profile_raul_glez.jpg" alt="Foto de perfil de ${esc(data.name)}" loading="eager" />
      <a class="phone-canvas__screen-call" href="tel:+525580995029" aria-label="Llamar a Raúl al +52 55 8099 5029" title="Llamar +52 55 8099 5029">
        <span class="phone-canvas__screen-call-icon" aria-hidden="true">📞</span>
        <span class="phone-canvas__screen-call-text">Llamar ahora a Raul Glez</span>
      </a>
    </div>`;
}

export function renderAbout(text: string): string {
  const marker = 'Estudios:';
  const idx = text.indexOf(marker);
  if (idx >= 0) {
    const intro = highlightSemantic(text.slice(0, idx).trim());
    const studies = text.slice(idx + marker.length).trim();
    const studiesHtml = studies
      .replace(
        'Licenciatura de Sistemas Computacionales Administrativos',
        '<span class="about__hl-degree">Licenciatura de Sistemas Computacionales Administrativos</span>'
      )
      .replace(
        'Facultad de Contaduría y Administración de la Universidad Veracruzana',
        '<span class="about__hl-university">Facultad de Contaduría y Administración de la Universidad Veracruzana</span>'
      )
      .replace(
        'Xalapa-Enríquez, Veracruz de Ignacio de la Llave.',
        '<span class="about__hl-location">Xalapa-Enríquez, Veracruz de Ignacio de la Llave.</span>'
      );

    return `
    <h2 class="section__title">Sobre mí</h2>
    <p class="about__text">${intro}</p>
    <ul class="about__list">
      <li><strong>Estudios:</strong> ${studiesHtml}</li>
    </ul>`;
  }

  return `
    <h2 class="section__title">Sobre mí</h2>
    <p class="about__text">${highlightSemantic(text)}</p>`;
}

export function renderExperience(items: ExperienceItem[]): string {
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
          ${item.highlights.map((h) => `<li>${highlightSemantic(h)}</li>`).join('')}
        </ul>
      </div>
    </article>`).join('');

  return `
    <h2 class="section__title">Experiencia</h2>
    <div class="experience__timeline">${cards}</div>`;
}

export function renderSkills(skills: Skills): string {
  const technical = skills.technical.map((s) => `<span class="badge badge--technical">${esc(s)}</span>`).join('');
  const competencies = skills.competencies.map((s) => `<span class="badge badge--competency">${esc(s)}</span>`).join('');

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

export function renderEducation(certs: Certification[]): string {
  const cards = certs.map((c) => `
    <article class="card">
      <p class="card-title">${esc(c.title)}</p>
      <p class="small-desc">${esc(c.year)} · ${esc(c.code)}<br>ID: ${esc(c.id)}</p>
      <div class="go-corner"><div class="go-arrow">→</div></div>
    </article>`).join('');

  return `
    <h2 class="section__title">Certificaciones</h2>
    <div class="education__grid">${cards}</div>`;
}

export function renderConferences(confs: Conference[]): string {
  const items = confs.map((c) => `
    <article class="card">
      <p class="card-title">${esc(c.title)}</p>
      <p class="small-desc">${esc(c.event)} · ${esc(c.location)}</p>
      <div class="go-corner"><div class="go-arrow">→</div></div>
    </article>`).join('');

  return `
    <h2 class="section__title">Conferencias</h2>
    <div class="conferences__list">${items}</div>`;
}

export function renderProjects(projects: Project[]): string {
  const cards = projects.map((p) => `
    <article class="card">
      <p class="card-title">
        <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.name)}</a>
      </p>
      <p class="small-desc">${esc(p.description)}</p>
      <div class="go-corner"><div class="go-arrow">→</div></div>
    </article>`).join('');

  return `
    <h2 class="section__title">Proyectos</h2>
    <div class="projects__grid">${cards}</div>`;
}

export function renderContact(contact: Contact): string {
  return `
    <h2 class="section__title">Contacto</h2>
    <div class="contact__grid">
      <div class="contact-card">
        <div class="bg">
          <span class="contact__label">Teléfono</span>
          <span class="contact__value">${esc(contact.phone)}</span>
        </div>
        <div class="blob"></div>
      </div>
      <div class="contact-card">
        <div class="bg">
          <span class="contact__label">Email</span>
          <a class="contact__value" href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>
        </div>
        <div class="blob"></div>
      </div>
      <div class="contact-card">
        <div class="bg">
          <span class="contact__label">Ubicación</span>
          <span class="contact__value">${esc(contact.location)}</span>
        </div>
        <div class="blob"></div>
      </div>
      <div class="contact-card">
        <div class="bg">
          <span class="contact__label">Web</span>
          <a class="contact__value" href="https://${esc(contact.website)}" target="_blank" rel="noopener noreferrer">${esc(contact.website)}</a>
        </div>
        <div class="blob"></div>
      </div>
    </div>`;
}
