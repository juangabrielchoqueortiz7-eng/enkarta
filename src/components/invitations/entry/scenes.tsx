'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ease } from '@/lib/motion';
import type { EntryTheme, Ornament } from './config';
import {
  Grain, Linen, SealPressed, darken, GoldRule, OpenCue,
  EnterButton, Monogram,
} from './materials';

export interface SceneProps {
  theme: EntryTheme;
  names: string;
  initials: string;
  dateLine?: string;
  coverImage?: string;
  label: string;
  phase: 'idle' | 'opening';
  onEnter: () => void;
}

/**
 * Separación entre las piezas apiladas de una escena (etiqueta, visual grande,
 * pista, botón). Va en `vh` y no fija, porque la portada NO hace scroll: en un
 * Android corto con la barra de direcciones puesta, un `gap-7` fijo empujaba el
 * botón de entrar por debajo del corte. A 812px de alto sale ~28px, o sea lo
 * mismo de siempre; solo aprieta cuando la pantalla es baja de verdad.
 */
const SCENE_GAP = 'clamp(16px, 3.4vh, 28px)';

// ── Small shared primitives ───────────────────────────────────────────────────
function Tagline({ theme }: { theme: EntryTheme }) {
  if (!theme.tagline) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: ease.soft }}
      className="font-cinzel uppercase"
      style={{ color: theme.soft, letterSpacing: '0.34em', fontSize: 11 }}
    >
      {theme.tagline}
    </motion.p>
  );
}

/** Couple names (script) + date caps — shared block below most motifs. */
function NamesBlock({ theme, names, dateLine, serif }: { theme: EntryTheme; names: string; dateLine?: string; serif?: boolean }) {
  return (
    <div className="text-center">
      <h1 className={serif ? 'font-playfair font-semibold leading-tight' : 'font-great leading-none'}
        style={{ color: theme.script, fontSize: serif ? 'clamp(30px,7vw,46px)' : 'clamp(40px,10vw,64px)' }}>
        {names}
      </h1>
      {dateLine && (
        <p className="font-cinzel mt-3 uppercase" style={{ color: theme.soft, letterSpacing: '0.3em', fontSize: 12 }}>
          {dateLine}
        </p>
      )}
    </div>
  );
}

// ── Decorative sprig (line-art) ────────────────────────────────────────────────
function Sprig({ kind, color, className, style }: { kind: Ornament; color: string; className?: string; style?: React.CSSProperties }) {
  if (kind === 'none') return null;
  const leaf = (x: number, y: number, rx: number, ry: number, rot: number) => (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <path d={`M${x - rx} ${y} Q ${x} ${y - ry} ${x + rx} ${y} Q ${x} ${y + ry} ${x - rx} ${y} Z`} />
      <line x1={x - rx} y1={y} x2={x + rx} y2={y} strokeWidth="0.5" />
    </g>
  );
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" aria-hidden>
      <path d="M8 8 C 40 26, 64 50, 86 92" opacity="0.8" />
      {(kind === 'leaf' || kind === 'sage' || kind === 'palm') && (
        <>
          {leaf(30, 28, 14, 6, -36)}{leaf(50, 50, 16, 7, -28)}{leaf(70, 74, 15, 6, -20)}
          {leaf(20, 42, 11, 5, -64)}{leaf(44, 68, 12, 5, -58)}
        </>
      )}
      {kind === 'orchid' && (
        <g transform="translate(60 56)" opacity="0.9">
          <ellipse cx="0" cy="-10" rx="6" ry="10" />
          <ellipse cx="-11" cy="-2" rx="10" ry="6" transform="rotate(-30)" />
          <ellipse cx="11" cy="-2" rx="10" ry="6" transform="rotate(30)" />
          <ellipse cx="-7" cy="8" rx="7" ry="5" transform="rotate(-18)" />
          <ellipse cx="7" cy="8" rx="7" ry="5" transform="rotate(18)" />
          <circle cx="0" cy="0" r="2" />
        </g>
      )}
      {kind === 'rose' && (
        <g transform="translate(58 54)" opacity="0.9">
          <circle cx="0" cy="0" r="3" />
          <path d="M0 0 C 7 -7, 16 -2, 12 8 C 8 16, -6 16, -10 6 C -13 -2, -6 -10, 4 -10 C 16 -10, 20 2, 14 12" />
        </g>
      )}
      {kind === 'pampas' && (
        <g transform="translate(58 50)" opacity="0.85">
          {[-26, -13, 0, 13, 26].map((a) => (
            <line key={a} x1="0" y1="0" x2={Math.sin((a * Math.PI) / 180) * 34} y2={-Math.cos((a * Math.PI) / 180) * 34} strokeWidth="0.6" />
          ))}
        </g>
      )}
      {kind === 'lavender' && (
        <g opacity="0.9">
          {[[34, 34, -22], [56, 52, -8], [76, 76, -30]].map(([x, y, rot], i) => (
            <g key={i} transform={`rotate(${rot} ${x} ${y})`}>
              <line x1={x} y1={y + 22} x2={x} y2={y - 22} strokeWidth="0.8" />
              {[-16, -8, 0, 8, 16].map(dy => (
                <g key={dy}>
                  <ellipse cx={x - 3} cy={y + dy} rx="3" ry="1.7" transform={`rotate(-28 ${x - 3} ${y + dy})`} />
                  <ellipse cx={x + 3} cy={y + dy + 3} rx="3" ry="1.7" transform={`rotate(28 ${x + 3} ${y + dy + 3})`} />
                </g>
              ))}
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

function CornerSprigs({ theme }: { theme: EntryTheme }) {
  if (theme.ornament === 'none') return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden style={{ opacity: 0.5 }}>
      <Sprig kind={theme.ornament} color={theme.accent} className="absolute -top-3 -left-3 w-[34vw] max-w-[230px]" />
      <Sprig kind={theme.ornament} color={theme.accent} className="absolute -bottom-3 -right-3 w-[34vw] max-w-[230px]" style={{ transform: 'scale(-1)' }} />
    </div>
  );
}

const reveal = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

// ══════════════════════ ENVELOPE (Dolce Vita, Grazia, Napoly, Allegria…) ═══════
// El sobre NO es un dibujo dentro de la página: es la página. Ocupa el viewport
// entero, las dos solapas convergen en el centro y ahí va el lacre, único punto
// de color y único elemento interactivo. Nombres, fecha y botón salen de aquí a
// propósito: el impacto viene de la escala y de un solo objeto, no de acumular.
/** Puntos de una cúpula (semielipse) de altura `amp`, de izquierda a derecha. */
function dome(amp: number, steps = 16): string[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = (i / steps) * 100;
    const y = amp * Math.sqrt(Math.max(0, 1 - ((x - 50) / 50) ** 2));
    return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
  });
}

/**
 * Cómo convergen las dos solapas en el centro. Es lo que diferencia un sobre de
 * otro ahora que la portada es monocroma: punta clásica, curva romántica o
 * corte recto minimalista.
 */
function flapClips(flap: EntryTheme['flap']) {
  if (flap === 'square') {
    return { arriba: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', abajo: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' };
  }
  if (flap === 'curve') {
    return {
      arriba: `polygon(0% 0%, 100% 0%, ${dome(100).reverse().join(', ')})`,
      abajo: `polygon(${dome(100).map(pt => { const [x, y] = pt.split(' '); return `${x} ${(100 - parseFloat(y)).toFixed(1)}%`; }).join(', ')}, 100% 100%, 0% 100%)`,
    };
  }
  return { arriba: 'polygon(0 0, 100% 0, 50% 100%)', abajo: 'polygon(50% 0, 100% 100%, 0 100%)' };
}

function EnvelopeScene({ theme, initials, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;

  // Monocromo a propósito: el papel es un solo tono y la ÚNICA nota de color es
  // el lacre. Un objeto grande + un punto focal es lo que da impacto; llenar la
  // portada de nombres, fechas, botones y ramitas es lo que se lo quitaba.
  const cuerpo = `linear-gradient(150deg, rgba(255,255,255,0.5), rgba(0,0,0,0.03)), ${theme.panel}`;
  const solapa = `linear-gradient(180deg, rgba(255,255,255,0.28), rgba(0,0,0,0.07)), ${theme.panel}`;
  const clip = flapClips(theme.flap);

  const flap = (lado: 'arriba' | 'abajo') => {
    const arriba = lado === 'arriba';
    return (
      <motion.div
        className="absolute left-0 right-0"
        style={{
          height: '50%',
          [arriba ? 'top' : 'bottom']: 0,
          background: solapa,
          clipPath: arriba ? clip.arriba : clip.abajo,
          transformOrigin: arriba ? 'top center' : 'bottom center',
          // La sombra del pliegue cae hacia el centro, donde se juntan las puntas.
          filter: `drop-shadow(0 ${arriba ? 6 : -6}px 14px rgba(0,0,0,0.16))`,
        }}
        initial={false}
        animate={opening ? { rotateX: arriba ? -96 : 96, opacity: 0 } : { rotateX: 0, opacity: 1 }}
        transition={{ duration: 1, ease: ease.inOut, delay: opening ? 0.35 : 0 }}
      >
        <Linen opacity={0.6} />
      </motion.div>
    );
  };

  return (
    <div className="absolute inset-0" style={{ perspective: 1800 }}>
      {/* Interior del sobre: se ve por los lados y al abrirse las solapas */}
      {/* Sin estampado: a pantalla completa el motivo repetido se lee como papel
          pintado y rompe la calma. El lino solo ya da la sensación de papel. */}
      <div className="absolute inset-0" style={{ background: cuerpo }}>
        <Linen opacity={0.45} />
      </div>

      {flap('arriba')}
      {flap('abajo')}

      {/* Único elemento interactivo: el lacre. Es un botón de verdad para que
          funcione con teclado y lectores de pantalla aunque no parezca uno. */}
      <motion.div
        className="absolute left-1/2 top-1/2 z-10 flex flex-col items-center"
        style={{ transform: 'translate(-50%, -50%)' }}
        // initial={false}: el lacre es el ÚNICO elemento interactivo de la
        // portada, así que nunca puede depender de que la animación llegue a
        // correr. Con initial opacity 0 se quedaba invisible en cualquier
        // situación que congele el bucle de animación (pestaña en segundo
        // plano, por ejemplo) y la invitación no se podía abrir.
        initial={false}
        animate={opening ? { opacity: 0, scale: 1.06 } : { opacity: 1, scale: 1 }}
        transition={{ duration: opening ? 0.45 : 1.1, ease: ease.soft }}
      >
        {theme.tagline && (
          <p
            className="font-cinzel uppercase"
            style={{ color: theme.soft, letterSpacing: '0.34em', fontSize: 10, marginBottom: 18 }}
          >
            {theme.tagline}
          </p>
        )}
        <motion.button
          onClick={onEnter}
          aria-label={label}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="cursor-pointer"
          style={{ background: 'none', border: 0, padding: 0, lineHeight: 0 }}
        >
          <SealPressed
            initials={initials}
            wax={theme.accent}
            waxDeep={darken(theme.accent, 0.45)}
            ink={darken(theme.accent, 0.68)}
            size={132}
          />
        </motion.button>
        <motion.svg
          width="20" height="12" viewBox="0 0 24 14" fill="none"
          stroke={theme.soft} strokeWidth="1.3" style={{ marginTop: 20 }}
          animate={reduce ? {} : { y: [0, 5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 7 8-7" />
        </motion.svg>
      </motion.div>
    </div>
  );
}


// ══════════════════════ PASSPORT (Passport) ══════════════════════
function PassportScene({ theme, names, initials, dateLine, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  return (
    <motion.div className="relative z-10 flex flex-col items-center px-6" style={{ gap: SCENE_GAP }}
      variants={{ show: { transition: { staggerChildren: 0.14 } } }} initial="hidden" animate="show">
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.8, ease: ease.soft }} style={{ perspective: 1500 }}>
        <motion.div
          className="relative flex flex-col items-center justify-between text-center"
          style={{
            // El término en vh solo entra en pantallas cortas: a 812px de alto
            // 42vh son 341px y gana el tope de 300px de siempre.
            width: 'min(78vw, 300px, 42vh)', aspectRatio: '2 / 2.7', background: theme.panel,
            transformOrigin: 'left center', transformStyle: 'preserve-3d', borderRadius: 12,
            border: `2px solid ${theme.accent}`, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)', padding: '26px 22px',
          }}
          animate={opening ? { rotateY: -118, opacity: 0 } : { rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.95, ease: ease.inOut }}
        >
          <p className="font-cinzel uppercase" style={{ color: theme.accent, letterSpacing: '0.3em', fontSize: 12 }}>Pasaporte</p>
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full flex items-center justify-center" style={{ width: 96, height: 96, border: `1.5px solid ${theme.accent}` }}>
              <span className="font-great whitespace-nowrap" style={{ color: theme.script, fontSize: 30, lineHeight: 1 }}>{initials}</span>
            </div>
            <h1 className="font-great leading-none" style={{ color: theme.script, fontSize: 'clamp(30px,8vw,42px)' }}>{names}</h1>
          </div>
          <div className="w-full">
            <div className="h-px w-full" style={{ background: `${theme.accent}66` }} />
            <p className="font-cinzel uppercase mt-3" style={{ color: theme.soft, letterSpacing: '0.22em', fontSize: 11 }}>{dateLine}</p>
          </div>
        </motion.div>
      </motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><OpenCue color={theme.soft} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><EnterButton theme={theme} label={label} onEnter={onEnter} solid /></motion.div>
    </motion.div>
  );
}

// ══════════════════════ NEWSPAPER (Primicia) ══════════════════════
function NewspaperScene({ theme, names, dateLine, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  return (
    <motion.div className="relative z-10 flex flex-col items-center gap-7 px-6"
      variants={{ show: { transition: { staggerChildren: 0.14 } } }} initial="hidden" animate="show">
      <motion.div variants={reveal} transition={{ duration: 0.8, ease: ease.soft }} style={{ perspective: 1500 }}>
        <motion.div
          className="relative text-center"
          style={{
            width: 'min(88vw, 380px)', background: theme.panel, padding: '26px 24px',
            transformOrigin: 'bottom center', boxShadow: '0 30px 60px -22px rgba(0,0,0,0.4)',
            border: `1px solid ${theme.ink}22`,
          }}
          animate={opening ? { rotateX: -16, y: '-46%', opacity: 0 } : { rotateX: 0, y: 0, opacity: 1 }}
          transition={{ duration: 0.85, ease: ease.inOut }}
        >
          <p className="font-cinzel uppercase" style={{ color: theme.soft, letterSpacing: '0.34em', fontSize: 10 }}>{theme.tagline}</p>
          <div className="my-2" style={{ borderTop: `2px solid ${theme.ink}`, borderBottom: `1px solid ${theme.ink}` }}>
            <h1 className="font-playfair font-black uppercase py-1" style={{ color: theme.ink, fontSize: 'clamp(26px,7vw,40px)', letterSpacing: '0.02em' }}>La Primicia</h1>
          </div>
          <p className="font-cinzel uppercase" style={{ color: theme.soft, letterSpacing: '0.2em', fontSize: 10 }}>{dateLine}</p>
          <h2 className="font-playfair font-bold mt-5" style={{ color: theme.ink, fontSize: 'clamp(24px,6vw,34px)' }}>{names}</h2>
          <p className="font-cormorant italic mt-2" style={{ color: theme.soft, fontSize: 16 }}>se dan el “sí, quiero”</p>
        </motion.div>
      </motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><OpenCue color={theme.soft} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><EnterButton theme={theme} label={label} onEnter={onEnter} solid /></motion.div>
    </motion.div>
  );
}

// ══════════════════════ ARCH (Paradise) ══════════════════════
function ArchScene({ theme, names, dateLine, coverImage, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  return (
    <motion.div className="relative z-10 flex flex-col items-center px-6" style={{ gap: SCENE_GAP }}
      variants={{ show: { transition: { staggerChildren: 0.14 } } }} initial="hidden" animate="show">
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>
      <motion.div
        variants={reveal} transition={{ duration: 0.85, ease: ease.soft }}
        className="relative flex flex-col items-center justify-end text-center overflow-hidden"
        style={{
          // Ver PassportScene: el término en vh solo manda en pantallas cortas.
          width: 'min(80vw, 320px, 41vh)', aspectRatio: '3 / 4.2',
          borderRadius: '50% 50% 10px 10px / 32% 32% 4px 4px',
          border: `1.5px solid ${theme.accent}`, boxShadow: '0 30px 60px -22px rgba(0,0,0,0.55)',
          backgroundColor: '#2c3a1c',
          backgroundImage: coverImage ? `linear-gradient(180deg, rgba(34,44,18,0.35), rgba(34,44,18,0.85)), url(${coverImage})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      >
        <motion.div className="relative w-full px-5 pb-9 flex flex-col items-center"
          animate={opening ? { opacity: 0, scale: 1.1 } : { opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: ease.soft }}>
          <Sprig kind="leaf" color={theme.accent} className="w-20 mb-2" style={{ opacity: 0.85 }} />
          <h1 className="font-great leading-none" style={{ color: theme.script, fontSize: 'clamp(36px,9vw,54px)' }}>{names}</h1>
          {dateLine && <p className="font-cinzel uppercase mt-3" style={{ color: theme.ink, letterSpacing: '0.3em', fontSize: 12 }}>{dateLine}</p>}
        </motion.div>
      </motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><OpenCue color={theme.soft} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><EnterButton theme={theme} label={label} onEnter={onEnter} solid /></motion.div>
    </motion.div>
  );
}

// ══════════════════════ LUXE (Obsidiana) ══════════════════════
function LuxeScene({ theme, names, initials, dateLine, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  return (
    <motion.div className="relative z-10 flex flex-col items-center gap-8 px-6"
      variants={{ show: { transition: { staggerChildren: 0.16 } } }} initial="hidden" animate="show">
      <motion.div
        className="relative flex flex-col items-center justify-center text-center"
        style={{ width: 'min(82vw, 340px)', aspectRatio: '3 / 3.6', border: `1px solid ${theme.accent}55`, padding: 28 }}
        animate={opening ? { opacity: 0, scale: 1.06 } : { opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: ease.soft }}
      >
        {/* gold corner ticks */}
        {[['top-2 left-2', ''], ['top-2 right-2', 'scaleX(-1)'], ['bottom-2 left-2', 'scaleY(-1)'], ['bottom-2 right-2', 'scale(-1)']].map(([pos, tf]) => (
          <svg key={pos} className={`absolute ${pos}`} width="22" height="22" viewBox="0 0 22 22" fill="none" stroke={theme.accent} strokeWidth="1" style={{ transform: tf }} aria-hidden>
            <path d="M2 10 L2 2 L10 2" />
          </svg>
        ))}
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }} className="my-5">
          <div className="rounded-full flex items-center justify-center" style={{ width: 108, height: 108, border: `1px solid ${theme.accent}` }}>
            <span className="font-great whitespace-nowrap" style={{ color: theme.script, fontSize: 34, lineHeight: 1 }}>{initials}</span>
          </div>
        </motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
          <h1 className="font-great leading-none" style={{ color: theme.script, fontSize: 'clamp(38px,9vw,56px)' }}>{names}</h1>
          {dateLine && <p className="font-cinzel uppercase mt-3" style={{ color: theme.soft, letterSpacing: '0.3em', fontSize: 12 }}>{dateLine}</p>}
        </motion.div>
      </motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><OpenCue color={theme.soft} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><EnterButton theme={theme} label={label} onEnter={onEnter} solid /></motion.div>
    </motion.div>
  );
}

// ══════════════════════ BOTANICAL (Azure) ══════════════════════
// Acuarela suave + esquinas de orquídea + semillas de diente de león flotando +
// monograma entrelazado + nombres + doble flecha + botón outline.

function DandelionSeed({ color }: { color: string }) {
  const fil = Array.from({ length: 11 }, (_, i) => ((-100 + i * 20) * Math.PI) / 180);
  return (
    <svg width="26" height="34" viewBox="0 0 26 34" fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" aria-hidden>
      {fil.map((a, i) => <line key={i} x1="13" y1="9" x2={13 + Math.cos(a) * 9} y2={9 + Math.sin(a) * 9} />)}
      {fil.map((a, i) => <circle key={`c${i}`} cx={13 + Math.cos(a) * 9} cy={9 + Math.sin(a) * 9} r="0.6" fill={color} stroke="none" />)}
      <path d="M13 9 C 13 18, 12 24, 13 31" />
      <ellipse cx="13" cy="32" rx="1.2" ry="2" fill={color} stroke="none" />
    </svg>
  );
}

const SEEDS = [
  { x: 12, dx: 40, dur: 16, delay: -2, s: 0.7, o: 0.4 },
  { x: 26, dx: -30, dur: 21, delay: -9, s: 0.5, o: 0.3 },
  { x: 40, dx: 50, dur: 18, delay: -14, s: 0.95, o: 0.42 },
  { x: 55, dx: -22, dur: 23, delay: -5, s: 0.6, o: 0.34 },
  { x: 68, dx: 35, dur: 15, delay: -11, s: 0.8, o: 0.4 },
  { x: 80, dx: -45, dur: 20, delay: -3, s: 0.55, o: 0.3 },
  { x: 90, dx: 25, dur: 17, delay: -16, s: 0.7, o: 0.4 },
  { x: 7, dx: 30, dur: 24, delay: -7, s: 0.45, o: 0.26 },
  { x: 48, dx: -35, dur: 19, delay: -19, s: 0.65, o: 0.34 },
];

function DandelionField({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <style>{`@keyframes egDrift{0%{transform:translateY(-14vh) translateX(0) rotate(0deg);opacity:0}10%{opacity:var(--o)}90%{opacity:var(--o)}100%{transform:translateY(116vh) translateX(var(--dx)) rotate(45deg);opacity:0}}`}</style>
      {SEEDS.map((s, i) => {
        const st: React.CSSProperties = { left: `${s.x}%`, top: 0, animation: `egDrift ${s.dur}s linear ${s.delay}s infinite` };
        (st as Record<string, string>)['--o'] = String(s.o);
        (st as Record<string, string>)['--dx'] = `${s.dx}px`;
        return (
          <div key={i} className="absolute" style={st}>
            <div style={{ transform: `scale(${s.s})` }}><DandelionSeed color={color} /></div>
          </div>
        );
      })}
    </div>
  );
}

function SoftLeaves({ color }: { color: string }) {
  const leaf = (x: number, y: number, r: number, rot: number) => (
    <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M0 0 C ${-r * 0.45} ${-r * 0.6}, ${-r * 0.28} ${-r * 1.5}, 0 ${-r * 2.1} C ${r * 0.28} ${-r * 1.5}, ${r * 0.45} ${-r * 0.6}, 0 0 Z`} />
      <line x1="0" y1="0" x2="0" y2={-r * 2.1} stroke={color} strokeWidth="0.4" opacity="0.5" />
    </g>
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden style={{ opacity: 0.11 }}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800" fill={color} stroke="none">
        {leaf(70, 250, 60, 28)}{leaf(120, 180, 44, -10)}{leaf(40, 360, 50, 64)}
        {leaf(340, 520, 58, -34)}{leaf(300, 600, 42, 18)}{leaf(360, 430, 40, -70)}
        {leaf(200, 720, 46, 6)}
      </svg>
    </div>
  );
}

function DoubleChevron({ color }: { color: string }) {
  const ch = <path strokeLinecap="round" strokeLinejoin="round" d="M5 6l7 7 7-7" />;
  return (
    <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} className="flex flex-col items-center" aria-hidden>
      <svg width="26" height="16" viewBox="0 0 24 18" fill="none" stroke={color} strokeWidth="1.4">{ch}</svg>
      <svg width="26" height="16" viewBox="0 0 24 18" fill="none" stroke={color} strokeWidth="1.4" style={{ marginTop: -9 }}>{ch}</svg>
    </motion.div>
  );
}

function BotanicalScene({ theme, names, initials, dateLine, label, onEnter }: SceneProps) {
  const letters = initials.match(/[A-Za-zÀ-ÿ]/g) ?? ['M'];
  const a = letters[0];
  const b = letters[1] ?? letters[0];
  const t = { duration: 0.7, ease: ease.soft };
  return (
    <>
      <SoftLeaves color={theme.accent} />
      <DandelionField color={theme.soft} />
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden style={{ opacity: 0.55 }}>
        <Sprig kind="orchid" color={theme.accent} className="absolute -top-4 -left-4 w-[42vw] max-w-[260px]" />
        <Sprig kind="orchid" color={theme.accent} className="absolute -bottom-4 -right-4 w-[42vw] max-w-[260px]" style={{ transform: 'scale(-1)' }} />
      </div>

      <motion.div className="relative z-10 flex flex-col items-center gap-6 px-6"
        variants={{ show: { transition: { staggerChildren: 0.16 } } }} initial="hidden" animate="show">
        <motion.div variants={reveal} transition={t}><Monogram a={a} b={b} color={theme.script} soft={theme.accent} /></motion.div>
        <motion.div variants={reveal} transition={t} className="text-center">
          <h1 className="font-cinzel" style={{ color: theme.ink, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 'clamp(24px,6vw,40px)' }}>{names}</h1>
          {dateLine && <p className="font-cinzel mt-3 uppercase" style={{ color: theme.soft, letterSpacing: '0.34em', fontSize: 12 }}>{dateLine}</p>}
        </motion.div>
        <motion.div variants={reveal} transition={t}><DoubleChevron color={theme.soft} /></motion.div>
        <motion.div variants={reveal} transition={t}>
          <motion.button onClick={onEnter} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="font-cormorant"
            style={{ color: theme.ink, border: `1px solid ${theme.accent}55`, letterSpacing: '0.06em', fontSize: 16, padding: '12px 36px', borderRadius: 9999, background: 'rgba(255,255,255,0.4)' }}>
            {label}
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
}

// ══════════════════════ CURTAIN (telón de teatro) ══════════════════════
// Escenario completo: bambalina festoneada con fleco de oro arriba, dos paños
// de seda con pliegues suaves y una cartela iluminada al centro donde vive el
// texto. La cartela es clave: antes los nombres caían sobre la tela rayada y
// no se leían.

/**
 * Bambalina festoneada. Devuelve dos paths: el relleno de la tela y sólo el
 * borde ondulado, para que el fleco de oro siga las ondas en vez de cruzar
 * recto por debajo.
 */
function scallop(n = 9): { fill: string; edge: string } {
  const w = 100 / n;
  let edge = 'M100 9';
  for (let i = n; i > 0; i--) {
    const x = (i - 1) * w;
    edge += ` Q ${x + w / 2} 20 ${x} 9`;
  }
  return { fill: `M0 0 H100 V9 ${edge.replace('M100 9', '')} V0 Z`, edge };
}

/** Seda: pliegues con paradas suaves (nada de rayas duras). */
function silk(base: string): string {
  const dark = 'rgba(0,0,0,0.42)';
  const lite = 'rgba(255,255,255,0.13)';
  return [
    `linear-gradient(90deg, ${dark} 0%, ${lite} 9%, ${dark} 19%, ${lite} 28%, ${dark} 38%,
      ${lite} 47%, ${dark} 57%, ${lite} 66%, ${dark} 76%, ${lite} 85%, ${dark} 100%)`,
    `linear-gradient(180deg, rgba(0,0,0,0.34) 0%, transparent 22%, transparent 74%, rgba(0,0,0,0.42) 100%)`,
    `linear-gradient(0deg, ${base}, ${base})`,
  ].join(', ');
}

function CurtainScene({ theme, names, initials, dateLine, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  const letters = initials.match(/[A-Za-zÀ-ÿ]/g) ?? ['A'];
  const fabric = silk(theme.accent);

  return (
    <>
      {/* Fondo de escenario: la luz cae al centro, los bordes se apagan */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 76% 54% at 50% 42%, ${theme.panel}22, transparent 72%),
                       linear-gradient(180deg, ${theme.ink}, #000000)`,
        }}
      />

      {/* Paños laterales */}
      {([-1, 1] as const).map(side => (
        <motion.div
          key={side}
          className="pointer-events-none absolute top-0 bottom-0 z-[5]"
          style={{
            width: '53%',
            [side === -1 ? 'left' : 'right']: 0,
            background: fabric,
            boxShadow: side === -1
              ? 'inset -50px 0 70px -30px rgba(0,0,0,0.75)'
              : 'inset 50px 0 70px -30px rgba(0,0,0,0.75)',
            // Caída del paño: el borde interior cae en curva, no en recto.
            borderRadius: side === -1 ? '0 14% 0 0 / 0 5% 0 0' : '14% 0 0 0 / 5% 0 0 0',
          }}
          initial={false}
          animate={opening ? { x: `${side * 104}%` } : { x: 0 }}
          transition={{ duration: 1.15, ease: ease.inOut }}
        />
      ))}

      {/* Bambalina + fleco de oro */}
      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-0 z-[6]"
        style={{ height: '15vh' }}
        initial={false}
        animate={opening ? { y: '-100%' } : { y: 0 }}
        transition={{ duration: 1, ease: ease.inOut }}
        aria-hidden
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ek-valance" x1="0" x2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
              <stop offset="14%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="32%" stopColor="rgba(0,0,0,0.4)" />
              <stop offset="52%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="72%" stopColor="rgba(0,0,0,0.4)" />
              <stop offset="88%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
            </linearGradient>
          </defs>
          <path d={scallop().fill} fill={theme.accent} />
          <path d={scallop().fill} fill="url(#ek-valance)" />
          {/* Fleco de oro siguiendo la onda del festón */}
          <path
            d={scallop().edge}
            fill="none"
            stroke={theme.script}
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            opacity="0.9"
          />
        </svg>
      </motion.div>

      {/* Cartela iluminada con el texto */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-6"
        initial={{ opacity: 0, y: 18 }}
        animate={opening ? { opacity: 0, scale: 0.97, y: -8 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: opening ? 0.5 : 0.9, ease: ease.soft, delay: opening ? 0 : 0.25 }}
      >
        <div
          className="relative flex flex-col items-center gap-4 text-center"
          style={{
            // El relleno superior es generoso a propósito: más arriba la
            // arcada se estrecha y el texto se saldría por los lados.
            width: 'min(82vw, 340px)',
            padding: '58px 22px 30px',
            background: `linear-gradient(170deg, ${theme.panel}, ${theme.panel}e6)`,
            borderRadius: '150px 150px 6px 6px / 110px 110px 6px 6px',
            border: `1px solid ${theme.script}66`,
            boxShadow: `0 40px 90px -30px rgba(0,0,0,0.85), 0 0 60px -20px ${theme.script}44`,
          }}
        >
          {/* Doble filete interior */}
          <span
            className="pointer-events-none absolute"
            style={{
              inset: 7,
              border: `1px solid ${theme.script}44`,
              borderRadius: '145px 145px 4px 4px / 105px 105px 4px 4px',
            }}
          />
          <Grain opacity={0.1} />

          <Tagline theme={theme} />
          <Monogram a={letters[0]} b={letters[1] ?? letters[0]} color={theme.script} soft={theme.script} size={96} />
          <NamesBlock theme={theme} names={names} dateLine={dateLine} />
          <GoldRule color={theme.script} width={110} />
          <EnterButton theme={theme} label={label} onEnter={onEnter} solid />
        </div>
      </motion.div>
    </>
  );
}

// ══════════════════════ PETALS (lluvia de pétalos / polvo dorado) ══════════════════════
// Pétalos: forma de pétalo real (no una coma), tamaño discreto y por DEBAJO
// del contenido, para que nunca aterricen encima del botón ni de los nombres.
function FallingPetals({ color, count = 14 }: { color: string; count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const petals = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 61.8) % 100}%`,
    delay: (i % 9) * 0.9,
    dur: 9 + (i % 5) * 2.2,
    size: 6 + (i % 4) * 2.5,
    drift: (i % 2 ? 1 : -1) * (24 + (i % 3) * 16),
    rot: (i % 2 ? 1 : -1) * (180 + (i % 3) * 90),
    tilt: (i * 37) % 180,
    op: 0.3 + (i % 3) * 0.12,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <style>{`@keyframes ekPetalFall {
        0% { transform: translateY(-12vh) translateX(0) rotate(0deg); opacity: 0; }
        14% { opacity: var(--op); }
        86% { opacity: var(--op); }
        100% { transform: translateY(112vh) translateX(var(--dx)) rotate(var(--rot)); opacity: 0; }
      }`}</style>
      {petals.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', left: p.left, top: 0,
          animation: `ekPetalFall ${p.dur}s ${p.delay}s linear infinite`, opacity: 0,
          ['--dx' as string]: `${p.drift}px`,
          ['--rot' as string]: `${p.rot}deg`,
          ['--op' as string]: String(p.op),
        }}>
          <span style={{
            display: 'block', width: p.size, height: p.size * 1.45,
            background: `linear-gradient(150deg, ${color}, ${color}77)`,
            // Pétalo: ancho abajo, en punta arriba.
            borderRadius: '52% 48% 46% 54% / 68% 66% 34% 32%',
            transform: `rotate(${p.tilt}deg)`,
          }} />
        </span>
      ))}
    </div>
  );
}

function PetalsScene({ theme, names, initials, dateLine, label, onEnter }: SceneProps) {
  const letters = initials.match(/[A-Za-zÀ-ÿ]/g) ?? ['A'];
  return (
    <>
      <FallingPetals color={theme.accent} />
      <CornerSprigs theme={theme} />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 px-6"
        variants={{ show: { transition: { staggerChildren: 0.16 } } }}
        initial="hidden" animate="show"
      >
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.8, ease: ease.soft }}>
          <Monogram a={letters[0]} b={letters[1] ?? letters[0]} color={theme.script} soft={theme.accent} />
        </motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
          <NamesBlock theme={theme} names={names} dateLine={dateLine} />
        </motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
          <GoldRule color={theme.accent} />
        </motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
          <EnterButton theme={theme} label={label} onEnter={onEnter} solid />
        </motion.div>
      </motion.div>
    </>
  );
}

// ══════════════════════ GIFTBOX (caja de regalo que se destapa) ══════════════════════
/** Lazo de raso: dos lazadas con brillo, nudo y dos cintas cayendo. */
function SatinBow({ color, sheen, size = 96 }: { color: string; sheen: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 100 72" aria-hidden style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="ek-satin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="42%" stopColor={sheen} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      {/* Cintas que caen */}
      <path d="M48 30 C 40 44, 30 54, 20 70 L 33 66 L 36 72 C 42 56, 47 42, 50 32 Z" fill="url(#ek-satin)" opacity="0.92" />
      <path d="M52 30 C 60 44, 70 54, 80 70 L 67 66 L 64 72 C 58 56, 53 42, 50 32 Z" fill="url(#ek-satin)" opacity="0.82" />
      {/* Lazadas */}
      <path d="M50 28 C 34 6, 4 10, 8 26 C 11 38, 34 36, 50 30 Z" fill="url(#ek-satin)" />
      <path d="M50 28 C 66 6, 96 10, 92 26 C 89 38, 66 36, 50 30 Z" fill="url(#ek-satin)" />
      {/* Sombra interior de las lazadas */}
      <path d="M50 29 C 40 20, 26 18, 18 22" stroke="rgba(0,0,0,0.28)" strokeWidth="1.4" fill="none" />
      <path d="M50 29 C 60 20, 74 18, 82 22" stroke="rgba(0,0,0,0.28)" strokeWidth="1.4" fill="none" />
      {/* Nudo */}
      <ellipse cx="50" cy="29" rx="9" ry="7.5" fill="url(#ek-satin)" />
      <ellipse cx="50" cy="29" rx="9" ry="7.5" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
    </svg>
  );
}

function GiftboxScene({ theme, names, initials, dateLine, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  const ribbon = `linear-gradient(90deg, ${theme.accent} 0%, ${theme.script} 38%, ${theme.accent} 72%, ${theme.accent} 100%)`;
  // panelEdge es semitransparente: va como capa sobre `panel`, nunca como parada.
  const carton = `linear-gradient(160deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 48%, ${theme.panelEdge} 100%), ${theme.panel}`;

  return (
    <motion.div
      className="relative z-10 flex flex-col items-center px-6"
      style={{ gap: SCENE_GAP }}
      variants={{ show: { transition: { staggerChildren: 0.14 } } }}
      initial="hidden" animate="show"
    >
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>

      <motion.div variants={reveal} transition={{ duration: 0.8, ease: ease.soft }} style={{ perspective: 1200 }}>
        {/* Esta escena lleva un bloque de nombres extra bajo la caja, así que es
            la que más apila: el tope en vh entra antes que en las otras dos. */}
        <div className="relative" style={{ width: 'min(66vw, 240px, 34vh)', aspectRatio: '1 / 1.02' }}>
          {/* Cuerpo de la caja */}
          <div
            className="absolute left-0 right-0 bottom-0 overflow-hidden"
            style={{
              top: '30%',
              background: carton,
              borderRadius: 6,
              boxShadow: '0 34px 64px -26px rgba(0,0,0,0.55)',
            }}
          >
            {/* Cinta vertical con brillo de raso */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2" style={{ width: '14%', background: ribbon }} />
            {/* Arista lateral: da volumen sin dibujar la caja en 3D */}
            <div className="absolute inset-y-0 right-0" style={{ width: '13%', background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.16))' }} />
            <Grain opacity={0.12} />
          </div>

          {/* Resplandor que sale de la caja al destaparse */}
          <motion.div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{
              top: '22%', width: '86%', height: '34%', zIndex: 1,
              background: `radial-gradient(ellipse at 50% 100%, ${theme.script}88, transparent 70%)`,
            }}
            animate={{ opacity: opening ? 1 : 0 }}
            transition={{ duration: 0.6, delay: opening ? 0.25 : 0, ease: ease.soft }}
          />

          {/* Iniciales que asoman al destapar */}
          <motion.div
            className="absolute left-1/2 top-[30%] -translate-x-1/2 font-great whitespace-nowrap"
            style={{ color: theme.script, fontSize: 42, zIndex: 2, textShadow: '0 2px 10px rgba(0,0,0,0.25)' }}
            animate={opening ? { y: '-46%', opacity: 1 } : { y: '10%', opacity: 0 }}
            transition={{ duration: 0.75, delay: opening ? 0.3 : 0, ease: ease.soft }}
          >
            {initials}
          </motion.div>

          {/* Tapa: se levanta, gira y se va */}
          <motion.div
            className="absolute left-[-5%] right-[-5%]"
            style={{ top: '14%', height: '22%', zIndex: 3, transformOrigin: 'center bottom' }}
            animate={opening ? { y: '-135%', rotate: -13, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.85, ease: ease.inOut }}
          >
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                background: carton,
                borderRadius: 6,
                boxShadow: '0 10px 22px -8px rgba(0,0,0,0.45)',
              }}
            >
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2" style={{ width: '14%', background: ribbon }} />
              <Grain opacity={0.12} />
            </div>
            {/* Lazo montado sobre la tapa (apoyado en ella, no flotando) */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '26%' }}>
              <SatinBow color={theme.accent} sheen={theme.script} size={132} />
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
        <NamesBlock theme={theme} names={names} dateLine={dateLine} />
      </motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><OpenCue color={theme.soft} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
        <EnterButton theme={theme} label={label} onEnter={onEnter} solid />
      </motion.div>
    </motion.div>
  );
}

export function EntryScene(props: SceneProps) {
  switch (props.theme.scene) {
    case 'passport': return <PassportScene {...props} />;
    case 'newspaper': return <NewspaperScene {...props} />;
    case 'arch': return <ArchScene {...props} />;
    case 'luxe': return <LuxeScene {...props} />;
    case 'botanical': return <BotanicalScene {...props} />;
    case 'curtain': return <CurtainScene {...props} />;
    case 'petals': return <PetalsScene {...props} />;
    case 'giftbox': return <GiftboxScene {...props} />;
    default: return <EnvelopeScene {...props} />;
  }
}
