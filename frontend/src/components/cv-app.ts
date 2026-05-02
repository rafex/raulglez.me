import { CVData } from '../types/cv.types';

class CVApp extends HTMLElement {
  private data: CVData | null = null;

  async connectedCallback(): Promise<void> {
    try {
      const res = await fetch('/src/data/cv.json');
      this.data = await res.json();
      this.render();
      this.dispatchEvent(new CustomEvent('cv-loaded', { bubbles: true }));
    } catch (err) {
      this.innerHTML = '<p style="color:red">Error loading CV data. Check console for details.</p>';
      console.error('Failed to fetch cv.json:', err);
    }
  }

  /** Called externally after render to trigger a global fade-in. */
  public animateEntrance(): void {
    // Handled by main.ts via the cv-loaded event — kept for API consistency.
  }

  private render(): void {
    if (!this.data) return;
    const { header, about, experience, skills, certifications, conferences, projects, contact } = this.data;
    this.innerHTML = `
      <cv-header data='${this.esc(JSON.stringify(header))}'></cv-header>
      <cv-about text="${this.esc(about)}"></cv-about>
      <cv-experience data='${this.esc(JSON.stringify(experience))}'></cv-experience>
      <cv-skills data='${this.esc(JSON.stringify(skills))}'></cv-skills>
      <cv-education data='${this.esc(JSON.stringify(certifications))}'></cv-education>
      <cv-conferences data='${this.esc(JSON.stringify(conferences))}'></cv-conferences>
      <cv-projects data='${this.esc(JSON.stringify(projects))}'></cv-projects>
      <cv-contact data='${this.esc(JSON.stringify(contact))}'></cv-contact>
    `;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

customElements.define('cv-app', CVApp);
