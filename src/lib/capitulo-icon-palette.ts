/** Capítulo's colors belong to the instance, never to the archived Lottie file. */
export const CAPITULO_ICON_INK = '#8c453b';
export const CAPITULO_ICON_PAPER = '#f8f7f3';

type JsonObject = Record<string, unknown>;
const object = (value: unknown): value is JsonObject => !!value && !Array.isArray(value) && typeof value === 'object';
const rgba = (value: unknown): value is number[] => Array.isArray(value) && (value.length === 3 || value.length === 4) && value.every(channel => typeof channel === 'number' && Number.isFinite(channel));
const color = (hex: string | undefined) => {
  if (!hex || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return null;
  const full = hex.length === 4 ? hex.slice(1).split('').map(channel => channel + channel).join('') : hex.slice(1);
  return [0, 2, 4].map(offset => parseInt(full.slice(offset, offset + 2), 16) / 255);
};
const matches = (first: number[], second: number[]) => first.slice(0, 3).every((channel, index) => Math.abs(channel - second[index]) < .05);
const instancePaint = (property: JsonObject, channels: number[]) => {
  // These originals bind c.x to After Effects' blue/turquoise Color Ctrl layer.
  // Changing only c.k is ignored by Lottie's expression renderer. Release this
  // color binding on the instance; position/path/trim expressions stay intact.
  const next: JsonObject = { ...property, k: channels };
  delete next.x;
  return next;
};

/**
 * Recolor actual paint only: transforms, paths, masks, alpha and timing remain intact.
 * White interiors stay paper instead of becoming solid silhouettes. Skin fills in
 * host-selected artwork stay natural; an explicit per-color override still wins.
 */
export function colorCapituloIcon<T>(animation: T, { iconColor, colors }: { iconColor?: string; colors?: Record<string, string> } = {}): T {
  const ink = color(iconColor) ?? color(CAPITULO_ICON_INK)!;
  const paper = color(CAPITULO_ICON_PAPER)!;
  const overrides = Object.entries(colors ?? {}).flatMap(([from, to]) => {
    const original = color(from), replacement = color(to);
    return original && (to === 'transparent' || replacement) ? [{ original, replacement }] : [];
  });

  // A matte precomposition may be stored separately in assets. Its paints define
  // the cut-out, not visible decoration; keep their original colors as well.
  const matteAssets = new Set<string>();
  const assets = object(animation) && Array.isArray(animation.assets) ? animation.assets.filter(object) : [];
  const findMatteReferences = (value: unknown, inMatte = false) => {
    if (Array.isArray(value)) { value.forEach(child => findMatteReferences(child, inMatte)); return; }
    if (!object(value)) return;
    const matte = inMatte || value.td === 1;
    if (matte && typeof value.refId === 'string') matteAssets.add(value.refId);
    Object.values(value).forEach(child => findMatteReferences(child, matte));
  };
  findMatteReferences(animation);
  for (let previous = -1; previous !== matteAssets.size;) {
    previous = matteAssets.size;
    for (const asset of assets) if (typeof asset.id === 'string' && matteAssets.has(asset.id)) findMatteReferences(asset, true);
  }

  const walk = (value: unknown, inMatte = false): unknown => {
    if (Array.isArray(value)) return value.map(child => walk(child, inMatte));
    if (!object(value)) return value;
    const matte = inMatte || value.td === 1 || (typeof value.id === 'string' && matteAssets.has(value.id));
    const next: JsonObject = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, walk(child, matte)]));
    if ((value.ty !== 'fl' && value.ty !== 'st') || !object(value.c) || !rgba(value.c.k)) return next;
    const original = value.c.k;
    const override = overrides.find(entry => matches(original, entry.original));
    if (override) {
      const alpha = original.length === 4 ? [override.replacement ? original[3] : 0] : [];
      next.c = instancePaint(value.c, [...(override.replacement ?? original.slice(0, 3)), ...alpha]);
      if (!override.replacement) next.o = { ...(object(value.o) ? value.o : {}), a: 0, k: 0 };
      return next;
    }
    if (matte || original[3] === 0 || (object(value.o) && value.o.a === 0 && value.o.k === 0)) return next;
    const [red, green, blue] = original;
    const white = Math.min(red, green, blue) > .93 && Math.max(red, green, blue) - Math.min(red, green, blue) < .03;
    const skinFill = value.ty === 'fl' && red > .65 && green > .2 && blue > .1 && red > green && green > blue && red - green > .07;
    if (!skinFill) next.c = instancePaint(value.c, [...(white ? paper : ink), ...original.slice(3)]);
    return next;
  };
  return walk(animation) as T;
}
