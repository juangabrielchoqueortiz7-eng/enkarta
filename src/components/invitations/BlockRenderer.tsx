'use client';

// Renderiza un documento por bloques (`PageLayout`). Se usa igual en la
// invitación real (/i/[slug]), en /muestra y en el preview del editor (modo
// `editor` con selección, arrastre y redimensión de bloques). Cada bloque:
//   envoltorio de transform libre (x/y/ancho/giro) -> ScrollReveal (animación)
//   -> <section> con su BlockStyle -> componente del bloque.

import React, { useEffect, useRef, useState } from 'react';
import type {
  Block, BlockLayout, BlockViewportLayout, PageLayout, TemplateTheme,
  PageMotion, TemplateDecor, TemplateTokens, SeamShape, Guest,
} from '@/lib/types';
import PageDecor from './decorations';
import { BLOCKS } from './blocks/registry';
import { BlockDesignProvider, BlockThemeProvider, resolveBlockTheme, useBlockTheme } from './blocks/theme';
import { resolveInvitationVisualSystem } from './blocks/visual-system';
import { useBlockTypography } from './blocks/typography';
import { hasInvitationVisualSystem, MARFIL_SPACE, resolveInvitationTypography } from '@/lib/marfil-visual-system';
import { isEmptyOptionalBlock } from '@/lib/collection-design';
import { SeamFx, type SeamFxKind } from './seam-fx';
import { BlockEditProvider, BlockDataProvider } from './blocks/editable';
import MusicPlayer from './MusicPlayer';
import { ENKARTA_WA_URL } from './shared';
import type { BlockTheme } from './blocks/theme';
import { PageMotionProvider, ScrollExperience, ScrollReveal, usePageMotion } from '@/lib/scroll-motion';

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
  /** Las muestras simulan RSVP sin hacer escrituras en el servidor. */
  demo?: boolean;
  /** Read-only catalogue crop: no footer or audio. */
  previewOnly?: boolean;
  /** Invitado activo para bloques privados, QR y estados personalizados. */
  guest?: Guest;
  /** Hay portada ("sobre"): no animar hasta que el invitado entre. */
  gated?: boolean;
  // ── Modo editor ──
  editor?: boolean;
  selectedId?: string;
  selectedIds?: string[];
  onSelectBlock?: (id: string, additive?: boolean) => void;
  onTransform?: (id: string, patch: Partial<BlockLayout>) => void;
  onEditProp?: (id: string, key: string, value: string) => void;
  onPatchBlock?: (id: string, patch: Partial<Block>) => void;
  onDuplicateBlock?: (id: string) => void;
  onDeleteBlock?: (id: string) => void;
  onCopyBlockStyle?: (id: string) => void;
  onPasteBlockStyle?: (id: string) => void;
  hasStyleClipboard?: boolean;
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
    zIndex: L.z,
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
  const mode = override?.mode ?? (override && Object.keys(override).some(key => ['x', 'y', 'w', 'rotate', 'anchor', 'z'].includes(key)) ? 'custom' : 'inherit');
  const geometry = mode === 'auto'
    ? { x: 0, y: 0, w: undefined, rotate: 0, anchor: layout.anchor, z: layout.z }
    : mode === 'inherit'
      ? { x: layout.x, y: layout.y, w: layout.w, rotate: layout.rotate, anchor: layout.anchor, z: layout.z }
      : {
          x: override?.x ?? layout.x,
          y: override?.y ?? layout.y,
          w: override?.w ?? layout.w,
          rotate: override?.rotate ?? layout.rotate,
          anchor: override?.anchor ?? layout.anchor,
          z: override?.z ?? layout.z,
        };
  return {
    ...geometry,
    mode,
    hidden: override?.hidden ?? (layout.hideOn === viewport),
    order: override?.order,
    fontScale: override?.fontScale,
  };
}

function responsiveBlock(block: Block, layout?: BlockViewportLayout): Block {
  if (typeof layout?.fontScale !== 'number' || layout.fontScale === 1) return block;
  return { ...block, props: { ...block.props, __responsiveFontScale: layout.fontScale } };
}

/** Render del componente del bloque sin el envoltorio de sección (para stickers). */
function RawBlock({ block }: { block: Block }) {
  const def = BLOCKS[block.type];
  if (!def) return null;
  const Comp = def.Component;
  return <Comp block={block} />;
}

// ── Costuras entre bloques ────────────────────────────────────────────────────
// La forma la fija el token de la plantilla de la que partió la invitación
// (`tokens.seam`), no un control por bloque: en el constructor el cliente elige
// colores libremente y no hay "personalidad" de la que deducir la forma, así que
// se hereda la de su plantilla y el documento sale coherente sin que él decida
// nada. Ver TEMPLATE_TOKEN_DEFAULTS en src/lib/template-themes.ts.

/** Datos que necesita una sección para dibujar su costura superior. */
type SeamInfo = { from: string; shape: SeamShape; hairline: string; fx?: SeamFxKind };

/**
 * Color de fondo SÓLIDO de un bloque, o `null` si no se puede nombrar uno
 * (degradado, imagen de fondo, historia a sangre). La costura solo se dibuja
 * cuando el bloque ANTERIOR tiene un color sólido: pintar el arranque de un
 * degradado como si fuera plano se nota, y es peor que no poner costura.
 */
/**
 * Banda "suave": un velo de `primary` sobre el papel. Se calcula al pintar en vez
 * de guardar un hex, así que la banda sigue la paleta cuando el cliente cambia
 * los colores. Va opaca (no rgba) para que la costura pueda nombrar el color.
 */
function softBand(t: BlockTheme): string {
  return `color-mix(in srgb, ${t.primary} 9%, ${t.bg})`;
}

/**
 * Tema invertido para las secciones oscuras (banda `primary` o imagen a sangre).
 * Sin esto, los bloques que pintan sus propios colores desde el tema —el
 * itinerario tira de `primary` para las horas y de `muted` para los nombres—
 * salen en tinta oscura sobre fondo oscuro y no se leen. El fallo solo aparece
 * cuando hay bandas de color, o sea desde que existen las recetas de arranque.
 */
function invertedTheme(t: BlockTheme, ink: string): BlockTheme {
  return {
    ...t,
    primary: ink,
    text: ink,
    muted: `color-mix(in srgb, ${ink} 72%, transparent)`,
    line: `color-mix(in srgb, ${ink} 28%, transparent)`,
    onPrimary: t.primaryDeep,
  };
}

/** Luminancia relativa aproximada de un color hex o rgb(). -1 si no se puede leer. */
function lum(c: string): number {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  let r: number, g: number, b: number;
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map(x => x + x).join('') : hex[1];
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  } else {
    const m = /rgba?\(([^)]+)\)/i.exec(c);
    if (!m) return -1;
    const p = m[1].split(',').map(v => parseFloat(v));
    [r, g, b] = p;
    if ([r, g, b].some(v => Number.isNaN(v))) return -1;
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Tinta legible sobre una banda de color.
 *
 * `bgKind:'primary'` pinta el fondo con `primaryDeep` pero el tipo de tema trae
 * `onPrimary` pensado para el color `primary` (en Obsidiana, tinta oscura sobre
 * dorado). Al usar `onPrimary` sobre `primaryDeep` salía casi negro sobre oliva
 * oscuro. Aquí se elige entre los candidatos del propio tema el que de verdad
 * contrasta, así que sigue siendo la paleta del cliente y no un blanco impuesto.
 */
function readableInk(band: string, t: BlockTheme): string {
  const L = lum(band);
  if (L < 0) return t.onPrimary;
  const wantLight = L < 0.5;
  const candidates = wantLight ? [t.onPrimary, t.bg, '#ffffff'] : [t.text, t.primaryDeep, '#111111'];
  // En orden: se respeta el color DISEÑADO en cuanto separa lo suficiente. Coger
  // siempre el de más contraste pisaría la paleta del cliente sin necesidad.
  let best = candidates[0];
  let bestGap = -1;
  for (const c of candidates) {
    const cl = lum(c);
    if (cl < 0) continue;
    const gap = Math.abs(cl - L);
    if (gap >= 0.35) return c;
    if (gap > bestGap) { bestGap = gap; best = c; }
  }
  void best;
  return wantLight ? '#ffffff' : '#111111';
}

function blockBg(b: Block, t: BlockTheme): string | null {
  if (b.type === 'story' || b.type === 'cinematicHero' || b.type === 'passportHero' || b.type === 'passportTicket') return null;
  const s = b.style ?? {};
  if (s.bgKind === 'solid') return s.bg || null;
  if (s.bgKind === 'soft') return softBand(t);
  if (s.bgKind === 'primary') return t.primaryDeep;
  if (!s.bgKind || s.bgKind === 'none') return t.bg; // transparente = fondo de página
  return null; // gradient | image
}

/** Elemento flotante en modo lectura: anclado y por encima del contenido. */
function FloatingLiveBlock({ block, layout }: { block: Block; layout?: BlockViewportLayout }) {
  if (block.enabled === false || layout?.hidden) return null;
  return (
    <div style={{ ...anchorStyle(layout), pointerEvents: 'none' }}>
      <RawBlock block={block} />
    </div>
  );
}

function BlockView({ block, seam, tokens }: { block: Block; tokens?: TemplateTokens; seam?: SeamInfo }) {
  const t = useBlockTheme();
  const visual = resolveInvitationVisualSystem(t, tokens);
  const m = usePageMotion();
  const def = BLOCKS[block.type];
  const s = block.style ?? {};
  const isImg = s.bgKind === 'image' && !!s.bgImage;
  const bg =
    s.bgKind === 'solid' ? (s.bg || undefined)
    : s.bgKind === 'soft' ? softBand(t)
    : s.bgKind === 'gradient' ? `linear-gradient(160deg, ${s.bg || t.bg}, ${t.primary}22)`
    : s.bgKind === 'primary' ? t.primaryDeep
    : undefined;
  const color = s.bgKind === 'primary' ? readableInk(t.primaryDeep, t) : isImg ? (s.text || '#ffffff') : (s.text || undefined);
  const isDark = s.bgKind === 'primary' || isImg;
  const align = s.align ?? 'center';
  const spacingScale = Math.max(0.75, Math.min(1.35, tokens?.spacingScale ?? 1));
  const rawBasePad = tokens?.spacing === 'compact' ? 34 : tokens?.spacing === 'airy' ? (hasInvitationVisualSystem(tokens) ? MARFIL_SPACE.section : 68) : 48;
  const basePad = Math.round(rawBasePad * spacingScale);
  const padTop = s.padTop ?? basePad;
  const padBottom = s.padBottom ?? basePad;
  const maxW = s.maxWidth ?? tokens?.contentWidth ?? 680;
  const sectionInset = s.padX ?? Math.round((tokens?.sectionInset ?? 24) * spacingScale);
  const sectionRadius = tokens?.sectionRadius ?? 0;
  const inheritedSurface = tokens?.surface ?? 'flat';
  const surface = !s.surface || s.surface === 'inherit' ? inheritedSurface : s.surface;
  const radius = s.radius ?? (surface === 'flat' ? 0 : sectionRadius);
  const contentPadding = s.contentPadding;
  const verticalAlign = s.verticalAlign ?? (s.fullHeight ? 'center' : undefined);
  const justifyContent = verticalAlign === 'start' ? 'flex-start' : verticalAlign === 'end' ? 'flex-end' : 'center';
  const inheritedShadow = tokens?.shadow ?? (surface === 'card' || surface === 'glass' ? 'soft' : 'none');
  const shadowPreset = s.shadow ?? inheritedShadow;
  const shadow = shadowPreset === 'none' ? undefined
    : shadowPreset === 'soft' ? '0 10px 30px rgba(37,29,19,0.08)'
    : shadowPreset === 'medium' ? '0 18px 55px rgba(37,29,19,0.14)'
    : shadowPreset === 'strong' ? '0 26px 75px rgba(26,20,14,0.24)'
    : shadowPreset === 'glow' ? `0 0 42px color-mix(in srgb, ${t.primary} 34%, transparent)`
    : undefined;
  const responsivePadTop = typeof s.padTop === 'number' ? padTop : `clamp(${Math.round(basePad * 0.78)}px, 9vw, ${basePad}px)`;
  const responsivePadBottom = typeof s.padBottom === 'number' ? padBottom : `clamp(${Math.round(basePad * 0.78)}px, 9vw, ${basePad}px)`;
  const responsiveInset = sectionInset > 0 ? `clamp(${Math.min(hasInvitationVisualSystem(tokens) ? 20 : 16, sectionInset)}px, 5vw, ${sectionInset}px)` : 0;
  if (!def) return null;
  const Comp = def.Component;

  // Las escenas inmersivas van a sangre completa y gestionan su propia sección.
  if (block.type === 'story' || block.type === 'cinematicHero' || block.type === 'passportHero' || block.type === 'passportTicket') return <Comp block={block} />;

  const sectionStyle: React.CSSProperties = {
    background: bg,
    color,
    paddingTop: responsivePadTop,
    paddingBottom: responsivePadBottom,
    paddingLeft: responsiveInset,
    paddingRight: responsiveInset,
    textAlign: align,
    position: 'relative',
    scrollSnapAlign: m.scrollFlow === 'free' ? undefined : (s.fullHeight ? 'start' : 'center'),
    scrollSnapStop: m.scrollFlow === 'cinematic' && s.fullHeight ? 'always' : undefined,
    ...(isImg ? { backgroundImage: `url(${s.bgImage})`, backgroundSize: 'cover', backgroundPosition: s.bgFocal || 'center' } : {}),
    ...(s.fullHeight ? { minHeight: '100svh' } : s.minHeight ? { minHeight: s.minHeight } : {}),
    ...(verticalAlign ? { display: 'flex', flexDirection: 'column', justifyContent } : {}),
  };
  const contentStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    maxWidth: maxW || undefined,
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '100%',
    borderRadius: radius || undefined,
    padding: typeof contentPadding === 'number' ? contentPadding : surface === 'card' || surface === 'glass' ? `clamp(${Math.round(20 * spacingScale)}px, ${Math.round(4 * spacingScale * 100) / 100}vw, ${Math.round(42 * spacingScale)}px)` : surface === 'soft' ? `clamp(${Math.round(6 * spacingScale)}px, ${Math.round(1.5 * spacingScale * 100) / 100}vw, ${Math.round(14 * spacingScale)}px)` : undefined,
    background: surface === 'card'
      ? (isImg ? 'rgba(12,10,8,0.28)' : isDark ? 'rgba(255,255,255,0.055)' : `color-mix(in srgb, ${t.surface} 78%, transparent)`)
      : surface === 'glass'
        ? (isDark || isImg ? 'rgba(255,255,255,0.1)' : `color-mix(in srgb, ${t.surface} 62%, transparent)`)
      : surface === 'soft' && !isImg
        ? `linear-gradient(145deg, color-mix(in srgb, ${t.primary} 5%, transparent), transparent 68%)`
        : undefined,
    border: typeof s.borderWidth === 'number'
      ? (s.borderWidth > 0 ? `${s.borderWidth}px solid ${s.borderColor || t.line}` : undefined)
      : surface === 'card' || surface === 'glass' ? visual.border : undefined,
    boxShadow: shadow,
    opacity: s.contentOpacity,
    backdropFilter: surface === 'glass' ? 'blur(18px)' : surface === 'card' ? 'blur(10px)' : undefined,
    WebkitBackdropFilter: surface === 'glass' ? 'blur(18px)' : surface === 'card' ? 'blur(10px)' : undefined,
  };

  // La costura vive dentro del espacio superior del bloque, así que solo cabe
  // si ese espacio da de sí. Con el `padTop` por defecto (44) salen 36px, el
  // mismo alto que usan las plantillas en móvil.
  const seamH = seam && padTop >= 28 ? Math.min(padTop - 8, 64) : 0;

  return (
    <section data-ek-section={block.id} data-ek-block-type={block.type} style={sectionStyle}>
      {isImg && s.overlay ? <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${s.overlay})` }} aria-hidden /> : null}
      {/* zIndex 1 (y no el z-[2] por defecto de Seam): así queda por encima del
          velo de la imagen de fondo pero nunca por delante del contenido. */}
      {seamH > 0 && seam && (
        <SeamFx fx={seam.fx} from={seam.from} shape={seam.shape} hairline={seam.hairline} height={seamH} style={{ zIndex: 1 }} />
      )}
      <div style={contentStyle}>
        {isDark
          ? <BlockThemeProvider value={invertedTheme(t, color || t.onPrimary)}><Comp block={block} /></BlockThemeProvider>
          : <Comp block={block} />}
      </div>
    </section>
  );
}

// Bloque en modo lectura: envoltorio de transform libre + animación.
function LiveBlock({ block, layout, tokens, seam }: { block: Block; layout?: BlockViewportLayout; tokens?: TemplateTokens; seam?: SeamInfo }) {
  const m = usePageMotion();
  if (block.enabled === false || layout?.hidden) return null;
  // Las escenas inmersivas NO se envuelven en ScrollReveal ni transform: un
  // ancestro transformado rompería sticky/parallax y reduciría la portada.
  if (block.type === 'story' || block.type === 'cinematicHero' || block.type === 'passportHero' || block.type === 'passportTicket') {
    return (
      <div style={{ scrollSnapAlign: m.scrollFlow === 'free' ? undefined : 'start', scrollSnapStop: m.scrollFlow === 'cinematic' ? 'always' : undefined }}>
        <BlockView block={block} tokens={tokens} />
      </div>
    );
  }
  return (
    <div style={freeStyle(layout)}>
      <ScrollReveal
        variant={block.animation?.preset}
        delay={block.animation?.delay ?? 0}
        duration={block.animation?.duration}
        repeat={block.animation?.repeat}
      >
        <BlockView block={block} tokens={tokens} seam={seam} />
      </ScrollReveal>
    </div>
  );
}

const SNAP = 8;
const GRID = 8;
const COMMON_WIDTHS = [160, 240, 320, 390, 480, 560, 680, 760, 900];

function EditorBlock({
  block, selected, primary, onSelect, onTransform, onEditProp, onPatchBlock, onDuplicateBlock, onDeleteBlock, onCopyBlockStyle, onPasteBlockStyle, hasStyleClipboard, scale, floating, seam, tokens,
}: {
  block: Block;
  selected: boolean;
  primary: boolean;
  onSelect?: (id: string, additive?: boolean) => void;
  onTransform?: (id: string, patch: Partial<BlockLayout>) => void;
  onEditProp?: (id: string, key: string, value: string) => void;
  onPatchBlock?: (id: string, patch: Partial<Block>) => void;
  onDuplicateBlock?: (id: string) => void;
  onDeleteBlock?: (id: string) => void;
  onCopyBlockStyle?: (id: string) => void;
  onPasteBlockStyle?: (id: string) => void;
  hasStyleClipboard?: boolean;
  scale: number;
  floating?: boolean;
  seam?: SeamInfo;
  tokens?: TemplateTokens;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; lx: number; ly: number } | null>(null);
  const resize = useRef<{ sx: number; base: number; side: 1 | -1 } | null>(null);
  const rot = useRef<{ cx: number; cy: number; start: number; base: number } | null>(null);
  const [hint, setHint] = useState<{ x: number; y: number; gv: boolean; gh: boolean; grid: boolean } | null>(null);
  const [sizeHint, setSizeHint] = useState<{ width: number; preset: boolean } | null>(null);
  const L = (block.layout ?? {}) as BlockLayout & BlockViewportLayout;
  const locked = !!block.locked;

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    e.stopPropagation();
    if (!selected || e.shiftKey) {
      onSelect?.(block.id, e.shiftKey);
      return;
    }
    if (!primary) onSelect?.(block.id);
    (e.currentTarget as HTMLElement).focus({ preventScroll: true });
    drag.current = { sx: e.clientX, sy: e.clientY, lx: L.x || 0, ly: L.y || 0 };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const rawX = drag.current.lx + (e.clientX - drag.current.sx) / scale;
    const rawY = drag.current.ly + (e.clientY - drag.current.sy) / scale;
    let nx = e.altKey ? Math.round(rawX) : Math.round(rawX / GRID) * GRID;
    let ny = e.altKey ? Math.round(rawY) : Math.round(rawY / GRID) * GRID;
    const gv = Math.abs(rawX) < SNAP;
    const gh = Math.abs(rawY) < SNAP;
    if (gv) nx = 0;
    if (gh) ny = 0;
    setHint({ x: nx, y: ny, gv, gh, grid: !e.altKey });
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
    const rawWidth = Math.max(80, resize.current.base + dw);
    let width = e.altKey ? Math.round(rawWidth) : Math.round(rawWidth / GRID) * GRID;
    let preset = false;
    if (!e.altKey) {
      const nearest = COMMON_WIDTHS.reduce((best, value) => Math.abs(value - rawWidth) < Math.abs(best - rawWidth) ? value : best, COMMON_WIDTHS[0]);
      if (Math.abs(nearest - rawWidth) <= 12) { width = nearest; preset = true; }
    }
    setSizeHint({ width, preset });
    onTransform?.(block.id, { w: width });
  };

  const onResizeUp = () => {
    resize.current = null;
    setSizeHint(null);
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
    const rawDeg = rot.current.base + (a - rot.current.start) * 180 / Math.PI;
    let deg = e.altKey ? Math.round(rawDeg) : Math.round(rawDeg / 15) * 15;
    if (Math.abs(deg) < 4) deg = 0;
    onTransform?.(block.id, { rotate: deg });
  };

  const onRotUp = () => {
    rot.current = null;
  };

  const handleCls = 'absolute z-30 w-3 h-3 rounded-full bg-white border-2 border-enkarta-gold shadow';
  const textBlock = ['cover', 'heading', 'text', 'quote', 'hashtag'].includes(block.type);
  const toolbarBtn = 'flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-outfit text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-30';

  const nudge = (e: React.KeyboardEvent) => {
    if (!selected || locked || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const step = e.shiftKey ? GRID : 1;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    onTransform?.(block.id, { x: (L.x || 0) + dx, y: (L.y || 0) + dy });
  };
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
      tabIndex={selected && !locked ? 0 : -1}
      onKeyDown={nudge}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={e => e.stopPropagation()}
      className="relative group"
      style={{
        ...(floating ? anchorStyle(L) : freeStyle(L)),
        outline: selected ? (primary ? '2px solid #b8975a' : '2px dashed #7c6ad6') : '0px solid transparent',
        outlineOffset: -2,
        opacity: block.enabled === false ? 0.4 : L.hidden ? 0.28 : 1,
        cursor: locked ? 'default' : selected && primary ? 'move' : 'pointer',
        pointerEvents: locked ? 'none' : 'auto',
        touchAction: 'none',
      }}
    >
      <span className="absolute top-1 left-1 z-20 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-outfit opacity-0 group-hover:opacity-100 pointer-events-none">
        {BLOCKS[block.type]?.label ?? block.type}{locked ? ' 🔒' : ''}
      </span>

      {selected && primary && !locked && (
        <div
          role="toolbar"
          aria-label="Edición rápida del bloque"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          className="absolute left-1/2 top-3 z-[70] flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-xl border border-black/10 bg-white/95 p-1 shadow-[0_10px_30px_rgba(25,20,14,0.22)] backdrop-blur-md"
          style={{ cursor: 'default', touchAction: 'auto' }}
        >
          {textBlock && (
            <>
              <button type="button" title="Negrita" aria-label="Negrita" onClick={() => onPatchBlock?.(block.id, { props: { ...block.props, weight: block.props.weight === '700' ? '' : '700' } })} className={`${toolbarBtn} font-bold ${block.props.weight === '700' ? 'bg-enkarta-gold/15 text-enkarta-gold' : ''}`}>B</button>
              {(['left', 'center', 'right'] as const).map(align => (
                <button key={align} type="button" title={`Alinear ${align === 'left' ? 'a la izquierda' : align === 'center' ? 'al centro' : 'a la derecha'}`} aria-label={`Alinear ${align}`} onClick={() => onPatchBlock?.(block.id, { style: { align } })} className={`${toolbarBtn} ${(block.style?.align ?? 'center') === align ? 'bg-enkarta-gold/15 text-enkarta-gold' : ''}`}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden><path d={align === 'left' ? 'M2 3h12M2 6.5h8M2 10h12M2 13.5h7' : align === 'right' ? 'M2 3h12M6 6.5h8M2 10h12M7 13.5h7' : 'M2 3h12M4 6.5h8M2 10h12M4.5 13.5h7'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              ))}
              <label title="Color del texto" aria-label="Color del texto" className={`${toolbarBtn} relative cursor-pointer`}>
                <span className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: (block.props.textColor as string) || block.style?.text || '#3a342b' }} />
                <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={(block.props.textColor as string) || block.style?.text || '#3a342b'} onChange={e => onPatchBlock?.(block.id, { props: { ...block.props, textColor: e.target.value } })} />
              </label>
              <span className="mx-0.5 h-5 w-px bg-gray-200" />
            </>
          )}
          <button type="button" title="Copiar estilo (Ctrl+Shift+C)" aria-label="Copiar estilo" onClick={() => onCopyBlockStyle?.(block.id)} className={toolbarBtn}>◩</button>
          <button type="button" title="Pegar estilo (Ctrl+Shift+V)" aria-label="Pegar estilo" disabled={!hasStyleClipboard} onClick={() => onPasteBlockStyle?.(block.id)} className={toolbarBtn}>◪</button>
          <span className="mx-0.5 h-5 w-px bg-gray-200" />
          <button type="button" title="Duplicar bloque" aria-label="Duplicar bloque" onClick={() => onDuplicateBlock?.(block.id)} className={toolbarBtn}>⧉</button>
          <button type="button" title="Eliminar bloque (puedes deshacer)" aria-label="Eliminar bloque" onClick={() => onDeleteBlock?.(block.id)} className={`${toolbarBtn} hover:bg-red-50 hover:text-red-600`}>✕</button>
        </div>
      )}

      <BlockEditProvider value={{ editing: !locked, onEdit: (k, v) => onEditProp?.(block.id, k, v) }}>
        {floating ? <RawBlock block={block} /> : <BlockView block={block} seam={seam} tokens={tokens} />}
      </BlockEditProvider>

      {hint?.gv && <span className="pointer-events-none absolute -bottom-[100vh] -top-[100vh] left-1/2 z-40 w-px bg-pink-500/80" />}
      {hint?.gh && <span className="pointer-events-none absolute -left-[100vw] -right-[100vw] top-1/2 z-40 h-px bg-pink-500/80" />}
      {hint && (
        <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 z-40 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-outfit whitespace-nowrap">
          x: {hint.x} · y: {hint.y}{hint.grid ? ' · cuadrícula 8' : ' · libre'}
        </span>
      )}
      {sizeHint && (
        <span className="pointer-events-none absolute -bottom-6 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-2 py-0.5 text-[10px] font-outfit text-white">
          {sizeHint.width}px{sizeHint.preset ? ' · ancho sugerido' : ''}
        </span>
      )}

      {selected && primary && !locked && (
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

function FooterBar({ seam }: { seam?: SeamInfo }) {
  const t = useBlockTheme();
  const type = useBlockTypography();
  const noteType = type('note');
  return (
    <footer className="relative pb-8 pt-14 text-center" style={{ background: t.primaryDeep }}>
      {seam && <SeamFx fx={seam.fx} from={seam.from} shape={seam.shape} hairline={seam.hairline} height={44} />}
      <p className="font-great text-2xl" style={{ color: '#fff' }}>Enkarta</p>
      <p className="font-cormorant text-sm mt-1" style={{ color: noteType.fontFamily ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.6)', ...noteType, paddingInline: noteType.fontFamily ? 24 : undefined }}>
        ¿Deseas una invitación para tu evento? <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">Contáctanos</a>
      </p>
    </footer>
  );
}

export default function BlockRenderer({
  layout, theme, nightTheme, nightDefault, motion, decor, tokens, musicUrl, slug, guest, demo, previewOnly, gated, editor, selectedId, selectedIds, onSelectBlock, onTransform, onEditProp, onPatchBlock, onDuplicateBlock, onDeleteBlock, onCopyBlockStyle, onPasteBlockStyle, hasStyleClipboard, previewScale = 1, scrollRoot, viewportMode,
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
  const isMarfil = hasInvitationVisualSystem(tokens);
  const visual = resolveInvitationVisualSystem(bt, tokens);
  const isPassport = layout?.basePreset === 'passport' || layout?.presetKey === 'passport';
  const allBlocks = layout?.blocks ?? [];
  // Los bloques apagados no pintan nada en lectura: fuera también de la cadena
  // de costuras, o el color "anterior" sería el de una sección invisible.
  const byViewportOrder = (a: { block: Block; index: number }, b: { block: Block; index: number }) => {
    const aOrder = resolvedLayout(a.block.layout, viewport)?.order ?? a.index;
    const bOrder = resolvedLayout(b.block.layout, viewport)?.order ?? b.index;
    return aOrder - bOrder || a.index - b.index;
  };
  const indexed = allBlocks.map((block, index) => ({ block, index }));
  const blocks = indexed.filter(item => !isFloating(item.block) && (editor || (item.block.enabled !== false && (!isMarfil || !isEmptyOptionalBlock(item.block))))).sort(byViewportOrder).map(item => item.block);
  const floating = indexed.filter(item => isFloating(item.block)).sort(byViewportOrder).map(item => item.block);

  // ── Cadena de costuras ──
  // Fondo resuelto de cada bloque en orden de pintado; 'hidden' = oculto en
  // este viewport (se salta al buscar hacia atrás), null = color no nombrable.
  const seamShape = tokens?.seam ?? 'none';
  const seamFx = tokens?.seamFx ?? 'none';
  const chain = blocks.map(b => (resolvedLayout(b.layout, viewport)?.hidden ? 'hidden' as const : blockBg(b, bt)));
  const prevBg = (i: number): string | null => {
    for (let j = i - 1; j >= 0; j--) {
      if (chain[j] === 'hidden') continue;
      return chain[j] as string | null;
    }
    return null;
  };
  const seamAt = (i: number): SeamInfo | undefined => {
    if (seamShape === 'none') return undefined;
    const from = prevBg(i);
    // Sin color anterior, o mismo color: no hay salto que coser.
    if (!from || from === chain[i]) return undefined;
    return { from, shape: seamShape, hairline: bt.primary, fx: seamFx };
  };
  // El pie cose contra el último bloque visible (su fondo es `primaryDeep`).
  const lastBg = prevBg(blocks.length);
  const footerSeam: SeamInfo | undefined =
    seamShape !== 'none' && lastBg && lastBg !== bt.primaryDeep
      ? { from: lastBg, shape: seamShape, hairline: bt.primary, fx: seamFx }
      : undefined;
  const typeScale = tokens?.typeScale ?? {};
  const kitCssVars = {
    '--ek-type-title': typeScale.title ?? 1,
    '--ek-type-subtitle': typeScale.subtitle ?? 1,
    '--ek-type-body': typeScale.body ?? 1,
    '--ek-type-label': typeScale.label ?? 1,
    '--ek-radius-card': `${visual.cardRadius}px`,
    '--ek-radius-field': `${visual.fieldRadius}px`,
    '--ek-radius-button': `${visual.buttonRadius}px`,
    '--ek-radius-media': `${visual.mediaRadius}px`,
    '--ek-content-width': `${tokens?.contentWidth ?? 680}px`,
    '--ek-shadow-card': visual.cardShadow ?? 'none',
    '--ek-color-focus': isMarfil ? bt.primary : bt.accent,
  } as React.CSSProperties;

  return (
    <BlockThemeProvider value={bt}>
      <BlockDesignProvider value={tokens ?? {}}>
      <BlockDataProvider value={{ slug, guest, demo }}>
        <PageMotionProvider value={motion} gated={gated} scrollRoot={scrollRoot}>
          <ScrollExperience color={bt.primary} disabled={!!editor}>
          <div
            // overflow-x-clip (no -hidden): hidden crearía un scrollport y
            // rompería el position:sticky del bloque "historia fija".
            className="ek-invite relative w-full min-h-screen overflow-x-clip transition-colors duration-500"
            data-ek-visual-system="v2"
            data-ek-visual-profile={tokens?.visualProfile}
            style={{
              background: bt.bg,
              color: bt.text,
              overflowX: 'clip',
              width: '100%',
              ...kitCssVars,
              ...(previewOnly ? { height: '100svh', overflow: 'hidden' } : {}),
              ...(isMarfil ? { ...resolveInvitationTypography(tokens, 'body'), containerType: 'inline-size' as const } : {}),
              ...(isPassport ? {
                backgroundImage: `radial-gradient(${bt.primary}12 1px, transparent 1px), linear-gradient(92deg, transparent 48%, ${bt.primary}08 50%, transparent 52%)`,
                backgroundSize: '18px 18px, 100% 420px',
              } : {}),
            }}
            onClick={editor ? () => onSelectBlock?.('', false) : undefined}
          >
            {isMarfil ? <div className="ek-scoped-decor pointer-events-none absolute inset-0 overflow-clip" style={{ contain: 'paint' }}><PageDecor decor={decor} color={bt.primary} /></div> : <PageDecor decor={decor} color={bt.primary} />}
            <div className="relative" style={{ zIndex: 10 }}>
              {blocks.map((b, i) => {
                const currentLayout = resolvedLayout(b.layout, viewport);
                const currentBlock = responsiveBlock(b, currentLayout);
                const seam = seamAt(i);
                return editor
                  ? <EditorBlock key={b.id} block={{ ...currentBlock, layout: currentLayout ? { ...(b.layout ?? {}), ...currentLayout } : b.layout }} selected={(selectedIds ?? (selectedId ? [selectedId] : [])).includes(b.id)} primary={selectedId === b.id} onSelect={onSelectBlock} onTransform={onTransform} onEditProp={onEditProp} onPatchBlock={onPatchBlock} onDuplicateBlock={onDuplicateBlock} onDeleteBlock={onDeleteBlock} onCopyBlockStyle={onCopyBlockStyle} onPasteBlockStyle={onPasteBlockStyle} hasStyleClipboard={hasStyleClipboard} scale={previewScale} seam={seam} tokens={tokens} />
                  : <LiveBlock key={b.id} block={currentBlock} layout={currentLayout} tokens={tokens} seam={seam} />;
              })}
              {!previewOnly && <FooterBar seam={footerSeam} />}
            </div>
            {floating.length > 0 && (
              <div className="absolute inset-0" style={{ zIndex: 20, pointerEvents: 'none' }}>
                <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: FLOAT_COL, margin: '0 auto' }}>
                  {floating.map((b) => {
                    const currentLayout = resolvedLayout(b.layout, viewport);
                    const currentBlock = responsiveBlock(b, currentLayout);
                    return editor
                      ? <EditorBlock key={b.id} block={{ ...currentBlock, layout: currentLayout ? { ...(b.layout ?? {}), ...currentLayout } : b.layout }} floating selected={(selectedIds ?? (selectedId ? [selectedId] : [])).includes(b.id)} primary={selectedId === b.id} onSelect={onSelectBlock} onTransform={onTransform} onEditProp={onEditProp} onPatchBlock={onPatchBlock} onDuplicateBlock={onDuplicateBlock} onDeleteBlock={onDeleteBlock} onCopyBlockStyle={onCopyBlockStyle} onPasteBlockStyle={onPasteBlockStyle} hasStyleClipboard={hasStyleClipboard} scale={previewScale} tokens={tokens} />
                      : <FloatingLiveBlock key={b.id} block={currentBlock} layout={currentLayout} />;
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
            {musicUrl && !editor && !previewOnly && <MusicPlayer src={musicUrl} color={bt.primary} />}
          </div>
          </ScrollExperience>
        </PageMotionProvider>
      </BlockDataProvider>
      </BlockDesignProvider>
    </BlockThemeProvider>
  );
}
