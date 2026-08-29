import type { BuilderConfig } from './types';
import { isCurrentContract, resolveFeatures } from './packages';

type ColorDocument = { color_primary?: unknown; color_secondary?: unknown; color_accent?: unknown; template?: unknown; config: BuilderConfig };
const paintKey = /color|^(bg|background|gradient|fill|stroke)$/i;
function paints(value: unknown, path = '', result: Record<string, unknown> = {}) {
  if (!value || typeof value !== 'object') return result;
  for (const [key, item] of Object.entries(value)) {
    if (paintKey.test(key) && (typeof item === 'string' || item === null)) result[path + key] = item;
    else if (item && typeof item === 'object') paints(item, path + key + '.', result);
  }
  return result;
}
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
/** No convierte un cambio de color en un adicional implícito. Altas/bajas de bloques siguen permitidas. */
export function changesUncontractedColors(current: ColorDocument, next: ColorDocument): boolean {
  if (!isCurrentContract(next.config) || resolveFeatures(next.config).colorCustomization) return false;
  if (['color_primary', 'color_secondary', 'color_accent'].some(key => key in next && !same(current[key as keyof ColorDocument], next[key as keyof ColorDocument]))) return true;
  if (!same(current.config.theme, next.config.theme) || !same(current.config.iconColor, next.config.iconColor)) return true;
  const previous = new Map<string, Record<string, unknown>>();
  const visit = (blocks: NonNullable<BuilderConfig['layout']>['blocks'], check: boolean): boolean => blocks.some(block => {
    const colors = paints({ props: block.props, style: block.style });
    if (check && previous.has(block.id) && !same(previous.get(block.id), colors)) return true;
    if (!check) previous.set(block.id, colors);
    return block.children ? visit(block.children, check) : false;
  });
  visit(current.config.layout?.blocks || [], false);
  return visit(next.config.layout?.blocks || [], true);
}
