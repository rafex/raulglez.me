import { Header } from '../types/cv.types';

class CVHeader extends HTMLElement {
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
      <header class="header" data-animate="fadeIn">
        <div class="header__content">
          <h1 class="header__name">${data.name}</h1>
          <p class="header__title">${data.title}</p>
          <p class="header__role">${data.role}</p>
          <div class="header__vision"><p>${data.vision}</p></div>
        </div>
      </header>`;
  }
}

customElements.define('cv-header', CVHeader);
