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

// ---------------------------------------------------------------------------
// Global ScrollTrigger configuration
// ---------------------------------------------------------------------------
ScrollTrigger.defaults({
  toggleActions: 'play none none none',
});

// Refresh ScrollTrigger after DOM mutations (CV data loaded dynamically)
document.addEventListener('cv-loaded', () => {
  ScrollTrigger.refresh();
});

// Optional: global entrance for the <cv-app> shell when data is ready
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
