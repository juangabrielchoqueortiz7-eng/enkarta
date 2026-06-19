/**
 * Utilities for working with Lottie JSON animations.
 * Handles color override, loading, and registry management.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LottieIconMeta {
  id: string;
  label: string;
  path: string;
  tags: string[];
}

export interface LottieCategory {
  id: string;
  label: string;
  emoji: string;
  icons: LottieIconMeta[];
}

export interface LottieRegistry {
  version: string;
  categories: LottieCategory[];
}

// ─── Color Helpers ────────────────────────────────────────────────────────────

/** Convert hex color (#RRGGBB or #RGB) to Lottie's [r,g,b,a] format (0-1 range) */
export function hexToLottieColor(hex: string): [number, number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return [r, g, b, 1];
}

/** Convert Lottie's [r,g,b,a] (0-1) to hex string */
export function lottieColorToHex(color: number[]): string {
  const r = Math.round(color[0] * 255).toString(16).padStart(2, '0');
  const g = Math.round(color[1] * 255).toString(16).padStart(2, '0');
  const b = Math.round(color[2] * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/** Check if two Lottie colors are approximately equal (tolerance for float comparisons) */
function colorsMatch(a: number[], b: number[], tolerance = 0.05): boolean {
  return (
    Math.abs(a[0] - b[0]) < tolerance &&
    Math.abs(a[1] - b[1]) < tolerance &&
    Math.abs(a[2] - b[2]) < tolerance
  );
}

// ─── Deep Color Override ──────────────────────────────────────────────────────

/**
 * Deep-clone a Lottie JSON and replace colors.
 * colorMap: { '#source_hex': '#target_hex' }
 *
 * Example:
 *   applyColorOverrides(json, { '#000000': '#B8975A', '#4dcfca': '#ffffff' })
 */
export function applyColorOverrides(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lottieJson: any,
  colorMap: Record<string, string>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (!lottieJson || !colorMap || Object.keys(colorMap).length === 0) {
    return lottieJson;
  }

  // Pre-convert colorMap keys to Lottie format for fast matching
  const lottieMap = Object.entries(colorMap).map(([from, to]) => ({
    from: hexToLottieColor(from),
    to: hexToLottieColor(to),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any): any {
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node !== null && typeof node === 'object') {
      // Check if this is a Lottie color property: { a: 0, k: [r,g,b,a] }
      if ('k' in node && Array.isArray(node.k) && node.k.length === 4 &&
          typeof node.k[0] === 'number') {
        for (const { from, to } of lottieMap) {
          if (colorsMatch(node.k, from)) {
            return { ...node, k: [...to] };
          }
        }
      }
      // Recurse into all properties
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(node)) {
        result[key] = walk(node[key]);
      }
      return result;
    }
    return node;
  }

  return walk(lottieJson);
}

/**
 * Recolorea un icono permitiendo además volver una parte TRANSPARENTE.
 * colorMap: { '#origen': '#nuevo' | 'transparent' }
 *  - '#nuevo'     → cambia ese color.
 *  - 'transparent'→ pone a 0 la opacidad de ese relleno/trazo (deja ver el fondo).
 */
export function applyIconColors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lottieJson: any,
  colorMap: Record<string, string>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (!lottieJson || !colorMap || Object.keys(colorMap).length === 0) return lottieJson;

  const entries = Object.entries(colorMap).map(([from, to]) => ({
    from: hexToLottieColor(from),
    transparent: to === 'transparent',
    to: to === 'transparent' ? null : hexToLottieColor(to),
  }));
  const matchFor = (k: number[]) => entries.find((e) => colorsMatch(k, e.from));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any): any {
    if (Array.isArray(node)) return node.map(walk);
    if (node !== null && typeof node === 'object') {
      // Relleno/trazo: { ty:'fl'|'st', c:{k:[r,g,b,a]}, o:{k:0-100} }
      const c = node.c;
      const isFillColor = c && typeof c === 'object' && Array.isArray(c.k) && c.k.length === 4 && typeof c.k[0] === 'number';
      if (isFillColor) {
        const e = matchFor(c.k);
        if (e) {
          const next: Record<string, unknown> = {};
          for (const key of Object.keys(node)) {
            if (key === 'c' || key === 'o') continue;
            next[key] = walk(node[key]);
          }
          if (e.transparent) {
            next.c = { ...c, k: [c.k[0], c.k[1], c.k[2], 0] };
            next.o = node.o && typeof node.o === 'object' ? { ...node.o, a: 0, k: 0 } : { a: 0, k: 0 };
          } else {
            next.c = { ...c, k: [...(e.to as number[])] };
            if ('o' in node) next.o = walk(node.o);
          }
          return next;
        }
      }
      // Color suelto (sin opacidad asociada): sólo recolorear.
      if ('k' in node && Array.isArray(node.k) && node.k.length === 4 && typeof node.k[0] === 'number') {
        const e = matchFor(node.k);
        if (e && !e.transparent) return { ...node, k: [...(e.to as number[])] };
      }
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(node)) result[key] = walk(node[key]);
      return result;
    }
    return node;
  }
  return walk(lottieJson);
}

/**
 * Tinta TODO el icono a un solo color (monocromo), conservando la opacidad de
 * cada forma. Útil para que un icono animado combine con la paleta de la
 * plantilla sin tener que mapear sus colores originales uno por uno.
 *
 *   tintLottie(json, '#1e3a5f')
 */
export function tintLottie(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lottieJson: any,
  hex: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (!lottieJson || !hex) return lottieJson;
  const [r, g, b] = hexToLottieColor(hex);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any): any {
    if (Array.isArray(node)) return node.map(walk);
    if (node !== null && typeof node === 'object') {
      // Color sólido: { a:0, k:[r,g,b,a] } → conservamos el alfa original
      if ('k' in node && Array.isArray(node.k) && node.k.length === 4 && typeof node.k[0] === 'number') {
        return { ...node, k: [r, g, b, node.k[3]] };
      }
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(node)) result[key] = walk(node[key]);
      return result;
    }
    return node;
  }
  return walk(lottieJson);
}

/**
 * Extract all unique colors from a Lottie JSON (as hex strings).
 * Useful for showing a "color palette" in the editor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractColors(lottieJson: any): string[] {
  const colors = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any) {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node !== null && typeof node === 'object') {
      if ('k' in node && Array.isArray(node.k) && node.k.length === 4 &&
          typeof node.k[0] === 'number') {
        colors.add(lottieColorToHex(node.k));
      }
      Object.values(node).forEach(walk);
    }
  }

  walk(lottieJson);
  return Array.from(colors);
}

// ─── Registry Loader ─────────────────────────────────────────────────────────

let cachedRegistry: LottieRegistry | null = null;

/**
 * Load the icon registry.
 * Uses the dynamic API (/api/admin/icons) so cualquier archivo .json
 * que el usuario suba a public/lottie/[categoria]/ aparece automáticamente.
 */
export async function loadLottieRegistry(): Promise<LottieRegistry> {
  if (cachedRegistry) return cachedRegistry;
  try {
    const res = await fetch('/api/admin/icons');
    if (res.ok) {
      cachedRegistry = await res.json();
      return cachedRegistry!;
    }
  } catch { /* fallback below */ }

  // Fallback: index.json estático
  const res = await fetch('/lottie/index.json');
  cachedRegistry = await res.json();
  return cachedRegistry!;
}

/** Invalida el caché (útil después de subir un nuevo ícono) */
export function invalidateLottieCache() {
  cachedRegistry = null;
}

/** Find icon metadata by id (searches all categories) */
export async function findIconById(id: string): Promise<LottieIconMeta | null> {
  const registry = await loadLottieRegistry();
  for (const cat of registry.categories) {
    const icon = cat.icons.find(i => i.id === id);
    if (icon) return icon;
  }
  return null;
}

/** Load a Lottie JSON by icon id, returns null if file not found */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadLottieById(id: string): Promise<any | null> {
  const meta = await findIconById(id);
  if (!meta) return null;

  try {
    const res = await fetch(meta.path);
    if (!res.ok) {
      const ph = await fetch('/lottie/_placeholder.json');
      return ph.ok ? ph.json() : null;
    }
    return res.json();
  } catch {
    return null;
  }
}

/** Load a Lottie JSON directly by path */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadLottieByPath(filePath: string): Promise<any | null> {
  try {
    const res = await fetch(filePath);
    if (!res.ok) {
      const ph = await fetch('/lottie/_placeholder.json');
      return ph.ok ? ph.json() : null;
    }
    return res.json();
  } catch {
    return null;
  }
}
