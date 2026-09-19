'use client';

import { motion } from 'framer-motion';

/** Entrada elegante al entrar en viewport. Compartida por la home y el catálogo. */
export default function Reveal({ children, delay = 0, y = 32, className = '' }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
