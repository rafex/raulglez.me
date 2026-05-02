import './styles/main.css';
import './components/cv-app';
import './components/cv-header';
import './components/cv-about';
import './components/cv-experience';
import './components/cv-skills';
import './components/cv-education';
import './components/cv-conferences';
import './components/cv-projects';
import './components/cv-contact';

import { gsap, ScrollTrigger } from './animations/gsap';

// After cv-app renders all children and their ScrollTriggers are registered,
// double-refresh ensures positioning calculation is accurate even for
// dynamically-created Shadow DOM hosts.
document.addEventListener('cv-loaded', () => {
  // Immediate refresh catches any sync-registered triggers
  ScrollTrigger.refresh();
  // rAF refresh catches triggers that need a paint cycle to settle
  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });
});

// Global entrance for the <cv-app> shell
document.addEventListener('cv-loaded', () => {
  const app = document.querySelector('cv-app');
  if (app) {
    gsap.from(app, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
    });
  }
});
