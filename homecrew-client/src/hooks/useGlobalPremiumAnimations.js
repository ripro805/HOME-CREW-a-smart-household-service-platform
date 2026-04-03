import { useEffect } from 'react';

const STAGGER_CLASSES = ['delay-1', 'delay-2', 'delay-3', 'delay-4', 'delay-5', 'delay-6', 'delay-7', 'delay-8'];

const SECTION_SELECTORS = [
  'main section',
  'main article',
  'main [data-animate-section]',
  'main .section-card',
  'main .glass-card',
  'main .stat-card',
  'main .chart-card',
  'main .ticket-item',
  'main .card-hover',
  'main .card-hover-light',
].join(',');

const CARD_SELECTORS = [
  'main .rounded-2xl',
  'main .rounded-3xl',
  'main .section-card',
  'main .stat-card',
  'main .chart-card',
  'main .ticket-item',
].join(',');

const HEADING_SELECTORS = 'main section h2, main section h3, main article h2, main article h3';

const shouldSkip = (element) => {
  if (!element) return true;
  if (element.closest('nav,header,footer,textarea,table thead,table tfoot')) return true;
  const text = (element.textContent || '').trim();
  return text.length === 0;
};

export default function useGlobalPremiumAnimations(routeKey, disabled = false) {
  useEffect(() => {
    if (disabled) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    const root = document.querySelector('main') || document.body;
    if (!root) return undefined;

    const revealTargets = Array.from(root.querySelectorAll(SECTION_SELECTORS))
      .filter((el) => !shouldSkip(el));

    revealTargets.forEach((element, index) => {
      if (!element.classList.contains('reveal') && !element.classList.contains('reveal-left') && !element.classList.contains('reveal-right') && !element.classList.contains('reveal-scale')) {
        element.classList.add('reveal');
      }

      const delayClass = STAGGER_CLASSES[index % STAGGER_CLASSES.length];
      STAGGER_CLASSES.forEach((cls) => element.classList.remove(cls));
      element.classList.add(delayClass);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: '0px 0px -2% 0px' }
    );

    revealTargets.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const inViewport = rect.top <= window.innerHeight * 0.96 && rect.bottom >= 0;
      if (inViewport) {
        element.classList.add('revealed');
      } else {
        observer.observe(element);
      }
    });

    // Safety net: never let content remain hidden if observer misses.
    const revealFallbackTimer = window.setTimeout(() => {
      revealTargets.forEach((element) => element.classList.add('revealed'));
    }, 500);

    const cards = Array.from(root.querySelectorAll(CARD_SELECTORS));
    cards.forEach((card) => {
      if (!card.classList.contains('card-hover-light') && !card.classList.contains('card-hover')) {
        card.classList.add('card-hover-light');
      }
    });

    const headings = Array.from(root.querySelectorAll(HEADING_SELECTORS));
    headings.forEach((heading) => {
      if (!heading.classList.contains('section-heading')) {
        heading.classList.add('section-heading');
      }
    });

    const page = root.firstElementChild;
    if (page) {
      page.classList.remove('premium-page-enter');
      // Force reflow to replay animation on route change
      void page.offsetWidth;
      page.classList.add('premium-page-enter');
    }

    return () => {
      window.clearTimeout(revealFallbackTimer);
      observer.disconnect();
    };
  }, [routeKey, disabled]);
}
