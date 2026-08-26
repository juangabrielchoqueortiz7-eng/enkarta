import type { Block, InvitationParsed } from './types';
import type { DesignKit } from './design-kits';
import { applyDesignKitPatch } from './design-kits';

export type DesignAuditLevel = 'good' | 'warning' | 'critical';

export interface DesignAuditIssue {
  key: 'fonts' | 'colors' | 'radii' | 'spacing';
  level: DesignAuditLevel;
  label: string;
  detail: string;
  count: number;
  limit: number;
}

export interface DesignAuditResult {
  score: number;
  issues: DesignAuditIssue[];
  counts: { fonts: number; colors: number; radii: number; spacing: number };
}

const COLOR_RE = /^(#(?:[0-9a-f]{3,8})|rgba?\(|hsla?\(|color-mix\()/i;
const textStyleKeys = ['family', 'size', 'textColor', 'weight', 'tracking', 'lineHeight', 'textCase', 'textOpacity', 'textShadow'] as const;

function addColor(set: Set<string>, value: unknown) {
  if (typeof value === 'string' && COLOR_RE.test(value.trim())) set.add(value.trim().toLowerCase());
}

function addNumber(set: Set<number>, value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) set.add(Math.round(value));
}

function inspectBlock(block: Block, colors: Set<string>, radii: Set<number>, spacing: Set<number>, fonts: Set<string>) {
  const style = block.style ?? {};
  [style.bg, style.text, style.borderColor].forEach(value => addColor(colors, value));
  addNumber(radii, style.radius);
  [style.padTop, style.padBottom, style.padX, style.contentPadding].forEach(value => addNumber(spacing, value));
  const family = block.props.family;
  if (typeof family === 'string' && family) fonts.add(family);
  Object.entries(block.props).forEach(([key, value]) => {
    if (/color/i.test(key)) {
      if (typeof value === 'object' && value) Object.values(value as Record<string, unknown>).forEach(item => addColor(colors, item));
      else addColor(colors, value);
    }
    if (/radius|rounded/i.test(key)) addNumber(radii, value);
  });
  block.children?.forEach(child => inspectBlock(child, colors, radii, spacing, fonts));
}

export function auditDesignConsistency(data: InvitationParsed): DesignAuditResult {
  const cfg = data.config ?? {};
  const colors = new Set<string>();
  const radii = new Set<number>();
  const spacing = new Set<number>();
  const fonts = new Set<string>();
  [cfg.fontScript, cfg.fontHeading, cfg.fontBody].forEach(font => { if (font) fonts.add(font); });
  // `primaryDeep`, `muted` y `onPrimary` son derivados técnicos del sistema;
  // el auditor cuenta los seis tokens que la persona realmente decide.
  const semantic = cfg.theme ? [cfg.theme.bg, cfg.theme.text, cfg.theme.primary, cfg.theme.accent, cfg.theme.surface, cfg.theme.line] : [];
  [data.color_primary, data.color_secondary, data.color_accent, ...semantic].forEach(value => addColor(colors, value));
  [cfg.tokens?.sectionRadius, cfg.tokens?.cardRadius, cfg.tokens?.buttonRadius, cfg.tokens?.fieldRadius].forEach(value => addNumber(radii, value));
  [cfg.tokens?.sectionInset].forEach(value => addNumber(spacing, value));
  cfg.layout?.blocks.forEach(block => inspectBlock(block, colors, radii, spacing, fonts));

  const counts = { fonts: fonts.size, colors: colors.size, radii: radii.size, spacing: spacing.size };
  const rules = [
    { key: 'fonts' as const, label: 'Familias tipográficas', count: counts.fonts, limit: 3, detail: 'Usa máximo una fuente caligráfica, una de títulos y una de lectura.' },
    { key: 'colors' as const, label: 'Colores distintos', count: counts.colors, limit: 8, detail: 'Concentra el diseño en los seis colores semánticos del kit.' },
    { key: 'radii' as const, label: 'Radios diferentes', count: counts.radii, limit: 4, detail: 'Botones, campos, tarjetas y secciones deben repetir sus formas.' },
    { key: 'spacing' as const, label: 'Espaciados manuales', count: counts.spacing, limit: 6, detail: 'Usa la escala global y evita demasiadas distancias aisladas.' },
  ];
  const issues: DesignAuditIssue[] = rules.map(rule => ({
    ...rule,
    level: rule.count > rule.limit * 1.5 ? 'critical' : rule.count > rule.limit ? 'warning' : 'good',
  }));
  const penalty = issues.reduce((sum, issue) => sum + (issue.level === 'critical' ? 22 : issue.level === 'warning' ? 11 : 0), 0);
  return { score: Math.max(12, 100 - penalty), issues, counts };
}

function cleanBlock(block: Block): Block {
  const props = { ...block.props };
  textStyleKeys.forEach(key => { delete props[key]; });
  const style = { ...(block.style ?? {}) };
  delete style.text;
  delete style.padTop;
  delete style.padBottom;
  delete style.padX;
  delete style.maxWidth;
  delete style.surface;
  delete style.contentPadding;
  delete style.radius;
  delete style.borderWidth;
  delete style.borderColor;
  delete style.shadow;
  delete style.contentOpacity;
  if (style.bgKind === 'solid') style.bgKind = 'soft';
  delete style.bg;
  return {
    ...block,
    props,
    style,
    children: block.children?.map(cleanBlock),
  };
}

/** Normaliza los overrides antiguos y reaplica un kit, sin tocar el contenido. */
export function cleanInvitationDesign(data: InvitationParsed, kit: DesignKit): Partial<InvitationParsed> {
  const patch = applyDesignKitPatch(data, kit);
  const layout = data.config?.layout;
  if (!layout) return patch;
  return {
    ...patch,
    config: {
      ...(patch.config ?? data.config),
      layout: { ...layout, blocks: layout.blocks.map(cleanBlock) },
    },
  };
}
