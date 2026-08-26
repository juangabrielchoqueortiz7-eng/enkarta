import type { Block, InvitationParsed } from './types';

export type PublicationResourceKind = 'image' | 'audio' | 'video' | 'link';

export interface PublicationResource {
  url: string;
  kind: PublicationResourceKind;
  label: string;
  blockId?: string;
}

export interface PublicationMetrics {
  blocks: number;
  sections: number;
  images: number;
  links: number;
  animatedBlocks: number;
  animationStyles: number;
  approximateDocumentKb: number;
}

export function flattenPublicationBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap(block => [block, ...flattenPublicationBlocks(block.children ?? [])]);
}

function resourceKind(block: Block, key: string): PublicationResourceKind | null {
  const normalized = key.toLowerCase();
  if (normalized.includes('music') || normalized.includes('audio')) return 'audio';
  if (block.type === 'video' && normalized === 'url') return 'video';
  if (['image', 'element', 'beforeAfter', 'story'].includes(block.type) && /url|image|before|after|photo|qr/.test(normalized)) return 'image';
  if (/image|photo|before|after|qr/.test(normalized)) return 'image';
  if (/href|url|link|share/.test(normalized)) return 'link';
  return null;
}

function scanValue(block: Block, value: unknown, path: string, result: PublicationResource[]) {
  if (typeof value === 'string') {
    const url = value.trim();
    if (!/^(https?:|data:|mailto:|tel:)/i.test(url)) return;
    const key = path.split('.').pop() || path;
    const kind = resourceKind(block, key);
    if (kind) result.push({ url, kind, label: `${block.type} · ${key}`, blockId: block.id });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanValue(block, item, `${path}.${index}`, result));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => scanValue(block, item, `${path}.${key}`, result));
  }
}

export function collectPublicationResources(data: InvitationParsed): PublicationResource[] {
  const resources: PublicationResource[] = [];
  const add = (url: unknown, kind: PublicationResourceKind, label: string) => {
    if (typeof url === 'string' && url.trim()) resources.push({ url: url.trim(), kind, label });
  };
  add(data.cover_image_url, 'image', 'Portada principal');
  add(data.gallery_url, 'link', 'Galería externa');
  add(data.config?.musicUrl, 'audio', 'Música');
  data.config?.galleryImages?.forEach((url, index) => add(url, 'image', `Galería · foto ${index + 1}`));
  Object.entries(data.config?.sectionImages ?? {}).forEach(([key, url]) => add(url, 'image', `Sección · ${key}`));
  Object.entries(data.config?.sectionIcons ?? {}).forEach(([key, url]) => {
    if (/^https?:|^data:/i.test(url)) add(url, 'image', `Icono · ${key}`);
  });
  const blocks = flattenPublicationBlocks(data.config?.layout?.blocks ?? []);
  blocks.forEach(block => {
    add(block.style?.bgImage, 'image', `${block.type} · fondo`);
    Object.entries(block.props ?? {}).forEach(([key, value]) => scanValue(block, value, key, resources));
  });
  const deduped = new Map<string, PublicationResource>();
  resources.forEach(resource => {
    const key = `${resource.kind}:${resource.url}`;
    if (!deduped.has(key)) deduped.set(key, resource);
  });
  return Array.from(deduped.values());
}

export function publicationMetrics(data: InvitationParsed): PublicationMetrics {
  const sections = (data.config?.layout?.blocks ?? []).filter(block => block.enabled !== false);
  const blocks = flattenPublicationBlocks(sections);
  const resources = collectPublicationResources(data);
  const animations = blocks
    .map(block => block.animation?.preset || (typeof block.props?.anim === 'string' ? block.props.anim : 'none'))
    .filter(value => value && value !== 'none');
  return {
    blocks: blocks.length,
    sections: sections.length,
    images: resources.filter(resource => resource.kind === 'image').length,
    links: resources.filter(resource => resource.kind === 'link').length,
    animatedBlocks: animations.length,
    animationStyles: new Set(animations).size,
    approximateDocumentKb: Math.max(1, Math.ceil(new TextEncoder().encode(JSON.stringify(data)).byteLength / 1024)),
  };
}
