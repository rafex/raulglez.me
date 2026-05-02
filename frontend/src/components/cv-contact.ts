import { gsap, staggerFadeRight, animateSectionTitle } from '../animations/gsap';
import { escHtml } from '../utils/html';
import { Contact } from '../types/cv.types';

class CVContact extends HTMLElement {
  private _hoverCleanups: Array<() => void> = [];

  connectedCallback(): void {
    const data: Contact = JSON.parse(this.getAttribute('data') || '{}');
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .cv__section { margin-bottom: var(--spacing-3xl); padding: var(--spacing-2xl) 0; border-bottom: 1px solid var(--color-border); }
        .cv__section:last-of-type { border-bottom: none; }
        .section__container { max-width: var(--max-width); margin: 0 auto; }
        .section__title { position: relative; display: inline-block; margin-bottom: var(--spacing-2xl); padding-bottom: var(--spacing-sm); font-weight: 700; line-height: 1.3; color: var(--color-primary); font-size: var(--font-size-2xl); }
        .section__title::after { content: ''; position: absolute; bottom: 0; left: 0; width: 60px; height: 3px; background: var(--color-highlight); border-radius: 2px; }
        .contact__info { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: var(--spacing-lg); }
        .contact__item { display: flex; align-items: center; gap: var(--spacing-md); background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: var(--border-radius); padding: var(--spacing-lg); font-size: var(--font-size-md); box-shadow: var(--shadow-sm); }
        .contact__item a { color: var(--color-text); transition: color var(--transition-fast); text-decoration: none; }
        .contact__item a:hover { color: var(--color-highlight); text-decoration: none; }
        .contact__icon { font-size: var(--font-size-xl); flex-shrink: 0; }
        @media (max-width: 767px) { .contact__info { grid-template-columns: 1fr; } }
        @media (min-width: 768px) and (max-width: 1023px) { .contact__info { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .contact__info { grid-template-columns: repeat(4, 1fr); } }
      </style>
      <section class="cv__section">
        <div class="section__container">
          <h2 class="section__title">Contacto</h2>
          <div class="contact__info">
            <div class="contact__item"><span class="contact__icon">📱</span><span>${escHtml(data.phone)}</span></div>
            <div class="contact__item"><span class="contact__icon">✉️</span><a href="mailto:${escHtml(data.email)}">${escHtml(data.email)}</a></div>
            <div class="contact__item"><span class="contact__icon">📍</span><span>${escHtml(data.location)}</span></div>
            <div class="contact__item"><span class="contact__icon">🌐</span><a href="https://${escHtml(data.website)}" target="_blank" rel="noopener noreferrer">${escHtml(data.website)}</a></div>
          </div>
        </div>
      </section>`;

    // GSAP entrance
    animateSectionTitle(this, shadow);
    staggerFadeRight(this, shadow, '.contact__item');

    // Pulse icons on hover (with cleanup)
    shadow.querySelectorAll('.contact__icon').forEach((icon) => {
      const onEnter = () => gsap.to(icon, { scale: 1.3, duration: 0.3, ease: 'elastic.out(1, 0.3)' });
      const onLeave = () => gsap.to(icon, { scale: 1, duration: 0.3, ease: 'power2.out' });
      icon.addEventListener('mouseenter', onEnter);
      icon.addEventListener('mouseleave', onLeave);
      this._hoverCleanups.push(() => {
        icon.removeEventListener('mouseenter', onEnter);
        icon.removeEventListener('mouseleave', onLeave);
      });
    });
  }

  disconnectedCallback(): void {
    this._hoverCleanups.forEach(fn => fn());
    this._hoverCleanups = [];
  }
}

customElements.define('cv-contact', CVContact);
