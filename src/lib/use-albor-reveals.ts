'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useMediaPreferences } from './use-media-preferences';

/** Photographs unfold like printed plates; headings lead their supporting copy. */
export function useAlborReveals(root: RefObject<HTMLDivElement>, preview: boolean, disabled: boolean) {
  const media = useMediaPreferences();
  const seen = useRef(new WeakSet<Element>());
  const mode = preview ? 'preview' : disabled ? 'disabled' : !media.ready ? 'pending' : media.reducedMotion ? 'reduced' : media.saveData ? 'save-data' : !media.pageVisible ? 'hidden' : 'active';
  useEffect(() => {
    const node = root.current;
    if (!node || preview || disabled || !media.ready || media.reducedMotion || media.saveData || !media.pageVisible || typeof IntersectionObserver === 'undefined') return;
    let observer: IntersectionObserver | null = null;
    let frame: number | null = null;
    let disposed = false;
    const animations = new Set<Animation>();
    const blocked = 'form, details, [role="status"], [aria-live], [aria-roledescription="carrusel"], [data-albor-original-icon]';
    const connect = () => {
      if (disposed || node.closest('[inert], [aria-hidden="true"]') || node.querySelector('[data-albor-entry]')) return;
      observer?.disconnect();
      let copyIndex = 0;
      const delays = new WeakMap<Element, number>();
      observer = new IntersectionObserver(entries => {
        if (disposed) return;
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          if (!entry.isIntersecting || seen.current.has(element) || element.closest('[inert], [aria-hidden="true"]')) continue;
          seen.current.add(element);
          observer?.unobserve(element);
          if (typeof element.animate !== 'function') continue;
          const photo = element.hasAttribute('data-albor-photo');
          const heading = /^H[123]$/.test(element.tagName);
          const frames: Keyframe[] = photo
            ? [{ opacity: .6, transform: 'translateY(20px) scale(1.025)', clipPath: 'inset(6% 0 6% 0)' }, { opacity: 1, transform: 'translateY(0) scale(1)', clipPath: 'inset(0% 0 0% 0)' }]
            : [{ opacity: heading ? .35 : .55, transform: `translateY(${heading ? 20 : 12}px)` }, { opacity: 1, transform: 'translateY(0)' }];
          try {
            const animation = element.animate(frames, { duration: photo ? 900 : heading ? 700 : 650, delay: photo || heading ? 0 : delays.get(element) ?? 0, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
          } catch { /* Unsupported effects leave the default, fully visible document. */ }
        }
      }, { threshold: .14 });
      node.querySelectorAll<HTMLElement>('[data-albor-section] h1, [data-albor-section] h2, [data-albor-section] h3, [data-albor-section] p, [data-albor-photo]').forEach(element => {
        if (element.closest(blocked) || seen.current.has(element)) return;
        if (element.tagName === 'P') delays.set(element, (copyIndex++ % 3 + 1) * 70);
        observer?.observe(element);
      });
    };
    connect();
    const afterEntry = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { frame = null; connect(); });
    };
    window.addEventListener('enkarta:enter', afterEntry);
    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      window.removeEventListener('enkarta:enter', afterEntry);
    };
  }, [root, preview, disabled, media.ready, media.reducedMotion, media.saveData, media.pageVisible]);
  return mode;
}
