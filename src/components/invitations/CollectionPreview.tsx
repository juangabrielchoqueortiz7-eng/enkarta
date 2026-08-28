'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/** A real, read-only cover from the public renderer; never a separate mock invitation. */
export default function CollectionPreview({ name, image, demoPath, bg = '#FAF7F2' }: { name: string; image: string; demoPath: string; bg?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const resize = new ResizeObserver(entries => setScale(entries[0].contentRect.width / 390));
    resize.observe(node);
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '80px' });
    observer.observe(node);
    return () => { resize.disconnect(); observer.disconnect(); };
  }, []);
  return <div ref={ref} className="relative w-full overflow-hidden" style={{ aspectRatio: '390 / 620', background: bg }}>
    {!loaded && <Image src={image} alt={`Portada de ${name}`} fill sizes="(max-width: 640px) 90vw, 320px" className="object-cover" />}
    {visible && <iframe src={`${demoPath}?full=1&preview=1`} title={`Vista real de ${name}`} aria-hidden tabIndex={-1} loading="lazy" onLoad={() => setLoaded(true)} className="pointer-events-none absolute left-0 top-0 border-0" style={{ width: 390, height: 620, transform: `scale(${scale})`, transformOrigin: 'top left', opacity: loaded ? 1 : 0 }} />}
  </div>;
}
