// Reusable framer-motion presets for the whole site.
// Import these instead of re-declaring variants in every component, so the
// motion language (timing, easing, distances) stays consistent across pages
// and invitations — the same idea as a small in-house "Framer Motion" toolkit.
//
// Usage:
//   import { motion } from 'framer-motion';
//   import { fadeUp, stagger, viewport } from '@/lib/motion';
//
//   <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={viewport}>
//     <motion.h2 variants={fadeUp}>Título</motion.h2>
//   </motion.section>

import type { Variants, Transition } from 'framer-motion';

// Signature easings (cubic-bezier). `soft` is the default for most reveals.
export const ease = {
  soft: [0.22, 1, 0.36, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  out: [0, 0, 0.2, 1] as [number, number, number, number],
};

export const duration = { fast: 0.4, base: 0.7, slow: 1.1 };

// Shared viewport config: animate once, when ~25% is on screen.
export const viewport = { once: true, amount: 0.25 } as const;

const baseT = (d = duration.base, delay = 0): Transition => ({
  duration: d,
  delay,
  ease: ease.soft,
});

// ── Entrance variants (use with initial="hidden" + animate/whileInView="show") ──
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: baseT() },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -26 },
  show: { opacity: 1, y: 0, transition: baseT() },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: baseT() },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: baseT() },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: baseT() },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: baseT() },
};

// Container that reveals its children one after another.
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

export const staggerFast: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

// Gentle infinite float — for ornaments / seals.
export const float: Variants = {
  show: {
    y: [0, -9, 0],
    transition: { duration: 4.6, ease: ease.inOut, repeat: Infinity },
  },
};
