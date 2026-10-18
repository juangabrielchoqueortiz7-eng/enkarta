import { ENKARTA_COLLECTIONS, STARTER_DESIGNS } from './enkarta-collections';

/** Resolve names at server boundaries without adding the catalog to every CTA. */
export function commercialDesignName(value: unknown): string {
  const input = String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 80);
  const design = STARTER_DESIGNS.find(item => item.key === input);
  if (design) return design.name;
  if (Object.prototype.hasOwnProperty.call(ENKARTA_COLLECTIONS, input)) return ENKARTA_COLLECTIONS[input as keyof typeof ENKARTA_COLLECTIONS].name;
  return input;
}
