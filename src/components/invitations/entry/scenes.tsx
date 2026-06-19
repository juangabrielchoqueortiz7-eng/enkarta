'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ease } from '@/lib/motion';
import type { EntryTheme, Ornament } from './config';

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

function Chevron({ color }: { color: string }) {
  return (
    <motion.svg
      width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.4"
      animate={{ y: [0, 7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </motion.svg>
  );
}

function EnterButton({ theme, label, onEnter }: { theme: EntryTheme; label: string; onEnter: () => void }) {
  return (
    <motion.button
      onClick={onEnter}
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.97 }}
      className="font-cinzel uppercase"
      style={{
        color: theme.accentText, background: theme.accent,
        letterSpacing: '0.2em', fontSize: 12, padding: '14px 36px',
        borderRadius: '22px 7px 22px 7px',
        boxShadow: '0 12px 26px -10px rgba(0,0,0,0.5)',
      }}
    >
      {label}
    </motion.button>
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

function WaxSeal({ theme, size = 84, initials }: { theme: EntryTheme; size?: number; initials: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full" style={{
        background: theme.accent,
        boxShadow: '0 12px 26px rgba(0,0,0,0.32), inset 0 2px 5px rgba(255,255,255,0.22), inset 0 -4px 8px rgba(0,0,0,0.2)',
      }} />
      <div className="absolute inset-0 rounded-full" style={{
        background: 'radial-gradient(circle at 36% 30%, rgba(255,255,255,0.4), transparent 58%)',
      }} />
      <div className="absolute rounded-full" style={{ inset: size * 0.1, border: `1px solid ${theme.accentText}66` }} />
      <span className="relative font-cinzel" style={{ color: theme.accentText, fontSize: size * 0.24, letterSpacing: '0.04em' }}>
        {initials}
      </span>
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

// ══════════════════════ ENVELOPE (Azure & most templates) ══════════════════════
function EnvelopeScene({ theme, names, initials, dateLine, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  return (
    <>
      <CornerSprigs theme={theme} />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-7 px-6"
        variants={{ show: { transition: { staggerChildren: 0.14 } } }}
        initial="hidden" animate="show"
      >
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>

        <motion.div
          variants={reveal} transition={{ duration: 0.8, ease: ease.soft }}
          className="relative" style={{ width: 'min(86vw, 360px)', aspectRatio: '3 / 2', perspective: 1400 }}
        >
          {/* body */}
          <div className="absolute inset-0" style={{ background: theme.panel, borderRadius: 8, boxShadow: '0 34px 64px -22px rgba(0,0,0,0.4)' }} />
          {/* letter (peeks, lifts on open) */}
          <motion.div
            className="absolute"
            style={{ left: '7%', right: '7%', top: '-4%', bottom: '20%', background: '#fffdfa', borderRadius: 4, zIndex: 2, boxShadow: '0 6px 16px rgba(0,0,0,0.12)' }}
            animate={opening ? { y: '-62%', opacity: 0 } : { y: 0, opacity: 1 }}
            transition={{ duration: 0.85, ease: ease.soft, delay: opening ? 0.28 : 0 }}
          />
          {/* side + bottom inner flaps */}
          <div className="absolute inset-0" style={{ clipPath: 'polygon(0 0,50% 46%,0 100%)', background: theme.panelEdge, zIndex: 3 }} />
          <div className="absolute inset-0" style={{ clipPath: 'polygon(100% 0,50% 46%,100% 100%)', background: theme.panelEdge, zIndex: 3 }} />
          <div className="absolute inset-0" style={{ clipPath: 'polygon(0 100%,50% 46%,100% 100%)', background: theme.panelEdge, zIndex: 3 }} />
          <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 8, border: `1px solid ${theme.accent}33`, zIndex: 4 }} />
          {/* top flap */}
          <motion.div
            className="absolute left-0 right-0 top-0"
            style={{ height: '56%', transformOrigin: 'top center', transformStyle: 'preserve-3d', clipPath: 'polygon(0 0,100% 0,50% 100%)', background: theme.panel, zIndex: 6 }}
            animate={opening ? { rotateX: -168 } : { rotateX: 0 }}
            transition={{ duration: 0.9, ease: ease.inOut }}
          >
            <div className="absolute inset-0" style={{ clipPath: 'polygon(0 0,100% 0,50% 100%)', background: 'linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0.12))' }} />
          </motion.div>
          {/* wax seal at flap tip */}
          <motion.div
            className="absolute left-1/2" style={{ top: '32%', transform: 'translateX(-50%)', zIndex: 7 }}
            animate={opening ? { scale: 0.5, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <WaxSeal theme={theme} initials={initials} />
          </motion.div>
        </motion.div>

        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
          <NamesBlock theme={theme} names={names} dateLine={dateLine} />
        </motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Chevron color={theme.accent} /></motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
          <EnterButton theme={theme} label={label} onEnter={onEnter} />
        </motion.div>
      </motion.div>
    </>
  );
}

// ══════════════════════ PASSPORT (Passport) ══════════════════════
function PassportScene({ theme, names, initials, dateLine, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  return (
    <motion.div className="relative z-10 flex flex-col items-center gap-7 px-6"
      variants={{ show: { transition: { staggerChildren: 0.14 } } }} initial="hidden" animate="show">
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.8, ease: ease.soft }} style={{ perspective: 1500 }}>
        <motion.div
          className="relative flex flex-col items-center justify-between text-center"
          style={{
            width: 'min(78vw, 300px)', aspectRatio: '2 / 2.7', background: theme.panel,
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
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Chevron color={theme.accent} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><EnterButton theme={theme} label={label} onEnter={onEnter} /></motion.div>
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
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Chevron color={theme.accent} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><EnterButton theme={theme} label={label} onEnter={onEnter} /></motion.div>
    </motion.div>
  );
}

// ══════════════════════ ARCH (Paradise) ══════════════════════
function ArchScene({ theme, names, dateLine, coverImage, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  return (
    <motion.div className="relative z-10 flex flex-col items-center gap-7 px-6"
      variants={{ show: { transition: { staggerChildren: 0.14 } } }} initial="hidden" animate="show">
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>
      <motion.div
        variants={reveal} transition={{ duration: 0.85, ease: ease.soft }}
        className="relative flex flex-col items-center justify-end text-center overflow-hidden"
        style={{
          width: 'min(80vw, 320px)', aspectRatio: '3 / 4.2',
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
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Chevron color={theme.accent} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><EnterButton theme={theme} label={label} onEnter={onEnter} /></motion.div>
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
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Chevron color={theme.accent} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><EnterButton theme={theme} label={label} onEnter={onEnter} /></motion.div>
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

function InterlockMonogram({ a, b, color, soft, size = 132 }: { a: string; b: string; color: string; soft: string; size?: number }) {
  return (
    <div className="relative flex items-end justify-center" style={{ height: size }}>
      <span className="font-playfair" style={{ color: soft, fontSize: size, lineHeight: 0.78, marginRight: -size * 0.27, opacity: 0.9 }}>{a}</span>
      <span className="font-playfair" style={{ color, fontSize: size * 1.16, lineHeight: 0.78, marginLeft: -size * 0.27 }}>{b}</span>
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
        <motion.div variants={reveal} transition={t}><InterlockMonogram a={a} b={b} color={theme.script} soft={theme.soft} /></motion.div>
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

// ══════════════════════ CURTAIN (cortina de seda que se abre) ══════════════════════
function CurtainScene({ theme, names, initials, dateLine, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  const letters = initials.match(/[A-Za-zÀ-ÿ]/g) ?? ['A'];
  // Tela: degradado con pliegues verticales (repeating-linear-gradient).
  const drape = `${theme.accent}`;
  const folds = `repeating-linear-gradient(90deg, ${drape} 0px, ${drape} 6px, rgba(0,0,0,0.18) 22px, ${drape} 40px)`;
  return (
    <>
      {/* Paneles de cortina a ambos lados */}
      {([-1, 1] as const).map(side => (
        <motion.div
          key={side}
          className="pointer-events-none absolute top-0 bottom-0 z-[5]"
          style={{
            width: '52%',
            [side === -1 ? 'left' : 'right']: 0,
            background: folds,
            boxShadow: side === -1 ? 'inset -40px 0 60px -20px rgba(0,0,0,0.5)' : 'inset 40px 0 60px -20px rgba(0,0,0,0.5)',
            borderRadius: side === -1 ? '0 50% 0 0 / 0 8% 0 0' : '50% 0 0 0 / 8% 0 0 0',
          }}
          initial={false}
          animate={opening ? { x: `${side * 105}%` } : { x: 0 }}
          transition={{ duration: 1.1, ease: ease.inOut }}
        >
          {/* Alzapaño dorado */}
          <div className="absolute top-1/2 h-10 w-full" style={{ background: `linear-gradient(${theme.script}, transparent)`, opacity: 0.4 }} />
        </motion.div>
      ))}

      <motion.div
        className="relative z-10 flex flex-col items-center gap-7 px-6"
        variants={{ show: { transition: { staggerChildren: 0.16, delayChildren: 0.3 } } }}
        initial="hidden" animate="show"
      >
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.8, ease: ease.soft }}>
          <InterlockMonogram a={letters[0]} b={letters[1] ?? letters[0]} color={theme.script} soft={theme.soft} />
        </motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
          <NamesBlock theme={theme} names={names} dateLine={dateLine} />
        </motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Chevron color={theme.accent} /></motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
          <EnterButton theme={theme} label={label} onEnter={onEnter} />
        </motion.div>
      </motion.div>
    </>
  );
}

// ══════════════════════ PETALS (lluvia de pétalos / polvo dorado) ══════════════════════
function FallingPetals({ color, count = 18 }: { color: string; count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const petals = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 61.8) % 100}%`,
    delay: (i % 9) * 0.7,
    dur: 6 + (i % 5) * 1.6,
    size: 7 + (i % 4) * 3,
    drift: (i % 2 ? 1 : -1) * (20 + (i % 3) * 14),
    rot: (i % 2 ? 1 : -1) * (180 + (i % 3) * 90),
  }));
  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden" aria-hidden>
      <style>{`@keyframes ekPetalFall {
        0% { transform: translateY(-12vh) translateX(0) rotate(0deg); opacity: 0; }
        12% { opacity: .85; }
        88% { opacity: .85; }
        100% { transform: translateY(112vh) translateX(var(--dx)) rotate(var(--rot)); opacity: 0; }
      }`}</style>
      {petals.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', left: p.left, top: 0, width: p.size, height: p.size * 1.3,
          background: color, borderRadius: '50% 0 50% 50%',
          ['--dx' as string]: `${p.drift}px`, ['--rot' as string]: `${p.rot}deg`,
          animation: `ekPetalFall ${p.dur}s ${p.delay}s ease-in-out infinite`, opacity: 0,
        }} />
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
        className="relative z-10 flex flex-col items-center gap-7 px-6"
        variants={{ show: { transition: { staggerChildren: 0.16 } } }}
        initial="hidden" animate="show"
      >
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.8, ease: ease.soft }}>
          <InterlockMonogram a={letters[0]} b={letters[1] ?? letters[0]} color={theme.script} soft={theme.soft} />
        </motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
          <NamesBlock theme={theme} names={names} dateLine={dateLine} />
        </motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Chevron color={theme.accent} /></motion.div>
        <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
          <EnterButton theme={theme} label={label} onEnter={onEnter} />
        </motion.div>
      </motion.div>
    </>
  );
}

// ══════════════════════ GIFTBOX (caja de regalo que se destapa) ══════════════════════
function GiftboxScene({ theme, names, initials, dateLine, label, phase, onEnter }: SceneProps) {
  const reduce = useReducedMotion();
  const opening = phase === 'opening' && !reduce;
  return (
    <motion.div
      className="relative z-10 flex flex-col items-center gap-7 px-6"
      variants={{ show: { transition: { staggerChildren: 0.14 } } }}
      initial="hidden" animate="show"
    >
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Tagline theme={theme} /></motion.div>

      <motion.div variants={reveal} transition={{ duration: 0.8, ease: ease.soft }} style={{ perspective: 1200 }}>
        <div className="relative" style={{ width: 'min(64vw, 230px)', aspectRatio: '1 / 0.92' }}>
          {/* Cuerpo de la caja */}
          <div className="absolute left-0 right-0 bottom-0" style={{ top: '26%', background: theme.panel, borderRadius: 8, boxShadow: '0 30px 60px -24px rgba(0,0,0,0.5)' }}>
            {/* Cinta vertical */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2" style={{ width: '18%', background: theme.accent, opacity: 0.9 }} />
          </div>
          {/* Tapa (se levanta y gira al abrir) */}
          <motion.div
            className="absolute left-[-4%] right-[-4%]"
            style={{ top: '8%', height: '30%', background: theme.accent, borderRadius: 8, transformOrigin: 'center bottom', zIndex: 3, boxShadow: '0 8px 18px -6px rgba(0,0,0,0.4)' }}
            animate={opening ? { y: '-120%', rotate: -12, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: ease.inOut }}
          >
            {/* Lazo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 26, height: 26 }}>
              <span className="absolute inset-0 rounded-full" style={{ border: `3px solid ${theme.accentText}`, opacity: 0.85 }} />
            </div>
          </motion.div>
          {/* Iniciales que asoman al abrir */}
          <motion.div
            className="absolute left-1/2 top-[34%] -translate-x-1/2 font-great"
            style={{ color: theme.script, fontSize: 40, zIndex: 2 }}
            animate={opening ? { y: '-40%', opacity: 1 } : { y: 0, opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: ease.soft }}
          >
            {initials}
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
        <NamesBlock theme={theme} names={names} dateLine={dateLine} />
      </motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}><Chevron color={theme.accent} /></motion.div>
      <motion.div variants={reveal} transition={{ duration: 0.7, ease: ease.soft }}>
        <EnterButton theme={theme} label={label} onEnter={onEnter} />
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
