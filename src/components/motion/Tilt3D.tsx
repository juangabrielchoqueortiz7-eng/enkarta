'use client';

import { useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

/** Perspectiva que sigue al cursor. Compartida por la home y el catálogo. */
export default function Tilt3D({ children, max = 9, scale = 1.015, className = '' }: {
  children: React.ReactNode; max?: number; scale?: number; className?: string;
}) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 20 });
  const sry = useSpring(ry, { stiffness: 160, damping: 20 });
  const [hover, setHover] = useState(false);
  const reduced = useReducedMotion();

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max * 2);
    rx.set(-py * max * 2);
  };
  const onLeave = () => { rx.set(0); ry.set(0); setHover(false); };

  return (
    <div className={className} style={{ perspective: '1400px' }} onMouseMove={onMove} onMouseEnter={() => setHover(true)} onMouseLeave={onLeave}>
      <motion.div
        style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' }}
        animate={{ scale: hover ? scale : 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
