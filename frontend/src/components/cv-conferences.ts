import { Conference } from '../types/cv.types';

class CVConferences extends HTMLElement {
  connectedCallback(): void {
    const data: Conference[] = JSON.parse(this.getAttribute('data') || '[]');
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .cv__section { margin-bottom: var(--spacing-3xl); padding: var(--spacing-2xl) 0; border-bottom: 1px solid var(--color-border); }
        .section__container { max-width: var(--max-width); margin: 0 auto; }
        .section__title { position: relative; display: inline-block; margin-bottom: var(--spacing-2xl); padding-bottom: var(--spacing-sm); font-weight: 700; line-height: 1.3; color: var(--color-primary); font-size: var(--font-size-2xl); }
        .section__title::after { content: ''; position: absolute; bottom: 0; left: 0; width: 60px; height: 3px; background: var(--color-highlight); border-radius: 2px; }
        .conferences__list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-lg); }
        .conference__item { background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: var(--border-radius); padding: var(--spacing-lg); border-left: 4px solid var(--color-highlight); box-shadow: var(--shadow-sm); transition: box-shadow var(--transition-base); }
        .conference__item:hover { box-shadow: var(--shadow-md); }
        .conference__title { font-size: var(--font-size-base); color: var(--color-primary); margin-bottom: var(--spacing-xs); }
        .conference__event { font-size: var(--font-size-sm); color: var(--color-text-light); margin-bottom: var(--spacing-xs); }
        .conference__location { font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 600; }
        @media (max-width: 767px) { .conferences__list { grid-template-columns: 1fr; } }
        @media (min-width: 768px) and (max-width: 1023px) { .conferences__list { grid-template-columns: repeat(2, 1fr); } }
      </style>
      <section class="cv__section" data-animate="fadeInUp">
        <div class="section__container">
          <h2 class="section__title">Conferencias y Cursos Impartidos</h2>
          <div class="conferences__list">${data.map(c => `
            <div class="conference__item" data-animate="fadeInRight">
              <h3 class="conference__title">${c.title}</h3>
              <p class="conference__event">${c.event}</p>
              <p class="conference__location">${c.location}</p>
            </div>`).join('')}</div>
        </div>
      </section>`;
  }
}

customElements.define('cv-conferences', CVConferences);
