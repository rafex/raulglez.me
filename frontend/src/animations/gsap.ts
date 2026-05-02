import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
ScrollTrigger.defaults({
  toggleActions: 'play none none none',
});

// Enable / disable markers in development
const DEV_MARKERS = false;
if (DEV_MARKERS) {
  ScrollTrigger.defaults({ markers: true });
}

export { gsap, ScrollTrigger };

// ---------------------------------------------------------------------------
// Shadow DOM helpers
// ---------------------------------------------------------------------------

/** Query a single element inside a Web Component's Shadow DOM */
export function queryShadow(host: HTMLElement, selector: string): Element | null {
  return host.shadowRoot?.querySelector(selector) ?? null;
}

/** Query all matching elements inside a Web Component's Shadow DOM */
export function queryShadowAll(host: HTMLElement, selector: string): Element[] {
  return Array.from(host.shadowRoot?.querySelectorAll(selector) ?? []);
}

// ---------------------------------------------------------------------------
// Pre-built animation presets
// ---------------------------------------------------------------------------

/**
 * Stagger entrance from the left (perfect for timeline items).
 * @param host   The Web Component host element (used as ScrollTrigger trigger)
 * @param shadow ShadowRoot of the component
 * @param itemsSelector Selector for items to animate (relative to shadow root)
 * @param options Override defaults
 */
export function staggerFadeLeft(
  host: HTMLElement,
  shadow: ShadowRoot,
  itemsSelector: string,
  options?: { start?: string; duration?: number; stagger?: number; x?: number }
): void {
  const items = shadow.querySelectorAll(itemsSelector);
  if (!items.length) return;

  gsap.from(items, {
    opacity: 0,
    x: options?.x ?? -40,
    duration: options?.duration ?? 0.6,
    stagger: { each: options?.stagger ?? 0.12, from: 'start' },
    ease: 'back.out(1.2)',
    scrollTrigger: {
      trigger: host,
      start: options?.start ?? 'top 78%',
      once: true,
    },
  });
}

/**
 * Stagger zoom-in (perfect for badges, cards, grid items).
 */
export function staggerZoomIn(
  host: HTMLElement,
  shadow: ShadowRoot,
  itemsSelector: string,
  options?: { start?: string; duration?: number; stagger?: number }
): void {
  const items = shadow.querySelectorAll(itemsSelector);
  if (!items.length) return;

  gsap.from(items, {
    opacity: 0,
    scale: 0.6,
    duration: options?.duration ?? 0.5,
    stagger: { each: options?.stagger ?? 0.08, from: 'start' },
    ease: 'back.out(1.7)',
    scrollTrigger: {
      trigger: host,
      start: options?.start ?? 'top 75%',
      once: true,
    },
  });
}

/**
 * Fade-in from the right (conferences, side elements).
 */
export function staggerFadeRight(
  host: HTMLElement,
  shadow: ShadowRoot,
  itemsSelector: string,
  options?: { start?: string; duration?: number; stagger?: number }
): void {
  const items = shadow.querySelectorAll(itemsSelector);
  if (!items.length) return;

  gsap.from(items, {
    opacity: 0,
    x: 40,
    duration: options?.duration ?? 0.6,
    stagger: { each: options?.stagger ?? 0.1, from: 'center' },
    ease: 'power2.out',
    scrollTrigger: {
      trigger: host,
      start: options?.start ?? 'top 78%',
      once: true,
    },
  });
}

/**
 * Flip-3D entrance (certifications).
 */
export function staggerFlipInX(
  host: HTMLElement,
  shadow: ShadowRoot,
  itemsSelector: string,
  options?: { start?: string; duration?: number; stagger?: number }
): void {
  const items = shadow.querySelectorAll(itemsSelector);
  if (!items.length) return;

  gsap.from(items, {
    opacity: 0,
    rotateX: 90,
    duration: options?.duration ?? 0.6,
    stagger: { each: options?.stagger ?? 0.1, from: 'start' },
    ease: 'back.out(1.4)',
    scrollTrigger: {
      trigger: host,
      start: options?.start ?? 'top 75%',
      once: true,
    },
  });
}

/**
 * Section title entrance: slide from left with a small bounce.
 */
export function animateSectionTitle(
  host: HTMLElement,
  shadow: ShadowRoot,
  selector: string = '.section__title'
): void {
  const title = shadow.querySelector(selector);
  if (!title) return;

  gsap.from(title, {
    x: -30,
    opacity: 0,
    duration: 0.7,
    ease: 'back.out(1.4)',
    scrollTrigger: {
      trigger: host,
      start: 'top 85%',
      once: true,
    },
  });
}
