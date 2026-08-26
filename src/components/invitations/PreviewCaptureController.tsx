'use client';

import { useEffect } from 'react';

export default function PreviewCaptureController({ position }: { position: 'cover' | 'middle' | 'end' }) {
  useEffect(() => {
    const move = () => {
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: position === 'cover' ? 0 : position === 'middle' ? maximum * 0.5 : maximum, behavior: 'auto' });
    };
    const first = window.setTimeout(move, 180);
    const second = window.setTimeout(move, 900);
    return () => { window.clearTimeout(first); window.clearTimeout(second); };
  }, [position]);
  return null;
}
