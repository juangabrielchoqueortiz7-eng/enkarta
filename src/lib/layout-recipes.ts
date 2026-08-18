// Recetas de arranque por plantilla.
//
// Antes, `applyTemplatePreset` solo sellaba metadatos: daba igual de qué
// plantilla viniera una invitación, el documento por bloques salía SIEMPRE con
// los mismos bloques, en el mismo orden y sobre una hoja blanca continua. Trece
// plantillas premium distintas colapsaban en un único esqueleto recoloreado.
//
// Aquí vive lo que las diferencia: el ritmo de bandas de color y la transición
// de entrada de cada bloque. Las bandas van en RACHAS (`['soft', 3]`), no
// alternando bloque a bloque: una banda tiene que abarcar varias secciones para
// leerse como una sección de la invitación; alternando en cada bloque el scroll
// se convierte en un tablero de ajedrez.
//
// Efecto de rebote: la costura solo se dibuja cuando un bloque cambia de fondo
// respecto al anterior, así que sin este archivo las formas de `tokens.seam`
// no llegaban a verse casi nunca.

import type { Block, BlockType, ScrollPreset } from './types';

/**
 * Papel de una banda. Se traduce a `bgKind`, nunca a un hex, para que la banda
 * siga la paleta cuando el cliente cambia los colores.
 */
export type BandRole = 'paper' | 'soft' | 'deep' | 'gradient';

/** Racha: un papel y cuántas secciones seguidas lo llevan. */
export type BandRun = [BandRole, number];

export interface TemplateRecipe {
  bands: BandRun[];
  /**
   * Transición de entrada SOLO para los tipos que la piden por su papel (la
   * portada, las fotos, las tarjetas de evento). Lo demás se deja sin tocar a
   * propósito: hereda el preset global de la plantilla, que es lo que el panel
   * de Animación controla. Escribir animación en todos los bloques dejaba ese
   * panel sin efecto sobre un documento recién sembrado.
   */
  motion?: Partial<Record<BlockType, ScrollPreset>>;
}

const BG_FOR: Record<BandRole, NonNullable<Block['style']>> = {
  paper:    { bgKind: 'none' },
  soft:     { bgKind: 'soft' },
  deep:     { bgKind: 'primary' },
  gradient: { bgKind: 'gradient' },
};

/**
 * Una receta por plantilla, coherente con la personalidad que ya declaran sus
 * tokens y su decoración (ver TEMPLATE_TOKEN_DEFAULTS en template-themes.ts):
 * lo editorial va a bandas anchas y cortes secos, lo romántico a tintes suaves,
 * lo oscuro abre en banda profunda, lo minimal casi no corta.
 */
const RECIPES: Record<string, TemplateRecipe> = {
  azure: {
    bands: [['paper', 3], ['soft', 3], ['paper', 3], ['deep', 2]],
    motion: { cover: 'fade', gallery: 'zoomScroll', countdown: 'pop', gift: 'fadeUp' },
  },
  primicia: {
    bands: [['paper', 4], ['deep', 2], ['paper', 4], ['soft', 2]],
    motion: { cover: 'none', eventCard: 'slideRight', gallery: 'parallax', itinerary: 'fadeUp' },
  },
  passport: {
    bands: [['paper', 2], ['soft', 3], ['deep', 2], ['paper', 3]],
    motion: { cover: 'fade', eventCard: 'slideRight', gallery: 'zoomScroll', rsvp: 'riseSoft' },
  },
  paradise: {
    bands: [['paper', 2], ['soft', 3], ['paper', 2], ['gradient', 2]],
    motion: { cover: 'zoom', gallery: 'zoomScroll', countdown: 'pop', dressCode: 'slideRight' },
  },
  obsidiana: {
    bands: [['deep', 3], ['paper', 3], ['deep', 2], ['soft', 2]],
    motion: { cover: 'fade', gallery: 'parallax', eventCard: 'tilt3d', rsvp: 'riseSoft' },
  },
  dolcevita: {
    bands: [['paper', 3], ['soft', 2], ['paper', 2], ['deep', 2]],
    motion: { cover: 'fade', gallery: 'zoomScroll', dressCode: 'slideRight', gift: 'fadeUp' },
  },
  grazia: {
    bands: [['paper', 3], ['deep', 2], ['soft', 3], ['paper', 2]],
    motion: { cover: 'fade', gallery: 'parallax', eventCard: 'flip3d', countdown: 'zoom' },
  },
  napoly: {
    bands: [['soft', 2], ['paper', 3], ['soft', 2], ['deep', 2]],
    motion: { cover: 'fade', gallery: 'zoomScroll', itinerary: 'slideRight' },
  },
  euforia: {
    bands: [['soft', 2], ['paper', 2], ['gradient', 2], ['deep', 2]],
    motion: { cover: 'zoom', gallery: 'zoomScroll', text: 'fadeUp', rsvp: 'pop' },
  },
  rosegold: {
    bands: [['paper', 2], ['soft', 3], ['paper', 2], ['soft', 2], ['deep', 2]],
    motion: { cover: 'fade', gallery: 'zoomScroll', countdown: 'pop', gift: 'fadeUp' },
  },
  allegria: {
    // Minimal: rachas largas de papel y un solo golpe de color al final.
    bands: [['paper', 6], ['soft', 2], ['paper', 4], ['deep', 2]],
    motion: { cover: 'none', gallery: 'fade' },
  },
  esmeralda: {
    bands: [['paper', 3], ['soft', 2], ['paper', 3], ['deep', 2]],
    motion: { cover: 'fade', gallery: 'zoomScroll', itinerary: 'fadeUp' },
  },
  provence: {
    bands: [['soft', 3], ['paper', 3], ['soft', 2], ['deep', 2]],
    motion: { cover: 'fade', gallery: 'zoomScroll', lodging: 'slideRight' },
  },
};

export function recipeFor(template?: string): TemplateRecipe {
  return (template && RECIPES[template]) || RECIPES.azure;
}

/** Separadores y adornos no abren banda: heredan la del bloque anterior. */
const PASSTHROUGH: BlockType[] = ['divider', 'spacer', 'ornament', 'element'];

/** Expande las rachas a un papel por sección. */
function flatten(bands: BandRun[]): BandRole[] {
  const out: BandRole[] = [];
  for (const [role, n] of bands) for (let i = 0; i < Math.max(1, n); i++) out.push(role);
  return out.length ? out : ['paper'];
}

/**
 * Aplica la receta sobre los bloques ya construidos: reparte las bandas, abre
 * aire en los cortes (la costura necesita >=28px de padding superior para
 * dibujarse) y asigna la transición de cada bloque.
 *
 * Solo rellena lo que no esté ya definido, así que es seguro sobre un documento
 * que traiga estilos propios.
 */
export function applyRecipe(blocks: Block[], template?: string): Block[] {
  const r = recipeFor(template);
  const roles = flatten(r.bands);

  // Papel que le toca a cada bloque; los de paso heredan el del anterior.
  const eff: BandRole[] = [];
  let slot = 0;
  let cur: BandRole = roles[0];
  for (const b of blocks) {
    if (!PASSTHROUGH.includes(b.type)) {
      cur = roles[slot % roles.length];
      slot++;
    }
    eff.push(cur);
  }

  // Contador por tipo, para alternar el lado de las entradas laterales cuando un
  // mismo tipo se repite (las dos tarjetas de evento, por ejemplo).
  const seen: Record<string, number> = {};

  return blocks.map((b, i) => {
    const role = eff[i];
    const opensBand = i === 0 || eff[i - 1] !== role;
    const closesBand = i === blocks.length - 1 || eff[i + 1] !== role;
    const style = { ...(b.style ?? {}) };

    if (style.bgKind === undefined) Object.assign(style, BG_FOR[role]);
    if (opensBand && (style.padTop ?? 0) < 64) style.padTop = 64;
    if (closesBand && (style.padBottom ?? 0) < 56) style.padBottom = 56;

    let preset = r.motion?.[b.type];
    const n = (seen[b.type] = (seen[b.type] ?? 0) + 1);
    // Un mismo tipo repetido (las dos tarjetas de evento) entra por lados
    // alternos, o las dos llegan desde el mismo sitio y parece un fallo.
    if (n > 1 && preset === 'slideRight') preset = 'slideLeft';
    else if (n > 1 && preset === 'slideLeft') preset = 'slideRight';

    const animation = b.animation ?? (preset ? { preset } : undefined);
    return { ...b, style, ...(animation ? { animation } : {}) };
  });
}
