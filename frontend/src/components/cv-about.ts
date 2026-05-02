class CVAbout extends HTMLElement {
  connectedCallback(): void {
    const text = this.getAttribute('text') || '';
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .cv__section { margin-bottom: var(--spacing-3xl); padding: var(--spacing-2xl) 0; border-bottom: 1px solid var(--color-border); }
        .section__container { max-width: var(--max-width); margin: 0 auto; }
        .section__title { position: relative; display: inline-block; margin-bottom: var(--spacing-2xl); padding-bottom: var(--spacing-sm); font-weight: 700; line-height: 1.3; color: var(--color-primary); font-size: var(--font-size-2xl); }
        .section__title::after { content: ''; position: absolute; bottom: 0; left: 0; width: 60px; height: 3px; background: var(--color-highlight); border-radius: 2px; }
        .about__text { font-size: var(--font-size-md); line-height: 1.8; }
      </style>
      <section class="cv__section" data-animate="fadeInUp">
        <div class="section__container">
          <h2 class="section__title">Sobre mí</h2>
          <div class="section__content"><p class="about__text">${text}</p></div>
        </div>
      </section>`;
  }
}

customElements.define('cv-about', CVAbout);
