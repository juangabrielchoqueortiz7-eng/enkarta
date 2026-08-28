import type { Block, BuilderConfig, InvitationTemplate, PageLayout } from './types';
import { decorForTemplate, themeForTemplate, tokensForTemplate } from './template-themes';

/** Versioned defaults for NEW documents only. Saved invitations are never inferred or migrated. */
export function collectionDesign(template: InvitationTemplate): Partial<BuilderConfig> {
  const dark = template === 'obsidiana';
  const editorial = ['primicia', 'grazia', 'allegria'].includes(template);
  const botanical = ['azure', 'paradise', 'dolcevita'].includes(template);
  const base = themeForTemplate(template);
  const decor = decorForTemplate(template);
  return {
    designMode: 'guided',
    fontHeading: dark || template === 'primicia' ? 'Cinzel' : botanical ? 'Cormorant Garamond' : 'Playfair Display',
    fontBody: 'Outfit',
    theme: {
      ...base,
      // Primary is functional ink, not a pale decorative gold. Accent retains the original hue.
      accent: base.primary,
      primary: dark ? '#D5BB83' : base.primaryDeep,
      primaryDeep: dark ? '#242119' : base.primaryDeep,
      muted: dark ? '#C7BDA9' : `color-mix(in srgb, ${base.text} 78%, ${base.bg})`,
      surface: dark ? '#1C1A16' : `color-mix(in srgb, ${base.bg} 70%, white)`,
      onPrimary: dark ? '#17150F' : '#FFFFFF',
    },
    tokens: {
      ...tokensForTemplate(template), visualProfile: 'collection-v1',
      contentWidth: 940, sectionInset: 24, sectionRadius: 0,
      cardRadius: editorial || dark ? 6 : 14, mediaRadius: editorial || dark ? 4 : 16,
      fieldRadius: 6, buttonRadius: botanical ? 24 : 6,
      spacing: 'airy', spacingScale: 1, surface: 'flat', shadow: 'none',
      buttonStyle: 'solid', cardBorder: 'hairline', seam: botanical ? 'arch' : 'none', seamFx: 'none',
      typeScale: { title: 1, subtitle: 1, body: 1, label: 1 },
    },
    decor: { ...decor, background: 'solid', floating: { on: false }, cursorTrail: { on: false }, texture: botanical ? 'paper' : 'none', corners: { ...decor?.corners, opacity: 0.32 } },
    motion: { preset: 'minimal', intensity: 0.55, parallax: 0, scrollFlow: 'free', progress: 'line' },
  };
}

/** Curated arrangements, applied at creation, not during rendering. */
export function curateCollectionLayout(layout: PageLayout, template: InvitationTemplate): PageLayout {
  const editorial = ['primicia', 'grazia', 'allegria'].includes(template);
  const dark = template === 'obsidiana';
  const curate = (block: Block): Block => {
    const props = { ...block.props };
    if (block.type === 'countdown') Object.assign(props, { display: dark ? 'cards' : editorial ? 'minimal' : 'rings', showSeconds: false });
    if (block.type === 'itinerary') Object.assign(props, { layout: editorial || dark ? 'editorial' : 'timeline', showNumbers: false, showConnectors: true });
    if (block.type === 'gallery') Object.assign(props, { layout: 'filmstrip', showCounter: true, lightbox: true });
    return {
      ...block, props,
      animation: { preset: ['cover', 'passportHero'].includes(block.type) ? 'none' : 'fadeUp' },
      style: { ...block.style, maxWidth: block.type === 'gallery' ? 1080 : ['cover', 'passportHero', 'group'].includes(block.type) ? 940 : 680 },
      ...(block.children ? { children: block.children.map(curate) } : {}),
    };
  };
  return { ...layout, blocks: layout.blocks.map(curate) };
}

const TYPOGRAPHY_OVERRIDES = ['family', 'textColor', 'weight', 'tracking', 'lineHeight', 'textCase', 'textOpacity', 'textShadow'];
const TEXT_SIZE_BLOCKS = new Set(['cover', 'heading', 'text', 'quote', 'hashtag']);

/** Explicit inspector action: keeps content, IDs, bindings, visibility, geometry and children. */
export function restoreBlockCollectionStyle(block: Block): Block {
  const props = { ...block.props };
  TYPOGRAPHY_OVERRIDES.forEach(key => delete props[key]);
  // Other blocks use `size` for geometry (icons, separators…), not typography.
  if (TEXT_SIZE_BLOCKS.has(block.type)) delete props.size;
  const style = { ...block.style };
  ['text', 'textMuted', 'borderColor', 'radius', 'shadow', 'fontFamily'].forEach(key => delete (style as Record<string, unknown>)[key]);
  return { ...block, props, style };
}

/** Empty optional sections stay editable, but should not leave a blank public chapter. */
export function isEmptyOptionalBlock(block: Block): boolean {
  if (block.type === 'gallery' && typeof block.props.shareUrl === 'string' && block.props.shareUrl.trim()) return false;
  const key = block.type === 'gallery' ? 'images' : block.type === 'itinerary' ? 'items' : null;
  if (key) return !Array.isArray(block.props[key]) || (block.props[key] as unknown[]).length === 0;
  return block.type === 'group' && !!block.children?.length && block.children.every(child => child.enabled === false || isEmptyOptionalBlock(child));
}
