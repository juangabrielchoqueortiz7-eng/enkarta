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
  const contentRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    if (gone) {
      content.removeAttribute('inert');
      const heading = content.querySelector<HTMLElement>('h1, h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    } else {
      content.setAttribute('inert', '');
      gateRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    }
  }, [gone]);

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

  const enter = (skip = false, withMusic = true) => {
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
      const audio = contentRef.current?.querySelector<HTMLAudioElement>('audio[data-invitation-music], audio');
      if (withMusic) audio?.play().catch(() => window.dispatchEvent(new Event('enkarta:audio-error')));
      else audio?.pause();
      return !!audio;
    };
    playAudio();
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
      <div ref={contentRef} aria-hidden={!gone} style={{ display: 'contents' }}>{children}</div>

      <AnimatePresence>
        {!gone && (
          <motion.div
            ref={gateRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onKeyDown={event => {
              if (event.key === 'Escape') { event.preventDefault(); enter(true, false); }
              if (event.key !== 'Tab') return;
              const items = gateRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]');
              if (!items?.length) return;
              const first = items[0], last = items[items.length - 1];
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }}
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
            {phase === 'idle' && <button type="button" onClick={event => { event.stopPropagation(); enter(false, false); }} className="absolute right-4 top-4 min-h-11 rounded-full border border-current bg-white/95 px-4 text-xs text-[#30291f]" style={{ top: 'max(16px, env(safe-area-inset-top))' }}>Abrir sin música</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
