import type { CSSProperties } from 'react';
import type { TemplateTheme, TemplateTokens } from './types';

/** Primera referencia visual de Marfil. No se infiere a partir del nombre del modelo. */
export const MARFIL_THEME: TemplateTheme = {
  bg: '#F7F4EC', surface: '#FFFCF6', text: '#30392F', muted: '#696C5E',
  primary: '#4B5942', primaryDeep: '#2C3627', accent: '#A38A58', line: '#D8D3C4', onPrimary: '#FFFCF6',
};

export const MARFIL_SPACE = { micro: 4, inline: 8, compact: 12, field: 16, gutter: 24, group: 32, tight: 48, section: 64, wide: 80 } as const;
export const MARFIL_WIDTH = { reading: 680, content: 940, gallery: 1080 } as const;

export const MARFIL_TOKENS: TemplateTokens = {
  visualProfile: 'marfil-v1',
  contentWidth: MARFIL_WIDTH.content, sectionInset: MARFIL_SPACE.gutter,
  sectionRadius: 0, cardRadius: 8, mediaRadius: 4, buttonRadius: 6, fieldRadius: 6,
  spacing: 'airy', spacingScale: 1, surface: 'flat', shadow: 'none',
  buttonStyle: 'solid', cardBorder: 'hairline', seam: 'none', seamFx: 'none',
  typeScale: { title: 1, subtitle: 1, body: 1, label: 1 },
};

export type InvitationTypeRole = 'display' | 'title' | 'subtitle' | 'body' | 'note' | 'label' | 'action' | 'field' | 'number' | 'time';
type ScaleRole = 'title' | 'subtitle' | 'body' | 'label';
const heading = 'var(--ek-font-heading, "Playfair Display", serif)';
const body = 'var(--ek-font-body, "Outfit", sans-serif)';

export function hasMarfilVisualSystem(tokens?: TemplateTokens): boolean {
  return tokens?.visualProfile === 'marfil-v1';
}

export function hasInvitationVisualSystem(tokens?: TemplateTokens): boolean {
  return hasMarfilVisualSystem(tokens) || tokens?.visualProfile === 'collection-v1';
}

/** Inline defaults, not !important rules: font variables and explicit edits still win. */
export function resolveInvitationTypography(tokens: TemplateTokens | undefined, role: InvitationTypeRole, responsiveScale = 1): CSSProperties {
  if (!hasInvitationVisualSystem(tokens)) return {};
  const scale = Number.isFinite(responsiveScale) ? Math.max(0.75, Math.min(1.35, responsiveScale)) : 1;
  const px = (value: number, semantic: ScaleRole) => `calc(${Math.round(value * scale * 100) / 100}px * var(--ek-type-${semantic}, 1))`;
  const fluid = (min: number, max: number, semantic: ScaleRole) => `clamp(${px(min, semantic)}, calc(${6 * scale}cqw * var(--ek-type-${semantic}, 1)), ${px(max, semantic)})`;
  const common: CSSProperties = { fontStyle: 'normal', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' };
  switch (role) {
    case 'display': return { ...common, fontFamily: heading, letterSpacing: '-0.025em', lineHeight: 1.08, overflowWrap: 'anywhere' };
    case 'title': return { ...common, fontFamily: heading, fontSize: fluid(32, 44, 'title'), lineHeight: 1.2, letterSpacing: '-0.025em', overflowWrap: 'anywhere' };
    case 'subtitle': return { ...common, fontFamily: heading, fontSize: fluid(22, 26, 'subtitle'), lineHeight: 1.3, letterSpacing: '-0.015em' };
    case 'body': return { ...common, fontFamily: body, fontSize: px(18, 'body'), lineHeight: 1.7 };
    case 'note': return { ...common, fontFamily: body, fontSize: px(15, 'body'), lineHeight: 1.65 };
    case 'label': return { ...common, fontFamily: body, fontSize: px(12, 'label'), fontWeight: 500, lineHeight: 1.5, textTransform: 'uppercase', letterSpacing: '0.14em' };
    case 'action': return { ...common, fontFamily: body, fontSize: px(15, 'label'), fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.02em' };
    case 'field': return { ...common, fontFamily: body, fontSize: px(16, 'body'), lineHeight: 1.5 };
    case 'time': return { ...common, fontFamily: body, fontSize: px(14, 'label'), fontWeight: 500, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' };
    case 'number': return { ...common, fontFamily: heading, lineHeight: 1, fontVariantNumeric: 'tabular-nums' };
  }
}
