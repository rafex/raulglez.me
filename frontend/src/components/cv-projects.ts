import { gsap, staggerZoomIn, animateSectionTitle } from '../animations/gsap';
import { escHtml } from '../utils/html';
import { Project } from '../types/cv.types';

class CVProjects extends HTMLElement {
  private _hoverCleanups: Array<() => void> = [];

  connectedCallback(): void {
    const data: Project[] = JSON.parse(this.getAttribute('data') || '[]');
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .cv__section { margin-bottom: var(--spacing-3xl); padding: var(--spacing-2xl) 0; border-bottom: 1px solid var(--color-border); }
        .section__container { max-width: var(--max-width); margin: 0 auto; }
        .section__title { position: relative; display: inline-block; margin-bottom: var(--spacing-2xl); padding-bottom: var(--spacing-sm); font-weight: 700; line-height: 1.3; color: var(--color-primary); font-size: var(--font-size-2xl); }
        .section__title::after { content: ''; position: absolute; bottom: 0; left: 0; width: 60px; height: 3px; background: var(--color-highlight); border-radius: 2px; }
        .projects__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-lg); }
        .project__card { display: block; background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: var(--border-radius); padding: var(--spacing-xl); box-shadow: var(--shadow-sm); transition: all var(--transition-base); text-decoration: none !important; color: inherit; }
        .project__card:hover { box-shadow: var(--shadow-lg); border-color: var(--color-highlight); transform: translateY(-2px); }
        .project__card:hover .project__name { color: var(--color-highlight); }
        .project__name { font-size: var(--font-size-md); font-weight: 700; color: var(--color-primary); margin-bottom: var(--spacing-sm); transition: color var(--transition-fast); }
        .project__desc { font-size: var(--font-size-sm); color: var(--color-text-light); margin-bottom: var(--spacing-md); line-height: 1.6; }
        .project__url { font-size: var(--font-size-xs); color: var(--color-text-muted); font-family: var(--font-mono); word-break: break-all; }
        @media (max-width: 767px) { .projects__grid { grid-template-columns: 1fr; } }
        @media (min-width: 768px) and (max-width: 1023px) { .projects__grid { grid-template-columns: repeat(2, 1fr); } }
      </style>
      <section class="cv__section">
        <div class="section__container">
          <h2 class="section__title">Experiencia Digital</h2>
          <div class="projects__grid">${data.map(p => `
            <a class="project__card" href="${escHtml(p.url)}" target="_blank" rel="noopener noreferrer">
              <h3 class="project__name">${escHtml(p.name)}</h3>
              <p class="project__desc">${escHtml(p.description)}</p>
              <span class="project__url">${escHtml(p.url)}</span>
            </a>`).join('')}</div>
        </div>
      </section>`;

    // GSAP entrance
    animateSectionTitle(this, shadow);
    staggerZoomIn(this, shadow, '.project__card', { stagger: 0.1 });

    // Hover lift effect (with cleanup)
    shadow.querySelectorAll('.project__card').forEach((card) => {
      const onEnter = () => gsap.to(card, { y: -6, duration: 0.3, ease: 'power2.out' });
      const onLeave = () => gsap.to(card, { y: 0, duration: 0.3, ease: 'power2.out' });
      card.addEventListener('mouseenter', onEnter);
      card.addEventListener('mouseleave', onLeave);
      this._hoverCleanups.push(() => {
        card.removeEventListener('mouseenter', onEnter);
        card.removeEventListener('mouseleave', onLeave);
      });
    });
  }

  disconnectedCallback(): void {
    this._hoverCleanups.forEach(fn => fn());
    this._hoverCleanups = [];
  }
}

customElements.define('cv-projects', CVProjects);
