'use client';

// Renderiza un documento por bloques (`PageLayout`). Se usa igual en la
// invitación real (/i/[slug]), en /muestra y en el preview del editor (modo
// `editor` con selección, arrastre y redimensión de bloques). Cada bloque:
//   envoltorio de transform libre (x/y/ancho/giro) -> ScrollReveal (animación)
//   -> <section> con su BlockStyle -> componente del bloque.

import React, { useEffect, useRef, useState } from 'react';
import type {
  Block, BlockLayout, BlockViewportLayout, PageLayout, TemplateTheme,
  PageMotion, TemplateDecor, TemplateTokens,
} from '@/lib/types';
import PageDecor from './decorations';
import { BLOCKS } from './blocks/registry';
import { BlockThemeProvider, resolveBlockTheme, useBlockTheme } from './blocks/theme';
import { BlockEditProvider, BlockDataProvider } from './blocks/editable';
import MusicPlayer from './MusicPlayer';
import { ENKARTA_WA_URL } from './shared';
import { PageMotionProvider, ScrollReveal } from '@/lib/scroll-motion';

interface Props {
  layout: PageLayout;
  theme?: TemplateTheme;
  /** Paleta noche opcional: si existe, se muestra un toggle sol/luna. */
  nightTheme?: TemplateTheme;
  /** Arrancar en modo noche. */
  nightDefault?: boolean;
  motion?: PageMotion;
  /** Decoración de página (orquídeas esquinas, hojas, plumas) editable desde el panel. */
  decor?: TemplateDecor;
  /** Tokens visuales del modelo para mantener consistencia al editar. */
  tokens?: TemplateTokens;
  /** Música de fondo (URL); muestra reproductor flotante en modo lectura. */
  musicUrl?: string;
  /** slug de la invitación (para el formulario de confirmación RSVP). */
  slug?: string;
  /** Hay portada ("sobre"): no animar hasta que el invitado entre. */
  gated?: boolean;
  // ── Modo editor ──
  editor?: boolean;
  selectedId?: string;
  onSelectBlock?: (id: string) => void;
  onTransform?: (id: string, patch: Partial<BlockLayout>) => void;
  onEditProp?: (id: string, key: string, value: string) => void;
  /** Escala del preview (para convertir el arrastre a px reales). */
  previewScale?: number;
  /** Contenedor de scroll para detectar la entrada en pantalla (preview). */
  scrollRoot?: React.RefObject<HTMLElement>;
  /** Fuerza la resolución responsive al modo indicado (preview). */
  viewportMode?: 'mobile' | 'desktop';
}

function freeStyle(L?: BlockViewportLayout): React.CSSProperties {
  if (!L) return {};
  const tf: string[] = [];
  if (L.x || L.y) tf.push(`translate(${L.x || 0}px, ${L.y || 0}px)`);
  if (L.rotate) tf.push(`rotate(${L.rotate}deg)`);
  return {
    transform: tf.length ? tf.join(' ') : undefined,
    width: L.w ? `${L.w}px` : undefined,
    marginLeft: L.w ? 'auto' : undefined,
    marginRight: L.w ? 'auto' : undefined,
    position: 'relative',
  };
}

/** ¿Es un elemento flotante (sticker)? Se renderiza en la capa absoluta. */
function isFloating(b: Block) {
  return b.type === 'element';
}

/**
 * Ancho de referencia de la columna de contenido. Los elementos flotantes se
 * anclan a esta columna (centrada) y su ancho se expresa como % de ella, así la
 * proporción es la misma en móvil y escritorio.
 */
const FLOAT_COL = 760;

function anchorStyle(L?: BlockViewportLayout): React.CSSProperties {
  const a = L?.anchor ?? 'tc';
  const v = a[0];
  const h = a[1];
  const x = L?.x || 0;
  const y = L?.y || 0;
  const rot = L?.rotate || 0;
  const w = L?.w ?? 160;
  const style: React.CSSProperties = {
    position: 'absolute',
    width: `${((w / FLOAT_COL) * 100).toFixed(2)}%`,
    zIndex: L?.z ?? 50,
  };
  if (v === 't') style.top = 0;
  else if (v === 'b') style.bottom = 0;
  else style.top = '50%';
  if (h === 'l') style.left = 0;
  else if (h === 'r') style.right = 0;
  else style.left = '50%';
  const tf: string[] = [];
  if (h === 'c') tf.push('translateX(-50%)');
  if (v === 'm') tf.push('translateY(-50%)');
  if (x || y) tf.push(`translate(${x}px, ${y}px)`);
  if (rot) tf.push(`rotate(${rot}deg)`);
  if (tf.length) style.transform = tf.join(' ');
  return style;
}

function resolvedLayout(layout: BlockLayout | undefined, viewport: 'mobile' | 'desktop'): BlockViewportLayout | undefined {
  if (!layout) return undefined;
  const override = viewport === 'mobile' ? layout.mobile : layout.desktop;
  return {
    x: override?.x ?? layout.x,
    y: override?.y ?? layout.y,
    w: override?.w ?? layout.w,
    rotate: override?.rotate ?? layout.rotate,
    anchor: override?.anchor ?? layout.anchor,
    z: override?.z ?? layout.z,
  };
}

/** Render del componente del bloque sin el envoltorio de sección (para stickers). */
function RawBlock({ block }: { block: Block }) {
  const def = BLOCKS[block.type];
  if (!def) return null;
  const Comp = def.Component;
  return <Comp block={block} />;
}

function hideClass(L?: BlockLayout) {
  if (L?.hideOn === 'mobile') return 'hidden sm:block';
  if (L?.hideOn === 'desktop') return 'sm:hidden';
  return '';
}

/** Elemento flotante en modo lectura: anclado y por encima del contenido. */
function FloatingLiveBlock({ block, layout }: { block: Block; layout?: BlockViewportLayout }) {
  if (block.enabled === false) return null;
  return (
    <div className={hideClass(block.layout)} style={{ ...anchorStyle(layout), pointerEvents: 'none' }}>
      <RawBlock block={block} />
    </div>
  );
}

function BlockView({ block }: { block: Block; tokens?: TemplateTokens }) {
  const t = useBlockTheme();
  const def = BLOCKS[block.type];
  const s = block.style ?? {};
  const isImg = s.bgKind === 'image' && !!s.bgImage;
  const bg =
    s.bgKind === 'solid' ? (s.bg || undefined)
    : s.bgKind === 'gradient' ? `linear-gradient(160deg, ${s.bg || t.bg}, ${t.primary}22)`
    : s.bgKind === 'primary' ? t.primaryDeep
    : undefined;
  const color = s.bgKind === 'primary' ? t.onPrimary : isImg ? (s.text || '#ffffff') : (s.text || undefined);
  const align = s.align ?? 'center';
  const basePad = 44;
  const padTop = s.padTop ?? basePad;
  const padBottom = s.padBottom ?? basePad;
  const maxW = s.maxWidth ?? 680;
  if (!def) return null;
  const Comp = def.Component;

  // La historia fija va a sangre completa y gestiona su propia sección.
  if (block.type === 'story') return <Comp block={block} />;

  const sectionStyle: React.CSSProperties = {
    background: bg,
    color,
    paddingTop: padTop,
    paddingBottom: padBottom,
    textAlign: align,
    position: 'relative',
    ...(isImg ? { backgroundImage: `url(${s.bgImage})`, backgroundSize: 'cover', backgroundPosition: s.bgFocal || 'center' } : {}),
    ...(s.fullHeight
      ? { minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }
      : s.minHeight ? { minHeight: s.minHeight } : {}),
  };

  return (
    <section className="px-6" style={sectionStyle}>
      {isImg && s.overlay ? <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${s.overlay})` }} aria-hidden /> : null}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: maxW || undefined, marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
        <Comp block={block} />
      </div>
    </section>
  );
}

// Bloque en modo lectura: envoltorio de transform libre + animación.
function LiveBlock({ block, layout, tokens }: { block: Block; layout?: BlockViewportLayout; tokens?: TemplateTokens }) {
  if (block.enabled === false) return null;
  // La historia fija NO se envuelve en ScrollReveal ni transform: un ancestro
  // con transform rompería el `position: sticky` del efecto anclado.
  if (block.type === 'story') {
    return (
      <div className={hideClass(block.layout)}>
        <BlockView block={block} tokens={tokens} />
      </div>
    );
  }
  return (
    <div className={hideClass(block.layout)} style={freeStyle(layout)}>
      <ScrollReveal variant={block.animation?.preset} delay={block.animation?.delay ?? 0}>
        <BlockView block={block} tokens={tokens} />
      </ScrollReveal>
    </div>
  );
}

const SNAP = 8;

function EditorBlock({
  block, selected, onSelect, onTransform, onEditProp, scale, floating,
}: {
  block: Block;
  selected: boolean;
  onSelect?: (id: string) => void;
  onTransform?: (id: string, patch: Partial<BlockLayout>) => void;
  onEditProp?: (id: string, key: string, value: string) => void;
  scale: number;
  floating?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; lx: number; ly: number } | null>(null);
  const resize = useRef<{ sx: number; base: number; side: 1 | -1 } | null>(null);
  const rot = useRef<{ cx: number; cy: number; start: number; base: number } | null>(null);
  const [hint, setHint] = useState<{ x: number; y: number; gv: boolean; gh: boolean } | null>(null);
  const L = block.layout ?? {};
  const locked = !!block.locked;

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    e.stopPropagation();
    if (!selected) {
      onSelect?.(block.id);
      return;
    }
    drag.current = { sx: e.clientX, sy: e.clientY, lx: L.x || 0, ly: L.y || 0 };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    let nx = Math.round(drag.current.lx + (e.clientX - drag.current.sx) / scale);
    let ny = Math.round(drag.current.ly + (e.clientY - drag.current.sy) / scale);
    const gv = Math.abs(nx) < SNAP;
    const gh = Math.abs(ny) < SNAP;
    if (gv) nx = 0;
    if (gh) ny = 0;
    setHint({ x: nx, y: ny, gv, gh });
    onTransform?.(block.id, { x: nx, y: ny });
  };

  const onPointerUp = () => {
    drag.current = null;
    setHint(null);
  };

  const makeResizeDown = (side: 1 | -1) => (e: React.PointerEvent) => {
    e.stopPropagation();
    resize.current = { sx: e.clientX, base: L.w || ref.current?.offsetWidth || 320, side };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resize.current) return;
    const dw = ((e.clientX - resize.current.sx) / scale) * resize.current.side;
    onTransform?.(block.id, { w: Math.max(80, Math.round(resize.current.base + dw)) });
  };

  const onResizeUp = () => {
    resize.current = null;
  };

  const onRotDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    rot.current = { cx, cy, start: Math.atan2(e.clientY - cy, e.clientX - cx), base: L.rotate || 0 };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onRotMove = (e: React.PointerEvent) => {
    if (!rot.current) return;
    const a = Math.atan2(e.clientY - rot.current.cy, e.clientX - rot.current.cx);
    let deg = Math.round(rot.current.base + (a - rot.current.start) * 180 / Math.PI);
    if (Math.abs(deg) < 4) deg = 0;
    onTransform?.(block.id, { rotate: deg });
  };

  const onRotUp = () => {
    rot.current = null;
  };

  const handleCls = 'absolute z-30 w-3 h-3 rounded-full bg-white border-2 border-enkarta-gold shadow';
  const Handle = ({ pos, side, cursor }: { pos: string; side: 1 | -1; cursor: string }) => (
    <span
      onPointerDown={makeResizeDown(side)}
      onPointerMove={onResizeMove}
      onPointerUp={onResizeUp}
      className={`${handleCls} ${pos}`}
      style={{ touchAction: 'none', cursor }}
    />
  );

  return (
    <div
      ref={ref}
      data-block-id={block.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={e => e.stopPropagation()}
      className="relative group"
      style={{
        ...(floating ? anchorStyle(L) : freeStyle(L)),
        outline: selected ? '2px solid #b8975a' : '0px solid transparent',
        outlineOffset: -2,
        opacity: block.enabled === false ? 0.4 : 1,
        cursor: locked ? 'default' : selected ? 'move' : 'pointer',
        pointerEvents: locked ? 'none' : 'auto',
        touchAction: 'none',
      }}
    >
      <span className="absolute top-1 left-1 z-20 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-outfit opacity-0 group-hover:opacity-100 pointer-events-none">
        {BLOCKS[block.type]?.label ?? block.type}{locked ? ' 🔒' : ''}
      </span>

      <BlockEditProvider value={{ editing: !locked, onEdit: (k, v) => onEditProp?.(block.id, k, v) }}>
        {floating ? <RawBlock block={block} /> : <BlockView block={block} />}
      </BlockEditProvider>

      {hint?.gv && <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-pink-500/80 z-40" />}
      {hint?.gh && <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-pink-500/80 z-40" />}
      {hint && (
        <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 z-40 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-outfit whitespace-nowrap">
          x: {hint.x} · y: {hint.y}
        </span>
      )}

      {selected && !locked && (
        <>
          <Handle pos="top-0 left-0 -translate-x-1/2 -translate-y-1/2" side={-1} cursor="nwse-resize" />
          <Handle pos="top-0 right-0 translate-x-1/2 -translate-y-1/2" side={1} cursor="nesw-resize" />
          <Handle pos="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" side={-1} cursor="nesw-resize" />
          <Handle pos="bottom-0 right-0 translate-x-1/2 translate-y-1/2" side={1} cursor="nwse-resize" />
          <Handle pos="top-1/2 left-0 -translate-x-1/2 -translate-y-1/2" side={-1} cursor="ew-resize" />
          <Handle pos="top-1/2 right-0 translate-x-1/2 -translate-y-1/2" side={1} cursor="ew-resize" />
          <span
            onPointerDown={onRotDown}
            onPointerMove={onRotMove}
            onPointerUp={onRotUp}
            title="Girar"
            className="absolute z-30 left-1/2 -top-7 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-enkarta-gold shadow flex items-center justify-center text-[9px]"
            style={{ touchAction: 'none', cursor: 'grab' }}
          >
            ↻
          </span>
        </>
      )}
    </div>
  );
}

function FooterBar() {
  const t = useBlockTheme();
  return (
    <footer className="py-8 text-center" style={{ background: t.primaryDeep }}>
      <p className="font-great text-2xl" style={{ color: '#fff' }}>Enkarta</p>
      <p className="font-cormorant text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
        ¿Deseas una invitación para tu evento? <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">Contáctanos</a>
      </p>
    </footer>
  );
}

export default function BlockRenderer({
  layout, theme, nightTheme, nightDefault, motion, decor, tokens, musicUrl, slug, gated, editor, selectedId, onSelectBlock, onTransform, onEditProp, previewScale = 1, scrollRoot, viewportMode,
}: Props) {
  const hasNight = !!nightTheme && Object.keys(nightTheme).length > 0;
  const [night, setNight] = useState(!!nightDefault && hasNight);
  const [viewport, setViewport] = useState<'mobile' | 'desktop'>(viewportMode ?? 'desktop');

  useEffect(() => {
    if (viewportMode) {
      setViewport(viewportMode);
      return;
    }
    const sync = () => setViewport(window.innerWidth < 640 ? 'mobile' : 'desktop');
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [viewportMode]);

  const bt = resolveBlockTheme(night && hasNight ? nightTheme : theme);
  const allBlocks = layout?.blocks ?? [];
  const blocks = allBlocks.filter(b => !isFloating(b));
  const floating = allBlocks.filter(isFloating);

  return (
    <BlockThemeProvider value={bt}>
      <BlockDataProvider value={{ slug }}>
        <PageMotionProvider value={motion} gated={gated} scrollRoot={scrollRoot}>
          <div
            // overflow-x-clip (no -hidden): hidden crearía un scrollport y
            // rompería el position:sticky del bloque "historia fija".
            className="ek-invite relative w-full min-h-screen overflow-x-clip transition-colors duration-500"
            style={{ background: bt.bg, color: bt.text }}
            onClick={editor ? () => onSelectBlock?.('') : undefined}
          >
            <PageDecor decor={decor} color={bt.primary} />
            <div className="relative" style={{ zIndex: 10 }}>
              {blocks.map((b) => {
                const currentLayout = resolvedLayout(b.layout, viewport);
                return editor
                  ? <EditorBlock key={b.id} block={{ ...b, layout: currentLayout ? { ...(b.layout ?? {}), ...currentLayout } : b.layout }} selected={selectedId === b.id} onSelect={onSelectBlock} onTransform={onTransform} onEditProp={onEditProp} scale={previewScale} />
                  : <LiveBlock key={b.id} block={b} layout={currentLayout} tokens={tokens} />;
              })}
              <FooterBar />
            </div>
            {floating.length > 0 && (
              <div className="absolute inset-0" style={{ zIndex: 20, pointerEvents: 'none' }}>
                <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: FLOAT_COL, margin: '0 auto' }}>
                  {floating.map((b) => {
                    const currentLayout = resolvedLayout(b.layout, viewport);
                    return editor
                      ? <EditorBlock key={b.id} block={{ ...b, layout: currentLayout ? { ...(b.layout ?? {}), ...currentLayout } : b.layout }} floating selected={selectedId === b.id} onSelect={onSelectBlock} onTransform={onTransform} onEditProp={onEditProp} scale={previewScale} />
                      : <FloatingLiveBlock key={b.id} block={b} layout={currentLayout} />;
                  })}
                </div>
              </div>
            )}
            {hasNight && !editor && (
              <button
                onClick={() => setNight(n => !n)}
                aria-label={night ? 'Modo día' : 'Modo noche'}
                className="fixed bottom-5 left-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
                style={{ background: bt.primary, color: bt.onPrimary }}
              >
                {night ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="4.5" /><path strokeLinecap="round" d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>
                )}
              </button>
            )}
            {musicUrl && !editor && <MusicPlayer src={musicUrl} color={bt.primary} />}
          </div>
        </PageMotionProvider>
      </BlockDataProvider>
    </BlockThemeProvider>
  );
}
