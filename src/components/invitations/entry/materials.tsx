'use client';

/**
 * Materiales de las entradas ("sobres") — la capa física de las portadas.
 *
 * Aquí vive todo lo que da sensación de material real: grano de papel, forro
 * estampado del sobre, lacre, pan de oro, seda. Las escenas (`scenes.tsx`)
 * componen estos ladrillos; así una mejora de material sube el nivel de todas
 * las plantillas a la vez en lugar de retocar cada escena por separado.
 *
 * Regla: todo se dibuja con SVG/gradientes (cero imágenes externas) y todo
 * color entra por props desde `EntryTheme` — nada hardcodeado.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ease } from '@/lib/motion';
import type { EntryTheme, Ornament } from './config';

// ── Grano de papel ────────────────────────────────────────────────────────────
// Ruido fractal en SVG: lo que separa un "rectángulo de color" de una cartulina.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function Grain({ opacity = 0.16, radius }: { opacity?: number; radius?: number | string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
      style={{ backgroundImage: GRAIN, opacity, mixBlendMode: 'multiply', borderRadius: radius }}
    />
  );
}

/**
 * Lino: grano fino + trama cruzada muy tenue. A pantalla completa el ruido
 * suelto no basta — se necesita ver fibra para que el papel parezca papel.
 */
export function Linen({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden style={{ opacity }}>
      <div className="absolute inset-0" style={{ backgroundImage: GRAIN, opacity: 0.28, mixBlendMode: 'multiply' }} />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 3px),
                            repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 3px)`,
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
}

/**
 * Lacre con el monograma GRABADO EN HUECO (no impreso encima).
 *
 * El truco del relieve son dos sombras de texto opuestas: una clara abajo y una
 * oscura arriba hacen que la letra parezca hundida en la cera. El borde es
 * irregular y la sombra proyectada va fuera del recorte, para que no se vea el
 * parche rectangular de siempre.
 */
export function SealPressed({
  initials, wax, waxDeep, ink, size = 128,
}: { initials: string; wax: string; waxDeep: string; ink: string; size?: number }) {
  const blob = '47% 53% 48% 52% / 51% 47% 53% 49%';
  return (
    <div className="relative" style={{ width: size, height: size }} aria-hidden>
      {/* Sombra proyectada sobre el papel */}
      <div
        className="absolute"
        style={{ inset: size * 0.06, borderRadius: blob, boxShadow: `0 ${size * 0.09}px ${size * 0.16}px -${size * 0.05}px rgba(0,0,0,0.34)` }}
      />
      {/* Cuerpo de cera */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: blob,
          background: `radial-gradient(circle at 36% 30%, ${wax} 0%, ${wax} 46%, ${waxDeep} 100%)`,
          boxShadow: `inset 0 ${size * 0.02}px ${size * 0.04}px rgba(255,255,255,0.5),
                      inset 0 -${size * 0.035}px ${size * 0.07}px rgba(0,0,0,0.22)`,
        }}
      />
      {/* Reborde exterior de la cera, un poco más alto que el centro */}
      <div
        className="absolute"
        style={{
          inset: size * 0.07, borderRadius: blob,
          boxShadow: `inset 0 ${size * 0.025}px ${size * 0.05}px rgba(0,0,0,0.16),
                      inset 0 -${size * 0.02}px ${size * 0.03}px rgba(255,255,255,0.42)`,
        }}
      />
      {/* Monograma hundido */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-great"
          style={{
            color: ink,
            fontSize: size * 0.3,
            lineHeight: 1,
            // Sin esto "R & N" partía en dos líneas dentro del lacre.
            whiteSpace: 'nowrap',
            // El grabado necesita contraste real: con poca opacidad el
            // monograma no se leía sobre una cera oscura.
            textShadow: `0 ${size * 0.012}px 0 rgba(255,255,255,0.42),
                         0 -1px ${size * 0.012}px rgba(0,0,0,0.55)`,
          }}
        >
          {initials}
        </span>
      </div>
      <Grain opacity={0.14} radius={blob} />
    </div>
  );
}

// ── Forro del sobre ───────────────────────────────────────────────────────────
// El estampado del interior de la solapa: el detalle de papelería fina que
// distingue una plantilla de otra cuando el sobre se abre.
export function LinerPattern({
  kind, color, opacity = 0.5, id,
}: { kind: Ornament; color: string; opacity?: number; id: string }) {
  if (kind === 'none') return null;
  const pid = `liner-${id}`;

  const motif = () => {
    switch (kind) {
      case 'orchid':
        return (
          <g stroke={color} fill="none" strokeWidth="0.9" strokeLinecap="round">
            <ellipse cx="20" cy="14" rx="4" ry="7" />
            <ellipse cx="13" cy="21" rx="7" ry="4" />
            <ellipse cx="27" cy="21" rx="7" ry="4" />
            <ellipse cx="16" cy="28" rx="5" ry="3.4" />
            <ellipse cx="24" cy="28" rx="5" ry="3.4" />
            <circle cx="20" cy="21" r="1.6" />
          </g>
        );
      case 'rose':
        return (
          <g stroke={color} fill="none" strokeWidth="0.9" strokeLinecap="round">
            <circle cx="20" cy="20" r="2.2" />
            <path d="M20 20 C 25 15, 32 19, 29 26 C 26 33, 15 33, 12 25 C 9 18, 15 12, 22 12" />
            <path d="M9 32 C 13 30, 16 32, 17 35" />
          </g>
        );
      case 'pampas':
        return (
          <g stroke={color} fill="none" strokeWidth="0.7" strokeLinecap="round">
            {[-34, -17, 0, 17, 34].map(a => (
              <line
                key={a}
                x1="20" y1="34"
                x2={20 + Math.sin((a * Math.PI) / 180) * 22}
                y2={34 - Math.cos((a * Math.PI) / 180) * 22}
              />
            ))}
          </g>
        );
      case 'lavender':
        return (
          <g stroke={color} fill="none" strokeWidth="0.8" strokeLinecap="round">
            <path d="M20 36 C 20 28, 20 20, 20 8" />
            {[10, 15, 20, 25, 30].map((y, i) => (
              <g key={y}>
                <ellipse cx={20 - 3.4} cy={y} rx="2.4" ry="1.5" transform={`rotate(-26 ${20 - 3.4} ${y})`} />
                <ellipse cx={20 + 3.4} cy={y + 2} rx="2.4" ry="1.5" transform={`rotate(26 ${20 + 3.4} ${y + 2})`} opacity={i % 2 ? 0.8 : 1} />
              </g>
            ))}
          </g>
        );
      default: // leaf / sage / palm — ramita de olivo
        return (
          <g stroke={color} fill="none" strokeWidth="0.8" strokeLinecap="round">
            <path d="M8 34 C 16 26, 22 18, 32 8" />
            {[[14, 27], [19, 21], [24, 15], [12, 21], [18, 14]].map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx="4.2" ry="1.9" transform={`rotate(${i % 2 ? -46 : -18} ${x} ${y})`} />
            ))}
          </g>
        );
    }
  };

  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden style={{ opacity }} preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={pid} width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-12) scale(1.1)">
          {motif()}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
}

// ── Lacre ─────────────────────────────────────────────────────────────────────
// Borde orgánico (no un círculo perfecto), brillo de cera y monograma grabado.
// La sombra vive en una capa aparte porque el clip-path de la rotura recortaría
// la sombra en un cuadrado — ese era el parche gris visible en el sobre viejo.
export function WaxSeal({ theme, size = 88, initials }: { theme: EntryTheme; size?: number; initials: string }) {
  const blob = '46% 54% 49% 51% / 52% 46% 54% 48%';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0"
        style={{
          borderRadius: blob,
          background: `radial-gradient(circle at 34% 28%, ${theme.accent}, ${theme.accent} 42%, rgba(0,0,0,0.35) 140%)`,
          boxShadow: `inset 0 2px 6px rgba(255,255,255,0.3), inset 0 -5px 10px rgba(0,0,0,0.28)`,
        }}
      />
      {/* Brillo especular de la cera */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: blob,
          background: 'radial-gradient(ellipse at 33% 26%, rgba(255,255,255,0.42), transparent 52%)',
        }}
      />
      {/* Anillo grabado */}
      <div
        className="absolute"
        style={{ inset: size * 0.11, borderRadius: blob, border: `1px solid ${theme.accentText}55` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-cinzel"
          style={{
            color: theme.accentText,
            fontSize: size * 0.23,
            letterSpacing: '0.06em',
            textShadow: '0 1px 1px rgba(0,0,0,0.35)',
          }}
        >
          {initials}
        </span>
      </div>
      <Grain opacity={0.1} radius={blob} />
    </div>
  );
}

/** Lacre que se parte en dos al abrir. La sombra queda fuera del recorte. */
export function BreakingSeal({
  theme, initials, opening, size = 88,
}: { theme: EntryTheme; initials: string; opening: boolean; size?: number }) {
  const CRACK_L = 'polygon(0 0, 54% 0, 44% 27%, 55% 54%, 43% 77%, 51% 100%, 0 100%)';
  const CRACK_R = 'polygon(54% 0, 100% 0, 100% 100%, 51% 100%, 43% 77%, 55% 54%, 44% 27%)';

  const half = (side: -1 | 1) => (
    <motion.div
      className="absolute inset-0"
      style={{ clipPath: side === -1 ? CRACK_L : CRACK_R }}
      animate={opening
        ? { x: side * 34, y: side === 1 ? 52 : 36, rotate: side * 26, opacity: 0 }
        : { x: 0, y: 0, rotate: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: ease.soft }}
    >
      <WaxSeal theme={theme} initials={initials} size={size} />
    </motion.div>
  );

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Sombra proyectada, sin recortar */}
      <motion.div
        className="absolute"
        style={{
          inset: size * 0.08,
          borderRadius: '50%',
          boxShadow: '0 14px 22px -6px rgba(0,0,0,0.45)',
        }}
        animate={{ opacity: opening ? 0 : 1 }}
        transition={{ duration: 0.35, ease: ease.soft }}
      />
      {half(-1)}
      {half(1)}
    </div>
  );
}

/**
 * Oscurece un color hex un `f` (0-1). Sirve para la sombra de la cera sin
 * depender de `color-mix`, que no es seguro en navegadores viejos. Si el color
 * no es hex (el cliente puede meter cualquier cosa en la paleta), lo devuelve
 * tal cual: peor sombra, pero nunca un color roto.
 */
export function darken(c: string, f = 0.42): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return c;
  const h = m[1].length === 3 ? m[1].split('').map(x => x + x).join('') : m[1];
  const v = [0, 2, 4].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - f)));
  return `#${v.map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

// ── Oro y filetes ─────────────────────────────────────────────────────────────
/** Degradado de pan de oro reutilizable (bordes, filetes, fleco). */
export function goldFoil(c: string) {
  return `linear-gradient(100deg, ${c}99 0%, ${c} 18%, #ffffffcc 34%, ${c} 50%, ${c}aa 68%, #ffffff88 82%, ${c} 100%)`;
}

/** Filete fino con rombo al centro — separador discreto en lugar del chevron. */
export function GoldRule({ color, width = 132 }: { color: string; width?: number }) {
  return (
    <div className="flex items-center justify-center gap-2" style={{ width }} aria-hidden>
      <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${color}88)` }} />
      <span style={{ width: 5, height: 5, background: color, transform: 'rotate(45deg)', opacity: 0.9 }} />
      <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${color}88, transparent)` }} />
    </div>
  );
}

// ── Interacción ───────────────────────────────────────────────────────────────
/** Pista de "toca para abrir": punto que late + microtexto. */
export function OpenCue({ color, text = 'Toca para abrir' }: { color: string; text?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-2" aria-hidden>
      <motion.span
        style={{ width: 6, height: 6, borderRadius: 9999, background: color }}
        animate={reduce ? {} : { opacity: [0.35, 1, 0.35], scale: [1, 1.35, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="font-cinzel uppercase" style={{ color, opacity: 0.66, letterSpacing: '0.3em', fontSize: 9 }}>
        {text}
      </span>
    </div>
  );
}

/** Botón de entrada: filete de oro, relleno tenue y brillo al pasar. */
export function EnterButton({
  theme, label, onEnter, solid = false,
}: { theme: EntryTheme; label: string; onEnter: () => void; solid?: boolean }) {
  return (
    <motion.button
      onClick={onEnter}
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.975 }}
      className="relative overflow-hidden font-cinzel uppercase"
      style={{
        color: solid ? theme.accentText : theme.ink,
        background: solid ? theme.accent : 'transparent',
        border: `1px solid ${theme.accent}${solid ? '' : '66'}`,
        letterSpacing: '0.2em',
        fontSize: 11,
        padding: '15px 26px',
        whiteSpace: 'nowrap',
        borderRadius: 2,
        boxShadow: solid ? '0 14px 30px -14px rgba(0,0,0,0.55)' : 'none',
      }}
    >
      {/* Filetes interiores: el doble marco de la papelería clásica */}
      <span
        className="pointer-events-none absolute"
        style={{ inset: 3, border: `1px solid ${solid ? theme.accentText : theme.accent}33` }}
        aria-hidden
      />
      <span className="relative">{label}</span>
    </motion.button>
  );
}

// ── Monograma ─────────────────────────────────────────────────────────────────
/**
 * Iniciales entrelazadas. El solape es leve y la primera letra va más tenue,
 * para que el cruce se lea como intención y no como letras chocando (con
 * letras anchas — P/L, J/N — el solape agresivo las volvía ilegibles).
 */
export function Monogram({
  a, b, color, soft, size = 124,
}: { a: string; b: string; color: string; soft: string; size?: number }) {
  const single = !b || a === b;
  return (
    <div className="relative flex items-end justify-center" style={{ height: size * 0.9 }} aria-hidden>
      <span
        className="font-playfair"
        style={{ color: soft, fontSize: size, lineHeight: 0.76, marginRight: single ? 0 : -size * 0.11, opacity: 0.62 }}
      >
        {a}
      </span>
      {!single && (
        <span className="font-playfair" style={{ color, fontSize: size * 1.1, lineHeight: 0.76 }}>
          {b}
        </span>
      )}
    </div>
  );
}
