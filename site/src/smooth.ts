import Lenis from 'lenis';

/** Smooth scrolling (Lenis) and the scroll progress rail. Off when the reader prefers reduced motion. */
export function startSmoothScroll() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lenis = reduce ? null : new Lenis({ lerp: 0.1, anchors: { offset: -80 } });
  const bar = document.getElementById('progress');
  const loop = (t: number) => {
    lenis?.raf(t);
    if (bar) {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return lenis;
}
