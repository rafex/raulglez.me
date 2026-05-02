import { gsap, staggerFadeLeft, animateSectionTitle } from '../animations/gsap';
import { escHtml } from '../utils/html';
import { ExperienceItem } from '../types/cv.types';

class CVExperience extends HTMLElement {
  private _pulses: gsap.core.Tween[] = [];

  connectedCallback(): void {
    const data: ExperienceItem[] = JSON.parse(this.getAttribute('data') || '[]');
    const shadow = this.attachShadow({ mode: 'open' });
    const items = data.map((job) => `
      <div class="timeline__item">
        <div class="timeline__dot"></div>
        <div class="timeline__card">
          <div class="card__header">
            <h3 class="card__role">${escHtml(job.role)}</h3>
            <span class="card__company">${escHtml(job.company)}</span>
            <span class="card__period">${escHtml(job.period)}</span>
            <span class="card__location">${escHtml(job.location)}</span>
          </div>
          <ul class="card__highlights">${job.highlights.map(h => `<li>${escHtml(h)}</li>`).join('')}</ul>
        </div>
      </div>`).join('');

    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .cv__section { margin-bottom: var(--spacing-3xl); padding: var(--spacing-2xl) 0; border-bottom: 1px solid var(--color-border); }
        .section__container { max-width: var(--max-width); margin: 0 auto; }
        .section__title { position: relative; display: inline-block; margin-bottom: var(--spacing-2xl); padding-bottom: var(--spacing-sm); font-weight: 700; line-height: 1.3; color: var(--color-primary); font-size: var(--font-size-2xl); }
        .section__title::after { content: ''; position: absolute; bottom: 0; left: 0; width: 60px; height: 3px; background: var(--color-highlight); border-radius: 2px; }
        .timeline { position: relative; padding-left: var(--spacing-2xl); }
        .timeline::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: var(--color-border); }
        .timeline__item { position: relative; margin-bottom: var(--spacing-2xl); }
        .timeline__item:last-child { margin-bottom: 0; }
        .timeline__dot { position: absolute; left: calc(-1 * var(--spacing-2xl)); top: 6px; width: 16px; height: 16px; border-radius: 50%; background: var(--color-highlight); border: 3px solid var(--color-bg); box-shadow: var(--shadow-sm); transform: translateX(-1px); }
        .timeline__card { background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: var(--border-radius); padding: var(--spacing-xl); box-shadow: var(--shadow-sm); transition: box-shadow var(--transition-base); }
        .timeline__card:hover { box-shadow: var(--shadow-md); }
        .card__role { font-size: var(--font-size-lg); color: var(--color-primary); margin-bottom: var(--spacing-xs); }
        .card__company { display: block; font-weight: 600; color: var(--color-highlight); margin-bottom: var(--spacing-xs); }
        .card__period { display: inline-block; font-size: var(--font-size-sm); color: var(--color-text-light); margin-right: var(--spacing-md); }
        .card__location { display: inline-block; font-size: var(--font-size-sm); color: var(--color-text-muted); }
        .card__highlights { margin-top: var(--spacing-md); padding-left: var(--spacing-lg); list-style: none; }
        .card__highlights li { position: relative; margin-bottom: var(--spacing-sm); font-size: var(--font-size-sm); line-height: 1.6; color: var(--color-text); }
        .card__highlights li::before { content: '▸'; position: absolute; left: -1rem; color: var(--color-highlight); }
      </style>
      <section class="cv__section">
        <div class="section__container">
          <h2 class="section__title">Experiencia Laboral</h2>
          <div class="timeline">${items}</div>
        </div>
      </section>`;

    // GSAP entrance animations
    animateSectionTitle(this, shadow);
    staggerFadeLeft(this, shadow, '.timeline__item');

    // Dot pulse animations
    this._pulses = [];
    shadow.querySelectorAll('.timeline__dot').forEach((dot, i) => {
      const tween = gsap.to(dot, {
        scale: 1.3,
        repeat: -1,
        yoyo: true,
        duration: 1.2,
        delay: i * 0.15,
        ease: 'sine.inOut',
      });
      this._pulses.push(tween);
    });
  }

  disconnectedCallback(): void {
    this._pulses.forEach(t => t.kill());
    this._pulses = [];
  }
}

customElements.define('cv-experience', CVExperience);
