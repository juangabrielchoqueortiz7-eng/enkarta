import type { Block, BuilderConfig, PageLayout } from './types';

const TARGET_LAYOUT_VERSION = 2;

function migrateBlock(block: Block): Block {
  const bindings = block.bindings ? { ...block.bindings } : undefined;
  if (block.type === 'gallery' && bindings?.images === 'media.galleryImages' && !bindings.captions
    && (!Array.isArray(block.props.captions) || block.props.captions.length === 0)) {
    bindings.captions = 'media.galleryCaptions';
  }
  return {
    ...block,
    layout: block.layout ? {
      ...block.layout,
      mobile: block.layout.mobile ? { ...block.layout.mobile } : undefined,
      desktop: block.layout.desktop ? { ...block.layout.desktop } : undefined,
    } : undefined,
    bindings,
    children: Array.isArray(block.children) ? block.children.map(migrateBlock) : block.children,
  };
}

export function migratePageLayout(layout?: PageLayout | null): PageLayout | undefined {
  if (!layout?.blocks?.length) return layout ?? undefined;
  return {
    ...layout,
    version: TARGET_LAYOUT_VERSION,
    blocks: layout.blocks.map(migrateBlock),
  };
}

export function migrateBuilderConfig(config: BuilderConfig): BuilderConfig {
  return {
    ...config,
    layout: migratePageLayout(config.layout),
    tokens: config.tokens ? { ...config.tokens } : undefined,
  };
}
