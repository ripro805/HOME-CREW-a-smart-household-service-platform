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

    const reveal = (el) => {
      if (!el.classList.contains('revealed')) el.classList.add('revealed');
    };

    // Check if an element is already inside the visible viewport
    const isInViewport = (el) => {
      const r = el.getBoundingClientRect();
      return (
        r.bottom > 0 &&
        r.right > 0 &&
        r.top < (window.innerHeight || document.documentElement.clientHeight) &&
        r.left < (window.innerWidth || document.documentElement.clientWidth)
      );
    };

    // If already visible → reveal immediately; otherwise hand off to IO
    const handle = (el) => {
      if (el.classList.contains('revealed')) return;
      if (isInViewport(el)) {
        reveal(el);
      } else {
        io.observe(el);
      }
    };

    // IntersectionObserver for elements below the fold
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    // Handle elements already in the DOM at mount
    container.querySelectorAll(SELECTOR).forEach(handle);

    // MutationObserver — picks up cards added after async API data loads
    const mo = new MutationObserver((mutations) => {
      const newEls = [];
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches(SELECTOR)) newEls.push(node);
          if (node.querySelectorAll) node.querySelectorAll(SELECTOR).forEach((el) => newEls.push(el));
        });
      });
      if (!newEls.length) return;

      // Small rAF delay so the browser has painted the elements and
      // getBoundingClientRect() returns real coordinates
      requestAnimationFrame(() => {
        newEls.forEach(handle);
        // Hard fallback: anything still hidden after 1 s gets force-revealed
        setTimeout(() => newEls.forEach(reveal), 1000);
      });
    });

    mo.observe(container, { childList: true, subtree: true });

    // Hard fallback for anything already in DOM that IO might miss
    setTimeout(() => container.querySelectorAll(SELECTOR).forEach(reveal), 1000);

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
