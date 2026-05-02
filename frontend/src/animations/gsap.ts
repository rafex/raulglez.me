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
//
// Pattern: gsap.set() for initial state + ScrollTrigger.create() + gsap.to()
// in the onEnter callback.
//
// WHY: gsap.from() with inline scrollTrigger immediately applies "from" values
// as inline styles. If ScrollTrigger doesn't fire for above-the-fold content
// (common with dynamically-created Shadow DOM hosts), elements stay invisible.
// The set + create + onEnter pattern guarantees control and visibility fallback.
// ---------------------------------------------------------------------------

export function staggerFadeLeft(
  host: HTMLElement,
  shadow: ShadowRoot,
  itemsSelector: string,
  options?: { start?: string; duration?: number; stagger?: number; x?: number }
): void {
  const items = Array.from(shadow.querySelectorAll(itemsSelector)) as HTMLElement[];
  if (!items.length) return;

  gsap.set(items, { opacity: 0, x: options?.x ?? -40 });

  ScrollTrigger.create({
    trigger: host,
    start: options?.start ?? 'top 78%',
    once: true,
    onEnter: () => {
      gsap.to(items, {
        opacity: 1, x: 0,
        duration: options?.duration ?? 0.6,
        stagger: { each: options?.stagger ?? 0.12, from: 'start' },
        ease: 'back.out(1.2)',
      });
    },
  });
}

export function staggerZoomIn(
  host: HTMLElement,
  shadow: ShadowRoot,
  itemsSelector: string,
  options?: { start?: string; duration?: number; stagger?: number }
): void {
  const items = Array.from(shadow.querySelectorAll(itemsSelector)) as HTMLElement[];
  if (!items.length) return;

  gsap.set(items, { opacity: 0, scale: 0.6 });

  ScrollTrigger.create({
    trigger: host,
    start: options?.start ?? 'top 75%',
    once: true,
    onEnter: () => {
      gsap.to(items, {
        opacity: 1, scale: 1,
        duration: options?.duration ?? 0.5,
        stagger: { each: options?.stagger ?? 0.08, from: 'start' },
        ease: 'back.out(1.7)',
      });
    },
  });
}

export function staggerFadeRight(
  host: HTMLElement,
  shadow: ShadowRoot,
  itemsSelector: string,
  options?: { start?: string; duration?: number; stagger?: number }
): void {
  const items = Array.from(shadow.querySelectorAll(itemsSelector)) as HTMLElement[];
  if (!items.length) return;

  gsap.set(items, { opacity: 0, x: 40 });

  ScrollTrigger.create({
    trigger: host,
    start: options?.start ?? 'top 78%',
    once: true,
    onEnter: () => {
      gsap.to(items, {
        opacity: 1, x: 0,
        duration: options?.duration ?? 0.6,
        stagger: { each: options?.stagger ?? 0.1, from: 'center' },
        ease: 'power2.out',
      });
    },
  });
}

export function staggerFlipInX(
  host: HTMLElement,
  shadow: ShadowRoot,
  itemsSelector: string,
  options?: { start?: string; duration?: number; stagger?: number }
): void {
  const items = Array.from(shadow.querySelectorAll(itemsSelector)) as HTMLElement[];
  if (!items.length) return;

  gsap.set(items, { opacity: 0, rotateX: 90 });

  ScrollTrigger.create({
    trigger: host,
    start: options?.start ?? 'top 75%',
    once: true,
    onEnter: () => {
      gsap.to(items, {
        opacity: 1, rotateX: 0,
        duration: options?.duration ?? 0.6,
        stagger: { each: options?.stagger ?? 0.1, from: 'start' },
        ease: 'back.out(1.4)',
      });
    },
  });
}

export function animateSectionTitle(
  host: HTMLElement,
  shadow: ShadowRoot,
  selector: string = '.section__title'
): void {
  const title = shadow.querySelector(selector);
  if (!title) return;

  gsap.set(title, { opacity: 0, x: -30 });

  ScrollTrigger.create({
    trigger: host,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to(title, {
        opacity: 1, x: 0,
        duration: 0.7,
        ease: 'back.out(1.4)',
      });
    },
  });
}
