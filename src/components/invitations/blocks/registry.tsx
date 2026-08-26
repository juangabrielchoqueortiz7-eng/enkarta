'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

// Registro central del sistema de bloques: para cada `BlockType`, su componente
// de render + el "field schema" que el editor del panel usa para generar los
// controles automáticamente (sin escribir un editor a medida por tipo).

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Block, BlockType, BlockLayout } from '@/lib/types';
import { useBlockDesign, useBlockTheme } from './theme';
import { Editable, useBlockData, useBlockEdit } from './editable';
import { useCountdown, CopyBtn, PhotoGrid, EventIcon, OrchidSprig, Odometer, Tilt, type GalleryLayout } from '../shared';
import { RevealDraw, PinnedStory } from '@/lib/scroll-motion';
import { PetalBurst } from '../effects';
import { renderElement, getElement, type ElementPalette } from './elements-library';
import { InvitationDivider, DEFAULT_DIVIDER } from '../dividers';
import { sanitizeSvg } from '@/lib/sanitize-svg';
import { PassportHeroBlock, PassportTicketBlock } from './passport-scenes';
import { imageAspect, imageColorOverlayStyle, imageFilter, imageFrameStyle, imageTemperatureStyle, imageTransform, imageViewportStyle } from '@/lib/image-effects';
import QrCard from '../QrCard';

// ── Lectura de props con defaults ─────────────────────────────────────────────
const str = (b: Block, k: string, d = '') => (typeof b.props[k] === 'string' ? (b.props[k] as string) : d);
const num = (b: Block, k: string, d = 0) => (typeof b.props[k] === 'number' ? (b.props[k] as number) : d);
const bool = (b: Block, k: string, d = false) => (typeof b.props[k] === 'boolean' ? (b.props[k] as boolean) : d);
const list = <T,>(b: Block, k: string): T[] => (Array.isArray(b.props[k]) ? (b.props[k] as T[]) : []);

// ── Tipografía por elemento (familia, tamaño, color, grosor, interletraje) ─────
export const FONT_CLASS: Record<string, string> = {
  great: 'font-great', cinzel: 'font-cinzel', cormorant: 'font-cormorant',
  playfair: 'font-playfair', outfit: 'font-outfit',
};
export const FONT_OPTIONS = [
  { value: '', label: 'Por defecto' },
  { value: 'great', label: 'Manuscrita' },
  { value: 'cinzel', label: 'Mayúsculas (Cinzel)' },
  { value: 'cormorant', label: 'Serif (Cormorant)' },
  { value: 'playfair', label: 'Serif (Playfair)' },
  { value: 'outfit', label: 'Sans (Outfit)' },
];
function famClass(b: Block) { return FONT_CLASS[str(b, 'family')] || ''; }
function typeScale(b: Block) { return Math.max(0.75, Math.min(1.35, num(b, '__responsiveFontScale', 1))); }
type TypeRole = 'title' | 'subtitle' | 'body' | 'label';
function semanticPx(px: number, role: TypeRole = 'body') { return `calc(${px}px * var(--ek-type-${role}, 1))`; }
function scaledPx(b: Block, px: number, role: TypeRole = 'body') { return `calc(${Math.round(px * typeScale(b) * 10) / 10}px * var(--ek-type-${role}, 1))`; }
function fluidType(b: Block, min: number, vw: number, max: number, role: TypeRole = 'title') {
  const scale = typeScale(b);
  return `clamp(calc(${Math.round(min * scale * 10) / 10}px * var(--ek-type-${role}, 1)), calc(${Math.round(vw * scale * 10) / 10}vw * var(--ek-type-${role}, 1)), calc(${Math.round(max * scale * 10) / 10}px * var(--ek-type-${role}, 1)))`;
}
function typoStyle(b: Block, role: TypeRole = 'body'): React.CSSProperties {
  const s: React.CSSProperties = {};
  const size = num(b, 'size', 0); if (size) s.fontSize = scaledPx(b, size, role);
  const color = str(b, 'textColor'); if (color) s.color = color;
  const w = str(b, 'weight'); if (w) s.fontWeight = w as React.CSSProperties['fontWeight'];
  const tk = b.props.tracking; if (typeof tk === 'number') s.letterSpacing = `${tk}px`;
  const lh = b.props.lineHeight; if (typeof lh === 'number' && lh > 0) s.lineHeight = String(lh);
  const textCase = str(b, 'textCase');
  if (['uppercase', 'lowercase', 'capitalize'].includes(textCase)) s.textTransform = textCase as React.CSSProperties['textTransform'];
  const opacity = b.props.textOpacity;
  if (typeof opacity === 'number') s.opacity = Math.max(0, Math.min(100, opacity)) / 100;
  const shadow = str(b, 'textShadow');
  if (shadow === 'soft') s.textShadow = '0 2px 12px rgba(20,15,10,0.2)';
  if (shadow === 'strong') s.textShadow = '0 3px 18px rgba(20,15,10,0.42)';
  if (shadow === 'glow') s.textShadow = '0 0 18px currentColor';
  return s;
}

// ── Field schema (para el editor genérico) ────────────────────────────────────
export type FieldKind =
  | 'text' | 'textarea' | 'color' | 'image' | 'images' | 'icon'
  | 'number' | 'switch' | 'select' | 'list' | 'focal' | 'divider';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  itemFields?: FieldDef[]; // para kind 'list'
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface BlockDef {
  label: string;
  icon: string; // emoji para la paleta
  defaultProps: Record<string, unknown>;
  fields: FieldDef[];
  Component: React.FC<{ block: Block }>;
}

// Los componentes interactivos comparten la misma geometría que la plantilla.
// Así una invitación editorial conserva esquinas precisas y una romántica usa
// curvas amplias, sin que cada bloque parezca pertenecer a un producto distinto.
function useInvitationShape() {
  const tokens = useBlockDesign();
  const source = tokens.sectionRadius ?? 18;
  const mood = source <= 12 ? 'editorial' : source >= 24 ? 'rounded' : 'balanced';
  const cardRadius = tokens.cardRadius ?? (mood === 'editorial' ? Math.max(7, source) : mood === 'rounded' ? Math.min(30, source) : Math.max(14, source));
  const fieldRadius = tokens.fieldRadius ?? (mood === 'editorial' ? 8 : mood === 'rounded' ? 16 : 12);
  const buttonRadius = tokens.buttonRadius ?? (mood === 'editorial' ? 8 : mood === 'rounded' ? 999 : 14);
  return { mood, cardRadius, fieldRadius, buttonRadius, shadow: tokens.shadow ?? 'soft' };
}

// ── Botón decorativo compartido ───────────────────────────────────────────────
function Pill({ href, children, filled }: { href?: string; children: React.ReactNode; filled?: boolean }) {
  const t = useBlockTheme();
  const shape = useInvitationShape();
  const buttonShadow = shape.shadow === 'none' ? undefined
    : shape.shadow === 'strong' ? `0 16px 40px color-mix(in srgb, ${t.primary} 34%, transparent)`
    : shape.shadow === 'medium' ? `0 12px 30px color-mix(in srgb, ${t.primary} 25%, transparent)`
    : `0 9px 24px color-mix(in srgb, ${t.primary} 18%, transparent)`;
  const style: React.CSSProperties = filled
    ? { background: t.primary, color: t.onPrimary, borderRadius: shape.buttonRadius, boxShadow: buttonShadow }
    : { border: `1px solid ${t.line}`, color: t.primary, borderRadius: shape.buttonRadius, background: `color-mix(in srgb, ${t.surface} 82%, ${t.bg})` };
  return (
    <a href={href || '#'} target="_blank" rel="noreferrer"
      className={`inline-flex min-h-11 items-center justify-center px-7 py-2.5 font-cinzel uppercase tracking-[0.16em] text-[11px] transition-all hover:-translate-y-px hover:opacity-95 ek-shine ${filled ? 'ek-shine-auto' : ''}`}
      style={style}>
      {children}
    </a>
  );
}

// ── Componentes de bloque ─────────────────────────────────────────────────────
const CoverBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const image = str(block, 'image');
  return (
    <div className="flex flex-col items-center">
      <Editable as="h1" k="groom" effect="write" value={str(block, 'groom', 'Lorena')} className={`${famClass(block) || 'font-great'} leading-[0.9]`} style={{ color: t.primary, fontSize: fluidType(block, 44, 13, 76), ...typoStyle(block, 'title') }} />
      <span className="font-cormorant my-1" style={{ color: t.muted, fontSize: scaledPx(block, 24, 'subtitle') }}>&amp;</span>
      <Editable as="h1" k="bride" effect="write" value={str(block, 'bride', 'Marcos')} className={`${famClass(block) || 'font-great'} leading-[0.9]`} style={{ color: t.primary, fontSize: fluidType(block, 44, 13, 76), ...typoStyle(block, 'title') }} />
      <Editable as="p" k="tagline" effect="cascade" value={str(block, 'tagline', 'Nos casamos')} className="font-cinzel uppercase tracking-[0.22em] mt-5" style={{ color: t.muted, fontSize: scaledPx(block, 12, 'label') }} />
      {image && (
        <div className="mt-8 w-full overflow-hidden rounded-2xl shadow-sm" style={{ maxWidth: 480, border: `1px solid ${t.line}` }}>
          <img src={image} alt="" decoding="async" fetchPriority="high" className="w-full object-cover" style={{ maxHeight: 600, objectPosition: str(block, 'focal', '50% 50%') }} />
        </div>
      )}
    </div>
  );
};

const HeadingBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const text = str(block, 'text', 'Título');
  const font = str(block, 'font', 'caps');
  const size = num(block, 'size', 0);
  const fc = famClass(block);
  const role: TypeRole = font === 'caps' ? 'subtitle' : 'title';
  const ts = typoStyle(block, role);
  if (font === 'script') return <Editable as="h2" k="text" effect="write" value={text} className={fc || 'font-great'} style={{ color: t.primary, fontSize: size ? scaledPx(block, size, role) : fluidType(block, 34, 7, 52, role), ...ts }} />;
  if (font === 'serif') return <Editable as="h2" k="text" effect="cascadeWords" value={text} className={fc || 'font-playfair'} style={{ color: t.primary, fontSize: size ? scaledPx(block, size, role) : fluidType(block, 24, 5, 36, role), ...ts }} />;
  return <Editable as="h2" k="text" effect="cascade" value={text} className={fc || 'font-cinzel uppercase tracking-[0.18em]'} style={{ color: t.muted, fontSize: size ? scaledPx(block, size, role) : fluidType(block, 14, 3, 18, role), ...ts }} />;
};

const TextBlock: React.FC<{ block: Block }> = ({ block }) => (
  <Editable as="p" k="text" value={str(block, 'text', 'Escribe aquí tu mensaje…')} className={`${famClass(block) || 'font-cormorant'} ${bool(block, 'italic') ? 'italic' : ''}`} style={{ color: 'inherit', fontSize: scaledPx(block, 18, 'body'), lineHeight: 1.75, opacity: 0.96, ...typoStyle(block, 'body') }} />
);

// Dígito con volteo 3D al cambiar (estilo tablero de aeropuerto/reloj flip).
function FlipDigit({ value, compact = false }: { value: string; compact?: boolean }) {
  const t = useBlockTheme();
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (value === prev.current) return;
    if (reduced) { setDisplay(value); prev.current = value; return; } // sin volteo
    setFlipping(true);
    const id = setTimeout(() => { setDisplay(value); setFlipping(false); prev.current = value; }, 280);
    return () => clearTimeout(id);
  }, [value, reduced]);
  return (
    <span
      className="relative inline-flex items-center justify-center font-playfair font-bold"
      style={{
        color: t.onPrimary, background: t.primaryDeep, borderRadius: 8,
        padding: compact ? '5px 1px' : '6px 2px', minWidth: '1.05em', fontSize: semanticPx(compact ? 21 : 30, 'subtitle'), lineHeight: 1,
        boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.08), 0 6px 14px -6px rgba(0,0,0,0.5)',
        transformStyle: 'preserve-3d', transition: 'transform .28s ease',
        transform: flipping ? 'rotateX(-90deg)' : 'rotateX(0deg)',
      }}
    >
      {/* Línea media del flip */}
      <span className="pointer-events-none absolute left-0 right-0 top-1/2 h-px" style={{ background: 'rgba(0,0,0,0.35)' }} />
      {display}
    </span>
  );
}

const CountdownBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const shape = useInvitationShape();
  const { days, hours, mins, secs } = useCountdown(str(block, 'isoDate', new Date().toISOString()));
  const storedDisplay = str(block, 'display', 'cards');
  const display = storedDisplay === 'plain' ? 'minimal' : storedDisplay;
  const units: [number, string][] = [[days, 'Días'], [hours, 'Horas'], [mins, 'Min'], ...(bool(block, 'showSeconds', true) ? [[secs, 'Seg'] as [number, string]] : [])];
  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: `repeat(${units.length}, minmax(0, 1fr))`, gap: 'clamp(6px, 2vw, 12px)', maxWidth: 560, margin: '0 auto' };
  const title = <p className="mb-5 font-cormorant italic" style={{ color: t.muted, fontSize: scaledPx(block, 17, 'body') }}>{str(block, 'label', 'Solo faltan')}</p>;
  const numberSize = (value: number, regular: number, compact: number) => scaledPx(block, value >= 100 ? compact : regular, 'subtitle');

  if (display === 'flip') {
    return (
      <div>
        {title}
        <div style={gridStyle}>
          {units.map(([n, l]) => {
            const s = String(n).padStart(2, '0');
            return (
              <div key={l} className="flex min-w-0 flex-col items-center gap-2">
                <span className="flex max-w-full gap-0.5">
                  {s.split('').map((digit, index) => <FlipDigit key={`${l}-${index}`} value={digit} compact={s.length > 2} />)}
                </span>
                <span className="font-cinzel uppercase tracking-widest" style={{ color: t.muted, fontSize: scaledPx(block, 10, 'label') }}>{l}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (display === 'rings') {
    return (
      <div>
        {title}
        <div style={gridStyle}>
          {units.map(([n, l]) => (
            <div key={l} className="flex min-w-0 flex-col items-center gap-2">
              <div className="flex aspect-square w-full max-w-[78px] items-center justify-center rounded-full" style={{ border: `1.5px solid ${t.primary}`, background: `radial-gradient(circle, color-mix(in srgb, ${t.primary} 9%, transparent), transparent 68%)`, boxShadow: `0 10px 28px color-mix(in srgb, ${t.primary} 10%, transparent)` }}>
                <span className="font-playfair font-bold leading-none" style={{ color: t.primary, fontSize: numberSize(n, 34, 27) }}><Odometer value={n} /></span>
              </div>
              <span className="font-cinzel uppercase tracking-[0.14em]" style={{ color: t.muted, fontSize: scaledPx(block, 9, 'label') }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (display === 'minimal') {
    return (
      <div>
        {title}
        <div style={{ ...gridStyle, gap: 0 }}>
          {units.map(([n, l], index) => (
            <div key={l} className="flex min-w-0 flex-col items-center px-1.5" style={{ borderLeft: index ? `1px solid ${t.line}` : undefined }}>
              <span className="font-playfair font-bold leading-none" style={{ color: t.primary, fontSize: numberSize(n, 39, 29) }}><Odometer value={n} /></span>
              <span className="mt-2 font-cinzel uppercase tracking-[0.16em]" style={{ color: t.muted, fontSize: scaledPx(block, 9, 'label') }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {title}
      <div style={gridStyle}>
        {units.map(([n, l]) => (
          <div key={l} className="flex min-w-0 flex-col items-center px-1 py-3.5" style={{ borderRadius: shape.cardRadius, border: `1px solid ${t.line}`, background: `linear-gradient(145deg, color-mix(in srgb, ${t.bg} 72%, white), color-mix(in srgb, ${t.primary} 7%, ${t.bg}))`, boxShadow: '0 12px 34px rgba(34,27,18,.065)' }}>
            <span className="font-playfair font-bold leading-none" style={{ color: t.primary, fontSize: numberSize(n, 36, 28) }}><Odometer value={n} /></span>
            <span className="mt-2 font-cinzel uppercase tracking-[0.12em]" style={{ color: t.muted, fontSize: scaledPx(block, 9, 'label') }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DateBadgeBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const shape = useInvitationShape();
  return (
    <div className="flex items-center justify-center gap-4">
      <span className="font-cinzel uppercase tracking-[0.2em]" style={{ color: t.muted, fontSize: scaledPx(block, 13, 'label') }}>{str(block, 'weekday', 'Sábado')}</span>
      <div className="flex flex-col items-center justify-center w-24 h-28 flex-shrink-0" style={{ border: `1px solid ${t.line}`, borderRadius: shape.mood === 'rounded' ? 999 : shape.cardRadius, background: `color-mix(in srgb, ${t.bg} 86%, white)` }}>
        {str(block, 'city') && <span className="font-cinzel uppercase tracking-widest" style={{ color: t.muted, fontSize: scaledPx(block, 8, 'label') }}>{str(block, 'city')}</span>}
        <span className="font-playfair font-bold leading-none" style={{ color: t.primary, fontSize: scaledPx(block, 46, 'title') }}>{str(block, 'day', '04')}</span>
        <span className="font-cinzel tracking-widest" style={{ color: t.muted, fontSize: scaledPx(block, 10, 'label') }}>{str(block, 'year', '2026')}</span>
      </div>
      <span className="font-cinzel uppercase tracking-[0.2em]" style={{ color: t.muted, fontSize: scaledPx(block, 13, 'label') }}>{str(block, 'month', 'Julio')}</span>
    </div>
  );
};

const EventCardBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  return (
    <div className="flex flex-col items-center">
      <span className="inline-flex w-12 h-12 mb-3">
        <EventIcon name={str(block, 'icon', 'church')} className="w-12 h-12" stroke={t.primary} lottieColors={block.props.iconColors as any} speed={block.props.iconSpeed as any} />
      </span>
      <h3 className="font-cinzel uppercase tracking-[0.16em]" style={{ color: t.muted, fontSize: scaledPx(block, 14, 'subtitle') }}>{str(block, 'title', 'Ceremonia')}</h3>
      <p className="font-playfair font-bold mt-2" style={{ color: t.primary, fontSize: scaledPx(block, 30, 'title') }}>{str(block, 'time', '16:00 h')}</p>
      <p className="font-cormorant mt-1" style={{ color: 'inherit', fontSize: scaledPx(block, 16, 'body') }}>{str(block, 'place', 'Lugar del evento')}</p>
      {str(block, 'address') && <p className="font-cormorant" style={{ color: t.muted, fontSize: scaledPx(block, 14, 'body') }}>{str(block, 'address')}</p>}
      {str(block, 'mapsUrl') && <div className="mt-4"><Pill href={str(block, 'mapsUrl')}>Ver ubicación</Pill></div>}
    </div>
  );
};

const DressCodeBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  return (
    <div className="flex flex-col items-center">
      <span className="inline-flex w-12 h-12 mb-3"><EventIcon name={str(block, 'icon', 'dress')} className="w-12 h-12" stroke={t.primary} /></span>
      <h3 className="font-cinzel uppercase tracking-[0.16em]" style={{ color: t.muted, fontSize: scaledPx(block, 15, 'subtitle') }}>{str(block, 'title', 'Código de vestimenta')}</h3>
      <div className="font-cormorant mt-3" style={{ color: 'inherit', fontSize: scaledPx(block, 17, 'body') }}>
        <p><span className="font-semibold">Hombres:</span> <span style={{ color: t.muted }}>{str(block, 'men', 'Formal')}</span></p>
        <p><span className="font-semibold">Damas:</span> <span style={{ color: t.muted }}>{str(block, 'women', 'Formal')}</span></p>
      </div>
    </div>
  );
};

const ItineraryBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const shape = useInvitationShape();
  const items = list<{ time?: string; label?: string; icon?: string; iconColors?: any; iconSpeed?: number }>(block, 'items');
  const layout = str(block, 'layout', 'timeline');
  const iconFor = (it: (typeof items)[number], size = 42) => (
    <span className="inline-flex flex-shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <EventIcon name={it.icon || 'rings'} className="h-full w-full" stroke={it.iconColors?.__tint || t.primary} lottieColors={it.iconColors} speed={it.iconSpeed} />
    </span>
  );
  const cardStyle: React.CSSProperties = { borderRadius: shape.cardRadius, border: `1px solid ${t.line}`, background: `color-mix(in srgb, ${t.bg} 78%, white)`, boxShadow: '0 10px 28px rgba(34,27,18,.05)' };

  const content = layout === 'cards' ? (
    <div className="mx-auto grid max-w-xl grid-cols-2 gap-3">
      {items.map((it, i) => (
        <div key={i} className="flex min-w-0 flex-col items-center px-3 py-4 text-center" style={cardStyle}>
          {iconFor(it, 44)}
          <p className="mt-2 font-cormorant leading-tight" style={{ color: t.text, fontSize: scaledPx(block, 16, 'body') }}>{it.label}</p>
          <p className="mt-1 font-cinzel tracking-[0.08em]" style={{ color: t.primary, fontSize: scaledPx(block, 13, 'label') }}>{it.time}</p>
        </div>
      ))}
    </div>
  ) : layout === 'carousel' ? (
    <div className="mx-auto flex max-w-xl snap-x snap-mandatory gap-3 overflow-x-auto pb-3 text-left" style={{ scrollbarWidth: 'thin' }}>
      {items.map((it, i) => (
        <div key={i} className="flex min-w-[72%] snap-center items-center gap-3 px-4 py-4" style={cardStyle}>
          {iconFor(it, 48)}
          <span className="min-w-0">
            <span className="block font-cormorant" style={{ color: t.text, fontSize: scaledPx(block, 17, 'body') }}>{it.label}</span>
            <span className="mt-0.5 block font-cinzel tracking-[0.1em]" style={{ color: t.primary, fontSize: scaledPx(block, 13, 'label') }}>{it.time}</span>
          </span>
        </div>
      ))}
    </div>
  ) : layout === 'compact' ? (
    <div className="mx-auto max-w-lg overflow-hidden text-left" style={cardStyle}>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? `1px solid ${t.line}` : undefined }}>
          {iconFor(it, 38)}
          <p className="min-w-0 flex-1 font-cormorant" style={{ color: t.text, fontSize: scaledPx(block, 16, 'body') }}>{it.label}</p>
          <p className="flex-shrink-0 font-cinzel tracking-[0.08em]" style={{ color: t.primary, fontSize: scaledPx(block, 12, 'label') }}>{it.time}</p>
        </div>
      ))}
    </div>
  ) : (
    <div className="mx-auto max-w-lg text-left">
      {items.map((it, i) => (
        <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[24px] top-[49px] bottom-0 w-px" style={{ background: t.line }} />}
          <span className="relative z-[1] flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${t.primary} 10%, ${t.bg})`, border: `1px solid ${t.line}` }}>{iconFor(it, 32)}</span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-cormorant leading-tight" style={{ color: t.text, fontSize: scaledPx(block, 18, 'body') }}>{it.label}</p>
            <p className="mt-1 font-cinzel tracking-[0.1em]" style={{ color: t.primary, fontSize: scaledPx(block, 13, 'label') }}>{it.time}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {str(block, 'title') && <h2 className="mb-8 font-great" style={{ color: t.primary, fontSize: fluidType(block, 32, 6, 48, 'title') }}>{str(block, 'title')}</h2>}
      {content}
    </div>
  );
};

const GiftBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const shape = useInvitationShape();
  return (
    <div>
      <h2 className="font-great" style={{ color: t.primary, fontSize: fluidType(block, 32, 6, 48, 'title') }}>{str(block, 'title', 'Sugerencia de Regalo')}</h2>
      {str(block, 'message') && <p className="font-cormorant mt-3 mb-8 mx-auto" style={{ color: 'inherit', maxWidth: 480, fontSize: scaledPx(block, 17, 'body') }}>{str(block, 'message')}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
        <Tilt className="p-6 text-left" style={{ background: t.primaryDeep, color: t.onPrimary, borderRadius: shape.cardRadius, boxShadow: '0 18px 42px rgba(22,18,12,.12)' }}>
          <p className="font-cinzel uppercase tracking-[0.16em] text-[12px] opacity-80">Transferencia bancaria</p>
          <p className="font-cinzel font-bold mt-3">{str(block, 'bank', 'Banco')}</p>
          <p className="font-cormorant mt-1 text-[15px]">{str(block, 'account', '000-0000')} <CopyBtn value={str(block, 'account')} color={t.onPrimary} /></p>
          {str(block, 'holder') && <p className="font-cinzel text-[12px] tracking-wide mt-2 opacity-80">{str(block, 'holder')}</p>}
        </Tilt>
        {str(block, 'qrUrl') && (
          <Tilt className="p-6 flex flex-col items-center justify-center" style={{ border: `1px solid ${t.line}`, borderRadius: shape.cardRadius, background: `color-mix(in srgb, ${t.bg} 84%, white)` }}>
            <p className="font-cinzel uppercase tracking-[0.16em] text-[12px] mb-3" style={{ color: t.muted }}>Transferencia QR</p>
            <img src={str(block, 'qrUrl')} alt="QR" className="w-36 h-36 rounded-lg" />
          </Tilt>
        )}
      </div>
    </div>
  );
};

const GalleryBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const layout = (str(block, 'layout', 'grid') as GalleryLayout);
  return (
    <div className="flex flex-col items-center">
      {str(block, 'message') && <p className="font-cormorant mb-6 mx-auto" style={{ color: t.muted, maxWidth: 420, fontSize: scaledPx(block, 16, 'body') }}>{str(block, 'message')}</p>}
      <PhotoGrid images={list<string>(block, 'images')} layout={layout} className={layout === 'carousel' || layout === 'coverflow' ? 'w-full' : 'max-w-lg mx-auto'} />
      {str(block, 'shareUrl') && <div className="mt-6"><Pill href={str(block, 'shareUrl')}>Compartir fotos</Pill></div>}
    </div>
  );
};

// Historia fija: foto anclada a pantalla completa + frases ligadas al scroll.
// En el editor se muestra una versión compacta (el sticky de 240vh haría el
// lienzo inmanejable); la publicación usa PinnedStory (scrubbing real).
const StoryBlock: React.FC<{ block: Block }> = ({ block }) => {
  const { editing } = useBlockEdit();
  const image = str(block, 'image');
  const focal = str(block, 'focal', '50% 50%');
  const overlay = Math.min(85, Math.max(0, num(block, 'overlay', 40))) / 100;
  const slides = list<{ text?: string }>(block, 'slides').map(s => s.text || '').filter(Boolean);
  const texts = slides.length ? slides : ['Nuestra historia'];

  if (editing) {
    return (
      <div className="relative overflow-hidden" style={{ minHeight: 300, background: '#1c1916' }}>
        {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: focal, opacity: 0.9 }} />}
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
        <div className="relative z-10 flex flex-col items-center justify-center gap-4 px-8 py-14 text-center">
          <span className="font-outfit text-[10px] uppercase tracking-[0.2em] text-white/60">🎬 Historia fija — en la invitación real la foto queda anclada y las frases pasan con el scroll</span>
          {texts.map((t, i) => (
            <p key={i} className="font-cormorant text-white" style={{ fontSize: 'clamp(18px,3vw,24px)', lineHeight: 1.4 }}>{t}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PinnedStory
      image={image || undefined}
      focal={focal}
      overlay={overlay}
      slides={texts}
      heightVh={Math.min(400, Math.max(150, num(block, 'height', 240)))}
    />
  );
};

// Formulario de confirmación digital: guarda la respuesta vía /api/rsvp.
function RsvpForm({ block }: { block: Block }) {
  const t = useBlockTheme();
  const shape = useInvitationShape();
  const { slug, guest } = useBlockData();
  const { editing } = useBlockEdit();
  const [name, setName] = useState(guest?.name ?? '');
  const [attending, setAttending] = useState<'yes' | 'no'>(guest?.status === 'declined' ? 'no' : 'yes');
  const [passes, setPasses] = useState(guest?.confirmedPasses ?? 1);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(Boolean(guest && guest.status !== 'pending'));

  useEffect(() => {
    setName(guest?.name ?? '');
    setAttending(guest?.status === 'declined' ? 'no' : 'yes');
    setPasses(guest?.confirmedPasses ?? 1);
    setDone(Boolean(guest && guest.status !== 'pending'));
  }, [guest]);

  const field: React.CSSProperties = { background: `color-mix(in srgb, ${t.bg} 76%, white)`, border: `1px solid ${t.line}`, color: t.text, borderRadius: shape.fieldRadius, padding: '11px 13px', fontSize: 15, width: '100%', outline: 'none', boxShadow: '0 5px 18px rgba(30,24,16,.035)' };

  if (done) {
    return (
      <div className="text-center">
        {attending === 'yes' && <PetalBurst color={t.primary} />}
        <p className="font-cinzel uppercase tracking-[0.16em]" style={{ color: t.primary, fontSize: 16 }}>{attending === 'yes' ? '¡Asistencia confirmada! 🤍' : 'Gracias por avisarnos'}</p>
        <p className="font-cormorant mt-2" style={{ color: t.muted }}>{attending === 'yes' ? `${passes} ${passes === 1 ? 'lugar reservado' : 'lugares reservados'}.` : 'Lamentamos que no puedas acompañarnos.'}</p>
      </div>
    );
  }

  const submit = async () => {
    if (!name.trim()) return;
    if (editing) { setDone(true); return; } // vista previa en el editor
    if (!slug) return;
    setBusy(true);
    try {
      await fetch(guest?.publicId ? '/api/guests/confirm' : '/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(guest?.publicId ? { slug, publicId: guest.publicId, confirmName: name, attending, passes, message: msg } : { slug, name, attending, passes, message: msg }) });
      setDone(true);
    } catch { /* sin conexión */ }
    setBusy(false);
  };

  return (
    <div className="mx-auto text-left" style={{ maxWidth: 380 }}>
      <h3 className="font-cinzel uppercase tracking-[0.16em] text-center mb-5" style={{ color: t.muted, fontSize: 15 }}>{str(block, 'message', 'Confirma tu asistencia')}</h3>
      <div className="space-y-3 font-cormorant">
        {!guest?.publicId && <input style={field} placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />}
        <select style={field} value={attending} onChange={e => setAttending(e.target.value as 'yes' | 'no')}>
          <option value="yes">Sí, asistiré</option>
          <option value="no">No podré asistir</option>
        </select>
        {attending === 'yes' && (
          <div className="flex items-center gap-3">
            <span style={{ color: t.muted, fontSize: 15 }}>N.º de personas</span>
            <input style={{ ...field, width: 90 }} type="number" min={1} max={guest?.passes ?? 20} value={passes} onChange={e => setPasses(parseInt(e.target.value) || 1)} />
          </div>
        )}
        <textarea style={{ ...field, minHeight: 70 }} placeholder="Mensaje para los novios (opcional)" value={msg} onChange={e => setMsg(e.target.value)} />
        <button onClick={submit} disabled={busy} className="w-full font-cinzel uppercase tracking-[0.16em] text-[12px] py-3 transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-50 ek-shine ek-shine-auto" style={{ background: t.primary, color: t.onPrimary, borderRadius: shape.buttonRadius, boxShadow: `0 9px 24px color-mix(in srgb, ${t.primary} 20%, transparent)` }}>
          {busy ? 'Enviando…' : str(block, 'buttonLabel', 'Confirmar asistencia')}
        </button>
      </div>
    </div>
  );
}

const RsvpBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  if (str(block, 'mode', 'whatsapp') === 'form') return <RsvpForm block={block} />;
  return (
    <div className="flex flex-col items-center">
      <h3 className="font-cinzel uppercase tracking-[0.16em] mx-auto" style={{ color: t.muted, maxWidth: 420, fontSize: '15px', lineHeight: 1.6 }}>{str(block, 'message', 'Confirma tu asistencia')}</h3>
      <div className="mt-6"><Pill href={str(block, 'whatsappUrl')} filled>{str(block, 'buttonLabel', 'Confirmar asistencia')}</Pill></div>
    </div>
  );
};

/** Pase individual como bloque nativo: nombre, cupos, mesa, código y QR real. */
const AccessPassBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const { guest } = useBlockData();
  const { editing } = useBlockEdit();
  const title = str(block, 'title', 'Tu pase personal');
  const message = str(block, 'message', 'Preséntalo al ingresar al evento.');

  if (!guest) {
    return (
      <div className="mx-auto max-w-sm rounded-[24px] border border-dashed px-6 py-8 text-center" style={{ borderColor: t.line, background: `color-mix(in srgb, ${t.bg} 82%, white)` }}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: `color-mix(in srgb, ${t.primary} 12%, white)` }}>▦</div>
        <p className="mt-4 font-cinzel text-sm uppercase tracking-[0.15em]" style={{ color: t.text }}>{title}</p>
        <p className="mt-2 font-cormorant text-lg" style={{ color: t.muted }}>{editing ? 'Selecciona un invitado en la pestaña Invitados para ver su pase.' : 'Este pase está disponible únicamente desde un enlace personal.'}</p>
      </div>
    );
  }

  if (!guest.accessToken && !editing) {
    return (
      <div className="mx-auto max-w-sm rounded-[24px] border px-6 py-8 text-center" style={{ borderColor: t.line, background: '#fff' }}>
        <p className="font-cinzel text-sm uppercase tracking-[0.15em]" style={{ color: t.primary }}>{title}</p>
        <p className="mt-3 font-cormorant text-lg" style={{ color: t.muted }}>Tu código QR aparecerá aquí después de confirmar tu asistencia.</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="font-cinzel text-sm uppercase tracking-[0.15em]" style={{ color: t.primary }}>{title}</p>
      <p className="mt-2 font-cormorant text-lg" style={{ color: t.muted }}>{message}</p>
      <QrCard
        t={t}
        accessToken={guest.accessToken || `enkarta-preview-${guest.publicId}`}
        accessCode={guest.accessCode || 'VISTA-PREVIA'}
        guestName={guest.name}
        tableNo={guest.tableNo}
        passes={guest.confirmedPasses ?? guest.passes}
      />
    </div>
  );
};

const ImageBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const url = str(block, 'url');
  if (!url) return <p className="font-outfit text-sm" style={{ color: t.muted }}>Selecciona una imagen…</p>;
  const settings = block.props;
  const aspect = imageAspect(settings);
  const cropped = Boolean(aspect);
  const temperatureStyle = imageTemperatureStyle(settings);
  const overlayStyle = imageColorOverlayStyle(settings);
  return (
    <div className="mx-auto w-full" style={imageFrameStyle(settings)}>
      <div style={{ ...imageViewportStyle(settings), aspectRatio: aspect, maxHeight: num(block, 'maxHeight', 0) || undefined }}>
        <img
          src={url}
          alt={str(block, 'alt')}
          loading="lazy"
          decoding="async"
          className={`${cropped ? 'absolute inset-0 h-full' : 'relative block h-auto'} w-full object-cover transition-[filter,transform] duration-200`}
          style={{
            minHeight: cropped ? '100%' : undefined,
            objectPosition: str(block, 'focal', '50% 50%'),
            transform: imageTransform(settings),
            filter: imageFilter(settings),
          }}
        />
        {temperatureStyle && <span className="pointer-events-none absolute inset-0" style={temperatureStyle} aria-hidden />}
        {overlayStyle && <span className="pointer-events-none absolute inset-0" style={overlayStyle} aria-hidden />}
      </div>
    </div>
  );
};

const ButtonBlock: React.FC<{ block: Block }> = ({ block }) => (
  <Pill href={str(block, 'href')} filled={bool(block, 'filled', true)}>{str(block, 'label', 'Botón')}</Pill>
);

const DividerBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  return (
    <RevealDraw duration={1.3}>
      <InvitationDivider
        variant={str(block, 'style', DEFAULT_DIVIDER)}
        color={str(block, 'color') || t.primary}
        width={num(block, 'width', 220) || 220}
      />
    </RevealDraw>
  );
};

const SpacerBlock: React.FC<{ block: Block }> = ({ block }) => <div style={{ height: num(block, 'height', 40) }} aria-hidden />;

// Añadir al calendario: botón a Google Calendar + descarga .ics (Apple/Outlook).
const pad2 = (n: number) => String(n).padStart(2, '0');
function calFmt(iso: string, addHours = 0): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  if (addHours) d.setHours(d.getHours() + addHours);
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
}
const CalendarBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const iso = str(block, 'isoDate') || new Date().toISOString();
  const title = str(block, 'title', 'Nuestra celebración');
  const location = str(block, 'location', '');
  const start = calFmt(iso);
  const end = calFmt(iso, num(block, 'duration', 4) || 4);
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&location=${encodeURIComponent(location)}`;
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${title}\nLOCATION:${location}\nEND:VEVENT\nEND:VCALENDAR`;
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  return (
    <div className="flex flex-col items-center gap-2">
      <Pill href={gcal} filled>{str(block, 'label', 'Añadir a mi calendario')}</Pill>
      <a href={icsHref} download="evento.ics" className="font-cormorant text-sm underline" style={{ color: t.muted }}>Apple / Outlook (.ics)</a>
    </div>
  );
};

// Adorno decorativo (motivos botánicos / florituras) — colocable y apilable como capa.
const HEART_PATH = 'M0 6 C -2 0 -9 0 -9 6 C -9 12 -2 15 0 18 C 2 15 9 12 9 6 C 9 0 2 0 0 6 Z';
const OrnamentBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const color = str(block, 'color') || t.primary;
  const size = num(block, 'size', 180);
  const motif = str(block, 'motif', 'orchid');
  const wrap = (svg: React.ReactNode) => <span className="inline-block align-middle" style={{ width: size, lineHeight: 0 }}>{svg}</span>;

  if (motif === 'orchid') return wrap(<OrchidSprig color={color} className="w-full h-auto" />);
  if (motif === 'ring') return wrap(
    <svg viewBox="0 0 100 100" className="w-full h-auto" fill="none" stroke={color} strokeWidth="1.2" aria-hidden>
      <circle cx="50" cy="50" r="46" />
      <circle cx="50" cy="50" r="42" opacity="0.5" />
    </svg>,
  );
  if (motif === 'hearts') return wrap(
    <svg viewBox="0 0 120 30" className="w-full h-auto" fill={color} aria-hidden>
      <g transform="translate(30 9) scale(0.8)"><path d={HEART_PATH} /></g>
      <g transform="translate(60 6) scale(1.05)"><path d={HEART_PATH} /></g>
      <g transform="translate(90 9) scale(0.8)"><path d={HEART_PATH} /></g>
    </svg>,
  );
  if (motif === 'laurel') return wrap(
    <svg viewBox="0 0 200 40" className="w-full h-auto" fill="none" stroke={color} strokeWidth="1.1" aria-hidden>
      <path d="M100 6 C 70 12, 40 18, 18 30" strokeLinecap="round" />
      <path d="M100 6 C 130 12, 160 18, 182 30" strokeLinecap="round" />
      {[30, 50, 70, 90].map((x, i) => (
        <g key={`l${i}`}>
          <ellipse cx={x} cy={26 - i * 2} rx="7" ry="2.6" transform={`rotate(-20 ${x} ${26 - i * 2})`} />
          <ellipse cx={200 - x} cy={26 - i * 2} rx="7" ry="2.6" transform={`rotate(20 ${200 - x} ${26 - i * 2})`} />
        </g>
      ))}
    </svg>,
  );
  // flourish (por defecto): líneas con rombo central
  return wrap(
    <svg viewBox="0 0 220 24" className="w-full h-auto" fill="none" stroke={color} strokeWidth="1.2" aria-hidden>
      <path d="M14 12 H96" strokeLinecap="round" />
      <path d="M124 12 H206" strokeLinecap="round" />
      <path d="M110 4 L118 12 L110 20 L102 12 Z" fill={color} stroke="none" />
      <circle cx="14" cy="12" r="2.2" fill={color} stroke="none" />
      <circle cx="206" cy="12" r="2.2" fill={color} stroke="none" />
    </svg>,
  );
};

// Elemento decorativo flotante ("sticker"): un motivo recoloreable de la librería
// curada o una imagen subida (PNG/WEBP/SVG de Canva). Se coloca como capa libre
// anclada a una esquina/borde (ver capa flotante en BlockRenderer). El ancho lo
// controla `layout.w`; aquí solo se rellena el contenedor.
// SVG subido renderizado inline para poder recolorearlo (fill/stroke →
// currentColor). Se sanea en cliente; si el fetch falla (CORS), cae a <img>.
function RecolorSvg({ url, color }: { url: string; color: string }) {
  const [markup, setMarkup] = useState('');
  useEffect(() => {
    let cancel = false;
    fetch(url).then(r => r.text()).then(txt => {
      const clean = sanitizeSvg(txt);
      if (!clean) return;
      const recolored = clean
        .replace(/(<svg[^>]*?)\s(?:width|height)="[^"]*"/gi, '$1')
        .replace(/fill="(?!none)[^"]*"/gi, 'fill="currentColor"')
        .replace(/stroke="(?!none)[^"]*"/gi, 'stroke="currentColor"');
      if (!cancel) setMarkup(recolored);
    }).catch(() => { /* CORS u offline → queda el <img> de respaldo */ });
    return () => { cancel = true; };
  }, [url]);
  if (!markup) return <img src={url} alt="" className="w-full h-auto block" />;
  return <span className="ek-inline-svg" style={{ color, display: 'block', width: '100%', lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: markup }} />;
}

const ANIM_CLASS: Record<string, string> = {
  none: 'ek-elem-in', sway: 'ek-anim-sway', float: 'ek-anim-float', breathe: 'ek-anim-breathe',
};
const ElementBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const { editing } = useBlockEdit();
  const source = str(block, 'source', 'library');
  const color = str(block, 'color') || t.primary;
  const color2 = str(block, 'color2') || undefined;
  const color3 = str(block, 'color3') || undefined;
  const color4 = str(block, 'color4') || undefined;
  const flipH = bool(block, 'flipH');
  const flipV = bool(block, 'flipV');
  const opacity = typeof block.props.opacity === 'number' ? (block.props.opacity as number) : 1;
  const legacyShadow = bool(block, 'shadow');
  const shadowStyle = str(block, 'shadowStyle', legacyShadow ? 'deep' : 'none');
  const shadowFilters: Record<string, string> = {
    none: '',
    soft: 'drop-shadow(0 4px 7px rgba(28,22,18,0.16))',
    deep: 'drop-shadow(0 10px 14px rgba(28,22,18,0.3))',
    glow: `drop-shadow(0 0 10px ${color3 || color2 || color}88)`,
  };
  const saturation = typeof block.props.saturation === 'number' ? (block.props.saturation as number) : 1;
  const filters = [shadowFilters[shadowStyle] ?? '', saturation !== 1 ? `saturate(${saturation})` : ''].filter(Boolean).join(' ');
  const sx = flipH ? -1 : 1;
  const sy = flipV ? -1 : 1;
  // En el editor no se anima (evita conflictos al arrastrar); en lectura sí.
  const animClass = editing ? '' : (ANIM_CLASS[str(block, 'anim', 'none')] ?? 'ek-elem-in');
  // Span externo: animación (transform). Span interno: flips + opacidad + sombra.
  const flipStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    opacity,
    transform: (sx !== 1 || sy !== 1) ? `scale(${sx}, ${sy})` : undefined,
    filter: filters || undefined,
    mixBlendMode: (str(block, 'blendMode', 'normal') as React.CSSProperties['mixBlendMode']),
    lineHeight: 0,
  };
  let inner: React.ReactNode;
  if (source === 'upload') {
    const url = str(block, 'url');
    if (!url) return <span className="font-outfit text-xs" style={{ color: t.muted }}>Elige un elemento…</span>;
    const recolor = bool(block, 'recolor') && /\.svg(\?|$)/i.test(url);
    inner = recolor ? <RecolorSvg url={url} color={color} /> : <img src={url} alt="" className="w-full h-auto block" />;
  } else {
    const node = renderElement(str(block, 'motif', 'corner-orchid'), color, color2, color3, color4);
    if (!node) return <span className="font-outfit text-xs" style={{ color: t.muted }}>Elige un elemento…</span>;
    inner = node;
  }
  return (
    <span className={animClass} style={{ display: 'block', width: '100%' }}>
      <span style={flipStyle}>{inner}</span>
    </span>
  );
};

// Video embebido (YouTube / Vimeo): pega el enlace normal y se convierte a embed.
function toEmbedUrl(raw: string): string {
  const u = raw.trim();
  let m = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/.exec(u);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return u;
}
const VideoBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const url = str(block, 'url');
  if (!url) return <p className="font-outfit text-sm" style={{ color: t.muted }}>Pega un enlace de YouTube o Vimeo…</p>;
  return (
    <div className="mx-auto w-full overflow-hidden" style={{ maxWidth: 560, borderRadius: num(block, 'rounded', 16), border: `1px solid ${t.line}`, aspectRatio: '16 / 9' }}>
      <iframe
        src={toEmbedUrl(url)}
        title={str(block, 'title', 'Video')}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
};

// Mapa de Google embebido: escribe el lugar o pega la dirección.
const MapBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const q = str(block, 'query');
  if (!q) return <p className="font-outfit text-sm" style={{ color: t.muted }}>Escribe el lugar o la dirección…</p>;
  const zoom = num(block, 'zoom', 15);
  return (
    <div className="mx-auto w-full">
      {str(block, 'title') && <h3 className="font-cinzel uppercase tracking-[0.16em] mb-4" style={{ color: t.muted, fontSize: scaledPx(block, 14, 'subtitle') }}>{str(block, 'title')}</h3>}
      <div className="overflow-hidden" style={{ maxWidth: 560, margin: '0 auto', borderRadius: num(block, 'rounded', 16), border: `1px solid ${t.line}`, aspectRatio: '4 / 3' }}>
        <iframe
          src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&output=embed`}
          title={str(block, 'title', 'Mapa')}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
};

// Versículo / cita con autor (con comillas decorativas).
const QuoteBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  return (
    <div className="mx-auto" style={{ maxWidth: 480 }}>
      <span aria-hidden className="font-playfair block leading-none" style={{ color: t.primary, fontSize: scaledPx(block, 54, 'title'), opacity: 0.35 }}>&ldquo;</span>
      <Editable as="p" k="text" value={str(block, 'text', 'El amor es paciente, el amor es bondadoso…')} className={`${famClass(block) || 'font-cormorant'} italic -mt-5`} style={{ color: 'inherit', fontSize: scaledPx(block, 19, 'body'), lineHeight: 1.8, ...typoStyle(block, 'body') }} />
      {str(block, 'author') && (
        <p className="font-cinzel uppercase tracking-[0.2em] mt-4" style={{ color: t.muted, fontSize: scaledPx(block, 11, 'label') }}>— {str(block, 'author')}</p>
      )}
    </div>
  );
};

// Padres y padrinos: columnas de rol + nombres.
const ParentsBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const items = list<{ role?: string; names?: string }>(block, 'items');
  return (
    <div>
      {str(block, 'title') && <h2 className="font-great mb-2" style={{ color: t.primary, fontSize: fluidType(block, 30, 6, 44, 'title') }}>{str(block, 'title')}</h2>}
      {str(block, 'message') && <p className="font-cormorant italic mb-6 mx-auto" style={{ color: t.muted, maxWidth: 420, fontSize: scaledPx(block, 16, 'body') }}>{str(block, 'message')}</p>}
      <div className={`grid gap-7 max-w-2xl mx-auto ${items.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} grid-cols-1`}>
        {items.map((it, i) => (
          <div key={i} className="flex flex-col items-center">
            <p className="font-cinzel uppercase tracking-[0.18em]" style={{ color: t.muted, fontSize: scaledPx(block, 11, 'label') }}>{it.role}</p>
            <div className="h-px w-10 my-2.5" style={{ background: t.line }} />
            {(it.names ?? '').split('\n').filter(Boolean).map((n, j) => (
              <p key={j} className="font-cormorant" style={{ color: 'inherit', fontSize: scaledPx(block, 18, 'body'), lineHeight: 1.6 }}>{n}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Sugerencia de hospedaje: tarjeta con foto, descripción y enlace.
const LodgingBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const shape = useInvitationShape();
  const image = str(block, 'image');
  return (
    <div className="mx-auto overflow-hidden text-center" style={{ maxWidth: 440, borderRadius: shape.cardRadius, border: `1px solid ${t.line}`, background: `color-mix(in srgb, ${t.bg} 84%, white)`, boxShadow: '0 16px 45px rgba(31,24,16,.07)' }}>
      {image && (
        <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
          <img src={image} alt="" className="h-full w-full object-cover" style={{ objectPosition: str(block, 'focal', '50% 50%') }} />
        </div>
      )}
      <div className="px-6 py-6">
        <p className="font-cinzel uppercase tracking-[0.18em]" style={{ color: t.muted, fontSize: scaledPx(block, 11, 'label') }}>{str(block, 'title', 'Sugerencia de hospedaje')}</p>
        <h3 className="font-playfair font-bold mt-2" style={{ color: t.primary, fontSize: scaledPx(block, 24, 'subtitle') }}>{str(block, 'name', 'Hotel')}</h3>
        {str(block, 'desc') && <p className="font-cormorant mt-2" style={{ color: 'inherit', fontSize: scaledPx(block, 16, 'body'), lineHeight: 1.65 }}>{str(block, 'desc')}</p>}
        {str(block, 'phone') && <p className="font-cormorant mt-1" style={{ color: t.muted, fontSize: scaledPx(block, 15, 'body') }}>Tel: {str(block, 'phone')}</p>}
        {str(block, 'url') && <div className="mt-4"><Pill href={str(block, 'url')}>{str(block, 'buttonLabel', 'Ver hotel')}</Pill></div>}
      </div>
    </div>
  );
};

// Hashtag del evento: para que los invitados etiqueten sus fotos.
const HashtagBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const tag = str(block, 'tag', '#NuestraBoda').replace(/^#?/, '#');
  return (
    <div className="flex flex-col items-center">
      {str(block, 'message') && <p className="font-cormorant italic mb-3 mx-auto" style={{ color: t.muted, maxWidth: 380, fontSize: scaledPx(block, 16, 'body') }}>{str(block, 'message')}</p>}
      <p className={famClass(block) || 'font-great'} style={{ color: t.primary, fontSize: fluidType(block, 28, 7, 46, 'title'), ...typoStyle(block, 'title') }}>{tag}</p>
      <div className="h-px w-24 mt-3" style={{ background: t.line }} />
    </div>
  );
};

// Monograma: iniciales dentro de una corona que se "dibuja" sola (stroke-dashoffset).
const MonogramBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const color = str(block, 'color') || t.primary;
  const a = str(block, 'initialA', 'A');
  const b = str(block, 'initialB', 'C');
  const size = num(block, 'size', 220);
  const wreath = str(block, 'wreath', 'laurel'); // ring | laurel | floral | none
  const leafCount = 14;
  const showRings = wreath !== 'none';
  return (
    <div className="mx-auto" style={{ width: size, maxWidth: '80vw' }}>
      <style>{`
        @keyframes ekDraw { to { stroke-dashoffset: 0; } }
        @keyframes ekMonoFade { from { opacity: 0; transform: scale(.9);} to { opacity: 1; transform: scale(1);} }
      `}</style>
      <svg viewBox="0 0 200 200" className="w-full h-auto" fill="none" aria-hidden>
        {/* Aros que se dibujan */}
        {showRings && [88, 80].map((r, i) => (
          <circle key={r} cx="100" cy="100" r={r} stroke={color} strokeWidth={i ? 0.8 : 1.4} pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `ekDraw 1.6s ${0.2 + i * 0.25}s cubic-bezier(0.5,0,0.2,1) forwards`, opacity: i ? 0.5 : 1 }} />
        ))}
        {/* Laurel inferior dibujándose (estilos laurel y floral) */}
        {(wreath === 'laurel' || wreath === 'floral') && Array.from({ length: leafCount }).map((_, i) => {
          const ang = Math.PI * (0.62 + (i / (leafCount - 1)) * 0.76); // arco inferior
          const cx = 100 + Math.cos(ang) * 84;
          const cy = 100 + Math.sin(ang) * 84;
          const rot = (ang * 180) / Math.PI + 90;
          return (
            <ellipse key={i} cx={cx} cy={cy} rx="8" ry="2.8" transform={`rotate(${rot} ${cx} ${cy})`} fill={color}
              style={{ opacity: 0, animation: `ekMonoFade .5s ${1 + i * 0.05}s ease forwards` }} />
          );
        })}
        {/* Flores en los costados (estilo floral) */}
        {wreath === 'floral' && [[16, 100], [184, 100]].map(([cx, cy], k) => (
          <g key={k} style={{ opacity: 0, animation: `ekMonoFade .6s ${1.3 + k * 0.15}s ease forwards`, transformOrigin: `${cx}px ${cy}px` }}>
            {[0, 72, 144, 216, 288].map(deg => (
              <ellipse key={deg} cx={cx} cy={cy - 7} rx="3" ry="6.5" fill={color} opacity="0.85" transform={`rotate(${deg} ${cx} ${cy})`} />
            ))}
            <circle cx={cx} cy={cy} r="2.4" fill={t.bg} />
          </g>
        ))}
        {/* Iniciales */}
        <text x="78" y="118" textAnchor="middle" fill={color} style={{ fontFamily: 'var(--ek-font-script, "Great Vibes")', fontSize: 64, opacity: 0, animation: 'ekMonoFade .8s 1.1s ease forwards' }}>{a}</text>
        <text x="100" y="112" textAnchor="middle" fill={color} style={{ fontFamily: 'var(--ek-font-body, "Cormorant Garamond")', fontSize: 26, opacity: 0, animation: 'ekMonoFade .8s 1.3s ease forwards' }}>&</text>
        <text x="122" y="118" textAnchor="middle" fill={color} style={{ fontFamily: 'var(--ek-font-script, "Great Vibes")', fontSize: 64, opacity: 0, animation: 'ekMonoFade .8s 1.5s ease forwards' }}>{b}</text>
      </svg>
      {str(block, 'date') && (
        <p className="mt-2 text-center font-cinzel uppercase tracking-[0.3em]" style={{ color: t.muted, fontSize: scaledPx(block, 11, 'label') }}>{str(block, 'date')}</p>
      )}
    </div>
  );
};

// Timeline "Nuestra historia": hitos alternados con foto + año + texto.
const TimelineBlock: React.FC<{ block: Block }> = ({ block }) => {
  const t = useBlockTheme();
  const items = list<{ year?: string; title?: string; text?: string; image?: string }>(block, 'items');
  return (
    <div>
      {str(block, 'title') && <h2 className="font-great mb-10" style={{ color: t.primary, fontSize: fluidType(block, 32, 6, 48, 'title') }}>{str(block, 'title')}</h2>}
      <div className="relative mx-auto max-w-2xl">
        {/* Línea central */}
        <div className="absolute bottom-0 left-[7px] top-0 w-px sm:left-1/2 sm:-translate-x-1/2" style={{ background: t.line }} aria-hidden />
        <div className="space-y-10">
          {items.map((it, i) => {
            const left = i % 2 === 0;
            return (
              <div key={i} className="relative grid grid-cols-[16px_1fr] items-start gap-4 sm:grid-cols-[1fr_16px_1fr] sm:items-center">
                {/* Lado izquierdo: solo en desktop cuando toca */}
                <div className={`hidden sm:block sm:pr-8 sm:text-right ${left ? '' : 'sm:invisible'}`}>
                  {left && <TimelineCard it={it} t={t} />}
                </div>
                {/* Punto */}
                <div className="flex justify-center pt-1.5 sm:pt-0">
                  <span className="h-3.5 w-3.5 rounded-full ring-4" style={{ background: t.primary, '--tw-ring-color': t.bg } as React.CSSProperties} />
                </div>
                {/* Lado derecho en desktop; contenido único en móvil */}
                <div className={`sm:pl-8 sm:text-left ${left ? 'sm:invisible' : ''}`}>
                  {(!left || true) && (
                    // En móvil siempre se muestra aquí; en desktop solo cuando va a la derecha.
                    <div className={left ? 'sm:hidden' : ''}><TimelineCard it={it} t={t} /></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
function TimelineCard({ it, t }: { it: { year?: string; title?: string; text?: string; image?: string }; t: ReturnType<typeof useBlockTheme> }) {
  return (
    <div className="inline-block w-full">
      {it.image && (
        <div className="mb-3 overflow-hidden rounded-xl" style={{ aspectRatio: '4 / 3', border: `1px solid ${t.line}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
      )}
      {it.year && <p className="font-playfair font-bold" style={{ color: t.primary, fontSize: semanticPx(22, 'subtitle') }}>{it.year}</p>}
      {it.title && <p className="font-cinzel uppercase tracking-[0.14em] mt-0.5" style={{ color: t.muted, fontSize: semanticPx(13, 'label') }}>{it.title}</p>}
      {it.text && <p className="font-cormorant mt-1.5" style={{ color: 'inherit', fontSize: semanticPx(16, 'body'), lineHeight: 1.6 }}>{it.text}</p>}
    </div>
  );
}

// Antes / después: deslizador que revela una foto sobre otra.
function BeforeAfterBlock({ block }: { block: Block }) {
  const t = useBlockTheme();
  const before = str(block, 'before');
  const after = str(block, 'after');
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = useCallbackPos(ref, setPos);
  if (!before || !after) {
    return <p className="font-outfit text-sm" style={{ color: t.muted }}>Sube las dos fotos (antes y después)…</p>;
  }
  return (
    <div className="mx-auto" style={{ maxWidth: 460 }}>
      <div
        ref={ref}
        className="relative w-full select-none overflow-hidden rounded-xl"
        style={{ aspectRatio: '4 / 5', border: `1px solid ${t.line}`, cursor: 'ew-resize', touchAction: 'none' }}
        onPointerDown={e => { dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); move(e.clientX); }}
        onPointerMove={e => { if (dragging.current) move(e.clientX); }}
        onPointerUp={() => { dragging.current = false; }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
        {/* Manija */}
        <div className="absolute top-0 bottom-0" style={{ left: `${pos}%`, width: 2, background: '#fff', boxShadow: '0 0 6px rgba(0,0,0,0.4)' }}>
          <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg" style={{ color: t.primary }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7L4 12l5 5M15 7l5 5-5 5" /></svg>
          </span>
        </div>
      </div>
      {str(block, 'caption') && <p className="mt-3 text-center font-cormorant italic" style={{ color: t.muted, fontSize: scaledPx(block, 15, 'body') }}>{str(block, 'caption')}</p>}
    </div>
  );
}
// Helper: convierte la X del puntero a porcentaje dentro del contenedor.
function useCallbackPos(ref: React.RefObject<HTMLElement>, setPos: (n: number) => void) {
  return (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(2, Math.min(98, p)));
  };
}

// Buscador de mesa: el invitado escribe su nombre y ve su número de mesa.
function TableFinderBlock({ block }: { block: Block }) {
  const t = useBlockTheme();
  const shape = useInvitationShape();
  const { slug } = useBlockData();
  const { editing } = useBlockEdit();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<null | { name: string; tableNo: string; passes: number }[]>(null);
  const [err, setErr] = useState('');
  const field: React.CSSProperties = { background: `color-mix(in srgb, ${t.bg} 76%, white)`, border: `1px solid ${t.line}`, color: t.text, borderRadius: shape.fieldRadius, padding: '11px 13px', fontSize: 15, width: '100%', outline: 'none' };

  const search = async () => {
    if (q.trim().length < 2 || busy) return;
    setBusy(true); setErr(''); setRes(null);
    if (editing || !slug) {
      // Vista previa en el editor: resultado de ejemplo.
      setRes([{ name: q.trim(), tableNo: '7', passes: 2 }]); setBusy(false); return;
    }
    try {
      const r = await fetch('/api/guests/table', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, name: q }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'No se pudo buscar'); }
      else if (!d.found) { setErr('No encontramos ese nombre. Revisa cómo aparece en tu invitación o pregunta a los anfitriones.'); }
      else setRes(d.results);
    } catch { setErr('Sin conexión. Intenta de nuevo.'); }
    setBusy(false);
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 420 }}>
      <h2 className="font-great" style={{ color: t.primary, fontSize: fluidType(block, 30, 6, 44, 'title') }}>{str(block, 'title', 'Encuentra tu mesa')}</h2>
      {str(block, 'message') && <p className="font-cormorant mt-2 mb-5 mx-auto" style={{ color: t.muted, fontSize: scaledPx(block, 16, 'body') }}>{str(block, 'message')}</p>}
      <div className="flex gap-2">
        <input style={field} placeholder="Escribe tu nombre" value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') search(); }} />
        <button onClick={search} disabled={busy} className="font-cinzel uppercase tracking-[0.14em] text-[12px] px-5 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: t.primary, color: t.onPrimary, borderRadius: shape.buttonRadius, flexShrink: 0 }}>
          {busy ? '…' : 'Buscar'}
        </button>
      </div>
      {err && <p className="font-cormorant mt-4" style={{ color: t.muted, fontSize: scaledPx(block, 15, 'body') }}>{err}</p>}
      {res && res.map((m, i) => (
        <div key={i} className="mt-4 px-6 py-5" style={{ background: `color-mix(in srgb, ${t.bg} 76%, white)`, border: `1px solid ${t.line}`, borderRadius: shape.cardRadius }}>
          <p className="font-cormorant" style={{ color: t.muted, fontSize: scaledPx(block, 15, 'body') }}>{m.name}, tu lugar es la</p>
          <p className="font-playfair font-bold my-1" style={{ color: t.primary, fontSize: scaledPx(block, 40, 'title'), lineHeight: 1 }}>Mesa {m.tableNo}</p>
          {m.passes > 0 && <p className="font-cinzel uppercase tracking-[0.14em]" style={{ color: t.muted, fontSize: scaledPx(block, 11, 'label') }}>{m.passes} {m.passes === 1 ? 'lugar' : 'lugares'}</p>}
        </div>
      ))}
    </div>
  );
}

// Libro de mensajes: muro de saludos que los invitados dejan en vivo.
function GuestbookBlock({ block }: { block: Block }) {
  const t = useBlockTheme();
  const shape = useInvitationShape();
  const { slug } = useBlockData();
  const { editing } = useBlockEdit();
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<{ id: string; name: string; message: string; at: string }[]>([]);
  const field: React.CSSProperties = { background: `color-mix(in srgb, ${t.bg} 76%, white)`, border: `1px solid ${t.line}`, color: t.text, borderRadius: shape.fieldRadius, padding: '11px 13px', fontSize: 15, width: '100%', outline: 'none' };

  useEffect(() => {
    if (editing || !slug) {
      setEntries([
        { id: '1', name: 'María', message: '¡Qué felicidad! Les deseo lo mejor en esta nueva etapa. 🤍', at: '' },
        { id: '2', name: 'Carlos y familia', message: 'Allí estaremos para celebrar con ustedes.', at: '' },
      ]);
      return;
    }
    fetch(`/api/guestbook?slug=${encodeURIComponent(slug)}`).then(r => r.json()).then(d => Array.isArray(d) && setEntries(d)).catch(() => {});
  }, [slug, editing]);

  const send = async () => {
    if (!name.trim() || !msg.trim() || busy) return;
    setBusy(true);
    const optimistic = { id: `tmp-${Date.now()}`, name: name.trim(), message: msg.trim(), at: new Date().toISOString() };
    if (editing || !slug) { setEntries(e => [optimistic, ...e]); setName(''); setMsg(''); setBusy(false); return; }
    try {
      const r = await fetch('/api/guestbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, name, message: msg }) });
      if (r.ok) { setEntries(e => [optimistic, ...e]); setName(''); setMsg(''); }
    } catch { /* sin conexión */ }
    setBusy(false);
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 520 }}>
      <h2 className="font-great" style={{ color: t.primary, fontSize: fluidType(block, 30, 6, 46, 'title') }}>{str(block, 'title', 'Déjanos un mensaje')}</h2>
      {str(block, 'message') && <p className="font-cormorant mt-2 mb-5 mx-auto" style={{ color: t.muted, fontSize: scaledPx(block, 16, 'body') }}>{str(block, 'message')}</p>}
      <div className="space-y-2.5 text-left">
        <input style={field} placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />
        <textarea style={{ ...field, minHeight: 80 }} placeholder="Escribe tu saludo para los novios…" value={msg} onChange={e => setMsg(e.target.value)} />
        <button onClick={send} disabled={busy || !name.trim() || !msg.trim()}
          className="w-full font-cinzel uppercase tracking-[0.16em] text-[12px] py-3 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: t.primary, color: t.onPrimary, borderRadius: shape.buttonRadius, boxShadow: `0 9px 24px color-mix(in srgb, ${t.primary} 20%, transparent)` }}>
          {busy ? 'Enviando…' : str(block, 'buttonLabel', 'Firmar el libro')}
        </button>
      </div>
      {entries.length > 0 && (
        <div className="mt-8 space-y-3 text-left">
          {entries.map(e => (
            <div key={e.id} className="px-5 py-4" style={{ background: `color-mix(in srgb, ${t.bg} 76%, white)`, border: `1px solid ${t.line}`, borderRadius: shape.cardRadius }}>
              <p className="font-cormorant" style={{ color: t.text, fontSize: scaledPx(block, 17, 'body'), lineHeight: 1.5 }}>&ldquo;{e.message}&rdquo;</p>
              <p className="font-cinzel uppercase tracking-[0.16em] mt-2" style={{ color: t.primary, fontSize: scaledPx(block, 11, 'label') }}>— {e.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Desplazamiento/giro/ancho de un hijo (para afinar su posición dentro del grupo).
function childTransform(c: Block): React.CSSProperties {
  const L = c.layout ?? {};
  const tf: string[] = [];
  if (L.x || L.y) tf.push(`translate(${L.x || 0}px, ${L.y || 0}px)`);
  if (L.rotate) tf.push(`rotate(${L.rotate}deg)`);
  return { transform: tf.length ? tf.join(' ') : undefined, width: L.w ? `${L.w}px` : undefined };
}

// Grupo: columnas (lado a lado) o superpuesto (capas centradas, para poner texto
// sobre una imagen — p. ej. los nombres dentro de un marco/corona).
const GroupBlock: React.FC<{ block: Block }> = ({ block }) => {
  const children = block.children ?? [];
  const render = (c: Block, extra?: React.CSSProperties) => {
    const Def = BLOCKS[c.type];
    if (!Def || c.enabled === false) return null;
    const Comp = Def.Component;
    return <div key={c.id} style={{ ...childTransform(c), ...extra }}><Comp block={c} /></div>;
  };

  if (str(block, 'mode', 'columns') === 'overlay') {
    // Todas las capas en la misma celda del grid → se solapan y se centran.
    return (
      <div className="grid place-items-center w-full">
        {children.map((c) => render(c, { gridArea: '1 / 1', justifySelf: 'center', alignSelf: 'center' }))}
      </div>
    );
  }

  const cols = Math.max(1, Math.min(4, num(block, 'columns', 2)));
  return (
    <div className="grid gap-5 items-start" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {children.map((c) => render(c))}
    </div>
  );
};

// ── Registro ──────────────────────────────────────────────────────────────────
export const BLOCKS: Record<BlockType, BlockDef> = {
  cover: {
    label: 'Portada', icon: '💍', Component: CoverBlock,
    defaultProps: { groom: 'Lorena', bride: 'Marcos', tagline: 'Nos casamos', image: '', focal: '50% 50%' },
    fields: [
      { key: 'groom', label: 'Nombre 1', kind: 'text' },
      { key: 'bride', label: 'Nombre 2', kind: 'text' },
      { key: 'tagline', label: 'Frase', kind: 'text' },
      { key: 'image', label: 'Foto (opcional)', kind: 'image' },
      { key: 'focal', label: 'Encuadre de la foto', kind: 'focal' },
    ],
  },
  passportHero: {
    label: 'Portada de viaje', icon: '✈️', Component: PassportHeroBlock,
    defaultProps: {
      groom: 'Robert', bride: 'Isabella', tagline: 'Pasaporte a nuestra boda',
      eyebrow: 'Nuestra próxima aventura', image: '', focal: '50% 50%',
      origin: 'Colombia', destination: 'Bolivia', dateLabel: '26 · 12 · 2026',
    },
    fields: [
      { key: 'groom', label: 'Nombre 1', kind: 'text' },
      { key: 'bride', label: 'Nombre 2', kind: 'text' },
      { key: 'tagline', label: 'Título del pasaporte', kind: 'text' },
      { key: 'eyebrow', label: 'Frase sobre la foto', kind: 'text' },
      { key: 'image', label: 'Foto protagonista', kind: 'image' },
      { key: 'focal', label: 'Encuadre de la foto', kind: 'focal' },
      { key: 'origin', label: 'Origen de la ruta', kind: 'text' },
      { key: 'destination', label: 'Destino de la ruta', kind: 'text' },
      { key: 'dateLabel', label: 'Fecha visible', kind: 'text' },
    ],
  },
  passportTicket: {
    label: 'Pases de viaje', icon: '🎫', Component: PassportTicketBlock,
    defaultProps: {
      callout: 'Prepara tus maletas y acompáñanos en esta aventura.',
      question: '¿Te unes?', passesLabel: '2 pases', guestName: 'Invitado especial',
    },
    fields: [
      { key: 'callout', label: 'Mensaje de viaje', kind: 'textarea' },
      { key: 'question', label: 'Pregunta', kind: 'text' },
      { key: 'passesLabel', label: 'Pases reservados', kind: 'text' },
      { key: 'guestName', label: 'Nombre del invitado', kind: 'text' },
    ],
  },
  heading: {
    label: 'Título', icon: '🔤', Component: HeadingBlock,
    defaultProps: { text: 'Nuevo título', font: 'caps', size: 0 },
    fields: [
      { key: 'text', label: 'Texto', kind: 'text' },
      { key: 'font', label: 'Estilo', kind: 'select', options: [{ value: 'script', label: 'Manuscrito' }, { value: 'caps', label: 'Mayúsculas' }, { value: 'serif', label: 'Serif' }] },
      { key: 'size', label: 'Tamaño (px, 0=auto)', kind: 'number', min: 0, max: 90 },
    ],
  },
  text: {
    label: 'Texto', icon: '📝', Component: TextBlock,
    defaultProps: { text: 'Escribe aquí tu mensaje…', italic: false },
    fields: [
      { key: 'text', label: 'Texto', kind: 'textarea' },
      { key: 'italic', label: 'Cursiva', kind: 'switch' },
    ],
  },
  countdown: {
    label: 'Cuenta regresiva', icon: '⏳', Component: CountdownBlock,
    defaultProps: { isoDate: '', label: 'Solo faltan', display: 'cards', showSeconds: true },
    fields: [
      { key: 'isoDate', label: 'Fecha y hora', kind: 'text', placeholder: '2026-07-04T16:00' },
      { key: 'label', label: 'Texto superior', kind: 'text' },
      { key: 'display', label: 'Estilo', kind: 'select', options: [
        { value: 'cards', label: 'Tarjetas elegantes' },
        { value: 'rings', label: 'Círculos delicados' },
        { value: 'minimal', label: 'Editorial minimalista' },
        { value: 'flip', label: 'Tablero (flip 3D)' },
      ] },
      { key: 'showSeconds', label: 'Mostrar segundos', kind: 'switch' },
    ],
  },
  calendar: {
    label: 'Agendar', icon: '📆', Component: CalendarBlock,
    defaultProps: { title: 'Nuestra celebración', isoDate: '', duration: 4, location: '', label: 'Añadir a mi calendario' },
    fields: [
      { key: 'label', label: 'Texto del botón', kind: 'text' },
      { key: 'title', label: 'Título del evento', kind: 'text' },
      { key: 'isoDate', label: 'Fecha y hora', kind: 'text', placeholder: '2026-07-04T16:00' },
      { key: 'duration', label: 'Duración (horas)', kind: 'number', min: 1, max: 12 },
      { key: 'location', label: 'Lugar', kind: 'text' },
    ],
  },
  dateBadge: {
    label: 'Fecha', icon: '📅', Component: DateBadgeBlock,
    defaultProps: { weekday: 'Sábado', day: '04', month: 'Julio', year: '2026', city: '' },
    fields: [
      { key: 'weekday', label: 'Día de la semana', kind: 'text' },
      { key: 'day', label: 'Día', kind: 'text' },
      { key: 'month', label: 'Mes', kind: 'text' },
      { key: 'year', label: 'Año', kind: 'text' },
      { key: 'city', label: 'Ciudad (opcional)', kind: 'text' },
    ],
  },
  eventCard: {
    label: 'Evento', icon: '⛪', Component: EventCardBlock,
    defaultProps: { title: 'Ceremonia', time: '16:00 h', place: 'Lugar del evento', address: '', mapsUrl: '', icon: 'church' },
    fields: [
      { key: 'icon', label: 'Icono', kind: 'icon' },
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'time', label: 'Hora', kind: 'text' },
      { key: 'place', label: 'Lugar', kind: 'text' },
      { key: 'address', label: 'Dirección', kind: 'text' },
      { key: 'mapsUrl', label: 'Enlace de mapa', kind: 'text' },
    ],
  },
  dressCode: {
    label: 'Vestimenta', icon: '👗', Component: DressCodeBlock,
    defaultProps: { title: 'Código de vestimenta', men: 'Formal', women: 'Formal', icon: 'dress' },
    fields: [
      { key: 'icon', label: 'Icono', kind: 'icon' },
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'men', label: 'Hombres', kind: 'text' },
      { key: 'women', label: 'Damas', kind: 'text' },
    ],
  },
  itinerary: {
    label: 'Itinerario', icon: '🗓️', Component: ItineraryBlock,
    defaultProps: { title: 'Itinerario', layout: 'timeline', items: [{ time: '16:00', label: 'Ceremonia', icon: 'church' }, { time: '18:00', label: 'Recepción', icon: 'cheers' }, { time: '20:00', label: 'Fiesta', icon: 'dance' }] },
    fields: [
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'layout', label: 'Organización en celular', kind: 'select', options: [
        { value: 'timeline', label: 'Línea vertical' },
        { value: 'cards', label: 'Tarjetas en 2 columnas' },
        { value: 'compact', label: 'Lista compacta' },
        { value: 'carousel', label: 'Carrusel deslizable' },
      ] },
      {
        key: 'items', label: 'Pasos', kind: 'list', itemFields: [
          { key: 'icon', label: 'Icono', kind: 'icon' },
          { key: 'label', label: 'Nombre', kind: 'text' },
          { key: 'time', label: 'Hora', kind: 'text' },
        ],
      },
    ],
  },
  gift: {
    label: 'Regalo', icon: '🎁', Component: GiftBlock,
    defaultProps: { title: 'Sugerencia de Regalo', message: 'Tu presencia es nuestro mejor regalo.', bank: 'Banco', account: '000-0000', holder: '', qrUrl: '' },
    fields: [
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'message', label: 'Mensaje', kind: 'textarea' },
      { key: 'bank', label: 'Banco', kind: 'text' },
      { key: 'account', label: 'Cuenta', kind: 'text' },
      { key: 'holder', label: 'Titular', kind: 'text' },
      { key: 'qrUrl', label: 'Imagen QR', kind: 'image' },
    ],
  },
  gallery: {
    label: 'Galería', icon: '🖼️', Component: GalleryBlock,
    defaultProps: { message: 'Comparte con nosotros tus fotos del evento.', images: [], shareUrl: '', layout: 'grid' },
    fields: [
      { key: 'message', label: 'Mensaje', kind: 'textarea' },
      { key: 'layout', label: 'Estilo de galería', kind: 'select', options: [
        { value: 'grid', label: 'Cuadrícula' }, { value: 'masonry', label: 'Mosaico (Pinterest)' },
        { value: 'polaroid', label: 'Polaroids inclinadas' }, { value: 'carousel', label: 'Carrusel horizontal' },
        { value: 'coverflow', label: 'Carrusel 3D (coverflow)' },
      ] },
      { key: 'images', label: 'Fotos', kind: 'images' },
      { key: 'shareUrl', label: 'Enlace para compartir', kind: 'text' },
    ],
  },
  monogram: {
    label: 'Monograma', icon: '✒️', Component: MonogramBlock,
    defaultProps: { initialA: 'A', initialB: 'C', date: '', color: '', size: 220, wreath: 'laurel' },
    fields: [
      { key: 'initialA', label: 'Inicial 1', kind: 'text' },
      { key: 'initialB', label: 'Inicial 2', kind: 'text' },
      { key: 'wreath', label: 'Corona', kind: 'select', options: [
        { value: 'laurel', label: 'Laurel + aros' }, { value: 'floral', label: 'Floral + aros' },
        { value: 'ring', label: 'Solo aros' }, { value: 'none', label: 'Solo iniciales' },
      ] },
      { key: 'date', label: 'Fecha (opcional)', kind: 'text' },
      { key: 'color', label: 'Color', kind: 'color' },
      { key: 'size', label: 'Tamaño (px)', kind: 'number', min: 120, max: 400 },
    ],
  },
  timeline: {
    label: 'Nuestra historia', icon: '📖', Component: TimelineBlock,
    defaultProps: {
      title: 'Nuestra historia',
      items: [
        { year: '2019', title: 'Nos conocimos', text: 'Todo empezó con una mirada.', image: '' },
        { year: '2022', title: 'El gran sí', text: 'La propuesta más esperada.', image: '' },
        { year: '2026', title: 'Para siempre', text: 'Y llegó el día de unir nuestras vidas.', image: '' },
      ],
    },
    fields: [
      { key: 'title', label: 'Título', kind: 'text' },
      {
        key: 'items', label: 'Hitos', kind: 'list', itemFields: [
          { key: 'image', label: 'Foto (opcional)', kind: 'image' },
          { key: 'year', label: 'Año / fecha', kind: 'text' },
          { key: 'title', label: 'Título', kind: 'text' },
          { key: 'text', label: 'Texto', kind: 'textarea' },
        ],
      },
    ],
  },
  beforeAfter: {
    label: 'Antes / después', icon: '🔀', Component: BeforeAfterBlock,
    defaultProps: { before: '', after: '', caption: 'Desliza para ver' },
    fields: [
      { key: 'before', label: 'Foto frontal (antes)', kind: 'image' },
      { key: 'after', label: 'Foto de fondo (después)', kind: 'image' },
      { key: 'caption', label: 'Pie de foto', kind: 'text' },
    ],
  },
  tableFinder: {
    label: 'Buscar mesa', icon: '🪑', Component: TableFinderBlock,
    defaultProps: { title: 'Encuentra tu mesa', message: 'Escribe tu nombre para conocer el número de tu mesa.' },
    fields: [
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'message', label: 'Mensaje', kind: 'textarea' },
    ],
  },
  story: {
    label: 'Historia fija', icon: '🎬', Component: StoryBlock,
    defaultProps: {
      image: '', focal: '50% 50%', overlay: 40, height: 240,
      slides: [
        { text: 'Todo comenzó con una mirada…' },
        { text: 'Después vinieron mil aventuras juntos.' },
        { text: 'Y hoy queremos celebrar la más grande contigo.' },
      ],
    },
    fields: [
      { key: 'image', label: 'Foto de fondo', kind: 'image' },
      { key: 'focal', label: 'Encuadre (punto focal)', kind: 'focal' },
      { key: 'overlay', label: 'Oscurecer (%)', kind: 'number', min: 0, max: 85 },
      { key: 'height', label: 'Duración del efecto (vh)', kind: 'number', min: 150, max: 400 },
      { key: 'slides', label: 'Frases', kind: 'list', itemFields: [
        { key: 'text', label: 'Frase', kind: 'textarea' },
      ] },
    ],
  },
  guestbook: {
    label: 'Libro de mensajes', icon: '💬', Component: GuestbookBlock,
    defaultProps: { title: 'Déjanos un mensaje', message: 'Tu saludo quedará para siempre con nosotros.', buttonLabel: 'Firmar el libro' },
    fields: [
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'message', label: 'Mensaje', kind: 'textarea' },
      { key: 'buttonLabel', label: 'Texto del botón', kind: 'text' },
    ],
  },
  rsvp: {
    label: 'Confirmación', icon: '✅', Component: RsvpBlock,
    defaultProps: { mode: 'form', message: 'Es muy importante para nosotros contar con tu presencia.', buttonLabel: 'Confirmar asistencia', whatsappUrl: '' },
    fields: [
      { key: 'mode', label: 'Tipo de confirmación', kind: 'select', options: [{ value: 'form', label: 'Formulario digital' }, { value: 'whatsapp', label: 'Botón de WhatsApp' }] },
      { key: 'message', label: 'Mensaje', kind: 'textarea' },
      { key: 'buttonLabel', label: 'Texto del botón', kind: 'text' },
      { key: 'whatsappUrl', label: 'Enlace de WhatsApp (modo WhatsApp)', kind: 'text' },
    ],
  },
  accessPass: {
    label: 'Pase personal', icon: '▦', Component: AccessPassBlock,
    defaultProps: { title: 'Tu pase personal', message: 'Preséntalo al ingresar al evento.' },
    fields: [
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'message', label: 'Mensaje', kind: 'textarea' },
    ],
  },
  image: {
    label: 'Imagen', icon: '📷', Component: ImageBlock,
    defaultProps: { url: '', alt: '', rounded: 16, maxHeight: 0, focal: '50% 50%', aspect: 'original', zoom: 1, imageRotate: 0, imageFlipH: false, imageFlipV: false, brightness: 1, contrast: 1, imageSaturation: 1, grayscale: 0, sepia: 0, temperature: 0, blur: 0, mask: 'none', overlayColor: '#5d3d76', overlayOpacity: 0, overlayMode: 'solid', overlayBlend: 'normal' },
    fields: [
      { key: 'url', label: 'Imagen', kind: 'image' },
      { key: 'focal', label: 'Encuadre (punto focal)', kind: 'focal' },
      { key: 'alt', label: 'Descripción accesible', kind: 'text', placeholder: 'Ej: La pareja durante la ceremonia' },
      { key: 'rounded', label: 'Redondeo (px)', kind: 'number', min: 0, max: 60 },
      { key: 'maxHeight', label: 'Alto máx. (px, 0=auto)', kind: 'number', min: 0, max: 900 },
    ],
  },
  button: {
    label: 'Botón', icon: '🔘', Component: ButtonBlock,
    defaultProps: { label: 'Botón', href: '', filled: true },
    fields: [
      { key: 'label', label: 'Texto', kind: 'text' },
      { key: 'href', label: 'Enlace', kind: 'text' },
      { key: 'filled', label: 'Relleno', kind: 'switch' },
    ],
  },
  divider: {
    label: 'Separador', icon: '➰', Component: DividerBlock,
    defaultProps: { style: DEFAULT_DIVIDER, width: 220, color: '' },
    fields: [
      { key: 'style', label: 'Estilo', kind: 'divider' },
      { key: 'width', label: 'Ancho (px)', kind: 'number', min: 80, max: 600 },
      { key: 'color', label: 'Color', kind: 'color' },
    ],
  },
  spacer: {
    label: 'Espacio', icon: '↕️', Component: SpacerBlock,
    defaultProps: { height: 40 },
    fields: [
      { key: 'height', label: 'Alto (px)', kind: 'number', min: 8, max: 240 },
    ],
  },
  ornament: {
    label: 'Adorno', icon: '🌿', Component: OrnamentBlock,
    defaultProps: { motif: 'orchid', color: '', size: 180 },
    fields: [
      { key: 'motif', label: 'Motivo', kind: 'select', options: [
        { value: 'orchid', label: 'Orquídeas' }, { value: 'laurel', label: 'Laurel / hojas' },
        { value: 'flourish', label: 'Floritura (línea)' }, { value: 'hearts', label: 'Corazones' },
        { value: 'ring', label: 'Aro (marco)' },
      ] },
      { key: 'color', label: 'Color', kind: 'color' },
      { key: 'size', label: 'Tamaño (px)', kind: 'number', min: 40, max: 600 },
    ],
  },
  group: {
    label: 'Columnas / Capas', icon: '🗂️', Component: GroupBlock,
    defaultProps: { columns: 2, mode: 'columns' },
    fields: [
      { key: 'mode', label: 'Disposición', kind: 'select', options: [{ value: 'columns', label: 'Columnas (lado a lado)' }, { value: 'overlay', label: 'Superpuesto (capas)' }] },
      { key: 'columns', label: 'Nº de columnas', kind: 'number', min: 1, max: 4 },
    ],
  },
  video: {
    label: 'Video', icon: '🎬', Component: VideoBlock,
    defaultProps: { url: '', title: '', rounded: 16 },
    fields: [
      { key: 'url', label: 'Enlace (YouTube / Vimeo)', kind: 'text', placeholder: 'https://youtu.be/…' },
      { key: 'title', label: 'Título (accesibilidad)', kind: 'text' },
      { key: 'rounded', label: 'Redondeo (px)', kind: 'number', min: 0, max: 40 },
    ],
  },
  map: {
    label: 'Mapa', icon: '📍', Component: MapBlock,
    defaultProps: { title: 'Cómo llegar', query: '', zoom: 15, rounded: 16 },
    fields: [
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'query', label: 'Lugar o dirección', kind: 'text', placeholder: 'Salón Castillo, Av. Principal 123' },
      { key: 'zoom', label: 'Zoom (1-20)', kind: 'number', min: 1, max: 20 },
      { key: 'rounded', label: 'Redondeo (px)', kind: 'number', min: 0, max: 40 },
    ],
  },
  quote: {
    label: 'Versículo / Cita', icon: '❝', Component: QuoteBlock,
    defaultProps: { text: 'El amor es paciente, el amor es bondadoso…', author: '1 Corintios 13:4' },
    fields: [
      { key: 'text', label: 'Texto', kind: 'textarea' },
      { key: 'author', label: 'Autor / referencia', kind: 'text' },
    ],
  },
  parents: {
    label: 'Padres y padrinos', icon: '👨‍👩‍👧', Component: ParentsBlock,
    defaultProps: {
      title: 'Con la bendición de',
      message: '',
      items: [
        { role: 'Padres de la novia', names: 'María García\nJuan Pérez' },
        { role: 'Padres del novio', names: 'Ana López\nCarlos Ruiz' },
      ],
    },
    fields: [
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'message', label: 'Mensaje (opcional)', kind: 'textarea' },
      {
        key: 'items', label: 'Grupos', kind: 'list', itemFields: [
          { key: 'role', label: 'Rol (ej: Padres de la novia)', kind: 'text' },
          { key: 'names', label: 'Nombres (uno por línea)', kind: 'textarea' },
        ],
      },
    ],
  },
  lodging: {
    label: 'Hospedaje', icon: '🏨', Component: LodgingBlock,
    defaultProps: { title: 'Sugerencia de hospedaje', name: 'Hotel', desc: '', phone: '', url: '', buttonLabel: 'Ver hotel', image: '', focal: '50% 50%' },
    fields: [
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'name', label: 'Nombre del hotel', kind: 'text' },
      { key: 'desc', label: 'Descripción', kind: 'textarea' },
      { key: 'phone', label: 'Teléfono', kind: 'text' },
      { key: 'image', label: 'Foto', kind: 'image' },
      { key: 'focal', label: 'Encuadre de la foto', kind: 'focal' },
      { key: 'url', label: 'Enlace (web / maps)', kind: 'text' },
      { key: 'buttonLabel', label: 'Texto del botón', kind: 'text' },
    ],
  },
  hashtag: {
    label: 'Hashtag', icon: '#️⃣', Component: HashtagBlock,
    defaultProps: { tag: '#NuestraBoda', message: 'Comparte tus fotos con nuestro hashtag' },
    fields: [
      { key: 'tag', label: 'Hashtag', kind: 'text', placeholder: '#AnaYCarlos2026' },
      { key: 'message', label: 'Mensaje (opcional)', kind: 'text' },
    ],
  },
  element: {
    label: 'Elemento', icon: '✿', Component: ElementBlock,
    defaultProps: { source: 'library', motif: 'corner-orchid', url: '', color: '', color2: '', color3: '', color4: '', flipH: false, flipV: false, shadow: false, shadowStyle: 'none', blendMode: 'normal', saturation: 1, opacity: 1, anim: 'none', recolor: false },
    fields: [
      { key: 'color', label: 'Color', kind: 'color' },
      { key: 'color2', label: 'Color secundario', kind: 'color' },
      { key: 'color3', label: 'Color de acento', kind: 'color' },
      { key: 'color4', label: 'Color de detalle', kind: 'color' },
      { key: 'flipH', label: 'Espejo horizontal', kind: 'switch' },
      { key: 'flipV', label: 'Espejo vertical', kind: 'switch' },
      { key: 'shadow', label: 'Sombra', kind: 'switch' },
    ],
  },
};

/** Orden de la paleta "Añadir bloque" (lista plana, por compatibilidad). */
export const BLOCK_PALETTE: BlockType[] = [
  'cover', 'passportHero', 'passportTicket', 'monogram', 'heading', 'text', 'quote', 'image', 'video', 'countdown', 'dateBadge', 'calendar',
  'eventCard', 'map', 'dressCode', 'itinerary', 'timeline', 'story', 'parents', 'lodging', 'gift', 'gallery', 'beforeAfter',
  'rsvp', 'accessPass', 'tableFinder', 'guestbook', 'hashtag', 'button', 'ornament', 'group', 'divider', 'spacer',
];

/** Paleta agrupada por categorías (para el panel de añadir bloques). */
export const PALETTE_GROUPS: { label: string; types: BlockType[] }[] = [
  { label: 'Esenciales',  types: ['heading', 'text', 'quote', 'monogram', 'image', 'video', 'cover', 'passportHero', 'passportTicket'] },
  { label: 'El evento',   types: ['eventCard', 'dateBadge', 'countdown', 'itinerary', 'map', 'calendar'] },
  { label: 'Fotos',       types: ['gallery', 'timeline', 'story', 'beforeAfter'] },
  { label: 'Invitados',   types: ['rsvp', 'accessPass', 'tableFinder', 'guestbook', 'dressCode', 'parents', 'lodging', 'gift', 'hashtag'] },
  { label: 'Diseño',      types: ['group', 'button', 'ornament', 'divider', 'spacer'] },
];

/** Tipos permitidos dentro de una columna (sin grupos anidados ni secciones grandes). */
export const CHILD_PALETTE: BlockType[] = [
  'heading', 'text', 'quote', 'image', 'ornament', 'eventCard', 'dateBadge', 'countdown', 'calendar', 'button', 'hashtag', 'divider', 'spacer',
];

let _newBlockSeq = 0;
function freshId(type: string) {
  return `${type}-${Date.now().toString(36)}-${(_newBlockSeq++).toString(36)}`;
}

/** Crea un bloque nuevo con sus props por defecto (clon profundo). */
export function createBlock(type: BlockType): Block {
  const b: Block = {
    id: freshId(type),
    type,
    props: JSON.parse(JSON.stringify(BLOCKS[type].defaultProps)),
  };
  if (type === 'group') {
    b.children = [createBlock('heading'), createBlock('text')];
  }
  return b;
}

/** Clona un bloque (y sus hijos) con ids nuevos — para copiar/pegar/duplicar. */
export function cloneBlock(b: Block): Block {
  const copy: Block = JSON.parse(JSON.stringify(b));
  const reid = (x: Block) => {
    x.id = `${x.type}-${Date.now().toString(36)}-${(_newBlockSeq++).toString(36)}`;
    if (x.children) x.children.forEach(reid);
  };
  reid(copy);
  return copy;
}

// ── Secciones prediseñadas ────────────────────────────────────────────────────
// Conjuntos de bloques ya compuestos: un clic inserta la sección completa lista
// para personalizar (mucho más rápido que armarla bloque a bloque).

/** Crea un bloque con props extra ya aplicadas. */
function block(type: BlockType, props: Record<string, unknown> = {}, children?: Block[]): Block {
  const b = createBlock(type);
  b.props = { ...b.props, ...props };
  if (children) b.children = children;
  return b;
}

export interface SectionPreset {
  key: string;
  label: string;
  icon: string;
  desc: string;
  /** Apartado del panel donde aparece (ver SECTION_GROUPS). */
  group: string;
  create: () => Block[];
}

/** Orden de los apartados en el panel "Secciones listas". */
export const SECTION_GROUPS = ['Inicio', 'El evento', 'Fotos y recuerdos', 'Invitados', 'XV Años', 'Otros eventos'] as const;

export const SECTION_PRESETS: SectionPreset[] = [
  // ── Inicio ──────────────────────────────────────────────────────────────────
  {
    key: 'cover-photo', label: 'Portada con foto', icon: '💍', group: 'Inicio',
    desc: 'Foto de fondo con los nombres + la fecha',
    create: () => [
      block('cover', { tagline: 'Nos casamos' }),
      block('dateBadge', {}),
    ],
  },
  {
    key: 'welcome', label: 'Bienvenida', icon: '💌', group: 'Inicio',
    desc: 'Título manuscrito + mensaje + separador',
    create: () => [
      block('heading', { text: '¡Nos casamos!', font: 'script' }),
      block('text', { text: 'Con la bendición de Dios y de nuestras familias, queremos compartir contigo el inicio de nuestra historia juntos.', italic: true }),
      block('divider', { style: 'flourish' }),
    ],
  },
  {
    key: 'verse', label: 'Versículo o frase', icon: '❝', group: 'Inicio',
    desc: 'Cita centrada entre dos adornos',
    create: () => [
      block('ornament', { motif: 'flourish', size: 140 }),
      block('quote', { text: 'El amor es paciente, el amor es bondadoso. Todo lo disculpa, todo lo cree, todo lo espera, todo lo soporta.', author: '1 Corintios 13:4-7' }),
      block('divider', { style: 'diamond' }),
    ],
  },
  {
    key: 'save-date', label: 'Reserva la fecha', icon: '⏳', group: 'Inicio',
    desc: 'Fecha + cuenta regresiva + botón de calendario',
    create: () => [
      block('dateBadge', {}),
      block('countdown', { label: 'Solo faltan', display: 'cards', showSeconds: true }),
      block('calendar', { label: 'Agendar en mi calendario' }),
    ],
  },

  // ── El evento ───────────────────────────────────────────────────────────────
  {
    key: 'events', label: 'Ceremonia y recepción', icon: '⛪', group: 'El evento',
    desc: 'Dos tarjetas de evento lado a lado',
    create: () => [
      block('heading', { text: '¿Cuándo y dónde?', font: 'script' }),
      block('group', { columns: 2, mode: 'columns' }, [
        block('eventCard', { title: 'Ceremonia', time: '16:00 h', place: 'Iglesia', icon: 'church' }),
        block('eventCard', { title: 'Recepción', time: '19:00 h', place: 'Salón de eventos', icon: 'cheers' }),
      ]),
    ],
  },
  {
    key: 'schedule', label: 'Itinerario del día', icon: '🗓️', group: 'El evento',
    desc: 'Título + horario paso a paso',
    create: () => [
      block('heading', { text: 'El gran día', font: 'script' }),
      block('itinerary', {
        title: '', items: [
          { time: '16:00', label: 'Ceremonia', icon: 'church' },
          { time: '17:30', label: 'Cóctel de bienvenida', icon: 'cheers' },
          { time: '19:00', label: 'Cena', icon: 'dinner' },
          { time: '21:00', label: 'Primer baile', icon: 'dance' },
          { time: '23:00', label: 'Fiesta', icon: 'party' },
        ],
      }),
    ],
  },
  {
    key: 'directions', label: 'Cómo llegar', icon: '📍', group: 'El evento',
    desc: 'Mapa + dirección + botón de indicaciones',
    create: () => [
      block('heading', { text: 'Cómo llegar', font: 'script' }),
      block('map', { title: '', query: '' }),
      block('button', { label: 'Abrir en Google Maps', href: '', filled: true }),
    ],
  },
  {
    key: 'details', label: 'Detalles a tener en cuenta', icon: '📌', group: 'El evento',
    desc: 'Vestimenta + dos avisos en columnas',
    create: () => [
      block('dressCode', {}),
      block('group', { columns: 2, mode: 'columns' }, [
        block('text', { text: 'Celebración solo para adultos. ¡Gracias por comprenderlo!', italic: true }),
        block('text', { text: 'Habrá estacionamiento disponible en el mismo salón.', italic: true }),
      ]),
    ],
  },

  // ── Fotos y recuerdos ───────────────────────────────────────────────────────
  {
    key: 'story', label: 'Nuestra historia', icon: '📖', group: 'Fotos y recuerdos',
    desc: 'Monograma + línea de tiempo con fotos',
    create: () => [
      block('monogram', {}),
      block('timeline', {}),
    ],
  },
  {
    key: 'gallery', label: 'Galería de fotos', icon: '🖼️', group: 'Fotos y recuerdos',
    desc: 'Mosaico de fotos + hashtag para compartir',
    create: () => [
      block('heading', { text: 'Nuestros momentos', font: 'script' }),
      block('gallery', { layout: 'masonry', message: 'Un pequeño recorrido por los momentos que nos trajeron hasta aquí.' }),
      block('hashtag', {}),
    ],
  },
  {
    key: 'cinema', label: 'Momento cinematográfico', icon: '🎬', group: 'Fotos y recuerdos',
    desc: 'Foto a pantalla completa con frases al hacer scroll',
    create: () => [
      block('story', { overlay: 45, height: 260 }),
    ],
  },
  {
    key: 'video', label: 'Video', icon: '🎥', group: 'Fotos y recuerdos',
    desc: 'Título + video de YouTube o Vimeo',
    create: () => [
      block('heading', { text: 'Un mensaje para ti', font: 'script' }),
      block('video', { url: '', title: 'Nuestro video' }),
      block('text', { text: 'Nos hizo mucha ilusión grabarlo pensando en ti.', italic: true }),
    ],
  },
  {
    key: 'then-now', label: 'Antes y ahora', icon: '🔀', group: 'Fotos y recuerdos',
    desc: 'Dos fotos comparadas con un deslizador',
    create: () => [
      block('heading', { text: 'Antes y ahora', font: 'script' }),
      block('beforeAfter', { caption: 'Desliza para vernos entonces… y hoy' }),
    ],
  },

  // ── Invitados ───────────────────────────────────────────────────────────────
  {
    key: 'family', label: 'Familia', icon: '👨‍👩‍👧', group: 'Invitados',
    desc: 'Padres y padrinos en columnas',
    create: () => [block('parents', {})],
  },
  {
    key: 'guests-info', label: 'Info para invitados', icon: '🧳', group: 'Invitados',
    desc: 'Vestimenta + hospedaje + hashtag',
    create: () => [
      block('dressCode', {}),
      block('divider', { style: 'double' }),
      block('lodging', {}),
      block('hashtag', {}),
    ],
  },
  {
    key: 'gifts', label: 'Mesa de regalos', icon: '🎁', group: 'Invitados',
    desc: 'Datos bancarios o QR + mensaje',
    create: () => [
      block('gift', {}),
      block('text', { text: 'Cualquier detalle lo recibiremos con muchísimo cariño.', italic: true }),
    ],
  },
  {
    key: 'guestbook', label: 'Libro de mensajes', icon: '💬', group: 'Invitados',
    desc: 'Los invitados dejan su saludo',
    create: () => [
      block('guestbook', {}),
      block('divider', { style: 'hairline' }),
    ],
  },
  {
    key: 'tables', label: 'Tu lugar en la fiesta', icon: '🪑', group: 'Invitados',
    desc: 'Buscador de mesa por nombre',
    create: () => [
      block('tableFinder', {}),
      block('text', { text: 'Si no encuentras tu nombre, escríbenos y lo resolvemos al instante.', italic: true }),
    ],
  },
  {
    key: 'personal-access', label: 'Acceso personal', icon: '▦', group: 'Invitados',
    desc: 'Nombre, estado, mesa, cupos y QR individual',
    create: () => {
      const pass = block('accessPass', {});
      pass.visibility = { audience: 'personalized', rsvpStatus: 'confirmed' };
      return [
        block('heading', { text: 'Hola, {{guest.name}}', font: 'script' }),
        block('text', { text: '{{guest.passesLabel}} · {{guest.tableLabel}}', italic: true }),
        pass,
      ];
    },
  },
  {
    key: 'closing', label: 'Cierre', icon: '🤍', group: 'Invitados',
    desc: 'Cuenta regresiva + confirmación',
    create: () => [
      block('countdown', { label: 'Solo faltan' }),
      block('rsvp', { mode: 'form' }),
      block('text', { text: '¡Te esperamos!', italic: true }),
    ],
  },

  // ── XV Años ─────────────────────────────────────────────────────────────────
  {
    key: 'xv-welcome', label: 'Bienvenida de XV', icon: '👑', group: 'XV Años',
    desc: 'Título + mensaje de la quinceañera',
    create: () => [
      block('heading', { text: 'Mis XV Años', font: 'script' }),
      block('text', { text: 'Hoy cumplo quince años y quiero celebrarlo con las personas que más quiero. Me haría muy feliz que me acompañes.', italic: true }),
      block('divider', { style: 'bloom' }),
    ],
  },
  {
    key: 'xv-party', label: 'Vals y fiesta', icon: '💃', group: 'XV Años',
    desc: 'Itinerario con misa, vals, brindis y fiesta',
    create: () => [
      block('heading', { text: 'Programa de la noche', font: 'script' }),
      block('itinerary', {
        title: '', items: [
          { time: '18:00', label: 'Misa de acción de gracias', icon: 'church' },
          { time: '20:00', label: 'Recepción', icon: 'cheers' },
          { time: '21:00', label: 'Vals', icon: 'dance' },
          { time: '22:00', label: 'Brindis y pastel', icon: 'cake' },
          { time: '23:00', label: 'Fiesta', icon: 'party' },
        ],
      }),
    ],
  },
  {
    key: 'xv-court', label: 'Damas y chambelanes', icon: '🎀', group: 'XV Años',
    desc: 'Corte de honor y padrinos',
    create: () => [
      block('parents', {
        title: 'Mi corte de honor',
        message: '',
        items: [
          { role: 'Damas', names: 'Nombre\nNombre\nNombre' },
          { role: 'Chambelanes', names: 'Nombre\nNombre\nNombre' },
        ],
      }),
      block('parents', {
        title: 'Con la bendición de',
        message: '',
        items: [
          { role: 'Mis padres', names: 'Nombre\nNombre' },
          { role: 'Mis padrinos', names: 'Nombre\nNombre' },
        ],
      }),
    ],
  },

  // ── Otros eventos ───────────────────────────────────────────────────────────
  {
    key: 'birthday', label: 'Cumpleaños', icon: '🎂', group: 'Otros eventos',
    desc: 'Fecha + lugar de la fiesta + confirmación',
    create: () => [
      block('heading', { text: '¡Estás invitado!', font: 'script' }),
      block('dateBadge', {}),
      block('eventCard', { title: 'La fiesta', time: '20:00 h', place: 'Lugar de la celebración', icon: 'party' }),
      block('rsvp', { mode: 'whatsapp', message: 'Avísame si vienes para reservarte un lugar.', buttonLabel: 'Confirmar por WhatsApp' }),
    ],
  },
  {
    key: 'baby-shower', label: 'Baby shower', icon: '🍼', group: 'Otros eventos',
    desc: 'Mensaje + tarjeta del evento + regalos',
    create: () => [
      block('heading', { text: 'Baby Shower', font: 'script' }),
      block('text', { text: 'Estamos contando los días para conocerle. Ven a celebrar con nosotros esta nueva etapa.', italic: true }),
      block('eventCard', { title: 'Celebración', time: '17:00 h', place: 'Lugar del evento', icon: 'cheers' }),
      block('gift', { title: 'Sugerencia de regalo', message: 'Tu presencia es el mejor regalo, pero si quieres traer algo, aquí van unas ideas.' }),
    ],
  },
  {
    key: 'baptism', label: 'Bautizo', icon: '✝️', group: 'Otros eventos',
    desc: 'Versículo + ceremonia + padrinos',
    create: () => [
      block('quote', { text: 'Dejen que los niños vengan a mí, porque de ellos es el reino de los cielos.', author: 'Mateo 19:14' }),
      block('eventCard', { title: 'Ceremonia', time: '11:00 h', place: 'Parroquia', icon: 'church' }),
      block('parents', {
        title: 'Con la bendición de',
        message: '',
        items: [
          { role: 'Papás', names: 'Nombre\nNombre' },
          { role: 'Padrinos', names: 'Nombre\nNombre' },
        ],
      }),
    ],
  },
];

// ── Elementos flotantes (stickers) ────────────────────────────────────────────

/** Crea un elemento flotante desde la librería (motif) o una imagen subida (url). */
export function createElementBlock(opts: { motif?: string; url?: string; color?: string; palette?: ElementPalette }): Block {
  const b = createBlock('element');
  const def = opts.motif ? getElement(opts.motif) : undefined;
  b.props = {
    ...b.props,
    source: opts.url ? 'upload' : 'library',
    motif: opts.motif ?? 'corner-orchid',
    url: opts.url ?? '',
    color: opts.palette?.primary ?? opts.color ?? '',
    color2: opts.palette?.secondary ?? '',
    color3: opts.palette?.accent ?? '',
    color4: opts.palette?.detail ?? '',
  };
  b.layout = { anchor: def?.anchor ?? 'tc', w: def?.w ?? (opts.url ? 160 : 170), z: 60 };
  return b;
}

/** Atajo "decorar esquinas": 4 esquineros del mismo motivo, anclados y espejados. */
export function createCornerSet(motif: string, color?: string, palette?: ElementPalette): Block[] {
  const def = getElement(motif);
  const w = def?.w ?? 170;
  const corners: { anchor: NonNullable<BlockLayout['anchor']>; flipH?: boolean; flipV?: boolean }[] = [
    { anchor: 'tl' },
    { anchor: 'tr', flipH: true },
    { anchor: 'bl', flipV: true },
    { anchor: 'br', flipH: true, flipV: true },
  ];
  return corners.map((c, i) => {
    const b = createBlock('element');
    b.props = {
      ...b.props,
      source: 'library',
      motif,
      color: palette?.primary ?? color ?? '',
      color2: palette?.secondary ?? '',
      color3: palette?.accent ?? '',
      color4: palette?.detail ?? '',
      flipH: !!c.flipH,
      flipV: !!c.flipV,
    };
    b.layout = { anchor: c.anchor, w, z: 60 + i };
    return b;
  });
}

// ── Packs decorativos (un clic = look completo coherente) ──────────────────────
function packElem(motif: string, palette: ElementPalette, patch?: Partial<BlockLayout>): Block {
  const b = createElementBlock({ motif, palette });
  if (patch) b.layout = { ...(b.layout ?? {}), ...patch };
  return b;
}

export interface DecorPack {
  key: string;
  label: string;
  desc: string;
  /** Motivo representativo para la miniatura. */
  preview: string;
  build: (palette: ElementPalette) => Block[];
}

export const DECOR_PACKS: DecorPack[] = [
  {
    key: 'orchid-garden', label: 'Jardín de orquídeas', desc: 'Esquinas de orquídeas + cenefa',
    preview: 'corner-orchid',
    build: (p) => [...createCornerSet('corner-orchid', p.primary, p), packElem('divider-floral', p, { anchor: 'tc', y: 70, z: 70 })],
  },
  {
    key: 'eucalyptus', label: 'Eucalipto', desc: 'Esquinas de eucalipto, fresco y natural',
    preview: 'corner-eucalyptus',
    build: (p) => [...createCornerSet('corner-eucalyptus', p.primary, p)],
  },
  {
    key: 'roses-romance', label: 'Romance de rosas', desc: 'Esquinas de rosas + ramo inferior',
    preview: 'corner-rose',
    build: (p) => [...createCornerSet('corner-rose', p.primary, p), packElem('bouquet-roses', p, { anchor: 'bc', y: -10, z: 70 })],
  },
  {
    key: 'deco-gold', label: 'Déco dorado', desc: 'Abanicos déco + cenefa geométrica',
    preview: 'corner-fan',
    build: (p) => [...createCornerSet('corner-fan', p.primary, p), packElem('divider-deco', p, { anchor: 'tc', y: 70, z: 70 })],
  },
  {
    key: 'wildflowers', label: 'Flores silvestres', desc: 'Esquinas de margaritas y brotes',
    preview: 'corner-wild',
    build: (p) => [...createCornerSet('corner-wild', p.primary, p)],
  },
  {
    key: 'laurel-frame', label: 'Marco de laurel', desc: 'Esquinas de laurel + corona superior',
    preview: 'corner-laurel',
    build: (p) => [...createCornerSet('corner-laurel', p.primary, p), packElem('wreath-laurel', p, { anchor: 'tc', y: 40, w: 120, z: 70 })],
  },
];

/** Atajo: grupo en capas con una imagen de marco/corona y los nombres centrados encima. */
export function createOverlayGroup(): Block {
  const image = createBlock('image');
  image.props = { ...image.props, url: '', rounded: 0, maxHeight: 360 };
  const names = createBlock('heading');
  names.props = { ...names.props, text: 'Ana & Carlos', font: 'script', size: 0 };
  const g = createBlock('group');
  g.props = { columns: 1, mode: 'overlay' };
  g.children = [image, names]; // imagen debajo, texto encima (orden = capa)
  return g;
}
