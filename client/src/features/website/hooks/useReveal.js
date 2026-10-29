import { useEffect, useRef } from 'react';

/**
 * Adds .is-visible to [data-reveal] elements as they scroll into view (once each).
 * Also picks up elements added later (e.g. after filtering the products list).
 */
export function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const show = (el) => el.classList.add('is-visible');
    if (!('IntersectionObserver' in window)) { root.querySelectorAll('[data-reveal]').forEach(show); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    const scan = () => root.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((t) => io.observe(t));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
  return ref;
}
