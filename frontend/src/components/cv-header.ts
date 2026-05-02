import { gsap } from '../animations/gsap';
import { escHtml } from '../utils/html';
import { Header } from '../types/cv.types';

class CVHeader extends HTMLElement {
  private _timeline: gsap.core.Timeline | null = null;

  connectedCallback(): void {
    const data: Header = JSON.parse(this.getAttribute('data') || '{}');
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .header { padding: var(--spacing-3xl) 0 var(--spacing-2xl); text-align: center; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); color: #fff; border-radius: var(--border-radius-lg); margin-bottom: var(--spacing-3xl); }
        .header__content { padding: var(--spacing-3xl) var(--spacing-xl); }
        .header__name { font-size: var(--font-size-4xl); color: #fff; margin-bottom: var(--spacing-xs); letter-spacing: -0.5px; }
        .header__title { font-size: var(--font-size-lg); color: rgba(255,255,255,0.8); margin-bottom: var(--spacing-sm); }
        .header__role { display: inline-block; font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-highlight); background: rgba(233,69,96,0.1); padding: var(--spacing-xs) var(--spacing-lg); border-radius: var(--border-radius); margin-bottom: var(--spacing-xl); }
        .header__vision { max-width: 700px; margin: 0 auto; font-size: var(--font-size-md); line-height: 1.8; color: rgba(255,255,255,0.85); font-style: italic; }
      </style>
      <header class="header">
        <div class="header__content">
          <h1 class="header__name">${escHtml(data.name)}</h1>
          <p class="header__title">${escHtml(data.title)}</p>
          <p class="header__role">${escHtml(data.role)}</p>
          <div class="header__vision"><p>${escHtml(data.vision)}</p></div>
        </div>
      </header>`;

    // GSAP timeline: sequential entrance with premium easing
    requestAnimationFrame(() => {
      this._timeline = gsap.timeline({ defaults: { duration: 0.7, ease: 'power3.out' } });
      this._timeline.from(shadow.querySelector('.header__name'), { x: -80, opacity: 0 }, 0)
        .from(shadow.querySelector('.header__title'), { y: 30, opacity: 0 }, 0.15)
        .from(shadow.querySelector('.header__role'), { scale: 0.4, opacity: 0, ease: 'back.out(1.7)' }, 0.30)
        .from(shadow.querySelector('.header__vision'), { y: 20, opacity: 0 }, 0.45);
    });
  }

  disconnectedCallback(): void {
    this._timeline?.kill();
  }
}

customElements.define('cv-header', CVHeader);
