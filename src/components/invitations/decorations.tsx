'use client';

// Decoraciones de página reutilizables (extraídas de Azure) para que CUALQUIER
// invitación por bloques pueda tener: orquídeas en las esquinas, fondo de hojas de
// acuarela y plumas cayendo sutilmente. Todo parametrizado por color (tema).

import type React from 'react';
import { Particles } from './shared';
import { CursorTrail } from './effects';
import type { TemplateDecor } from '@/lib/types';

// ── Orquídea (flor) ───────────────────────────────────────────────────────────
function OrchidBloom({ x, y, s, o = 0.9, color }: { x: number; y: number; s: number; o?: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <ellipse cx="0" cy="-11" rx="6.5" ry="11" />
      <ellipse cx="-12" cy="-3" rx="11.5" ry="6.5" transform="rotate(-32)" />
      <ellipse cx="12" cy="-3" rx="11.5" ry="6.5" transform="rotate(32)" />
      <ellipse cx="-8" cy="9" rx="8.5" ry="5.5" transform="rotate(-18)" />
      <ellipse cx="8" cy="9" rx="8.5" ry="5.5" transform="rotate(18)" />
      <path d="M-3 3 C -5 9, -3 14, 0 15 C 3 14, 5 9, 3 3 Z" />
      <circle cx="0" cy="1" r="2.4" />
      <circle cx="0" cy="1" r="0.9" fill={color} />
      <line x1="0" y1="-3" x2="0" y2="-20" strokeWidth="0.5" />
      <line x1="0" y1="0" x2="-20" y2="-9" strokeWidth="0.5" />
      <line x1="0" y1="0" x2="20" y2="-9" strokeWidth="0.5" />
    </g>
  );
}

// ── Ramo de orquídeas para una esquina ────────────────────────────────────────
function OrchidCluster({ color, className, style }: { color: string; className?: string; style?: React.CSSProperties }) {
  const leaf = (x: number, y: number, rx: number, ry: number, rot: number, o: number) => (
    <g transform={`rotate(${rot} ${x} ${y})`} opacity={o}>
      <path d={`M${x - rx} ${y} Q ${x} ${y - ry * 1.6} ${x + rx} ${y} Q ${x} ${y + ry * 1.6} ${x - rx} ${y} Z`} />
      <line x1={x - rx} y1={y} x2={x + rx} y2={y} strokeWidth="0.5" />
    </g>
  );
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} fill="none" stroke={color} strokeWidth="1" aria-hidden>
      <path d="M6 6 C 45 28, 80 55, 104 104" strokeLinecap="round" opacity="0.85" />
      <path d="M6 6 C 26 48, 32 86, 36 128" strokeLinecap="round" opacity="0.7" />
      <path d="M34 6 C 70 22, 104 40, 132 78" strokeLinecap="round" opacity="0.6" />
      <path d="M16 30 C 40 60, 52 92, 58 132" strokeLinecap="round" opacity="0.45" />
      {leaf(62, 52, 16, 6, -32, 0.7)}
      {leaf(86, 82, 18, 6.5, -22, 0.65)}
      {leaf(44, 100, 15, 5.5, -58, 0.6)}
      {leaf(112, 64, 16, 6, -12, 0.6)}
      {leaf(56, 36, 13, 5, -42, 0.55)}
      {leaf(30, 70, 12, 4.5, -68, 0.45)}
      <g opacity="0.6"><ellipse cx="138" cy="84" rx="3" ry="6" transform="rotate(40 138 84)" /><line x1="138" y1="84" x2="132" y2="78" strokeWidth="0.6" /></g>
      <g opacity="0.55"><ellipse cx="40" cy="136" rx="3" ry="6" transform="rotate(-20 40 136)" /></g>
      <OrchidBloom x={104} y={104} s={1} o={0.9} color={color} />
      <OrchidBloom x={40} y={126} s={0.72} o={0.8} color={color} />
      <OrchidBloom x={130} y={74} s={0.6} o={0.7} color={color} />
      <OrchidBloom x={22} y={58} s={0.5} o={0.6} color={color} />
    </svg>
  );
}

// ── Otras variantes de ramo de esquina (viewBox 0 0 210 210) ──────────────────
type ClusterProps = { color: string; className?: string; style?: React.CSSProperties };

function RoseCluster({ color, className, style }: ClusterProps) {
  const rose = (x: number, y: number, r: number) => (
    <g>
      <circle cx={x} cy={y} r={r} />
      <circle cx={x} cy={y} r={r * 0.62} opacity="0.8" />
      <circle cx={x} cy={y} r={r * 0.3} />
      <circle cx={x} cy={y} r={r * 0.12} fill={color} />
    </g>
  );
  const leaf = (x: number, y: number, rx: number, rot: number, o: number) => (
    <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.4} transform={`rotate(${rot} ${x} ${y})`} opacity={o} />
  );
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} fill="none" stroke={color} strokeWidth="1" aria-hidden>
      <path d="M6 6 C 50 30, 84 60, 112 104" strokeLinecap="round" opacity="0.8" />
      <path d="M6 6 C 28 50, 34 92, 40 132" strokeLinecap="round" opacity="0.6" />
      {leaf(64, 50, 15, -30, 0.7)}{leaf(46, 96, 13, -56, 0.6)}{leaf(102, 72, 15, -12, 0.6)}{leaf(34, 70, 11, -70, 0.45)}
      {rose(112, 104, 16)}{rose(44, 128, 11)}{rose(124, 66, 9)}{rose(74, 58, 7)}
    </svg>
  );
}

function LeavesCluster({ color, className, style }: ClusterProps) {
  const eu = (x: number, y: number, s: number, o: number) => (
    <g opacity={o}><circle cx={x - s} cy={y} r={s} /><circle cx={x + s} cy={y} r={s} /></g>
  );
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} fill={color} stroke="none" aria-hidden>
      <path d="M6 6 C 44 40, 74 80, 100 132" stroke={color} strokeWidth="1" fill="none" opacity="0.7" strokeLinecap="round" />
      {eu(28, 30, 7, 0.85)}{eu(46, 56, 8, 0.8)}{eu(62, 84, 8, 0.7)}{eu(78, 112, 7, 0.6)}
      <path d="M6 6 C 30 28, 40 56, 44 92" stroke={color} strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />
      {eu(22, 58, 6, 0.5)}{eu(34, 86, 6, 0.45)}
    </svg>
  );
}

function PampasCluster({ color, className, style }: ClusterProps) {
  const plume = (rot: number, len: number, o: number) => (
    <g transform={`rotate(${rot} 8 8)`} opacity={o}>
      <path d={`M8 8 C ${len * 0.4} ${8 + len * 0.05}, ${len * 0.8} ${8 + len * 0.1}, ${len} ${8 + len * 0.15}`} stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      {Array.from({ length: 7 }, (_, i) => {
        const t = (i + 2) / 10; const px = 8 + (len - 8) * t; const py = 8 + len * 0.15 * t;
        return <line key={i} x1={px} y1={py} x2={px - 5} y2={py - 7} stroke={color} strokeWidth="0.7" />;
      })}
    </g>
  );
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} aria-hidden>
      {plume(8, 150, 0.8)}{plume(20, 165, 0.7)}{plume(34, 150, 0.6)}{plume(50, 130, 0.5)}{plume(64, 110, 0.4)}
    </svg>
  );
}

function PalmCluster({ color, className, style }: ClusterProps) {
  const frond = (rot: number, len: number, o: number) => (
    <g transform={`rotate(${rot} 6 6)`} opacity={o}>
      <path d={`M6 6 C ${len * 0.4} 10, ${len * 0.75} 16, ${len} 26`} stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {Array.from({ length: 9 }, (_, i) => {
        const t = (i + 1) / 11; const px = 6 + (len - 6) * t; const py = 6 + 20 * t * t;
        return <line key={i} x1={px} y1={py} x2={px + 4} y2={py - 12} stroke={color} strokeWidth="0.7" />;
      })}
    </g>
  );
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} aria-hidden>
      {frond(6, 150, 0.8)}{frond(26, 160, 0.65)}{frond(48, 140, 0.5)}{frond(70, 115, 0.4)}
    </svg>
  );
}

function GeoCluster({ color, className, style }: ClusterProps) {
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} fill="none" stroke={color} aria-hidden>
      <path d="M0 70 Q 0 0 70 0" strokeWidth="1.4" opacity="0.9" />
      <path d="M0 100 Q 0 0 100 0" strokeWidth="1" opacity="0.55" />
      <path d="M0 40 L 40 0" strokeWidth="1" opacity="0.7" />
      <path d="M0 16 L 16 0" strokeWidth="1" opacity="0.5" />
      <g transform="rotate(45 58 58)"><rect x="50" y="50" width="16" height="16" strokeWidth="1.1" /></g>
      <circle cx="58" cy="58" r="2.2" fill={color} stroke="none" />
    </svg>
  );
}

function LaurelCluster({ color, className, style }: ClusterProps) {
  const leaves = Array.from({ length: 9 }, (_, i) => {
    const t = i / 9;
    const x = 8 + 98 * t; const y = 8 + 130 * t * t;
    const side = i % 2 === 0 ? 1 : -1;
    return <ellipse key={i} cx={x} cy={y} rx={Math.max(4, 12 - i)} ry={4} transform={`rotate(${-45 + side * 32} ${x} ${y})`} opacity={0.85 - t * 0.35} />;
  });
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} fill={color} stroke="none" aria-hidden>
      <path d="M8 8 C 46 38, 78 78, 104 136" stroke={color} strokeWidth="1" fill="none" opacity="0.55" strokeLinecap="round" />
      {leaves}
    </svg>
  );
}

function VineCluster({ color, className, style }: ClusterProps) {
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} fill={color} stroke="none" aria-hidden>
      <path d="M6 6 C 40 24, 12 56, 46 78 C 80 100, 48 132, 78 158" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.7" />
      {([[28, 30], [22, 62], [54, 82], [46, 120], [72, 144]] as [number, number][]).map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="8" ry="3.4" transform={`rotate(${i % 2 ? 40 : -40} ${x} ${y})`} opacity="0.6" />
      ))}
      {([[42, 46], [66, 106]] as [number, number][]).map(([x, y], i) => (
        <g key={`f${i}`} opacity="0.75">{[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx={x} cy={y - 4} rx="1.8" ry="3" transform={`rotate(${a} ${x} ${y})`} />)}<circle cx={x} cy={y} r="1.6" fill={color} /></g>
      ))}
    </svg>
  );
}

function BerriesCluster({ color, className, style }: ClusterProps) {
  const berry = (x: number, y: number) => (
    <g><circle cx={x} cy={y} r="3.2" /><circle cx={x + 5} cy={y + 4} r="2.8" /><circle cx={x - 4} cy={y + 5} r="2.5" /><circle cx={x + 1} cy={y + 9} r="2.4" /></g>
  );
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} fill={color} stroke="none" aria-hidden>
      <path d="M6 6 C 44 34, 74 72, 100 128" stroke={color} strokeWidth="1" fill="none" opacity="0.6" strokeLinecap="round" />
      {([[40, 44], [70, 90]] as [number, number][]).map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="12" ry="5" transform={`rotate(-30 ${x} ${y})`} opacity="0.5" />)}
      {berry(54, 60)}{berry(88, 106)}{berry(34, 98)}
    </svg>
  );
}

function FanCluster({ color, className, style }: ClusterProps) {
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} fill="none" stroke={color} aria-hidden>
      {[12, 26, 40, 54, 68, 80].map((deg, i) => {
        const r = 130 - i * 8; const a = (deg * Math.PI) / 180;
        return <line key={i} x1="6" y1="6" x2={6 + Math.cos(a) * r} y2={6 + Math.sin(a) * r} strokeWidth="1" opacity={0.75 - i * 0.07} />;
      })}
      <path d="M0 92 Q 0 0 92 0" strokeWidth="1.3" opacity="0.85" />
      <path d="M0 60 Q 0 0 60 0" strokeWidth="1" opacity="0.5" />
      <circle cx="7" cy="7" r="3" fill={color} stroke="none" />
    </svg>
  );
}

/**
 * Un ramo/esquinero decorativo en un único SVG (viewBox 0 0 210 210),
 * recoloreable. Reutilizado por la decoración de página (CornerDecor) y por la
 * librería de elementos del constructor (elements-library).
 */
export function CornerCluster({ variant, color, className, style }: ClusterProps & { variant: string }) {
  if (variant === 'rose') return <RoseCluster color={color} className={className} style={style} />;
  if (variant === 'leaves') return <LeavesCluster color={color} className={className} style={style} />;
  if (variant === 'pampas') return <PampasCluster color={color} className={className} style={style} />;
  if (variant === 'palm') return <PalmCluster color={color} className={className} style={style} />;
  if (variant === 'geometric') return <GeoCluster color={color} className={className} style={style} />;
  if (variant === 'laurel') return <LaurelCluster color={color} className={className} style={style} />;
  if (variant === 'vine') return <VineCluster color={color} className={className} style={style} />;
  if (variant === 'berries') return <BerriesCluster color={color} className={className} style={style} />;
  if (variant === 'fan') return <FanCluster color={color} className={className} style={style} />;
  return <OrchidCluster color={color} className={className} style={style} />;
}

/** Marco de adornos en las cuatro esquinas del DOCUMENTO (absolute, no fixed:
 *  no acompañan el scroll); elige el diseño con `variant`. */
export function CornerDecor({ color, opacity = 1, variant = 'orchid' }: { color: string; opacity?: number; variant?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden style={{ opacity }}>
      {/* ek-sway (globals.css): vaivén de brisa vía rotate/translate individuales,
          que se componen con el transform del espejado sin pisarlo. */}
      <CornerCluster variant={variant} color={color} className="absolute -top-8 -left-8 w-[44vw] max-w-[340px] min-w-[160px] opacity-90 ek-sway" style={{ '--sway-dur': '10s' } as React.CSSProperties} />
      <CornerCluster variant={variant} color={color} className="absolute -bottom-8 -right-8 w-[44vw] max-w-[340px] min-w-[160px] opacity-90 ek-sway" style={{ transform: 'scaleX(-1) scaleY(-1)', '--sway-dur': '12s', '--sway-delay': '-5s' } as React.CSSProperties} />
      <CornerCluster variant={variant} color={color} className="absolute -bottom-10 -left-10 w-[30vw] max-w-[230px] min-w-[120px] opacity-65 ek-sway" style={{ transform: 'scaleY(-1)', '--sway-dur': '14s', '--sway-delay': '-8s' } as React.CSSProperties} />
      <CornerCluster variant={variant} color={color} className="absolute -top-10 -right-10 w-[30vw] max-w-[230px] min-w-[120px] opacity-55 ek-sway" style={{ transform: 'scaleX(-1)', '--sway-dur': '11s', '--sway-delay': '-3s' } as React.CSSProperties} />
    </div>
  );
}

/** Fondo de hojas de acuarela (manchas suaves + hojitas tenues). */
export function WatercolorLeaves({ color }: { color: string }) {
  const blot = (cx: string, cy: string, r: string) => (
    <div style={{ position: 'absolute', left: cx, top: cy, width: r, height: r, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: `radial-gradient(circle, ${color}18, transparent 70%)` }} />
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {blot('18%', '20%', '420px')}
      {blot('82%', '34%', '380px')}
      {blot('30%', '64%', '460px')}
      {blot('72%', '82%', '420px')}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 1600" fill={color} stroke="none" opacity="0.06" aria-hidden>
        {([
          [150, 300, 150, 35], [1040, 240, 120, -28], [320, 760, 130, 18],
          [980, 900, 150, -20], [620, 1180, 120, 8], [120, 1120, 110, -42],
          [1080, 1340, 130, 24], [700, 460, 100, -12], [430, 1380, 115, 50],
        ] as [number, number, number, number][]).map(([x, y, s, rot], i) => (
          <path key={i} transform={`rotate(${rot} ${x} ${y})`}
            d={`M${x} ${y} C ${x - s * 0.22} ${y - s * 0.35}, ${x - s * 0.14} ${y - s * 0.8}, ${x} ${y - s} C ${x + s * 0.14} ${y - s * 0.8}, ${x + s * 0.22} ${y - s * 0.35}, ${x} ${y} Z`} />
        ))}
      </svg>
    </div>
  );
}

/** Textura de papel sutil (lino, papel, mármol, pergamino) sobre el fondo. */
export function PaperTexture({ kind, color }: { kind: NonNullable<TemplateDecor['texture']>; color: string }) {
  if (!kind || kind === 'none') return null;
  // Patrones generados con SVG/gradientes (sin imágenes externas), muy tenues.
  let bg: React.CSSProperties;
  if (kind === 'linen') {
    bg = {
      backgroundImage:
        `repeating-linear-gradient(0deg, ${color}0a 0px, ${color}0a 1px, transparent 1px, transparent 3px),
         repeating-linear-gradient(90deg, ${color}0a 0px, ${color}0a 1px, transparent 1px, transparent 3px)`,
      mixBlendMode: 'multiply',
    };
  } else if (kind === 'paper') {
    bg = {
      backgroundImage:
        `radial-gradient(${color}12 0.5px, transparent 0.6px)`,
      backgroundSize: '4px 4px',
      mixBlendMode: 'multiply',
    };
  } else if (kind === 'marble') {
    bg = {
      backgroundImage:
        `radial-gradient(ellipse at 20% 30%, ${color}10, transparent 55%),
         radial-gradient(ellipse at 75% 60%, ${color}0d, transparent 50%),
         radial-gradient(ellipse at 50% 85%, ${color}0a, transparent 45%)`,
      mixBlendMode: 'multiply',
    };
  } else {
    // parchment: viñeta cálida en los bordes
    bg = {
      background: `radial-gradient(ellipse at center, transparent 55%, ${color}14 100%)`,
      mixBlendMode: 'multiply',
    };
  }
  return <div className="pointer-events-none fixed inset-0 z-0" aria-hidden style={bg} />;
}

/**
 * Capa de decoración de página completa, controlada por `config.decor`:
 * fondo de hojas (background='art'), orquídeas en esquinas y plumas flotantes.
 */
export default function PageDecor({ decor, color }: { decor?: TemplateDecor; color: string }) {
  const d = decor ?? {};
  const showLeaves = d.background === 'art';
  const showCorners = d.corners?.on === true;
  const showFeathers = d.floating?.on === true;
  const showTrail = d.cursorTrail?.on === true;
  const showTexture = !!d.texture && d.texture !== 'none';
  if (!showLeaves && !showCorners && !showFeathers && !showTrail && !showTexture) return null;
  return (
    <>
      <style>{`
        @keyframes featherFall {
          0%   { transform: translateY(0) translateX(0) rotate(0deg) scale(var(--s,1)); opacity: 0; }
          12%  { opacity: .34; }
          50%  { transform: translateY(56vh) translateX(var(--drift,30px)) rotate(var(--spin,15deg)) scale(var(--s,1)); }
          88%  { opacity: .34; }
          100% { transform: translateY(116vh) translateX(0) rotate(calc(var(--spin,15deg) * -1)) scale(var(--s,1)); opacity: 0; }
        }
      `}</style>
      {showTexture && <PaperTexture kind={d.texture!} color={d.corners?.color || color} />}
      {showLeaves && <WatercolorLeaves color={d.corners?.color || color} />}
      {showCorners && <CornerDecor color={d.corners?.color || color} opacity={d.corners?.opacity ?? 1} variant={d.corners?.style || 'orchid'} />}
      {showFeathers && <Particles color={d.floating?.color || color} tip={d.floating?.tip || color} count={d.floating?.count ?? 6} shape={d.floating?.shape || 'feather'} />}
      {showTrail && <CursorTrail color={d.cursorTrail?.color || color} shape={d.cursorTrail?.shape || 'sparkle'} />}
    </>
  );
}
