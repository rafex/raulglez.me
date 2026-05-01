import 'animate.css';
import './styles/main.scss';

// Intersection Observer for scroll-triggered animations
const observerOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -50px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const animation = el.dataset.animate || 'fadeInUp';
      el.classList.add('animate__animated', `animate__${animation}`);
      observer.unobserve(el);
    }
  });
}, observerOptions);

// Observe all elements with data-animate attribute after DOM is ready
function initAnimations() {
  document.querySelectorAll('[data-animate]').forEach((el) => {
    observer.observe(el);
  });
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}
