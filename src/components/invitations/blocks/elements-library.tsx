'use client';

// Librería curada de elementos decorativos recoloreables ("stickers") que el
// cliente arrastra al lienzo desde el constructor. Cada elemento es un SVG de
// confianza (se renderiza inline para poder recolorearlo con color/color2).
// Los esquineros reutilizan CornerCluster de decorations.tsx (no se duplican).

import React from 'react';
import type { BlockLayout } from '@/lib/types';
import { CornerCluster } from '../decorations';

export type ElementCategory =
  | 'corner' | 'frame' | 'divider' | 'bouquet' | 'wreath' | 'ribbon' | 'sparkle';

export interface ElementDef {
  key: string;
  label: string;
  category: ElementCategory;
  /** Ancho natural sugerido (px) al insertar. */
  w: number;
  /** Ancla sugerida al insertar (los esquineros → 'tl'). */
  anchor?: NonNullable<BlockLayout['anchor']>;
  /** Render recoloreable. color2 = color secundario (cae a color si falta). */
  render: (color: string, color2?: string) => React.ReactNode;
}

export const ELEMENT_CATEGORIES: { id: ElementCategory; label: string }[] = [
  { id: 'corner', label: 'Esquineros' },
  { id: 'frame', label: 'Marcos' },
  { id: 'divider', label: 'Cenefas' },
  { id: 'bouquet', label: 'Ramos' },
  { id: 'wreath', label: 'Coronas' },
  { id: 'ribbon', label: 'Cintas' },
  { id: 'sparkle', label: 'Destellos' },
];

const full = 'w-full h-auto block';

// ── Esquineros (reutilizan los ramos de esquina de la decoración de página) ────
const CORNER_VARIANTS: { key: string; label: string }[] = [
  { key: 'orchid', label: 'Orquídeas' },
  { key: 'rose', label: 'Rosas' },
  { key: 'leaves', label: 'Hojas' },
  { key: 'pampas', label: 'Pampa' },
  { key: 'palm', label: 'Palmera' },
  { key: 'laurel', label: 'Laurel' },
  { key: 'vine', label: 'Enredadera' },
  { key: 'berries', label: 'Bayas' },
  { key: 'geometric', label: 'Geométrico' },
  { key: 'fan', label: 'Abanico déco' },
];

const cornerElements: ElementDef[] = CORNER_VARIANTS.map(v => ({
  key: `corner-${v.key}`,
  label: v.label,
  category: 'corner' as const,
  w: 170,
  anchor: 'tl' as const,
  render: (color: string) => <CornerCluster variant={v.key} color={color} className={full} />,
}));

// ── Cenefas / separadores horizontales ────────────────────────────────────────
function DividerFloral(color: string, c2: string) {
  return (
    <svg viewBox="0 0 240 28" className={full} fill="none" stroke={color} strokeWidth="1.1" aria-hidden>
      <path d="M20 14 H104" strokeLinecap="round" />
      <path d="M136 14 H220" strokeLinecap="round" />
      <path d="M120 5 L127 14 L120 23 L113 14 Z" fill={c2} stroke="none" />
      {[[104, 'left'], [136, 'right']].map(([x, side], i) => (
        <g key={i}>
          <ellipse cx={x as number} cy="14" rx="6" ry="2.4" transform={`rotate(${side === 'left' ? -18 : 18} ${x} 14)`} fill={color} stroke="none" opacity="0.85" />
        </g>
      ))}
      <circle cx="20" cy="14" r="2" fill={color} stroke="none" />
      <circle cx="220" cy="14" r="2" fill={color} stroke="none" />
    </svg>
  );
}
function DividerVine(color: string) {
  return (
    <svg viewBox="0 0 240 30" className={full} fill={color} stroke="none" aria-hidden>
      <path d="M16 15 Q 60 2 120 15 Q 180 28 224 15" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {[40, 80, 160, 200].map((x, i) => (
        <ellipse key={i} cx={x} cy={i % 2 ? 22 : 8} rx="6" ry="2.4" transform={`rotate(${i % 2 ? 25 : -25} ${x} ${i % 2 ? 22 : 8})`} opacity="0.8" />
      ))}
      {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="120" cy="11" rx="2" ry="3.4" transform={`rotate(${a} 120 15)`} opacity="0.9" />)}
      <circle cx="120" cy="15" r="1.8" />
    </svg>
  );
}
function DividerDots(color: string) {
  return (
    <svg viewBox="0 0 240 16" className={full} fill="none" stroke={color} strokeWidth="1" aria-hidden>
      <path d="M30 8 H100" strokeLinecap="round" />
      <path d="M140 8 H210" strokeLinecap="round" />
      {[110, 120, 130].map((x, i) => <circle key={i} cx={x} cy="8" r={i === 1 ? 2.6 : 1.6} fill={color} stroke="none" />)}
    </svg>
  );
}
function DividerDeco(color: string, c2: string) {
  return (
    <svg viewBox="0 0 240 24" className={full} fill="none" stroke={color} strokeWidth="1.1" aria-hidden>
      <path d="M10 12 H92" strokeLinecap="round" />
      <path d="M148 12 H230" strokeLinecap="round" />
      <path d="M92 12 L120 4 L148 12 L120 20 Z" fill="none" />
      <path d="M104 12 L120 7 L136 12 L120 17 Z" fill={c2} stroke="none" />
    </svg>
  );
}

// ── Marcos ────────────────────────────────────────────────────────────────────
function FrameLine(color: string) {
  return (
    <svg viewBox="0 0 300 400" className={full} fill="none" stroke={color} aria-hidden>
      <rect x="10" y="10" width="280" height="380" strokeWidth="1.4" />
      <rect x="20" y="20" width="260" height="360" strokeWidth="0.7" opacity="0.6" />
    </svg>
  );
}
function FrameArch(color: string) {
  return (
    <svg viewBox="0 0 300 400" className={full} fill="none" stroke={color} aria-hidden>
      <path d="M20 390 V150 A130 130 0 0 1 280 150 V390" strokeWidth="1.4" />
      <path d="M30 388 V152 A120 120 0 0 1 270 152 V388" strokeWidth="0.7" opacity="0.55" />
    </svg>
  );
}
function FrameFloral(color: string) {
  const leaf = (x: number, y: number, rot: number) => (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <path d={`M${x} ${y} q 18 -10 36 0 q -18 14 -36 0 Z`} fill={color} stroke="none" opacity="0.85" />
    </g>
  );
  return (
    <svg viewBox="0 0 300 400" className={full} fill="none" stroke={color} aria-hidden>
      <rect x="16" y="16" width="268" height="368" strokeWidth="1.2" />
      {leaf(16, 16, 20)}{leaf(284, 16, 160)}{leaf(16, 384, -20)}{leaf(284, 384, 200)}
    </svg>
  );
}

// ── Ramos centrados ───────────────────────────────────────────────────────────
function petalFlower(cx: number, cy: number, r: number, color: string, c2: string) {
  return (
    <g>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={a} cx={cx} cy={cy - r * 0.7} rx={r * 0.42} ry={r * 0.85} transform={`rotate(${a} ${cx} ${cy})`} fill={color} opacity="0.9" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.34} fill={c2} />
    </g>
  );
}
function BouquetRoses(color: string, c2: string) {
  return (
    <svg viewBox="0 0 200 160" className={full} fill="none" stroke={color} aria-hidden>
      {[[60, 70], [140, 70], [100, 110]].map(([x, y], i) => (
        <g key={i}><path d={`M${x} ${y} C ${x} ${y - 50}, ${x + 36} ${y - 28}, ${x + 16} ${y + 8}`} strokeWidth="1" opacity="0.5" /></g>
      ))}
      {petalFlower(70, 60, 26, color, c2)}
      {petalFlower(132, 64, 22, color, c2)}
      {petalFlower(100, 96, 20, color, c2)}
      {[[40, 96], [160, 96], [100, 134]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="14" ry="5" transform={`rotate(${i * 40 - 40} ${x} ${y})`} fill={color} stroke="none" opacity="0.55" />
      ))}
    </svg>
  );
}
function BouquetWild(color: string, c2: string) {
  return (
    <svg viewBox="0 0 200 170" className={full} fill={color} stroke="none" aria-hidden>
      {[-30, -10, 12, 32].map((rot, i) => (
        <g key={i} transform={`rotate(${rot} 100 150)`}>
          <path d="M100 150 C 96 100, 98 70, 100 50" stroke={color} strokeWidth="1" fill="none" />
          {[120, 100, 80, 64].map((y, j) => <ellipse key={j} cx={100 + (j % 2 ? 9 : -9)} cy={y} rx="7" ry="3" transform={`rotate(${j % 2 ? 30 : -30} ${100 + (j % 2 ? 9 : -9)} ${y})`} opacity="0.8" />)}
        </g>
      ))}
      {petalFlower(100, 48, 18, color, c2)}
      {petalFlower(72, 66, 12, color, c2)}
      {petalFlower(128, 66, 12, color, c2)}
    </svg>
  );
}

// ── Coronas ───────────────────────────────────────────────────────────────────
function WreathLaurel(color: string) {
  const leaves = (mirror: number) => Array.from({ length: 11 }, (_, i) => {
    const ang = Math.PI * (0.5 + (i / 10) * 0.9) * mirror;
    const cx = 80 + Math.cos(ang) * 64;
    const cy = 80 + Math.sin(ang) * 64;
    return <ellipse key={i} cx={cx} cy={cy} rx="9" ry="3.2" transform={`rotate(${(ang * 180) / Math.PI + 90} ${cx} ${cy})`} opacity={0.85} />;
  });
  return (
    <svg viewBox="0 0 160 160" className={full} fill={color} stroke="none" aria-hidden>
      {leaves(1)}{leaves(-1)}
    </svg>
  );
}
function WreathFloral(color: string, c2: string) {
  return (
    <svg viewBox="0 0 160 160" className={full} fill="none" stroke={color} aria-hidden>
      <circle cx="80" cy="80" r="62" strokeWidth="1" opacity="0.5" />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const x = 80 + Math.cos(a) * 62; const y = 80 + Math.sin(a) * 62;
        return <ellipse key={i} cx={x} cy={y} rx="8" ry="3" transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} fill={color} stroke="none" opacity="0.8" />;
      })}
      {[0, 90, 180, 270].map(deg => {
        const a = (deg / 180) * Math.PI; const x = 80 + Math.cos(a) * 62; const y = 80 + Math.sin(a) * 62;
        return petalFlower(x, y, 11, color, c2);
      })}
    </svg>
  );
}

// ── Cintas ────────────────────────────────────────────────────────────────────
function RibbonBanner(color: string, c2: string) {
  return (
    <svg viewBox="0 0 220 70" className={full} aria-hidden>
      <path d="M0 50 L20 30 L20 50 Z" fill={c2} />
      <path d="M220 50 L200 30 L200 50 Z" fill={c2} />
      <path d="M20 18 H200 V52 H20 Z" fill={color} />
      <path d="M20 18 V52 L8 35 Z" fill={color} opacity="0.8" />
      <path d="M200 18 V52 L212 35 Z" fill={color} opacity="0.8" />
    </svg>
  );
}
function RibbonTag(color: string) {
  return (
    <svg viewBox="0 0 120 70" className={full} aria-hidden>
      <path d="M6 14 H92 L114 35 L92 56 H6 Z" fill={color} />
      <circle cx="24" cy="35" r="5" fill="#fff" opacity="0.85" />
    </svg>
  );
}

// ── Destellos ─────────────────────────────────────────────────────────────────
function spark(cx: number, cy: number, r: number, color: string) {
  return <path d={`M${cx} ${cy - r} C ${cx + r * 0.18} ${cy - r * 0.18}, ${cx + r * 0.18} ${cy - r * 0.18}, ${cx + r} ${cy} C ${cx + r * 0.18} ${cy + r * 0.18}, ${cx + r * 0.18} ${cy + r * 0.18}, ${cx} ${cy + r} C ${cx - r * 0.18} ${cy + r * 0.18}, ${cx - r * 0.18} ${cy + r * 0.18}, ${cx - r} ${cy} C ${cx - r * 0.18} ${cy - r * 0.18}, ${cx - r * 0.18} ${cy - r * 0.18}, ${cx} ${cy - r} Z`} fill={color} />;
}
function SparkleSingle(color: string) {
  return <svg viewBox="0 0 60 60" className={full} aria-hidden>{spark(30, 30, 28, color)}</svg>;
}
function SparkleTrio(color: string, c2: string) {
  return (
    <svg viewBox="0 0 120 80" className={full} aria-hidden>
      {spark(40, 40, 26, color)}
      {spark(86, 26, 16, c2)}
      {spark(92, 60, 12, color)}
    </svg>
  );
}
function StarBurst(color: string) {
  return (
    <svg viewBox="0 0 80 80" className={full} fill="none" stroke={color} strokeWidth="1.4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <line key={i} x1="40" y1="40" x2={40 + Math.cos(a) * 34} y2={40 + Math.sin(a) * 34} strokeLinecap="round" opacity={i % 2 ? 0.5 : 1} />;
      })}
      <circle cx="40" cy="40" r="3" fill={color} stroke="none" />
    </svg>
  );
}

const otherElements: ElementDef[] = [
  // Cenefas
  { key: 'divider-floral', label: 'Floritura', category: 'divider', w: 260, render: (c, c2) => DividerFloral(c, c2 || c) },
  { key: 'divider-vine', label: 'Enredadera', category: 'divider', w: 260, render: (c) => DividerVine(c) },
  { key: 'divider-deco', label: 'Déco', category: 'divider', w: 260, render: (c, c2) => DividerDeco(c, c2 || c) },
  { key: 'divider-dots', label: 'Puntos', category: 'divider', w: 240, render: (c) => DividerDots(c) },
  // Marcos
  { key: 'frame-line', label: 'Doble línea', category: 'frame', w: 260, anchor: 'mc', render: (c) => FrameLine(c) },
  { key: 'frame-arch', label: 'Arco', category: 'frame', w: 260, anchor: 'mc', render: (c) => FrameArch(c) },
  { key: 'frame-floral', label: 'Floral', category: 'frame', w: 260, anchor: 'mc', render: (c) => FrameFloral(c) },
  // Ramos
  { key: 'bouquet-roses', label: 'Rosas', category: 'bouquet', w: 180, anchor: 'bc', render: (c, c2) => BouquetRoses(c, c2 || c) },
  { key: 'bouquet-wild', label: 'Silvestre', category: 'bouquet', w: 170, anchor: 'bc', render: (c, c2) => BouquetWild(c, c2 || c) },
  // Coronas
  { key: 'wreath-laurel', label: 'Laurel', category: 'wreath', w: 180, anchor: 'mc', render: (c) => WreathLaurel(c) },
  { key: 'wreath-floral', label: 'Floral', category: 'wreath', w: 180, anchor: 'mc', render: (c, c2) => WreathFloral(c, c2 || c) },
  // Cintas
  { key: 'ribbon-banner', label: 'Banderín', category: 'ribbon', w: 200, anchor: 'tc', render: (c, c2) => RibbonBanner(c, c2 || c) },
  { key: 'ribbon-tag', label: 'Etiqueta', category: 'ribbon', w: 140, anchor: 'tc', render: (c) => RibbonTag(c) },
  // Destellos
  { key: 'sparkle-single', label: 'Destello', category: 'sparkle', w: 60, render: (c) => SparkleSingle(c) },
  { key: 'sparkle-trio', label: 'Trío', category: 'sparkle', w: 110, render: (c, c2) => SparkleTrio(c, c2 || c) },
  { key: 'star-burst', label: 'Estrella', category: 'sparkle', w: 70, render: (c) => StarBurst(c) },
];

// ── Esquineros florales de más detalle (render propio, viewBox 0 0 210 210) ────
function peony(cx: number, cy: number, r: number, color: string, c2: string) {
  return (
    <g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
        <ellipse key={a} cx={cx} cy={cy - r * 0.55} rx={r * 0.34} ry={r * 0.6} transform={`rotate(${a} ${cx} ${cy})`} fill={color} opacity="0.5" />
      ))}
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={`i${a}`} cx={cx} cy={cy - r * 0.3} rx={r * 0.26} ry={r * 0.4} transform={`rotate(${a} ${cx} ${cy})`} fill={c2} opacity="0.85" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.18} fill={c2} />
    </g>
  );
}
function CornerPeony(color: string, c2: string) {
  return (
    <svg viewBox="0 0 210 210" className={full} aria-hidden>
      <path d="M6 6 C 50 30, 80 60, 96 96" stroke={color} strokeWidth="1" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M6 6 C 30 50, 36 90, 40 128" stroke={color} strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />
      {([[60, 52, -30], [44, 98, -58], [104, 68, -12], [34, 72, -70], [78, 40, -40]] as [number, number, number][]).map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="13" ry="5" transform={`rotate(${r} ${x} ${y})`} fill={color} opacity="0.45" />
      ))}
      {peony(96, 96, 27, color, c2)}
      {peony(44, 124, 16, color, c2)}
      {peony(122, 60, 13, color, c2)}
    </svg>
  );
}

function daisy(cx: number, cy: number, r: number, color: string, c2: string) {
  return (
    <g>
      {Array.from({ length: 10 }).map((_, i) => (
        <ellipse key={i} cx={cx} cy={cy - r * 0.7} rx={r * 0.16} ry={r * 0.5} transform={`rotate(${i * 36} ${cx} ${cy})`} fill={color} opacity="0.9" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.28} fill={c2} />
    </g>
  );
}
function CornerWild(color: string, c2: string) {
  return (
    <svg viewBox="0 0 210 210" className={full} aria-hidden>
      {[[6, 6, 100, 100], [6, 6, 50, 132], [22, 14, 110, 70]].map(([x1, y1, x2, y2], i) => (
        <path key={i} d={`M${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`} stroke={color} strokeWidth="1" fill="none" opacity={0.55 - i * 0.1} strokeLinecap="round" />
      ))}
      {([[58, 50, -34], [44, 100, -60], [100, 70, -14]] as [number, number, number][]).map(([x, y, r], i) => (
        <ellipse key={`l${i}`} cx={x} cy={y} rx="11" ry="4" transform={`rotate(${r} ${x} ${y})`} fill={color} opacity="0.5" />
      ))}
      {daisy(100, 100, 18, color, c2)}
      {daisy(50, 128, 13, color, c2)}
      {daisy(112, 66, 10, color, c2)}
      {([[70, 60], [40, 86]] as [number, number][]).map(([x, y], i) => (
        <g key={`b${i}`}><circle cx={x} cy={y} r="3.4" fill={color} opacity="0.7" /><line x1={x} y1={y} x2={x - 4} y2={y + 8} stroke={color} strokeWidth="0.8" /></g>
      ))}
    </svg>
  );
}

function CornerEucalyptus(color: string) {
  const pair = (x: number, y: number, s: number, rot: number, o: number) => (
    <g transform={`rotate(${rot} ${x} ${y})`} opacity={o}>
      <ellipse cx={x - s} cy={y} rx={s} ry={s * 0.82} fill={color} />
      <ellipse cx={x + s} cy={y} rx={s} ry={s * 0.82} fill={color} />
    </g>
  );
  const stem = (x1: number, y1: number, x2: number, y2: number, n: number, o: number) => {
    const items = Array.from({ length: n }, (_, i) => {
      const t = (i + 1) / (n + 1);
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t * t;
      return pair(px, py, 7 - i * 0.4, (i % 2 ? 30 : -30) + 20, o - t * 0.2);
    });
    return (
      <g>
        <path d={`M${x1} ${y1} C ${(x1 + x2) / 2} ${y1 + 4}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`} stroke={color} strokeWidth="1" fill="none" opacity={o * 0.7} strokeLinecap="round" />
        {items}
      </g>
    );
  };
  return (
    <svg viewBox="0 0 210 210" className={full} aria-hidden>
      {stem(4, 4, 120, 150, 7, 0.85)}
      {stem(4, 4, 60, 120, 5, 0.6)}
      {stem(20, 8, 140, 80, 5, 0.5)}
    </svg>
  );
}

const richCornerElements: ElementDef[] = [
  { key: 'corner-peony', label: 'Peonías', category: 'corner', w: 185, anchor: 'tl', render: (c, c2) => CornerPeony(c, c2 || c) },
  { key: 'corner-wild', label: 'Silvestres', category: 'corner', w: 180, anchor: 'tl', render: (c, c2) => CornerWild(c, c2 || c) },
  { key: 'corner-eucalyptus', label: 'Eucalipto', category: 'corner', w: 185, anchor: 'tl', render: (c) => CornerEucalyptus(c) },
];

export const ELEMENTS: ElementDef[] = [...cornerElements, ...richCornerElements, ...otherElements];

const BY_KEY: Record<string, ElementDef> = Object.fromEntries(ELEMENTS.map(e => [e.key, e]));

export function getElement(key: string): ElementDef | undefined {
  return BY_KEY[key];
}

/** Render de un motivo de la librería (cae a un cuadro tenue si no existe). */
export function renderElement(motif: string, color: string, color2?: string): React.ReactNode {
  const def = BY_KEY[motif];
  if (!def) return null;
  return def.render(color, color2);
}
