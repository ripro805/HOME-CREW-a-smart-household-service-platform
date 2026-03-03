import { useEffect, useRef } from 'react';

/**
 * useScrollReveal
 *
 * Attaches an IntersectionObserver to a container ref.
 * Any child with class `reveal`, `reveal-left`, `reveal-right`, or `reveal-scale`
 * gets the class `revealed` added when it enters the viewport.
 *
 * Usage:
 *   const sectionRef = useScrollReveal();
 *   <section ref={sectionRef}>
 *     <div className="reveal delay-1">...</div>
 *   </section>
 */
export function useScrollReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const { threshold = 0.05, rootMargin = '0px 0px 0px 0px' } = options;
    const SELECTOR = '.reveal, .reveal-left, .reveal-right, .reveal-scale';

    // Force-reveal any element that is still hidden (safety net for IO misses)
    const forceReveal = (el) => {
      if (!el.classList.contains('revealed')) el.classList.add('revealed');
    };

    // IntersectionObserver — makes elements visible when they enter viewport
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    // Observe a single element (skip already-revealed ones)
    const observe = (el) => {
      if (!el.classList.contains('revealed')) {
        io.observe(el);
      }
    };

    // Observe everything already in the DOM
    container.querySelectorAll(SELECTOR).forEach(observe);

    // MutationObserver — watches for new .reveal elements added after async data loads
    const mo = new MutationObserver((mutations) => {
      const newEls = [];
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return; // elements only
          if (node.matches && node.matches(SELECTOR)) { observe(node); newEls.push(node); }
          if (node.querySelectorAll) {
            node.querySelectorAll(SELECTOR).forEach((el) => { observe(el); newEls.push(el); });
          }
        });
      });
      // Fallback: if IO never fires for a card (fast scroll / layout edge case),
      // force-reveal it after 1.8 s so it never stays invisible forever
      if (newEls.length) {
        setTimeout(() => newEls.forEach(forceReveal), 1800);
      }
    });

    mo.observe(container, { childList: true, subtree: true });

    // Fallback for elements already in DOM at mount time
    setTimeout(() => {
      container.querySelectorAll(SELECTOR).forEach(forceReveal);
    }, 1800);

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return ref;
}

/**
 * useSingleReveal
 * Attach directly to one element ref (not a container).
 */
export function useSingleReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const { threshold = 0.05, rootMargin = '0px 0px 0px 0px' } = options;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/**
 * useTilt
 * 3-D mouse-tilt effect on a card element.
 * Returns a ref to attach to the card.
 */
export function useTilt(max = 8) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${x * max}deg) rotateX(${-y * max}deg) scale3d(1.03,1.03,1.03)`;
      el.style.boxShadow = `${-x * 16}px ${y * 16}px 40px rgba(0,0,0,0.15)`;
    };

    const handleLeave = () => {
      el.style.transform = '';
      el.style.boxShadow = '';
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);

    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [max]);

  return ref;
}

export default useScrollReveal;
