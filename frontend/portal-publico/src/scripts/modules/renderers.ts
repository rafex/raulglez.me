import type {
  Header,
  Contact,
  EducationItem,
  ExperienceItem,
  Skills,
  Certification,
  Conference,
  Article,
  Project,
} from '../../types/cv.types';
import { esc, highlightSemantic } from './text-utils';

function highlightVisionText(text: string): string {
  return highlightSemantic(text);
}

function renderVision(text: string): string {
  const sentences = text.split('.').map((s) => s.trim()).filter(Boolean);
  if (sentences.length <= 1) return `<p>${highlightVisionText(text)}</p>`;

  const first = `${sentences.slice(0, 2).join('. ')}.`;
  const second = `${sentences.slice(2).join('. ')}.`;
  return `
    <p>${highlightVisionText(first)}</p>
    ${sentences.length > 2 ? `<p>${highlightVisionText(second)}</p>` : ''}`;
}

export function renderHeader(data: Header): string {
  const displayName = data.nickname ?? data.name;
  return `
    <div class="content">
      <h1 class="header__name">${esc(displayName)}</h1>
      ${data.title ? `<p class="header__title">${esc(data.title)}</p>` : ''}
      <p class="header__role">${esc(data.role)}</p>
      <div class="header__vision">${renderVision(data.vision)}</div>
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

export function renderAbout(text: string, education: EducationItem[] = []): string {
  const educationBlock = education.length
    ? `<ul class="about__list">${education
        .map((e) => `<li><strong class="about__hl-degree">${esc(e.degree)}</strong>, <span class="about__hl-university">${esc(e.institution)}</span>. <span class="about__hl-location">${esc(e.location)} (${esc(e.period)})</span></li>`)
        .join('')}</ul>`
    : '';

  return `
    <h2 class="section__title">Sobre mí</h2>
    <p class="about__text">${highlightSemantic(text)}</p>
    ${educationBlock}`;
}

export function renderExperience(items: ExperienceItem[]): string {
  const renderSkill = (skill: string | { name: string; experienceYears?: number }): string => {
    if (typeof skill === 'string') return esc(skill);
    return esc(`${skill.name}${skill.experienceYears ? ` (${skill.experienceYears} años)` : ''}`);
  };

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
        ${
          item.skills
            ? `
        <details class="experience__skills-card">
          <summary class="experience__skills-summary">Habilidades y Competencias</summary>
          <div class="experience__skills-content">
            <p class="experience__skills-title">Habilidades técnicas</p>
            <div class="experience__skills-tags">
              ${item.skills.technical.map((s) => `<span class="experience__skill-tag">${renderSkill(s)}</span>`).join('')}
            </div>
            <p class="experience__skills-title">Competencias</p>
            <div class="experience__skills-tags">
              ${item.skills.competencies.map((c) => `<span class="experience__skill-tag experience__skill-tag--soft">${esc(c)}</span>`).join('')}
            </div>
          </div>
        </details>`
            : ''
        }
      </div>
    </article>`).join('');

  return `
    <h2 class="section__title">Experiencia</h2>
    <div class="experience__timeline">${cards}</div>`;
}

export function renderSkills(skills: Skills): string {
  const technical = skills.technical
    .map((s) => {
      if (typeof s === 'string') return `<span class="badge badge--technical">${esc(s)}</span>`;
      return `
        <span class="badge badge--technical badge--technical-split">
          <span class="badge__name">${esc(s.name)}</span>
          ${s.experienceYears ? `<span class="badge__years">${esc(String(s.experienceYears))} años</span>` : ''}
        </span>`;
    })
    .join('');
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
      <p class="small-desc">${c.issuer ? `${esc(c.issuer)} · ` : ''}${esc(c.expedition ?? '')}${c.code ? ` · ${esc(c.code)}` : ''}${c.id ? `<br>ID: ${esc(c.id)}` : ''}</p>
      <div class="go-corner"><div class="go-arrow">→</div></div>
    </article>`).join('');

  return `
    <h2 class="section__title">Certificaciones</h2>
    <div class="education__grid">${cards}</div>`;
}

export function renderConferences(confs: Conference[]): string {
  const typeLabels: Record<string, string> = {
    talk: 'Charla',
    course: 'Curso',
    workshop: 'Taller',
    publication: 'Publicación',
  };
  const items = confs.map((c) => {
    const typeBadge = c.type
      ? `<span class="conference__type conference__type--${esc(c.type)}">${esc(typeLabels[c.type] ?? c.type)}</span>`
      : '';
    return `
    <article class="card">
      <p class="card-title">${esc(c.title)}</p>
      <p class="small-desc">${typeBadge} ${esc(c.event)} · ${esc(c.location)}</p>
      <div class="go-corner"><div class="go-arrow">→</div></div>
    </article>`;
  }).join('');

  return `
    <h2 class="section__title">Conferencias</h2>
    <div class="conferences__list">${items}</div>`;
}

export function renderArticles(articles: Article[]): string {
  const cards = articles.map((a) => `
    <article class="card">
      <p class="card-title">${esc(a.title)}</p>
      <p class="small-desc">${esc(a.publication)} · ${esc(a.date)}</p>
      <div class="go-corner"><div class="go-arrow">→</div></div>
    </article>`).join('');

  return `
    <h2 class="section__title">Artículos</h2>
    <div class="articles__list">${cards}</div>`;
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
  const email = contact.public?.email ?? '';
  const website = contact.public?.website ?? '';
  const cards: string[] = [];

  if (email) {
    cards.push(`
      <div class="contact-card">
        <div class="bg">
          <span class="contact__label">Email</span>
          <a class="contact__value" href="mailto:${esc(email)}">${esc(email)}</a>
        </div>
        <div class="blob"></div>
      </div>`);
  }

  if (website) {
    cards.push(`
      <div class="contact-card">
        <div class="bg">
          <span class="contact__label">Web</span>
          <a class="contact__value" href="https://${esc(website)}" target="_blank" rel="noopener noreferrer">${esc(website)}</a>
        </div>
        <div class="blob"></div>
      </div>`);
  }

  return `
    <h2 class="section__title">Contacto</h2>
    <div class="contact__grid">${cards.join('')}</div>`;
}
