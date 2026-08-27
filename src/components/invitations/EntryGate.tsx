'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
  scene?: EntryTheme['scene'];
  entryVideoUrl?: string;
  entryPoster?: string;
  entryDuration?: number;
  entryOverlay?: number;
  showSkip?: boolean;
  skipLabel?: string;
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
  label = 'Ingresar a mi invitación', scene, entryVideoUrl, entryPoster,
  entryDuration = 4, entryOverlay = 42, showSkip = true,
  skipLabel = 'Omitir animación', accent, bg, text,
}: Props) {
  const [phase, setPhase] = useState<'idle' | 'opening'>('idle');
  const [gone, setGone] = useState(false);
  const [exitReady, setExitReady] = useState(false);
  const openingRef = useRef(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealDispatchedRef = useRef(false);
  const reducedMotion = useReducedMotion();

  // Bloquea el scroll del fondo mientras la portada está visible.
  useEffect(() => {
    if (gone) { document.body.style.overflow = ''; return; }
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [gone]);

  useEffect(() => () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
  }, []);

  const base = themeFor(template);
  const theme: EntryTheme = {
    ...base,
    scene: scene || base.scene,
    veil: bg || base.veil,
    veil2: bg || base.veil2,
    ink: text || base.ink,
    accent: accent || base.accent,
    script: accent || base.script,
  };
  const cinematic = theme.scene === 'cinematic';
  const cinematicDuration = Math.max(2, Math.min(8, entryDuration));
  const cinematicWait = entryVideoUrl ? cinematicDuration : 0.9;

  const armContent = () => {
    if (revealDispatchedRef.current) return;
    revealDispatchedRef.current = true;
    window.dispatchEvent(new CustomEvent('enkarta:enter'));
  };

  const enter = (skip = false) => {
    // Durante un clip ya iniciado, el botón "Omitir" adelanta la salida sin
    // repetir analítica ni volver a arrancar la música.
    if (openingRef.current && phase === 'opening') {
      if (skip && cinematic) {
        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        armContent();
        setExitReady(true);
      }
      return;
    }
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
    // "Arma" las transiciones justo cuando la portada empieza a desvanecerse.
    // En la entrada cinematográfica el tiempo coincide con el clip configurado.
    const revealAfter = skip || reducedMotion ? 80 : cinematic ? cinematicWait * 1000 : 1100;
    revealTimerRef.current = setTimeout(() => {
      armContent();
      setExitReady(true);
    }, revealAfter);
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
            onClick={() => enter(false)}
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
            animate={{ opacity: exitReady ? 0 : 1 }}
            transition={{ duration: reducedMotion ? 0.18 : 0.7, ease: ease.soft }}
            onAnimationComplete={() => { if (exitReady) setGone(true); }}
            aria-hidden={phase !== 'idle' && !cinematic}
          >
            <EntryScene
              theme={theme}
              names={names}
              initials={initials}
              dateLine={dateLine}
              coverImage={coverImage}
              videoUrl={entryVideoUrl}
              poster={entryPoster || coverImage}
              duration={cinematicWait}
              overlay={entryOverlay}
              showSkip={showSkip}
              skipLabel={skipLabel}
              label={label}
              phase={phase}
              onEnter={() => enter(false)}
              onSkip={() => enter(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
