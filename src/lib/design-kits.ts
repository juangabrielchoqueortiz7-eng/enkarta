import type {
  BuilderConfig,
  InvitationParsed,
  InvitationTemplate,
  InvitationType,
  TemplateTheme,
  TemplateTokens,
} from './types';
import { MARFIL_THEME, MARFIL_TOKENS } from './marfil-vivo';

export interface DesignKit {
  id: string;
  name: string;
  vibe: string;
  family: string;
  official: boolean;
  eventTypes: InvitationType[];
  templates: InvitationTemplate[];
  /** Papel, tinta, primario, acento, superficie y línea. */
  colors: [string, string, string, string, string, string];
  theme: TemplateTheme;
  tokens: TemplateTokens;
  fonts: Pick<BuilderConfig, 'fontScript' | 'fontHeading' | 'fontBody'>;
  decor: NonNullable<BuilderConfig['decor']>;
  motion: NonNullable<BuilderConfig['motion']>;
  elements: { iconColor: string; iconScale: number };
}

const typography = (title = 1, subtitle = 1, body = 1, label = 1) => ({ title, subtitle, body, label });

export const DESIGN_KITS: DesignKit[] = [
  {
    id: 'marfil-vivo', name: 'Marfil Vivo', vibe: 'Luminoso, editorial y sereno', family: 'Editorial', official: true,
    eventTypes: ['boda', 'bautizo'], templates: ['grazia', 'provence', 'dolcevita'],
    colors: ['#F7F4EC', '#30392F', '#4B5942', '#A38A58', '#FFFCF6', '#D8D3C4'],
    theme: MARFIL_THEME, tokens: MARFIL_TOKENS,
    fonts: { fontScript: 'Great Vibes', fontHeading: 'Playfair Display', fontBody: 'Outfit' },
    decor: { background: 'solid', texture: 'none', corners: { on: false }, floating: { on: false }, dividers: 'line', loader: 'none' },
    motion: { preset: 'minimal', intensity: 0.55, tempo: 'balanced', scrollFlow: 'free', progress: 'line', parallax: 0 },
    elements: { iconColor: '#4B5942', iconScale: 1 },
  },
  {
    id: 'garden-editorial', name: 'Jardín editorial', vibe: 'Botánico, aireado y romántico', family: 'Botánico', official: true,
    eventTypes: ['boda', 'bautizo'], templates: ['azure', 'paradise', 'dolcevita', 'provence', 'gerbera'],
    colors: ['#F7F3EA', '#25342C', '#315E48', '#D5A94E', '#FFFDF8', '#D7CBB8'],
    theme: { primary: '#315E48', primaryDeep: '#233F32', accent: '#D5A94E', text: '#25342C', muted: '#71816D', line: '#D7CBB8', bg: '#F7F3EA', surface: '#FFFDF8', onPrimary: '#FFFDF7' },
    tokens: { contentWidth: 720, sectionInset: 26, sectionRadius: 26, cardRadius: 24, buttonRadius: 999, fieldRadius: 14, mediaRadius: 24, spacing: 'airy', spacingScale: 1.05, surface: 'soft', shadow: 'soft', buttonStyle: 'solid', cardBorder: 'hairline', typeScale: typography(1.05, 1, 1, 0.96), seam: 'arch', seamFx: 'glass' },
    fonts: { fontScript: 'Pinyon Script', fontHeading: 'Cinzel', fontBody: 'Lora' },
    decor: { background: 'art', texture: 'paper', corners: { on: true, style: 'vine', opacity: 0.78 }, floating: { on: true, shape: 'leaf', count: 4 }, dividers: 'art', loader: 'heart' },
    motion: { preset: 'elegant', intensity: 0.75, tempo: 'balanced' },
    elements: { iconColor: '#315E48', iconScale: 1 },
  },
  {
    id: 'noir-champagne', name: 'Noir champagne', vibe: 'Nocturno, elegante y dramático', family: 'Gala', official: true,
    eventTypes: ['boda', 'xv'], templates: ['primicia', 'obsidiana', 'carmesi_v2', 'sobre'],
    colors: ['#11110F', '#F0E7D4', '#C9A45C', '#E4C98F', '#1C1B18', '#5A4C32'],
    theme: { primary: '#C9A45C', primaryDeep: '#080807', accent: '#E4C98F', text: '#F0E7D4', muted: '#BBAF98', line: '#5A4C32', bg: '#11110F', surface: '#1C1B18', onPrimary: '#11110F' },
    tokens: { contentWidth: 700, sectionInset: 28, sectionRadius: 16, cardRadius: 14, buttonRadius: 8, fieldRadius: 8, mediaRadius: 10, spacing: 'normal', spacingScale: 1, surface: 'card', shadow: 'strong', buttonStyle: 'solid', cardBorder: 'accent', typeScale: typography(1.08, 1.02, 0.98, 0.92), seam: 'bevel', seamFx: 'fold' },
    fonts: { fontScript: 'Mrs Saint Delafield', fontHeading: 'Bodoni Moda', fontBody: 'Jost' },
    decor: { background: 'gradient', texture: 'none', corners: { on: true, style: 'fan', opacity: 0.55 }, floating: { on: true, shape: 'sparkle', count: 4 }, dividers: 'line', loader: 'ring' },
    motion: { preset: 'cinematic3d', intensity: 0.9, tempo: 'slow' },
    elements: { iconColor: '#C9A45C', iconScale: 0.95 },
  },
  {
    id: 'terra-mediterranean', name: 'Terra mediterránea', vibe: 'Cálido, artesanal y natural', family: 'Orgánico', official: true,
    eventTypes: ['boda', 'cumpleanos', 'bautizo'], templates: ['passport', 'terra', 'euforia'],
    colors: ['#FBF4E9', '#4B4038', '#A45136', '#D8AD55', '#FFF9F0', '#D9C7AE'],
    theme: { primary: '#A45136', primaryDeep: '#733724', accent: '#D8AD55', text: '#4B4038', muted: '#7D6D5D', line: '#D9C7AE', bg: '#FBF4E9', surface: '#FFF9F0', onPrimary: '#FFF8ED' },
    tokens: { contentWidth: 720, sectionInset: 24, sectionRadius: 30, cardRadius: 26, buttonRadius: 18, fieldRadius: 14, mediaRadius: 24, spacing: 'airy', spacingScale: 1.08, surface: 'soft', shadow: 'soft', buttonStyle: 'soft', cardBorder: 'hairline', typeScale: typography(1.04, 1.02, 1.02, 0.96), seam: 'wave', seamFx: 'depth' },
    fonts: { fontScript: 'Italianno', fontHeading: 'Marcellus', fontBody: 'Spectral' },
    decor: { background: 'gradient', texture: 'linen', corners: { on: true, style: 'pampas', opacity: 0.72 }, floating: { on: true, shape: 'petal', count: 3 }, dividers: 'art', loader: 'heart' },
    motion: { preset: 'elegant', intensity: 0.65, tempo: 'balanced' },
    elements: { iconColor: '#A45136', iconScale: 1.04 },
  },
  {
    id: 'pastel-celebration', name: 'Celebración pastel', vibe: 'Dulce, colorido y luminoso', family: 'Festivo', official: true,
    eventTypes: ['xv', 'cumpleanos', 'baby_shower'], templates: ['rosegold', 'napoly', 'gerbera'],
    colors: ['#FFF8FA', '#4F4652', '#9B72A5', '#E3B74C', '#FFFFFF', '#E4D3E3'],
    theme: { primary: '#9B72A5', primaryDeep: '#704E78', accent: '#E3B74C', text: '#4F4652', muted: '#8E7E92', line: '#E4D3E3', bg: '#FFF8FA', surface: '#FFFFFF', onPrimary: '#FFFFFF' },
    tokens: { contentWidth: 700, sectionInset: 22, sectionRadius: 32, cardRadius: 28, buttonRadius: 999, fieldRadius: 16, mediaRadius: 28, spacing: 'normal', spacingScale: 1.02, surface: 'card', shadow: 'medium', buttonStyle: 'soft', cardBorder: 'hairline', typeScale: typography(1.08, 1.03, 1, 0.98), seam: 'scallop', seamFx: 'curtain' },
    fonts: { fontScript: 'Dancing Script', fontHeading: 'Playfair Display', fontBody: 'Nunito' },
    decor: { background: 'art', texture: 'paper', corners: { on: true, style: 'rose', opacity: 0.68 }, floating: { on: true, shape: 'confetti', count: 5 }, dividers: 'art', loader: 'heart' },
    motion: { preset: 'playful', intensity: 0.8, tempo: 'quick' },
    elements: { iconColor: '#9B72A5', iconScale: 1.08 },
  },
  {
    id: 'modern-minimal', name: 'Minimal contemporáneo', vibe: 'Limpio, tipográfico y sereno', family: 'Editorial', official: true,
    eventTypes: ['boda', 'xv', 'cumpleanos', 'baby_shower', 'bautizo'], templates: ['allegria', 'primicia', 'marmol', 'perla', 'perla_v2'],
    colors: ['#FAFAF8', '#30383B', '#1E2930', '#8A9A93', '#FFFFFF', '#DDE0DE'],
    theme: { primary: '#1E2930', primaryDeep: '#101719', accent: '#8A9A93', text: '#30383B', muted: '#778084', line: '#DDE0DE', bg: '#FAFAF8', surface: '#FFFFFF', onPrimary: '#FFFFFF' },
    tokens: { contentWidth: 780, sectionInset: 20, sectionRadius: 10, cardRadius: 8, buttonRadius: 8, fieldRadius: 8, mediaRadius: 6, spacing: 'compact', spacingScale: 0.9, surface: 'flat', shadow: 'none', buttonStyle: 'outline', cardBorder: 'hairline', typeScale: typography(1, 0.96, 0.96, 0.9), seam: 'none', seamFx: 'none' },
    fonts: { fontScript: 'Allura', fontHeading: 'Julius Sans One', fontBody: 'Karla' },
    decor: { background: 'solid', texture: 'none', corners: { on: false }, floating: { on: false }, dividers: 'line', loader: 'none' },
    motion: { preset: 'minimal', intensity: 0.45, tempo: 'balanced' },
    elements: { iconColor: '#1E2930', iconScale: 0.92 },
  },
  {
    id: 'celestial-blue', name: 'Azul celestial', vibe: 'Clásico, fresco y luminoso', family: 'Clásico', official: true,
    eventTypes: ['boda', 'bautizo', 'baby_shower'], templates: ['azure', 'grazia', 'esmeralda'],
    colors: ['#F4F8F8', '#29424D', '#235B73', '#D7AD58', '#FFFFFF', '#BFD1D3'],
    theme: { primary: '#235B73', primaryDeep: '#173E50', accent: '#D7AD58', text: '#29424D', muted: '#6B858E', line: '#BFD1D3', bg: '#F4F8F8', surface: '#FFFFFF', onPrimary: '#FFFFFF' },
    tokens: { contentWidth: 720, sectionInset: 24, sectionRadius: 24, cardRadius: 22, buttonRadius: 999, fieldRadius: 14, mediaRadius: 22, spacing: 'airy', spacingScale: 1.04, surface: 'soft', shadow: 'soft', buttonStyle: 'solid', cardBorder: 'hairline', typeScale: typography(1.07, 1, 1, 0.94), seam: 'arch', seamFx: 'glass' },
    fonts: { fontScript: 'Great Vibes', fontHeading: 'Cormorant Garamond', fontBody: 'Lora' },
    decor: { background: 'art', texture: 'paper', corners: { on: true, style: 'orchid', opacity: 0.65 }, floating: { on: true, shape: 'feather', count: 4 }, dividers: 'art', loader: 'ring' },
    motion: { preset: 'elegant', intensity: 0.7, tempo: 'balanced' },
    elements: { iconColor: '#235B73', iconScale: 1 },
  },
];

export function kitMatchScore(kit: DesignKit, data: Pick<InvitationParsed, 'type' | 'template'>): number {
  return (kit.templates.includes(data.template) ? 3 : 0) + (kit.eventTypes.includes(data.type) ? 2 : 0);
}

export function recommendedDesignKits(data: Pick<InvitationParsed, 'type' | 'template'>): DesignKit[] {
  return [...DESIGN_KITS].sort((a, b) => kitMatchScore(b, data) - kitMatchScore(a, data));
}

/** Aplica únicamente estilo: nunca toca contenido, invitados, medios ni bloques. */
export function applyDesignKitPatch(data: InvitationParsed, kit: DesignKit): Partial<InvitationParsed> {
  const cfg = data.config ?? {};
  return {
    color_primary: kit.theme.primary || kit.colors[2],
    color_secondary: kit.theme.bg || kit.colors[0],
    color_accent: kit.theme.text || kit.colors[1],
    config: {
      ...cfg,
      ...kit.fonts,
      designMode: kit.official ? 'guided' : cfg.designMode,
      designKitId: kit.id,
      iconColor: kit.elements.iconColor,
      iconScale: kit.elements.iconScale,
      theme: { ...kit.theme },
      tokens: { ...kit.tokens, ...(kit.official ? { visualProfile: kit.tokens.visualProfile ?? 'collection-v1' as const } : {}), typeScale: { ...kit.tokens.typeScale } },
      decor: {
        ...kit.decor,
        corners: kit.decor.corners ? { ...kit.decor.corners } : undefined,
        floating: kit.decor.floating ? { ...kit.decor.floating } : undefined,
      },
      motion: { ...kit.motion },
    },
  };
}
