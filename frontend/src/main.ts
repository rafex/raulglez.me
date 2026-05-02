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

// Animaciones scroll-triggered con IntersectionObserver y CSS nativo
const observerOptions: IntersectionObserverInit = {
  threshold: 0.15,
  rootMargin: '0px 0px -50px 0px',
};

const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target as HTMLElement;
      const animation = el.dataset.animate || 'fadeInUp';
      el.style.animationName = animation;
      el.style.animationDuration = '0.8s';
      el.style.animationFillMode = 'both';
      observer.unobserve(el);
    }
  });
}, observerOptions);

// Inicializar observer después de que cv-app termine de cargar datos
function initAnimations(): void {
  document.querySelectorAll<HTMLElement>('[data-animate]').forEach((el) => {
    observer.observe(el);
  });
}

document.addEventListener('cv-loaded', initAnimations);
