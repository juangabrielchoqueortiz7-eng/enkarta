'use client';

import { useEffect, type RefObject } from 'react';

/** Euforia: speed 4.9 => 149% layer; progress uses its parent page's viewport ratio.
 * The published reference supplies `position`, not `_position`, so Elementor
 * selects element-viewport progress, rounded to two decimal percentage points.
 */
export function alborBackgroundFrame(viewportHeight: number, rootTop: number, rootHeight: number) {
  if (![viewportHeight, rootTop, rootHeight].every(Number.isFinite) || viewportHeight <= 0 || rootHeight <= 0) return null;
  const progress = Number((Math.max(0, Math.min(1, (viewportHeight - rootTop) / (rootHeight + viewportHeight))) * 100).toFixed(2));
  const height = viewportHeight * 1.49;
  return { height, offset: -(height - viewportHeight) * progress / 100 };
}

/** Scroll affects only the decorative layer; no React state is updated per frame. */
export function useAlborBackground(root: RefObject<HTMLDivElement>, layer: RefObject<HTMLDivElement>, mode: string) {
  useEffect(() => {
    const page = root.current, art = layer.current;
    if (!page || !art || mode !== 'active' || typeof window.requestAnimationFrame !== 'function' || typeof window.cancelAnimationFrame !== 'function') return;
    const initialRect = page.getBoundingClientRect();
    if (!alborBackgroundFrame(window.innerHeight, initialRect.top, initialRect.height)) return;
    const oldTransform = art.style.transform;
    const oldMode = art.getAttribute('data-albor-background-motion');
    let disposed = false, connected = false, frame: number | null = null;
    let observer: ResizeObserver | null = null;
    const restore = () => {
      art.style.transform = oldTransform;
      if (oldMode === null) art.removeAttribute('data-albor-background-motion');
      else art.setAttribute('data-albor-background-motion', oldMode);
    };
    const blocked = () => !!page.closest('[inert], [aria-hidden="true"]') || !!page.querySelector('[data-albor-entry]');
    const paint = () => {
      frame = null;
      if (disposed || blocked()) return;
      const rect = page.getBoundingClientRect();
      const next = alborBackgroundFrame(window.innerHeight, rect.top, rect.height);
      if (!next) { restore(); return; }
      art.style.transform = `translateY(${next.offset}px)`;
      art.setAttribute('data-albor-background-motion', 'active');
    };
    const schedule = () => {
      if (!disposed && frame === null) frame = window.requestAnimationFrame(paint);
    };
    const connect = () => {
      if (disposed || connected || blocked()) return;
      const rect = page.getBoundingClientRect();
      if (!alborBackgroundFrame(window.innerHeight, rect.top, rect.height)) return;
      connected = true;
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(schedule);
        observer.observe(page);
      }
      schedule();
    };
    const afterEntry = () => {
      if (disposed || frame !== null) return;
      frame = window.requestAnimationFrame(() => { frame = null; connect(); });
    };
    window.addEventListener('enkarta:enter', afterEntry);
    connect();
    return () => {
      disposed = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('enkarta:enter', afterEntry);
      restore();
    };
  }, [root, layer, mode]);
}
