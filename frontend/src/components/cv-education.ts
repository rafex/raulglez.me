import { Certification } from '../types/cv.types';

class CVEducation extends HTMLElement {
  connectedCallback(): void {
    const data: Certification[] = JSON.parse(this.getAttribute('data') || '[]');
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .cv__section { margin-bottom: var(--spacing-3xl); padding: var(--spacing-2xl) 0; border-bottom: 1px solid var(--color-border); }
        .section__container { max-width: var(--max-width); margin: 0 auto; }
        .section__title { position: relative; display: inline-block; margin-bottom: var(--spacing-2xl); padding-bottom: var(--spacing-sm); font-weight: 700; line-height: 1.3; color: var(--color-primary); font-size: var(--font-size-2xl); }
        .section__title::after { content: ''; position: absolute; bottom: 0; left: 0; width: 60px; height: 3px; background: var(--color-highlight); border-radius: 2px; }
        .certifications__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-xl); }
        .certification__card { display: flex; align-items: flex-start; gap: var(--spacing-md); background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: var(--border-radius); padding: var(--spacing-xl); box-shadow: var(--shadow-sm); transition: box-shadow var(--transition-base); }
        .certification__card:hover { box-shadow: var(--shadow-md); }
        .cert__icon { font-size: var(--font-size-2xl); flex-shrink: 0; }
        .cert__title { font-size: var(--font-size-base); color: var(--color-primary); margin-bottom: var(--spacing-xs); }
        .cert__details { font-size: var(--font-size-sm); color: var(--color-text-light); margin-bottom: var(--spacing-xs); }
        .cert__code { font-family: var(--font-mono); font-weight: 600; }
        .cert__year { font-weight: 600; color: var(--color-highlight); }
        .cert__id { font-size: var(--font-size-xs); color: var(--color-text-muted); }
        @media (max-width: 767px) { .certifications__grid { grid-template-columns: 1fr; } }
        @media (min-width: 768px) and (max-width: 1023px) { .certifications__grid { grid-template-columns: repeat(2, 1fr); } }
      </style>
      <section class="cv__section" data-animate="fadeInUp">
        <div class="section__container">
          <h2 class="section__title">Certificaciones</h2>
          <div class="certifications__grid">${data.map(c => `
            <div class="certification__card" data-animate="flipInX">
              <span class="cert__icon">🏅</span>
              <div class="cert__info">
                <h3 class="cert__title">${c.title}</h3>
                <p class="cert__details"><span class="cert__code">${c.code}</span> — <span class="cert__year">${c.year}</span></p>
                <p class="cert__id">ID: ${c.id}</p>
              </div>
            </div>`).join('')}</div>
        </div>
      </section>`;
  }
}

customElements.define('cv-education', CVEducation);
