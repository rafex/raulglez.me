import { gsap, staggerZoomIn, animateSectionTitle } from '../animations/gsap';
import { escHtml } from '../utils/html';
import { Skills } from '../types/cv.types';

class CVSkills extends HTMLElement {
  private _hoverCleanups: Array<() => void> = [];

  connectedCallback(): void {
    const data: Skills = JSON.parse(this.getAttribute('data') || '{}');
    const shadow = this.attachShadow({ mode: 'open' });
    const technicalHtml = (data.technical || []).map(s => `<span class="skill__badge">${escHtml(s)}</span>`).join('');
    const compHtml = (data.competencies || []).map(c => `<span class="skill__badge skill__badge--soft">${escHtml(c)}</span>`).join('');

    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .cv__section { margin-bottom: var(--spacing-3xl); padding: var(--spacing-2xl) 0; border-bottom: 1px solid var(--color-border); }
        .section__container { max-width: var(--max-width); margin: 0 auto; }
        .section__title { position: relative; display: inline-block; margin-bottom: var(--spacing-2xl); padding-bottom: var(--spacing-sm); font-weight: 700; line-height: 1.3; color: var(--color-primary); font-size: var(--font-size-2xl); }
        .section__title::after { content: ''; position: absolute; bottom: 0; left: 0; width: 60px; height: 3px; background: var(--color-highlight); border-radius: 2px; }
        .skills__subtitle { margin-top: var(--spacing-2xl); }
        .skills__grid { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin-top: var(--spacing-md); }
        .skills__grid--soft { gap: var(--spacing-sm); }
        .skill__badge { display: inline-block; background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: 20px; padding: var(--spacing-xs) var(--spacing-md); font-size: var(--font-size-sm); color: var(--color-text); transition: all var(--transition-fast); cursor: default; }
        .skill__badge:hover { border-color: var(--color-highlight); color: var(--color-highlight); box-shadow: var(--shadow-sm); }
        .skill__badge--soft { background: linear-gradient(135deg, rgba(233,69,96,0.05), rgba(15,52,96,0.05)); border-color: rgba(233,69,96,0.2); }
      </style>
      <section class="cv__section">
        <div class="section__container">
          <h2 class="section__title">Conocimientos Técnicos</h2>
          <div class="skills__grid">${technicalHtml}</div>
          <h2 class="section__title skills__subtitle">Competencias</h2>
          <div class="skills__grid skills__grid--soft">${compHtml}</div>
        </div>
      </section>`;

    // Entrance animations
    animateSectionTitle(this, shadow, '.section__title');
    staggerZoomIn(this, shadow, '.skill__badge', { stagger: 0.05 });

    // Hover micro-interactions with GSAP (with cleanup)
    shadow.querySelectorAll('.skill__badge').forEach((badge) => {
      const onEnter = () => gsap.to(badge, { scale: 1.08, duration: 0.25, ease: 'back.out(2)' });
      const onLeave = () => gsap.to(badge, { scale: 1, duration: 0.2, ease: 'power2.out' });
      badge.addEventListener('mouseenter', onEnter);
      badge.addEventListener('mouseleave', onLeave);
      this._hoverCleanups.push(() => {
        badge.removeEventListener('mouseenter', onEnter);
        badge.removeEventListener('mouseleave', onLeave);
      });
    });
  }

  disconnectedCallback(): void {
    this._hoverCleanups.forEach(fn => fn());
    this._hoverCleanups = [];
  }
}

customElements.define('cv-skills', CVSkills);
