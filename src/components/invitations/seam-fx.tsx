'use client';

// Efectos de scroll sobre la costura entre bandas.
//
// `<Seam>` dibuja un borde estático. Aquí ese borde pasa a ser un momento: la
// forma se pliega en 3D, se abre como un telón o desenfoca lo que queda detrás,
// todo ligado al scroll (no a un temporizador), así que el invitado controla la
// transición con el pulgar.
//
// El progreso se mide con `container: m.scrollRoot`, igual que `PinnedStory`:
// sin eso los efectos funcionarían en la invitación publicada pero no en el
// preview del editor, que scrollea dentro del "teléfono" y no en la ventana.

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useMotionTemplate } from 'framer-motion';
import { Seam, type SeamShape } from './shared';
import { usePageMotion } from '@/lib/scroll-motion';

/** Efecto de entrada de la costura. */
export type SeamFxKind = 'none' | 'depth' | 'fold' | 'glass' | 'curtain';

export const SEAM_FX_OPTIONS: { key: SeamFxKind; label: string; desc: string }[] = [
  { key: 'none',    label: 'Sin efecto',   desc: 'El borde, quieto' },
  { key: 'depth',   label: 'Profundidad',  desc: 'La forma flota sobre la banda' },
  { key: 'fold',    label: 'Pliegue 3D',   desc: 'El borde cae y se asienta' },
  { key: 'glass',   label: 'Cristal',      desc: 'Franja translúcida que desenfoca' },
  { key: 'curtain', label: 'Telón',        desc: 'Dos mitades que cierran el corte' },
];

interface Props {
  fx?: SeamFxKind;
  shape: SeamShape;
  from: string;
  hairline?: string;
  height: number;
  style?: React.CSSProperties;
}

/**
 * Costura con efecto. Los hooks se llaman SIEMPRE (aunque el efecto sea 'none' o
 * el usuario pida menos movimiento) porque este componente se monta con una
 * forma fija por render site: sacar los hooks detrás de un `if` los volvería
 * condicionales en cuanto alguien cambie el efecto desde el panel.
 */
export function SeamFx({ fx = 'none', shape, from, hairline, height, style }: Props) {
  const m = usePageMotion();
  const ref = useRef<HTMLDivElement>(null);
  // 0 cuando la costura asoma por abajo, 1 cuando llega al centro de la pantalla.
  const { scrollYProgress } = useScroll({
    target: ref,
    container: m.scrollRoot,
    offset: ['start end', 'start center'],
  });

  // REGLA de todos los efectos: terminan SIEMPRE en la costura correcta. Un
  // efecto que acaba desplazado o abierto deja un corte recto y se lee como un
  // fallo, no como una transición.
  const driftY = useTransform(scrollYProgress, [0, 1], [26, 0]);
  const shadow = useTransform(scrollYProgress, [0, 1], [0, 0.2]);
  const shadowCss = useMotionTemplate`drop-shadow(0 10px 18px rgba(20,14,8,${shadow}))`;

  const rotate = useTransform(scrollYProgress, [0, 1], [44, 0]);
  const foldFade = useTransform(scrollYProgress, [0, 0.55], [0.25, 1]);

  const blurPx = useTransform(scrollYProgress, [0, 1], [16, 3]);
  const blurCss = useMotionTemplate`blur(${blurPx}px)`;

  // Las mitades vienen de fuera y CIERRAN sobre el corte, no al revés.
  const openL = useTransform(scrollYProgress, [0, 0.9], ['-54%', '0%']);
  const openR = useTransform(scrollYProgress, [0, 0.9], ['54%', '0%']);

  // El marcador va vacío y sin alto: solo sirve para medir dónde empieza la
  // costura. El dibujo real lo pinta `Seam`, que se posiciona solo.
  const probe = <div ref={ref} className="pointer-events-none absolute inset-x-0 top-0" style={{ height }} aria-hidden />;
  const plain = <Seam shape={shape} from={from} hairline={hairline} height={height} style={style} />;

  // Accesibilidad y presets sin movimiento: el borde queda estático, pero el
  // marcador se monta igualmente porque useScroll necesita hidratar su ref.
  if (fx === 'none' || m.reduced || m.variant === 'none') return <>{probe}{plain}</>;

  if (fx === 'depth') {
    return (
      <>
        {probe}
        <motion.div className="pointer-events-none absolute inset-x-0 top-0 z-[2]" style={{ y: driftY, filter: shadowCss }} aria-hidden>
          <Seam shape={shape} from={from} hairline={hairline} height={height} shadow={false} style={{ position: 'relative' }} />
        </motion.div>
      </>
    );
  }

  if (fx === 'fold') {
    return (
      <>
        {probe}
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-0 z-[2]"
          style={{ rotateX: rotate, opacity: foldFade, transformPerspective: 900, transformOrigin: 'top center' }}
          aria-hidden
        >
          <Seam shape={shape} from={from} hairline={hairline} height={height} style={{ position: 'relative' }} />
        </motion.div>
      </>
    );
  }

  if (fx === 'glass') {
    return (
      <>
        {probe}
        {plain}
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-0 z-[3]"
          style={{
            height,
            backdropFilter: blurCss,
            WebkitBackdropFilter: blurCss,
            background: `linear-gradient(180deg, ${from}22, transparent)`,
          }}
          aria-hidden
        />
      </>
    );
  }

  // Telón: dos mitades de la MISMA forma, recortada cada una a su lado, que
  // entran desde los bordes y se juntan en el centro al asentarse la sección.
  return (
    <>
      {probe}
      <motion.div className="pointer-events-none absolute inset-x-0 top-0 z-[2]" style={{ x: openL, clipPath: 'inset(0 50% 0 0)' }} aria-hidden>
        <Seam shape={shape} from={from} hairline={hairline} height={height} style={{ position: 'relative' }} />
      </motion.div>
      <motion.div className="pointer-events-none absolute inset-x-0 top-0 z-[2]" style={{ x: openR, clipPath: 'inset(0 0 0 50%)' }} aria-hidden>
        <Seam shape={shape} from={from} hairline={hairline} height={height} style={{ position: 'relative' }} />
      </motion.div>
    </>
  );
}
