'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ease } from '@/lib/motion';
import { themeFor, type EntryTheme } from './entry/config';
import { EntryScene } from './entry/scenes';
import { emitInvitationAnalytics } from './InvitationAnalytics';

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
  const openingRef = useRef(false);

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
    // El botón vive dentro de una portada que también es clicable. El ref evita
    // que el mismo gesto burbujee y dispare dos veces analítica, música y timers
    // antes de que React alcance a reflejar el nuevo `phase`.
    if (openingRef.current || phase !== 'idle') return;
    openingRef.current = true;
    emitInvitationAnalytics('entry_open');
    setPhase('opening');
    // No forzamos `requestFullscreen`: el cambio de viewport a mitad de la
    // animación hacía que las escenas calculadas con vw/vh saltaran de tamaño
    // y se vieran deformadas, especialmente dentro de previews y en Android.
    // La portada ya ocupa el viewport visual con 100dvh.
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
            data-entry-gate
            data-entry-scene={theme.scene}
            onClick={enter}
            className={`fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden text-center ${phase === 'idle' ? 'cursor-pointer' : ''}`}
            style={{
              background: `linear-gradient(160deg, ${theme.veil} 0%, ${theme.veil2 ?? theme.veil} 100%)`,
              color: theme.ink,
              boxSizing: 'border-box',
              height: '100dvh',
              minHeight: '100svh',
              paddingTop: 'max(12px, env(safe-area-inset-top))',
              paddingRight: 'max(12px, env(safe-area-inset-right))',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              paddingLeft: 'max(12px, env(safe-area-inset-left))',
              overscrollBehavior: 'none',
            }}
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
