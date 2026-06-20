// Paleta semántica por defecto de cada plantilla premium. Fuente única usada por
// el DecorPanel (selectores de color), el constructor de bloques (sembrar el tema
// al convertir) y la previsualización por bloques en /muestra.

import type { TemplateTheme, PageMotionPreset, TemplateDecor, TemplateTokens } from './types';

export const TEMPLATE_THEME_DEFAULTS: Record<string, TemplateTheme> = {
  azure:     { primary: '#1e3a5f', primaryDeep: '#16304f', text: '#274a73', muted: '#6982a3', line: 'rgba(30,58,95,0.4)', bg: '#fbfdff', onPrimary: '#ffffff' },
  primicia:  { primary: '#161616', primaryDeep: '#000000', text: '#1a1a1a', muted: '#555555', line: 'rgba(20,20,20,0.4)', bg: '#f4f1ea', onPrimary: '#ffffff' },
  passport:  { primary: '#6e795b', primaryDeep: '#3b4a2e', text: '#3a3a2e', muted: '#7a7a68', line: 'rgba(110,121,91,0.4)', bg: '#f3efe2', onPrimary: '#ffffff' },
  paradise:  { primary: '#5f6b47', primaryDeep: '#3c4a2a', text: '#3c4a2a', muted: '#5f6b47', line: '#c7b181', bg: '#eceedd', onPrimary: '#ffffff' },
  obsidiana: { primary: '#c6a86a', primaryDeep: '#3a3d28', text: '#ece6d6', muted: '#decb96', line: 'rgba(198,168,106,0.5)', bg: '#100f0c', onPrimary: '#1a1813' },
  dolcevita: { primary: '#4f7a52', primaryDeep: '#33563a', text: '#3b3b35', muted: '#4f7a52', line: '#c2a368', bg: '#fbfaf3', onPrimary: '#ffffff' },
  grazia:    { primary: '#bca478', primaryDeep: '#1b1b18', text: '#2c2c27', muted: '#b6985f', line: 'rgba(182,152,95,0.5)', bg: '#fdfcf8', onPrimary: '#ffffff' },
  carmesi_v2:{ primary: '#871a2f', primaryDeep: '#6d1424', text: '#4a3733', muted: '#b3924f', line: '#b3924f', bg: '#f6efe3', onPrimary: '#ffffff' },
  napoly:    { primary: '#b98a86', primaryDeep: '#6f6052', text: '#5a4d44', muted: '#b59a6a', line: '#b59a6a', bg: '#fbf8f3', onPrimary: '#ffffff' },
  euforia:   { primary: '#8a7257', primaryDeep: '#6b563f', text: '#5d5040', muted: '#b89a6a', line: '#b89a6a', bg: '#f7f1e5', onPrimary: '#ffffff' },
  rosegold:  { primary: '#b97f86', primaryDeep: '#7a5550', text: '#7a6157', muted: '#c2a06a', line: 'rgba(185,127,134,0.5)', bg: '#fdf6f1', onPrimary: '#ffffff' },
  allegria:  { primary: '#8c9a86', primaryDeep: '#6f7d69', text: '#3a3a34', muted: '#7a7a72', line: '#d3d3cb', bg: '#fbfbf8', onPrimary: '#ffffff' },
};

/** Paleta por defecto de una plantilla (o la de Azure como respaldo). */
export function themeForTemplate(template: string): TemplateTheme {
  return TEMPLATE_THEME_DEFAULTS[template] ?? TEMPLATE_THEME_DEFAULTS.azure;
}

/** Preset de animación que mejor acompaña a cada plantilla (al convertir a bloques). */
export const TEMPLATE_MOTION_DEFAULTS: Record<string, PageMotionPreset> = {
  azure: 'elegant', primicia: 'editorial', passport: 'elegant',
  paradise: 'elegant', obsidiana: 'cinematic3d', dolcevita: 'elegant',
  grazia: 'cinematic3d', carmesi_v2: 'cinematic3d', napoly: 'elegant',
  euforia: 'elegant', rosegold: 'playful', allegria: 'minimal',
};

export function motionForTemplate(template: string): PageMotionPreset {
  return TEMPLATE_MOTION_DEFAULTS[template] ?? 'elegant';
}

export const TEMPLATE_DECOR_DEFAULTS: Record<string, TemplateDecor> = {
  azure:      { background: 'art', corners: { on: true, style: 'orchid', opacity: 1 }, floating: { on: true, shape: 'feather', count: 6 }, dividers: 'art', loader: 'heart', texture: 'paper' },
  primicia:   { background: 'solid', corners: { on: false }, floating: { on: false }, dividers: 'line', loader: 'ring', texture: 'paper' },
  passport:   { background: 'solid', corners: { on: true, style: 'geometric', opacity: 0.85 }, floating: { on: false }, dividers: 'line', loader: 'ring', texture: 'parchment' },
  paradise:   { background: 'gradient', corners: { on: true, style: 'palm', opacity: 0.9 }, floating: { on: true, shape: 'leaf', count: 5 }, dividers: 'art', loader: 'heart', texture: 'linen' },
  obsidiana:  { background: 'solid', corners: { on: true, style: 'fan', opacity: 0.7 }, floating: { on: true, shape: 'sparkle', count: 4 }, dividers: 'line', loader: 'ring', texture: 'none' },
  dolcevita:  { background: 'solid', corners: { on: true, style: 'vine', opacity: 0.9 }, floating: { on: false }, dividers: 'art', loader: 'heart', texture: 'paper' },
  grazia:     { background: 'solid', corners: { on: true, style: 'laurel', opacity: 0.8 }, floating: { on: false }, dividers: 'art', loader: 'ring', texture: 'linen' },
  carmesi_v2: { background: 'gradient', corners: { on: true, style: 'rose', opacity: 0.85 }, floating: { on: true, shape: 'petal', count: 5 }, dividers: 'art', loader: 'heart', texture: 'paper' },
  napoly:     { background: 'solid', corners: { on: true, style: 'vine', opacity: 0.7 }, floating: { on: false }, dividers: 'line', loader: 'heart', texture: 'linen' },
  euforia:    { background: 'gradient', corners: { on: true, style: 'berries', opacity: 0.75 }, floating: { on: true, shape: 'confetti', count: 5 }, dividers: 'art', loader: 'heart', texture: 'paper' },
  rosegold:   { background: 'solid', corners: { on: true, style: 'rose', opacity: 0.75 }, floating: { on: true, shape: 'sparkle', count: 4 }, dividers: 'art', loader: 'ring', texture: 'paper' },
  allegria:   { background: 'solid', corners: { on: false }, floating: { on: false }, dividers: 'line', loader: 'none', texture: 'linen' },
};

export const TEMPLATE_TOKEN_DEFAULTS: Record<string, TemplateTokens> = {
  azure:      { contentWidth: 700, sectionInset: 24, sectionRadius: 28, spacing: 'airy', surface: 'soft' },
  primicia:   { contentWidth: 760, sectionInset: 26, sectionRadius: 12, spacing: 'normal', surface: 'flat' },
  passport:   { contentWidth: 720, sectionInset: 24, sectionRadius: 18, spacing: 'normal', surface: 'card' },
  paradise:   { contentWidth: 720, sectionInset: 24, sectionRadius: 26, spacing: 'airy', surface: 'soft' },
  obsidiana:  { contentWidth: 700, sectionInset: 28, sectionRadius: 22, spacing: 'normal', surface: 'card' },
  dolcevita:  { contentWidth: 710, sectionInset: 24, sectionRadius: 24, spacing: 'normal', surface: 'soft' },
  grazia:     { contentWidth: 700, sectionInset: 26, sectionRadius: 18, spacing: 'airy', surface: 'soft' },
  carmesi_v2: { contentWidth: 700, sectionInset: 24, sectionRadius: 24, spacing: 'normal', surface: 'card' },
  napoly:     { contentWidth: 700, sectionInset: 24, sectionRadius: 22, spacing: 'normal', surface: 'soft' },
  euforia:    { contentWidth: 720, sectionInset: 24, sectionRadius: 24, spacing: 'normal', surface: 'soft' },
  rosegold:   { contentWidth: 700, sectionInset: 24, sectionRadius: 28, spacing: 'airy', surface: 'soft' },
  allegria:   { contentWidth: 760, sectionInset: 22, sectionRadius: 14, spacing: 'compact', surface: 'flat' },
};

export function decorForTemplate(template: string): TemplateDecor | undefined {
  const preset = TEMPLATE_DECOR_DEFAULTS[template];
  return preset ? {
    ...preset,
    floating: preset.floating ? { ...preset.floating } : undefined,
    corners: preset.corners ? { ...preset.corners } : undefined,
    cursorTrail: preset.cursorTrail ? { ...preset.cursorTrail } : undefined,
  } : undefined;
}

export function tokensForTemplate(template: string): TemplateTokens {
  return { ...(TEMPLATE_TOKEN_DEFAULTS[template] ?? TEMPLATE_TOKEN_DEFAULTS.azure) };
}
