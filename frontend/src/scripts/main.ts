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

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function initPhoneCanvas(): void {
  const wrap = document.querySelector('.phone-canvas');
  if (!wrap) return;
  const canvas = wrap.querySelector('.phone-canvas__el') as HTMLCanvasElement | null;
  const source = wrap.querySelector('.phone-canvas__source') as HTMLImageElement | null;
  if (!canvas || !source) return;

  const draw = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.max(1, Math.round(wrap.getBoundingClientRect().width));
    const cssHeight = Math.max(1, Math.round(wrap.getBoundingClientRect().height));
    const baseW = 220;
    const baseH = 380;
    const sx = cssWidth / baseW;
    const sy = cssHeight / baseH;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr * sx, 0, 0, dpr * sy, 0, 0);
    ctx.clearRect(0, 0, baseW, baseH);

    const stroke = 'rgba(255,255,255,0.35)';
    const body = { x: 8, y: 8, w: 204, h: 364, r: 14 };
    const screen = { x: 10, y: 40, w: 200, h: 280, r: 1 };
    const centerX = body.x + body.w / 2;
    const buttonX = centerX;
    const buttonY = 340;

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    drawRoundRect(ctx, body.x, body.y, body.w, body.h, body.r);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.moveTo(centerX - 12, 26);
    ctx.lineTo(centerX + 12, 26);
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.stroke();

    ctx.save();
    drawRoundRect(ctx, screen.x, screen.y, screen.w, screen.h, screen.r);
    ctx.clip();
    const sourceRatio = source.naturalWidth / source.naturalHeight;
    const targetRatio = screen.w / screen.h;
    let sw = source.naturalWidth;
    let sh = source.naturalHeight;
    let sxImg = 0;
    let syImg = 0;
    if (sourceRatio > targetRatio) {
      sw = sh * targetRatio;
      sxImg = (source.naturalWidth - sw) / 2;
    } else {
      sh = sw / targetRatio;
      syImg = (source.naturalHeight - sh) * 0.25;
    }
    ctx.drawImage(source, sxImg, syImg, sw, sh, screen.x, screen.y, screen.w, screen.h);
    ctx.restore();

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.arc(buttonX, buttonY, 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const icon = '☎';
    const metrics = ctx.measureText(icon);
    const iconY = buttonY + ((metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
    ctx.fillText(icon, buttonX, iconY);
  };

  if (source.complete) draw();
  else source.addEventListener('load', draw, { once: true });
  window.addEventListener('resize', draw);
}

function renderAbout(text: string): string {
  const marker = 'Estudios:';
  const idx = text.indexOf(marker);
  if (idx >= 0) {
    const intro = text.slice(0, idx).trim();
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
    <p class="about__text">${esc(intro)}</p>
    <ul class="about__list">
      <li><strong>Estudios:</strong> ${studiesHtml}</li>
    </ul>`;
  }

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
    <article class="card">
      <p class="card-title">${esc(c.title)}</p>
      <p class="small-desc">${esc(c.year)} · ${esc(c.code)}<br>ID: ${esc(c.id)}</p>
      <div class="go-corner"><div class="go-arrow">→</div></div>
    </article>`).join('');

  return `
    <h2 class="section__title">Certificaciones</h2>
    <div class="education__grid">${cards}</div>`;
}

function renderConferences(confs: Conference[]): string {
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

function renderProjects(projects: Project[]): string {
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

function renderContact(contact: Contact): string {
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

    initPhoneCanvas();
    observeSections();
  } catch (err) {
    const app = document.querySelector('#app');
    if (app) app.innerHTML = '<p class="error">Error cargando el CV. Revisa la consola.</p>';
    console.error('Failed to load CV:', err);
  }
}

loadCV();
