'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { IconCustomization } from './types';
import type { ParticleShape } from '@/lib/types';
import { ScrollReveal } from '@/lib/scroll-motion';

// ── Contacto de Enkarta (footer de todas las plantillas) ─────────────────────
// "Contáctanos" del pie de cada invitación → WhatsApp del negocio. El número
// se inyecta en build desde NEXT_PUBLIC_WA_PHONE (mismo que usa la landing).
export const ENKARTA_WA_URL = `https://wa.me/${process.env.NEXT_PUBLIC_WA_PHONE || '59162449491'}?text=${encodeURIComponent('Hola Enkarta, vi una invitación y quiero una para mi evento 🎉')}`;

// ── Escala tipográfica compartida ─────────────────────────────────────────────
// Roles, no valores sueltos: reemplaza los decenas de `clamp()` casi idénticos
// que cada plantilla hardcodeaba, para que titulares, cuerpos y etiquetas
// respiren igual en todo el producto. Son cadenas listas para `fontSize`.
export const TYPE = {
  display:  'clamp(46px,11vw,72px)', // nombres de pareja / script grande
  title:    'clamp(24px,4.6vw,34px)', // títulos de sección
  subtitle: 'clamp(20px,3.6vw,27px)', // subtítulos / script mediano
  lead:     'clamp(17px,2.6vw,20px)', // mensaje destacado
  body:     'clamp(15px,2vw,17px)',   // cuerpo
  small:    'clamp(13px,1.8vw,15px)', // secundario
  caption:  'clamp(11px,1.5vw,13px)', // etiquetas / overline
  number:   'clamp(26px,5vw,40px)',   // dígitos de la cuenta regresiva
} as const;

// ── Ritmo de espaciado de secciones ───────────────────────────────────────────
// Tres alturas estándar (padding vertical responsive) para un ritmo editorial
// consistente, en vez del batiburrillo actual py-8/10/12/14/16.
export const SECTION = {
  tight: 'py-10 sm:py-12',
  base:  'py-14 sm:py-16',
  roomy: 'py-16 sm:py-20',
} as const;

// ── Live countdown hook ───────────────────────────────────────────────────────
export function useCountdown(isoDate: string) {
  // Start at zeros so server and client first render match (avoids hydration mismatch),
  // then compute on the client after mount.
  const [t, setT] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    const target = new Date(isoDate).getTime();
    const calc = () => {
      const diff = Math.max(0, target - Date.now());
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      };
    };
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [isoDate]);
  return t;
}

// ── Odometer: número cuyos dígitos "ruedan" al cambiar (cuenta regresiva) ─────
// Cada dígito es una columna 0-9 que se desliza verticalmente; hereda fuente y
// color del contexto, así que sustituye a `String(n).padStart(2,'0')` sin más.
export function Odometer({ value, pad = 2, className, style }: {
  value: number;
  pad?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const s = String(Math.max(0, Math.floor(value))).padStart(pad, '0');
  const digits = s.split('');
  return (
    <span className={className} style={{ display: 'inline-flex', overflow: 'hidden', verticalAlign: 'baseline', ...style }} aria-label={s}>
      {digits.map((d, i) => (
        // key desde la derecha: si pasa de 100 a 99 días la columna no salta.
        <span key={digits.length - i} aria-hidden style={{ display: 'inline-block', height: '1em', overflow: 'hidden' }}>
          <span
            style={{
              display: 'block',
              transform: `translateY(-${Number(d)}em)`,
              transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n} style={{ display: 'block', height: '1em', lineHeight: '1em' }}>{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

// ── Tilt: la tarjeta se inclina sutilmente siguiendo el cursor (desktop) ──────
export function Tilt({ children, className, style, max = 7 }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Inclinación máxima en grados. */
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
  };
  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: 'transform 0.35s ease', willChange: 'transform', ...style }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </div>
  );
}

// ── Scroll reveal wrapper ─────────────────────────────────────────────────────
// Delega en el motor compartido `ScrollReveal` (src/lib/scroll-motion.tsx). Así
// todas las plantillas que usan <Reveal> responden al preset global de
// transiciones (fade / 3D / parallax) elegido en el panel "Animación", sin
// cambiar su código. Mantiene la API antigua (children/className/delay/style).
export function Reveal({
  children,
  className = '',
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <ScrollReveal className={className} delay={delay} style={style}>
      {children}
    </ScrollReveal>
  );
}

// ── Lightbox (visor de fotos a pantalla completa) ─────────────────────────────
// Compartido por toda galería de la app: abre la foto a pantalla completa, con
// navegación (flechas / swipe / teclado), contador y cierre con Escape o tap.
export function Lightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const total = images.length;
  const [mounted, setMounted] = useState(false);

  const go = useCallback((dir: number) => {
    onIndex((index + dir + total) % total);
  }, [index, total, onIndex]);

  // Solo portamos en cliente (document existe tras montar).
  useEffect(() => { setMounted(true); }, []);

  // Teclado: ←/→ navega, Esc cierra.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    // Bloquea el scroll del fondo mientras el visor está abierto.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);

  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (dy > 80) onClose(); // deslizar hacia abajo cierra
    touch.current = null;
  };

  if (!mounted) return null;

  // Portal a <body>: evita que un ancestro con `transform` (ScrollReveal/3D)
  // capture el position:fixed y descoloque el visor.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(12,10,8,0.94)', backdropFilter: 'blur(4px)', animation: 'ekLbFade .25s ease' }}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
    >
      <style>{`
        @keyframes ekLbFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ekLbZoom { from { opacity: 0; transform: scale(.94) } to { opacity: 1; transform: scale(1) } }
      `}</style>

      {/* Cerrar */}
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
      </button>

      {/* Contador */}
      {total > 1 && (
        <span className="absolute top-5 left-1/2 -translate-x-1/2 font-outfit text-[13px] tracking-[0.2em] text-white/70">
          {index + 1} / {total}
        </span>
      )}

      {/* Flecha anterior */}
      {total > 1 && (
        <button
          onClick={e => { e.stopPropagation(); go(-1); }}
          aria-label="Anterior"
          className="absolute left-2 sm:left-5 z-10 flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
        </button>
      )}

      {/* Imagen */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={index}
        src={images[index]}
        alt=""
        onClick={e => e.stopPropagation()}
        className="max-h-[88vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
        style={{ animation: 'ekLbZoom .3s cubic-bezier(0.22,1,0.36,1)' }}
      />

      {/* Flecha siguiente */}
      {total > 1 && (
        <button
          onClick={e => { e.stopPropagation(); go(1); }}
          aria-label="Siguiente"
          className="absolute right-2 sm:right-5 z-10 flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /></svg>
        </button>
      )}

      {/* Miniaturas (en pantallas amplias) */}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 gap-2 sm:flex">
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${src}-${i}`}
              src={src}
              alt=""
              onClick={e => { e.stopPropagation(); onIndex(i); }}
              className="h-12 w-12 cursor-pointer rounded object-cover transition-all"
              style={{ outline: i === index ? '2px solid #fff' : '2px solid transparent', opacity: i === index ? 1 : 0.5 }}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

// Imagen con aparición progresiva: arranca transparente y se funde al cargar
// (placeholder suave en el contenedor). Evita el "salto" brusco de las fotos.
export function FadeImg({ className, style, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { if (ref.current?.complete) setLoaded(true); }, []);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      alt=""
      loading="lazy"
      onLoad={() => setLoaded(true)}
      className={className}
      style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity .6s ease, transform .5s ease', filter: loaded ? 'none' : 'blur(8px)' }}
      {...rest}
    />
  );
}

export type GalleryLayout = 'grid' | 'masonry' | 'polaroid' | 'carousel' | 'coverflow';

// Carrusel 3D "coverflow": la foto central de frente, las laterales giradas en
// profundidad. El ángulo/escala de cada celda se recalcula al hacer scroll.
function CoverflowGallery({ images, radius = 16, lightbox = true, className = '' }: {
  images: string[];
  radius?: number;
  lightbox?: boolean;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  const update = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    Array.from(el.children).forEach(child => {
      const cell = child as HTMLElement;
      const inner = cell.firstElementChild as HTMLElement | null;
      if (!inner) return;
      const mid = cell.offsetLeft + cell.offsetWidth / 2;
      const t = Math.max(-1.2, Math.min(1.2, (mid - center) / (cell.offsetWidth * 1.1)));
      inner.style.transform = `rotateY(${(-t * 36).toFixed(1)}deg) scale(${(1 - Math.min(1, Math.abs(t)) * 0.16).toFixed(3)})`;
      inner.style.opacity = String(1 - Math.min(1, Math.abs(t)) * 0.35);
      cell.style.zIndex = String(50 - Math.round(Math.abs(t) * 20));
    });
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    // Arranca centrado en la primera foto y ajusta los ángulos iniciales.
    update();
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [update]);

  const visor = lightbox && open !== null
    ? <Lightbox images={images} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    : null;

  return (
    <>
      <div
        ref={wrap}
        className={`flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 ${className}`}
        style={{ pointerEvents: 'auto', scrollbarWidth: 'none', paddingInline: 'max(10%, calc(50% - 115px))' }}
      >
        {images.map((src, i) => (
          <div key={`${src}-${i}`} className="relative shrink-0 snap-center" style={{ width: 'min(58vw, 230px)', perspective: 900 }}>
            <div
              onClick={lightbox ? () => setOpen(i) : undefined}
              className="group relative overflow-hidden bg-black/5 shadow-xl"
              style={{ aspectRatio: '3 / 4', borderRadius: radius, cursor: lightbox ? 'zoom-in' : 'default', transition: 'opacity .2s linear', willChange: 'transform' }}
            >
              <FadeImg src={src} className="h-full w-full object-cover" />
            </div>
          </div>
        ))}
      </div>
      {visor}
    </>
  );
}

// Lupa de hover compartida por las celdas de la galería.
function ZoomHint() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/20 group-hover:opacity-100">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.3-4.3M11 8v6M8 11h6" /></svg>
    </div>
  );
}

// Hook reutilizable: estado del lightbox + el nodo a renderizar. Lo usan las
// galerías propias de cada plantilla (mosaico polaroid, etc.) para abrir foto.
export function useLightbox(images?: string[]) {
  const [open, setOpen] = useState<number | null>(null);
  const list = images ?? [];
  const node = open !== null && list.length
    ? <Lightbox images={list} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    : null;
  return { openAt: (i: number) => setOpen(i), node };
}

// Galería de mosaico (estilo "Nosotros" de las plantillas) con lightbox incluido.
// variant: polaroid (marco blanco inclinado) | rounded (esquinas redondeadas) | grid.
export function MasonryGallery({
  images,
  variant = 'polaroid',
  aspect = '3 / 4',
  className = '',
}: {
  images?: string[];
  variant?: 'polaroid' | 'rounded' | 'grid';
  aspect?: string;
  className?: string;
}) {
  const lb = useLightbox(images);
  if (!images || images.length === 0) return null;

  if (variant === 'grid') {
    return (
      <>
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${className}`}>
          {images.map((src, i) => (
            <div key={`${src}-${i}`} onClick={() => lb.openAt(i)} className={`group relative overflow-hidden rounded-2xl ${i % 3 === 1 ? 'sm:translate-y-6' : ''}`} style={{ aspectRatio: aspect, cursor: 'zoom-in' }}>
              <FadeImg src={src} className="h-full w-full object-cover group-hover:scale-105" />
              <ZoomHint />
            </div>
          ))}
        </div>
        {lb.node}
      </>
    );
  }

  const polaroid = variant === 'polaroid';
  return (
    <>
      <div className={`columns-2 gap-4 sm:columns-3 ${className}`}>
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            onClick={() => lb.openAt(i)}
            className={`group mb-4 inline-block w-full shadow-md ${polaroid ? 'bg-white p-2 pb-4' : 'overflow-hidden rounded-2xl'}`}
            style={{ transform: `rotate(${(i % 3 - 1) * (polaroid ? 2.2 : 2)}deg)`, cursor: 'zoom-in' }}
          >
            <div className="relative overflow-hidden" style={{ aspectRatio: aspect }}>
              <FadeImg src={src} className="h-full w-full object-cover group-hover:scale-105" />
              <ZoomHint />
            </div>
          </div>
        ))}
      </div>
      {lb.node}
    </>
  );
}

// ── Photo gallery (renders uploaded images) ───────────────────────────────────
export function PhotoGrid({
  images,
  className = '',
  radius = 16,
  lightbox = true,
  layout = 'grid',
}: {
  images?: string[];
  className?: string;
  radius?: number;
  /** Permite abrir cada foto a pantalla completa (por defecto, sí). */
  lightbox?: boolean;
  /** Disposición visual de la galería. */
  layout?: GalleryLayout;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const cursor = lightbox ? 'zoom-in' : 'default';
  const click = (i: number) => (lightbox ? () => setOpen(i) : undefined);

  if (!images || images.length === 0) return null;

  const visor = lightbox && open !== null
    ? <Lightbox images={images} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    : null;

  // Coverflow: carrusel 3D con la foto central de frente.
  if (layout === 'coverflow') {
    return <CoverflowGallery images={images} radius={radius} lightbox={lightbox} className={className} />;
  }

  // Masonry: alturas alternadas con columnas CSS (efecto Pinterest).
  if (layout === 'masonry') {
    return (
      <>
        <div className={className} style={{ columnGap: 8, columnCount: 2, pointerEvents: 'auto' }}>
          {images.map((src, i) => (
            <div key={`${src}-${i}`} onClick={click(i)} className="group relative mb-2 inline-block w-full overflow-hidden bg-black/5" style={{ borderRadius: radius, cursor }}>
              <FadeImg src={src} className="w-full object-cover group-hover:scale-105" />
              {lightbox && <ZoomHint />}
            </div>
          ))}
        </div>
        {visor}
      </>
    );
  }

  // Polaroid: fotos con marco blanco, ligeramente inclinadas.
  if (layout === 'polaroid') {
    return (
      <>
        <div className={`flex flex-wrap justify-center gap-4 ${className}`} style={{ pointerEvents: 'auto' }}>
          {images.map((src, i) => (
            <div key={`${src}-${i}`} onClick={click(i)} className="group relative bg-white p-2 pb-7 shadow-lg transition-transform duration-300 hover:z-10 hover:!rotate-0 hover:scale-105" style={{ width: 'min(40vw,160px)', transform: `rotate(${(i % 3 - 1) * 3}deg)`, cursor }}>
              <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
                <FadeImg src={src} className="h-full w-full object-cover" />
                {lightbox && <ZoomHint />}
              </div>
            </div>
          ))}
        </div>
        {visor}
      </>
    );
  }

  // Carrusel: tira horizontal con scroll por gesto.
  if (layout === 'carousel') {
    return (
      <>
        <div className={`flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 ${className}`} style={{ pointerEvents: 'auto', scrollbarWidth: 'thin' }}>
          {images.map((src, i) => (
            <div key={`${src}-${i}`} onClick={click(i)} className="group relative shrink-0 snap-center overflow-hidden bg-black/5" style={{ width: 'min(70vw,260px)', aspectRatio: '3 / 4', borderRadius: radius, cursor }}>
              <FadeImg src={src} className="h-full w-full object-cover group-hover:scale-105" />
              {lightbox && <ZoomHint />}
            </div>
          ))}
        </div>
        {visor}
      </>
    );
  }

  // Grid (por defecto): cuadrícula cuadrada.
  return (
    <>
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${className}`} style={{ pointerEvents: 'auto' }}>
        {images.map((src, i) => (
          <div key={`${src}-${i}`} onClick={click(i)} className="group relative overflow-hidden bg-black/5" style={{ borderRadius: radius, aspectRatio: '1 / 1', cursor }}>
            <FadeImg src={src} className="h-full w-full object-cover group-hover:scale-105" />
            {lightbox && <ZoomHint />}
          </div>
        ))}
      </div>
      {visor}
    </>
  );
}

// ── Delicate feather (pluma) ──────────────────────────────────────────────────
function Feather({ color, tip }: { color: string; tip: string }) {
  const barbs = [];
  for (let y = 6; y <= 40; y += 2.4) {
    const t = (y - 6) / 34;            // 0..1 from top to bottom
    const len = 5.5 * Math.sin(t * Math.PI) + 1.2; // widest in the middle
    const lift = 3.2;                  // barbs sweep upward
    barbs.push(
      <line key={`l${y}`} x1="11" y1={y} x2={11 - len} y2={y - lift} stroke={color} strokeWidth="0.55" strokeLinecap="round" />,
      <line key={`r${y}`} x1="11" y1={y} x2={11 + len} y2={y - lift} stroke={color} strokeWidth="0.55" strokeLinecap="round" />
    );
  }
  return (
    <svg width="22" height="48" viewBox="0 0 22 48" fill="none">
      {/* rachis */}
      <path d="M11 4 C 11.6 16, 11 32, 9.5 44" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
      {barbs}
      {/* soft colored tip */}
      <path d="M11 4 C 12.4 7, 12.2 11, 10.8 14 C 9.6 11, 9.8 7, 11 4 Z" fill={tip} opacity="0.5" />
    </svg>
  );
}

// ── Formas de partícula (caen suavemente). 10 diseños a elegir. ───────────────
export function ParticleShapeSvg({ shape, color, tip }: { shape: ParticleShape; color: string; tip: string }) {
  switch (shape) {
    case 'petal':
      return <svg width="20" height="26" viewBox="0 0 20 26"><path d="M10 1 C3 8,3 18,10 25 C17 18,17 8,10 1Z" fill={color} /><path d="M10 4 V22" stroke={tip} strokeWidth="0.6" opacity="0.5" /></svg>;
    case 'blossom':
      return (
        <svg width="26" height="26" viewBox="-13 -13 26 26" fill={color}>
          {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy="-7" rx="3.4" ry="6" transform={`rotate(${a})`} />)}
          <circle cx="0" cy="0" r="2.6" fill={tip} />
        </svg>
      );
    case 'heart':
      return <svg width="24" height="22" viewBox="-12 -2 24 22" fill={color}><path d="M0 4 C-2 0 -8.5 0 -8.5 5.2 C-8.5 10.5 -2 13.8 0 16.2 C2 13.8 8.5 10.5 8.5 5.2 C8.5 0 2 0 0 4 Z" /></svg>;
    case 'star':
      return <svg width="22" height="22" viewBox="0 0 24 24" fill={color}><path d="M12 1l2.9 6.6 7.1.6-5.4 4.7 1.7 7L12 17.8 5.7 20.5l1.7-7L2 8.8l7.1-.6z" /></svg>;
    case 'leaf':
      return <svg width="18" height="26" viewBox="0 0 18 26"><path d="M9 1 C1 7,1 19,9 25 C17 19,17 7,9 1Z" fill={color} /><path d="M9 3 V23 M9 9 L4 7 M9 9 L14 7 M9 14 L4.5 12 M9 14 L13.5 12" stroke={tip} strokeWidth="0.7" fill="none" opacity="0.6" /></svg>;
    case 'sparkle':
      return <svg width="20" height="20" viewBox="-10 -10 20 20" fill={color}><path d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10Z" /></svg>;
    case 'circle':
      return <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill={color} /></svg>;
    case 'ring':
      return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth="2" /></svg>;
    case 'butterfly': {
      // La misma mariposa de la landing: alas de dos lóbulos con degradado y
      // aleteo continuo, tintada con la paleta (color = alas, tip = cuerpo).
      const gid = `ekpbw-${color.replace(/[^a-zA-Z0-9]/g, '')}-${tip.replace(/[^a-zA-Z0-9]/g, '')}`;
      return (
        <svg width="30" height="24" viewBox="0 0 40 32" fill="none" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.5" />
              <stop offset="55%" stopColor={color} />
              <stop offset="100%" stopColor={tip} />
            </linearGradient>
          </defs>
          <style>{`.ekpbw-wing { animation: ekpbwFlap .6s ease-in-out infinite alternate; } @keyframes ekpbwFlap { from { transform: scaleX(1); } to { transform: scaleX(0.32); } }`}</style>
          <g className="ekpbw-wing" style={{ transformOrigin: '20px 16px' }}>
            <path d="M20 15 C 12 2, 1 2, 1.6 9 C 2 14, 10 16.5, 20 16 Z" fill={`url(#${gid})`} opacity="0.92" />
            <path d="M20 17 C 11 27, 2.5 26, 4 20.5 C 5 17, 12 16.5, 20 17 Z" fill={`url(#${gid})`} opacity="0.72" />
          </g>
          <g className="ekpbw-wing" style={{ transformOrigin: '20px 16px' }}>
            <path d="M20 15 C 28 2, 39 2, 38.4 9 C 38 14, 30 16.5, 20 16 Z" fill={`url(#${gid})`} opacity="0.92" />
            <path d="M20 17 C 29 27, 37.5 26, 36 20.5 C 35 17, 28 16.5, 20 17 Z" fill={`url(#${gid})`} opacity="0.72" />
          </g>
          <ellipse cx="20" cy="16" rx="1.4" ry="6.2" fill={tip} />
          <path d="M19 10.5 C 17.5 7.5, 15.8 6.2, 14.4 5.8 M21 10.5 C 22.5 7.5, 24.2 6.2, 25.6 5.8"
            stroke={tip} strokeWidth="0.9" strokeLinecap="round" />
        </svg>
      );
    }
    case 'snow':
      return (
        <svg width="22" height="22" viewBox="-11 -11 22 22" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round">
          {[0, 60, 120].map(a => <line key={a} x1="0" y1="-10" x2="0" y2="10" transform={`rotate(${a})`} />)}
          {[0, 60, 120, 180, 240, 300].map(a => <g key={a} transform={`rotate(${a})`}><line x1="0" y1="-10" x2="-3" y2="-7" /><line x1="0" y1="-10" x2="3" y2="-7" /></g>)}
        </svg>
      );
    case 'confetti':
      return <svg width="12" height="18" viewBox="0 0 12 18"><rect x="2" y="1" width="8" height="16" rx="2" fill={color} transform="rotate(20 6 9)" /></svg>;
    case 'maple':
      return <svg width="22" height="24" viewBox="-11 -2 22 24" fill={color}><path d="M0 22 L-1 13 L-8 16 L-5 9 L-11 8 L-5 5 L-7 -1 L-1 2 L0 -2 L1 2 L7 -1 L5 5 L11 8 L5 9 L8 16 L1 13 Z" /></svg>;
    case 'diamond':
      return <svg width="16" height="20" viewBox="0 0 16 20" fill={color}><path d="M8 0 L16 9 L8 20 L0 9 Z" /><path d="M0 9 H16" stroke={tip} strokeWidth="0.6" opacity="0.5" /></svg>;
    case 'note':
      return (
        <svg width="20" height="24" viewBox="0 0 20 24" fill={color}>
          <ellipse cx="6" cy="18" rx="5" ry="4" transform="rotate(-18 6 18)" />
          <rect x="10" y="3" width="1.8" height="15" />
          <path d="M11.8 3 C 16 4, 17 8, 15 11 C 16 7, 14 5, 11.8 6 Z" />
        </svg>
      );
    case 'bird':
      return <svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round"><path d="M2 10 Q 7 2 13 9 Q 19 2 24 10" /></svg>;
    case 'feather':
    default:
      return <Feather color={color} tip={tip} />;
  }
}

// ── Partículas que caen (sutiles, repartidas). 10 formas a elegir. ─────────────
export function Particles({ color = '#3a5a82', tip = '#9aa9d6', count = 6, shape = 'feather' }: { color?: string; tip?: string; count?: number; shape?: ParticleShape }) {
  // evenly spread across the full width with light jitter
  const items = Array.from({ length: count }, (_, i) => {
    const base = (i + 0.5) * (100 / count);
    const jitter = ((i * 37) % 14) - 7;
    return {
      left: `${Math.max(2, Math.min(96, base + jitter))}%`,
      delay: `${(i * 4.3) % 22}s`,
      duration: `${20 + ((i * 5) % 12)}s`,
      scale: 0.6 + ((i * 7) % 8) / 16,
      drift: `${(i % 2 === 0 ? 1 : -1) * (28 + (i * 11) % 46)}px`,
      spin: `${(i % 2 === 0 ? 1 : -1) * (18 + (i * 7) % 22)}deg`,
    };
  });
  return (
    <div className="pointer-events-none fixed inset-0 z-[6] overflow-hidden" aria-hidden>
      {items.map((f, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: f.left,
            top: '-60px',
            // @ts-expect-error custom props
            '--drift': f.drift,
            '--spin': f.spin,
            '--s': String(f.scale),
            animation: `featherFall ${f.duration} ease-in-out ${f.delay} infinite`,
            opacity: 0.4,
          }}
        >
          <ParticleShapeSvg shape={shape} color={color} tip={tip} />
        </span>
      ))}
    </div>
  );
}

// ── Copy-to-clipboard button ──────────────────────────────────────────────────
export function CopyBtn({ value, color = 'currentColor' }: { value: string; color?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center justify-center align-middle transition-transform active:scale-90"
      style={{ color }}
      aria-label="Copiar"
    >
      {done ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 012-2h10" />
        </svg>
      )}
    </button>
  );
}

// ── Shared line-art icon set — soporta Lottie JSON y SVG de respaldo ─────────
//    Si `name` es una ruta Lottie ("/lottie/...") renderiza la animación.
//    Si no, usa el SVG clásico como fallback.
/** Nombre clásico de icono → Lottie animado por defecto (public/lottie/…). */
const DEFAULT_LOTTIE: Record<string, string> = {
  church:   '/lottie/boda/iglesia.json',
  rings:    '/lottie/boda/anillos.json',
  cheers:   '/lottie/boda/salud.json',
  dinner:   '/lottie/boda/cena.json',
  dance:    '/lottie/boda/tango.json',
  gift:     '/lottie/boda/regalo-abierto.json',
  camera:   '/lottie/boda/photo.json',
  dress:    '/lottie/boda/wedding-dress.json',
  music:    '/lottie/general/musica.json',
  calendar: '/lottie/general/calendario.json',
  location: '/lottie/general/ubicacion.json',
  party:    '/lottie/boda/fuegos-artificiales.json',
  cake:     '/lottie/boda/pastel-de-boda.json',
  couple:   '/lottie/boda/marriage.json',
  dove:     '/lottie/boda/paloma.json',
  flowers:  '/lottie/boda/ramo.json',
};

export function EventIcon({ name, className = '', stroke = 'currentColor', lottieColors, tint, speed, custom, sec }: {
  name: string;
  className?: string;
  stroke?: string;
  /** Mapa de colores para Lottie: { '#colorOriginal': '#colorNuevo' } */
  lottieColors?: Record<string, string>;
  /** Tinta el icono Lottie a un solo color. Si no se da, usa `stroke` (cuando es hex). */
  tint?: string;
  /** Velocidad de la animación Lottie (1 = normal). */
  speed?: number;
  /** Personalización del panel (icono/color/velocidad por sección). */
  custom?: IconCustomization;
  /** Clave de sección para leer la personalización de `custom`. */
  sec?: string;
}) {
  // Resuelve la personalización del panel (icono, colores, velocidad y color por sección).
  if (custom) {
    if (sec && custom.icons?.[sec]) name = custom.icons[sec];
    if (sec && lottieColors == null) lottieColors = custom.iconColorsMap?.[sec];
    if (sec && speed == null) speed = custom.iconSpeedsMap?.[sec];
    if (custom.iconColor) stroke = custom.iconColor;
  }

  // Los iconos animados conservan sus colores propios; sólo se recolorean si el
  // usuario edita colores concretos (lottieColors) o pide un tinte explícito (tint).
  const lottieTint = tint;
  // Icono propio subido por el usuario (PNG/SVG/JPG) → renderizar como imagen
  if (name && (/\.(png|jpe?g|svg|webp|gif)(\?|$)/i.test(name) || (/^https?:\/\//.test(name) && !name.endsWith('.json')))) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={name} alt="" className={className} style={{ objectFit: 'contain' }} draggable={false} />;
  }

  // Nombres clásicos (church, cheers, dinner…) → icono Lottie ANIMADO por
  // defecto, tintado con el color de la plantilla para conservar su paleta.
  // Antes caían al SVG estático de abajo y los Lottie nunca se veían.
  if (name && DEFAULT_LOTTIE[name]) {
    const isColor = /^#|^rgb|^hsl/.test(stroke);
    return (
      <EventIcon
        name={DEFAULT_LOTTIE[name]}
        className={className}
        stroke={stroke}
        lottieColors={lottieColors}
        tint={tint ?? (isColor ? stroke : undefined)}
        speed={speed}
      />
    );
  }

  // Si es ruta Lottie → renderizar animación
  if (name && (name.startsWith('/lottie/') || name.endsWith('.json') || name.includes('/'))) {
    // Import dinámico inline para no romper el bundle en SSR
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const LottieIcon = require('@/components/ui/LottieIcon').default;
    return (
      <LottieIcon
        icon={name}
        size={48}
        colors={lottieColors}
        tint={lottieTint}
        speed={speed}
        loop
        autoplay
        lazy={false}
        className={className}
      />
    );
  }

  // Fallback: SVG hardcodeado clásico
  const common = { fill: 'none', stroke, strokeWidth: 1.25, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'church': // refined chapel badge
      return (
        <svg viewBox="0 0 48 52" className={className} {...common}>
          <path d="M24 4v5M21.6 6.4h4.8" />
          <path d="M14 48V21.8c0-7 4.5-11.8 10-11.8s10 4.8 10 11.8V48" />
          <path d="M14 48h20" />
          <path d="M20.8 30.5a2.3 2.3 0 1 0 0-.01Z" />
          <path d="M27.3 30.5a2.3 2.3 0 1 0 0-.01Z" />
          <path d="M19 38.2c.2-2.6 1.1-4.6 2.7-6" />
          <path d="M21.7 32.2 18.8 46h5.9l-2.1-10.4" />
          <path d="M26.4 32.5v7.6M26.4 34.8l-3.2 1.6M26.4 40.1 24.2 46M26.4 40.1 28.6 46" />
        </svg>
      );
    case 'cheers': // refined champagne flutes
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <path d="M15.4 11.5h5.8l-1.8 9.1c-.3 1.7-1.8 2.9-3.6 2.9h-.2c-1.8 0-3.2-1.2-3.6-2.9l-1.8-9.1h5.2" />
          <path d="M16.6 23.5v7.4M13.6 33.4h6" />
          <path d="M32.6 11.5h5.8l-1.8 9.1c-.3 1.7-1.8 2.9-3.6 2.9h-.2c-1.8 0-3.2-1.2-3.6-2.9l-1.8-9.1h5.2" />
          <path d="M33.8 23.5v7.4M30.8 33.4h6" />
          <path d="M24 6.5v3.6M21.7 8.2h4.6M19.8 11.2l2.1 1.5M28.2 11.2l-2.1 1.5" opacity="0.92" />
        </svg>
      );
    case 'dance': // refined dancing couple
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <circle cx="18" cy="12" r="2.5" />
          <circle cx="30" cy="12" r="2.5" />
          <path d="M18 15.2v8.4M18 18.8l5.9 3.5M18 23.6 15 36.5M18 23.6l2.5 11" />
          <path d="M30 15.2v6.8M30 18.2l-6.1 4.2M30 22l-4.8 14.5h10L31 22" />
          <path d="M23.9 22.3 26.3 19" />
        </svg>
      );
    case 'rings':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <circle cx="19" cy="29.5" r="8.4" />
          <circle cx="29.6" cy="29.5" r="8.4" />
          <path d="M18.8 19.7 22 13h4.4l3.2 6.7" />
          <path d="M22 13c.9 2.2 2 3.8 4.2 5.7" />
          <path d="M26.4 13c-.9 2.2-2 3.8-4.2 5.7" />
          <path d="M24 10.2v-2" />
        </svg>
      );
    case 'dinner':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <circle cx="24.2" cy="26" r="9.8" />
          <circle cx="24.2" cy="26" r="4.2" />
          <path d="M10.8 11v8.4M13.5 11v8.4M16.2 11v8.4M10.8 19.4c0 1.9 1.2 3.1 2.7 3.1s2.7-1.2 2.7-3.1" />
          <path d="M36.6 11c-2.4 0-4.3 2.9-4.3 6.6v4.7M36.6 11v25" />
        </svg>
      );
    case 'dress': // flared dress + suit jacket with bowtie, on hangers
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          {/* ── dress (left) ── */}
          <path d="M15.5 8.2c0-1.4 2-1.4 2 0" />
          <path d="M11.2 12.4 16.5 9.4 21.8 12.4" />
          {/* fitted bodice */}
          <path d="M13.8 12.8 16.5 11.6 19.2 12.8" />
          <path d="M14.4 13.2 15.6 21M18.6 13.2 17.4 21M15.6 21h1.8" />
          {/* flared A-line skirt */}
          <path d="M15.6 21 11 39h11l-4.6-18" />
          {/* ── suit (right) ── */}
          <path d="M30.5 8.2c0-1.4 2-1.4 2 0" />
          <path d="M26.2 12.4 31.5 9.4 36.8 12.4" />
          {/* jacket body */}
          <path d="M28 12.8 28.3 39h6.4l.3-26.2" />
          {/* lapels V */}
          <path d="M29 13 31.5 20 34 13" />
          <path d="M31.5 20V39" />
          {/* bowtie */}
          <path d="M30.2 13.6 31.5 14.5 30.2 15.4ZM32.8 13.6 31.5 14.5 32.8 15.4Z" />
        </svg>
      );
    case 'camera':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <rect x="6" y="14" width="36" height="26" rx="4" />
          <path d="M16 14l3-5h10l3 5" />
          <circle cx="24" cy="27" r="7" />
          <circle cx="35" cy="19" r="1" />
        </svg>
      );
    case 'gift':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <rect x="9" y="18" width="30" height="22" rx="2" />
          <path d="M7 18h34M24 18v22M24 18c-4-1-9-3-9-7s5-4 9 1c4-5 9-5 9-1s-5 6-9 7z" />
        </svg>
      );
    default:
      return null;
  }
}

// ── Heart loader (matches reference): two interlocking hearts at rest; the
//    filled heart leaves, the outline heart re-draws itself (self-tracing line)
//    while three little hearts orbit, then it all fuses back. Loops forever. ────
const HEART_C = 'M0 4 C-2 0 -8.5 0 -8.5 5.2 C-8.5 10.5 -2 13.8 0 16.2 C2 13.8 8.5 10.5 8.5 5.2 C8.5 0 2 0 0 4 Z';
export function HeartLoader({ color = '#1e3a5f', shine = '#7d93b8', size = 100, className = '' }: { color?: string; shine?: string; size?: number; className?: string }) {
  const mini = (cls: string) => (
    <svg viewBox="-9 -1 18 18" className={`hl-mini ${cls}`}><path d={HEART_C} fill={color} /></svg>
  );
  return (
    <div className={`hl ${className}`} style={{ width: size, height: size }} aria-hidden>
      <style>{`
        .hl { position: relative; }
        .hl svg { position: absolute; top: 50%; transform-origin: center; overflow: visible; }
        .hl .hl-outline { width: 44%; left: 56%; margin-left: -22%; margin-top: -22%; }
        .hl .hl-fill    { width: 44%; left: 44%; margin-left: -22%; margin-top: -22%; }
        .hl .hl-tiny    { width: 13%; left: 33%; top: 31%; margin-left: -6.5%; margin-top: -6.5%; }
        .hl .hl-mini    { width: 16%; left: 50%; margin-left: -8%; margin-top: -8%; }

        .hl .hl-rest { animation: hlRest 4.2s infinite; }
        .hl .hl-draw { stroke-dasharray: 100; animation: hlDraw 4.2s ease-in-out infinite; }
        .hl .hl-m1 { animation: hlM1 4.2s ease-in-out infinite; }
        .hl .hl-m2 { animation: hlM2 4.2s ease-in-out infinite; }
        .hl .hl-m3 { animation: hlM3 4.2s ease-in-out infinite; }

        /* filled + tiny hearts: present at rest, gone while it traces, bounce back */
        @keyframes hlRest {
          0%, 40% { transform: scale(1); animation-timing-function: cubic-bezier(.6,.04,.98,.34); }
          45%     { transform: scale(0); }
          86%     { transform: scale(0); animation-timing-function: cubic-bezier(.34,1.56,.64,1); }
          100%    { transform: scale(1); }
        }
        /* outline heart: drawn at rest, erases, then re-traces itself */
        @keyframes hlDraw {
          0%, 42% { stroke-dashoffset: 0; }
          47%     { stroke-dashoffset: 100; }
          85%     { stroke-dashoffset: 0; }
          100%    { stroke-dashoffset: 0; }
        }
        /* three little hearts orbit with a flip while the outline traces */
        @keyframes hlM1 {
          0%,47% { transform: translate(0,0) scale(0) rotate(0deg);        opacity: 0; }
          52%    { transform: translate(0,0) scale(.9) rotate(0deg);       opacity: 1; }
          63%    { transform: translate(-55%,-240%) scale(.9) rotate(-180deg); opacity: 1; }
          73%    { transform: translate(220%,-200%) scale(.9) rotate(-300deg); opacity: 1; }
          83%    { transform: translate(110%,-40%) scale(.8) rotate(-360deg);  opacity: 1; }
          86%    { transform: translate(0,0) scale(.4) rotate(-360deg);    opacity: 0; }
          100%   { transform: translate(0,0) scale(0) rotate(-360deg);     opacity: 0; }
        }
        @keyframes hlM2 {
          0%,48% { transform: translate(0,0) scale(0) rotate(0deg);        opacity: 0; }
          53%    { transform: translate(0,0) scale(.9) rotate(0deg);       opacity: 1; }
          64%    { transform: translate(-250%,-55%) scale(.9) rotate(170deg); opacity: 1; }
          74%    { transform: translate(-195%,185%) scale(.9) rotate(320deg); opacity: 1; }
          84%    { transform: translate(-65%,65%) scale(.8) rotate(360deg);  opacity: 1; }
          87%    { transform: translate(0,0) scale(.4) rotate(360deg);     opacity: 0; }
          100%   { transform: translate(0,0) scale(0) rotate(360deg);      opacity: 0; }
        }
        @keyframes hlM3 {
          0%,49% { transform: translate(0,0) scale(0) rotate(0deg);        opacity: 0; }
          54%    { transform: translate(0,0) scale(.9) rotate(0deg);       opacity: 1; }
          65%    { transform: translate(245%,-30%) scale(.9) rotate(-170deg); opacity: 1; }
          75%    { transform: translate(180%,195%) scale(.9) rotate(-320deg); opacity: 1; }
          85%    { transform: translate(55%,70%) scale(.8) rotate(-360deg);  opacity: 1; }
          88%    { transform: translate(0,0) scale(.4) rotate(-360deg);    opacity: 0; }
          100%   { transform: translate(0,0) scale(0) rotate(-360deg);     opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hl .hl-rest, .hl .hl-draw, .hl .hl-m1, .hl .hl-m2, .hl .hl-m3 { animation: none; }
          .hl .hl-mini { opacity: 0; }
          .hl .hl-draw { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* outline heart (back-right) — self-drawing */}
      <svg viewBox="-9 -1 18 18" className="hl-outline">
        <path className="hl-draw" d={HEART_C} pathLength={100} fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* filled heart (front-left) with a soft shine */}
      <svg viewBox="-9 -1 18 18" className="hl-fill hl-rest">
        <path d={HEART_C} fill={color} />
        <path d="M-5 5.6 C-3.6 3.9 -1.6 3.7 -0.4 4.9" fill="none" stroke={shine} strokeWidth="1" strokeLinecap="round" />
      </svg>
      {/* tiny accent heart (top-left) */}
      <svg viewBox="-9 -1 18 18" className="hl-tiny hl-rest"><path d={HEART_C} fill={color} /></svg>
      {/* three orbiting little hearts */}
      {mini('hl-m1')}
      {mini('hl-m2')}
      {mini('hl-m3')}
    </div>
  );
}

// ── Orchid sprig divider (refined botanical) ──────────────────────────────────
export function OrchidSprig({ color = '#2c4d77', className = '', flip = false }: { color?: string; className?: string; flip?: boolean }) {
  const leaf = (x: number, y: number, rx: number, ry: number, rot: number, o = 1) => (
    <g transform={`rotate(${rot} ${x} ${y})`} opacity={o}>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} />
      <line x1={x - rx} y1={y} x2={x + rx} y2={y} strokeWidth="0.5" />
    </g>
  );
  const orchid = (x: number, y: number, s: number) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="-6" rx="3.2" ry="6" />
      <ellipse cx="-6.5" cy="-1.5" rx="6" ry="3" transform="rotate(-32)" />
      <ellipse cx="6.5" cy="-1.5" rx="6" ry="3" transform="rotate(32)" />
      <ellipse cx="-4" cy="4.5" rx="4.5" ry="2.6" transform="rotate(-18)" />
      <ellipse cx="4" cy="4.5" rx="4.5" ry="2.6" transform="rotate(18)" />
      <circle cx="0" cy="0.5" r="1.8" />
      <circle cx="0" cy="0.5" r="0.6" fill={color} />
    </g>
  );
  return (
    <svg viewBox="0 0 160 48" className={className} fill="none" stroke={color} strokeWidth="0.9" style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
      {/* main curved stems */}
      <path d="M80 34 C 60 33, 40 30, 20 18" strokeLinecap="round" />
      <path d="M80 34 C 100 33, 120 30, 140 18" strokeLinecap="round" />
      <path d="M80 34 C 79 24, 80 16, 83 9" strokeLinecap="round" />
      {/* leaves along stems */}
      {leaf(54, 30, 6, 2.2, -16, 0.9)}
      {leaf(106, 30, 6, 2.2, 16, 0.9)}
      {leaf(40, 26, 5, 1.9, -22, 0.75)}
      {leaf(120, 26, 5, 1.9, 22, 0.75)}
      {leaf(28, 21, 4.4, 1.6, -30, 0.6)}
      {leaf(132, 21, 4.4, 1.6, 30, 0.6)}
      {leaf(83, 14, 3.6, 1.5, -8, 0.7)}
      {/* little buds */}
      <circle cx="20" cy="18" r="1.4" opacity="0.7" />
      <circle cx="140" cy="18" r="1.4" opacity="0.7" />
      <circle cx="84" cy="8" r="1.3" opacity="0.7" />
      {/* central orchid blossoms */}
      {orchid(72, 31, 0.62)}
      {orchid(88, 31, 0.78)}
    </svg>
  );
}

/* Icono de calendario de trazo fino, para el botón "Agendar el evento".
   Reemplaza al emoji 📅 (que renderiza distinto en cada dispositivo y rompe la
   elegancia). Hereda el color con `currentColor`. */
export function CalIcon({ className = '', size = 15 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18" />
      <path d="M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

/* Placeholder con carácter para cuando falta una foto.
   En vez de un círculo/arco gris plano, muestra la inicial (o las iniciales de la
   pareja, "L & I") en script sobre un tinte suave y un aro fino opcional. Se ve
   intencional, no vacío. Pasa `second` para el monograma de pareja (portadas). */
export function Monogram({ name, second, bg, fg, ring }: { name?: string; second?: string; bg: string; fg: string; ring?: string }) {
  const a = (name?.trim()?.[0] ?? '·').toUpperCase();
  const b = second?.trim()?.[0]?.toUpperCase();
  return (
    <div className="relative flex h-full w-full items-center justify-center" style={{ background: bg }}>
      {ring && <span className="pointer-events-none absolute inset-[10%] rounded-full" style={{ border: `1px solid ${ring}` }} />}
      <span style={{ fontFamily: "'Great Vibes', cursive", fontSize: `clamp(38px,${b ? 9 : 12}vw,64px)`, lineHeight: 1, color: fg }}>
        {b ? `${a} & ${b}` : a}
      </span>
    </div>
  );
}
