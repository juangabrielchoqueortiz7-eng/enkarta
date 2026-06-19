'use client';

// Motor de transiciones de scroll / 3D para las invitaciones (framer-motion).
//
// Idea: un único motor reutilizable, editable desde el panel de admin. Cada
// sección se revela al entrar en pantalla con un "preset" (fade, 3D, parallax…).
// El preset por sección lo deriva el preset GLOBAL de la invitación
// (`PageMotion`), que se inyecta con <PageMotionProvider>. Así una sola elección
// en el panel anima toda la página, y más adelante (bloques) se podrá afinar por
// sección con la prop `variant`.
//
// Uso:
//   <PageMotionProvider value={config.motion}>   // en la página / preview
//     <Plantilla />                              // sus <Reveal> usan el preset
//   </PageMotionProvider>
//
//   <ScrollReveal delay={120}>…</ScrollReveal>   // o variant="zoom" para forzar

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from 'framer-motion';
import { ease } from './motion';
import type { ScrollPreset, PageMotion, PageMotionPreset } from './types';

export type { ScrollPreset, PageMotion, PageMotionPreset };

// ── Preset global → animación por sección por defecto ─────────────────────────
const PRESET_TO_VARIANT: Record<PageMotionPreset, ScrollPreset> = {
  none: 'none',
  minimal: 'fade',
  elegant: 'fadeUp',
  editorial: 'fadeDown',
  cinematic3d: 'tilt3d',
  parallaxBook: 'flip3d',
  playful: 'pop',
  luxury3d: 'depth3d',
  gallery3d: 'swing3d',
  unfold: 'unfold3d',
};

// Fuerza del parallax de fondo por preset (0 = apagado).
const PRESET_TO_PARALLAX: Record<PageMotionPreset, number> = {
  none: 0,
  minimal: 0.04,
  elegant: 0.07,
  editorial: 0.08,
  cinematic3d: 0.14,
  parallaxBook: 0.2,
  playful: 0.1,
  luxury3d: 0.16,
  gallery3d: 0.12,
  unfold: 0.1,
};

/** Metadatos para el panel "Animación". */
export const PAGE_MOTION_PRESETS: { value: PageMotionPreset; label: string; desc: string; emoji: string }[] = [
  { value: 'elegant',      label: 'Elegante',        desc: 'Fundido + leve subida (clásico)', emoji: '🌿' },
  { value: 'luxury3d',     label: 'Lujo 3D',         desc: 'Emerge desde la profundidad con parallax', emoji: '💎' },
  { value: 'cinematic3d',  label: 'Cinemático 3D',   desc: 'Secciones inclinadas con profundidad', emoji: '🎬' },
  { value: 'gallery3d',    label: 'Galería 3D',      desc: 'Cada sección gira como una puerta', emoji: '🚪' },
  { value: 'unfold',       label: 'Despliegue 3D',   desc: 'Las secciones se despliegan desde el plano', emoji: '📐' },
  { value: 'parallaxBook', label: 'Parallax / Libro', desc: 'Volteo 3D de páginas + parallax', emoji: '📖' },
  { value: 'editorial',    label: 'Editorial',       desc: 'Entra desde arriba, sobrio', emoji: '📰' },
  { value: 'playful',      label: 'Festivo',         desc: 'Aparece con un rebote alegre', emoji: '🎉' },
  { value: 'minimal',      label: 'Mínimo',          desc: 'Solo un fundido suave', emoji: '✨' },
  { value: 'none',         label: 'Sin animación',   desc: 'Todo estático', emoji: '⏹️' },
];

// ── Resolución del contexto ───────────────────────────────────────────────────
interface ResolvedMotion {
  preset: PageMotionPreset;
  variant: ScrollPreset; // animación por sección por defecto
  perspective: number;
  intensity: number;
  parallax: number;      // fuerza del parallax de fondo
  reduced: boolean;
  /** Las animaciones solo arrancan cuando la página está "armada" (tras la portada). */
  armed: boolean;
  /** Contenedor de scroll para detectar la entrada en pantalla (null = ventana). */
  scrollRoot?: React.RefObject<HTMLElement>;
}

function resolveMotion(value: PageMotion | undefined, reduced: boolean): Omit<ResolvedMotion, 'armed' | 'scrollRoot'> {
  const preset = value?.preset ?? 'elegant';
  return {
    preset,
    variant: PRESET_TO_VARIANT[preset],
    perspective: value?.perspective ?? 1000,
    intensity: value?.intensity ?? 1,
    parallax: PRESET_TO_PARALLAX[preset],
    reduced,
  };
}

const MotionCtx = createContext<ResolvedMotion>({ ...resolveMotion(undefined, false), armed: true });
export const usePageMotion = () => useContext(MotionCtx);

export function PageMotionProvider({
  value,
  children,
  scrollRoot,
  gated,
}: {
  value?: PageMotion | null;
  children: React.ReactNode;
  /** Contenedor de scroll (preview del editor); por defecto, la ventana. */
  scrollRoot?: React.RefObject<HTMLElement>;
  /** Si la invitación tiene portada ("sobre"): no animar hasta que el invitado entre. */
  gated?: boolean;
}) {
  const reduced = !!useReducedMotion();
  const [armed, setArmed] = useState(!gated);

  useEffect(() => {
    if (!gated) { setArmed(true); return; }
    const onEnter = () => setArmed(true);
    window.addEventListener('enkarta:enter', onEnter);
    return () => window.removeEventListener('enkarta:enter', onEnter);
  }, [gated]);

  const resolved: ResolvedMotion = { ...resolveMotion(value ?? undefined, reduced), armed, scrollRoot };
  return <MotionCtx.Provider value={resolved}>{children}</MotionCtx.Provider>;
}

// ── Variants por preset ───────────────────────────────────────────────────────
function buildVariants(v: ScrollPreset, intensity: number, perspective: number): Variants {
  const y = 30 * intensity;
  const persp = { transformPerspective: perspective };
  switch (v) {
    case 'fade':
      return { hidden: { opacity: 0 }, show: { opacity: 1 } };
    case 'fadeDown':
      return { hidden: { opacity: 0, y: -y }, show: { opacity: 1, y: 0 } };
    case 'slideLeft':
      return { hidden: { opacity: 0, x: 48 * intensity }, show: { opacity: 1, x: 0 } };
    case 'slideRight':
      return { hidden: { opacity: 0, x: -48 * intensity }, show: { opacity: 1, x: 0 } };
    case 'pop':
      return { hidden: { opacity: 0, scale: 0.6 }, show: { opacity: 1, scale: 1 } };
    case 'rotateIn':
      return { hidden: { opacity: 0, rotate: -8 * intensity, scale: 0.96 }, show: { opacity: 1, rotate: 0, scale: 1 } };
    case 'zoom':
      return { hidden: { opacity: 0, scale: 1 - 0.09 * intensity }, show: { opacity: 1, scale: 1 } };
    case 'tilt3d':
      return {
        hidden: { opacity: 0, y: y * 0.7, rotateX: 16 * intensity, ...persp },
        show: { opacity: 1, y: 0, rotateX: 0, ...persp },
      };
    case 'flip3d':
      return {
        hidden: { opacity: 0, y: y * 0.5, rotateX: 72 * intensity, ...persp },
        show: { opacity: 1, y: 0, rotateX: 0, ...persp },
      };
    case 'curtain':
      return {
        hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0)' },
        show: { opacity: 1, clipPath: 'inset(0 0 0% 0)' },
      };
    case 'blur':
      return {
        hidden: { opacity: 0, filter: `blur(${12 * intensity}px)` },
        show: { opacity: 1, filter: 'blur(0px)' },
      };
    case 'swing3d':
      // Puerta: gira desde el lateral izquierdo con el eje en el borde.
      return {
        hidden: { opacity: 0, rotateY: -50 * intensity, x: -18 * intensity, transformOrigin: 'left center', ...persp },
        show: { opacity: 1, rotateY: 0, x: 0, transformOrigin: 'left center', ...persp },
      };
    case 'unfold3d':
      // Se despliega desde el plano (90° → 0°), como abrir un tríptico.
      return {
        hidden: { opacity: 0, rotateY: 88, scale: 0.96, ...persp },
        show: { opacity: 1, rotateY: 0, scale: 1, ...persp },
      };
    case 'depth3d':
      // Emerge desde la profundidad: pequeña, inclinada y desenfocada.
      return {
        hidden: { opacity: 0, scale: 1 - 0.16 * intensity, y: y * 0.6, rotateX: 8 * intensity, filter: `blur(${4 * intensity}px)`, ...persp },
        show: { opacity: 1, scale: 1, y: 0, rotateX: 0, filter: 'blur(0px)', ...persp },
      };
    case 'riseSoft':
      // Ascenso editorial: lento, con escala apenas perceptible.
      return {
        hidden: { opacity: 0, y: y * 1.2, scale: 0.985 },
        show: { opacity: 1, y: 0, scale: 1 },
      };
    case 'fadeUp':
    default:
      return { hidden: { opacity: 0, y }, show: { opacity: 1, y: 0 } };
  }
}

const VIEWPORT = { once: true, amount: 0.2, margin: '0px 0px -8% 0px' } as const;

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Retraso de entrada en ms (compatibilidad con el antiguo <Reveal>). */
  delay?: number;
  /** Fuerza un preset concreto en esta sección (si no, usa el global). */
  variant?: ScrollPreset;
  /** Anima cada vez que entra (por defecto solo la primera vez). */
  repeat?: boolean;
}

/**
 * Sección que se revela al hacer scroll. Reemplaza al antiguo `Reveal`; lee el
 * preset global del contexto salvo que se le pase `variant`.
 */
export function ScrollReveal({ children, className, style, delay = 0, variant, repeat = false }: ScrollRevealProps) {
  const m = usePageMotion();
  const v = variant ?? m.variant;
  const ref = useRef<HTMLDivElement>(null);
  // Detecta la entrada en pantalla usando el contenedor de scroll correcto
  // (la ventana en la invitación real; el "teléfono" en el preview del editor).
  const inView = useInView(ref, {
    once: !repeat,
    amount: 0.2,
    margin: '0px 0px -8% 0px',
    root: m.scrollRoot,
  });

  // Accesibilidad / preset apagado → render directo sin animación.
  if (m.reduced || v === 'none') {
    return (
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    );
  }

  if (v === 'parallax') {
    return (
      <ParallaxReveal className={className} style={style} delay={delay} intensity={m.intensity}>
        {children}
      </ParallaxReveal>
    );
  }

  if (v === 'zoomScroll') {
    return (
      <ZoomScrollReveal className={className} style={style} delay={delay} intensity={m.intensity}>
        {children}
      </ZoomScrollReveal>
    );
  }

  const variants = buildVariants(v, m.intensity, m.perspective);
  // Solo se revela cuando la página está "armada" (tras la portada) y está en vista.
  const show = m.armed && inView;
  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      animate={show ? 'show' : 'hidden'}
      transition={{ duration: 0.85, ease: ease.soft, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}

// Entrada con deriva continua ligada al progreso de scroll de la propia sección.
function ParallaxReveal({
  children,
  className,
  style,
  delay,
  intensity,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay: number;
  intensity: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [40 * intensity, -40 * intensity]);
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y, ...style }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.8, ease: ease.soft, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}

// Zoom continuo ligado al scroll (efecto Ken Burns): la sección crece sutilmente
// mientras se desplaza por la pantalla. Ideal para fotos.
function ZoomScrollReveal({
  children,
  className,
  style,
  delay,
  intensity,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay: number;
  intensity: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1 - 0.05 * intensity, 1, 1 + 0.04 * intensity]);
  const y = useTransform(scrollYProgress, [0, 1], [24 * intensity, -24 * intensity]);
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ scale, y, ...style }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.8, ease: ease.soft, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Capa de fondo con parallax (para fondos ilustrados/fijos). La fuerza la toma
 * del preset global salvo que se pase `strength`. Cross-browser (framer-motion),
 * sustituye al parallax CSS `scroll-timeline` que solo funciona en Chrome.
 */
export function ParallaxLayer({
  children,
  className,
  style,
  strength,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  strength?: number;
}) {
  const m = usePageMotion();
  const s = strength ?? m.parallax;
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 1000 * s], { clamp: false });
  if (m.reduced || s === 0) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div className={className} style={{ y, ...style }}>
      {children}
    </motion.div>
  );
}
