'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ease } from '@/lib/motion';
import { themeFor, type EntryTheme } from './entry/config';
import { EntryScene } from './entry/scenes';

interface Props {
  children: React.ReactNode;
  /** Plantilla activa: selecciona la escena y la paleta de la entrada. */
  template?: string;
  names: string;
  initials: string;          // "L & M"
  dateLine?: string;
  coverImage?: string;
  label?: string;            // texto del botón
  // Overrides opcionales desde config.theme (cuando el usuario personaliza la paleta)
  accent?: string;
  bg?: string;
  text?: string;
}

/**
 * Portada de entrada ("sobre") configurable y temática por plantilla. Cubre la
 * invitación hasta que el invitado pulsa el botón; al abrir reproduce la
 * animación propia de la escena (sobre, pasaporte, periódico, arco, lujo), se
 * desvanece, revela la invitación y arranca la música si la hay.
 * El enlace directo (?full=1) no monta este componente.
 */
export default function EntryGate({
  children, template, names, initials, dateLine, coverImage,
  label = 'Ingresar a mi invitación', accent, bg, text,
}: Props) {
  const [phase, setPhase] = useState<'idle' | 'opening'>('idle');
  const [gone, setGone] = useState(false);

  // Bloquea el scroll del fondo mientras la portada está visible.
  useEffect(() => {
    if (gone) { document.body.style.overflow = ''; return; }
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [gone]);

  const base = themeFor(template);
  const theme: EntryTheme = {
    ...base,
    veil: bg || base.veil,
    veil2: bg || base.veil2,
    ink: text || base.ink,
    accent: accent || base.accent,
    script: accent || base.script,
  };

  const enter = () => {
    if (phase !== 'idle') return;
    setPhase('opening');
    // Pantalla completa inmersiva (móvil y escritorio). Debe llamarse de forma
    // síncrona dentro del gesto del usuario o el navegador la rechaza. En
    // iPhone (Safari iOS) la API no existe para elementos: se ignora sin error.
    try {
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else el.webkitRequestFullscreen?.();
    } catch { /* sin soporte de fullscreen */ }
    // Inicia la música de forma SÍNCRONA dentro del gesto: iOS/Safari rechazan
    // play() diferido con setTimeout. Reintento corto por si el elemento aún
    // no estaba montado en el primer frame.
    const playAudio = () => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null;
      audio?.play().catch(() => {});
      return !!audio;
    };
    if (!playAudio()) setTimeout(playAudio, 250);
    // "Arma" las transiciones de scroll/3D justo cuando el sobre empieza a
    // desvanecerse, para que las secciones se revelen al levantarse la portada
    // (y no antes, ocultas detrás de ella).
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('enkarta:enter'));
    }, 1100);
  };

  return (
    <>
      {children}

      <AnimatePresence>
        {!gone && (
          <motion.div
            key="entry-gate"
            onClick={enter}
            className={`fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden text-center ${phase === 'idle' ? 'cursor-pointer' : ''}`}
            style={{ background: `linear-gradient(160deg, ${theme.veil} 0%, ${theme.veil2 ?? theme.veil} 100%)`, color: theme.ink }}
            initial={{ opacity: 1 }}
            animate={{ opacity: phase === 'opening' ? 0 : 1 }}
            transition={{ duration: 0.7, ease: ease.soft, delay: phase === 'opening' ? 1.05 : 0 }}
            onAnimationComplete={() => { if (phase === 'opening') setGone(true); }}
            aria-hidden={phase !== 'idle'}
          >
            <EntryScene
              theme={theme}
              names={names}
              initials={initials}
              dateLine={dateLine}
              coverImage={coverImage}
              label={label}
              phase={phase}
              onEnter={enter}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
