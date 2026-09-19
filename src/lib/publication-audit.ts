import type { Block, InvitationParsed } from './types';
import { resolveLayoutBindings } from './block-bindings';

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
  animatedImages: number;
  videos: number;
  links: number;
  animatedBlocks: number;
  animationStyles: number;
  approximateDocumentKb: number;
}

export function flattenPublicationBlocks(blocks: Block[]): Block[] {
  return blocks.filter(block => block.enabled !== false).flatMap(block => [block, ...flattenPublicationBlocks(block.children ?? [])]);
}

export const isAnimatedResource = (url: string) => /\.(gif|webp)(?:[?#]|$)/i.test(url) || /^data:image\/(gif|webp)/i.test(url);
export const resourceBudgetBytes = (kind: string, url: string) => kind === 'video' ? 8_000_000 : kind === 'audio' ? 12_000_000 : isAnimatedResource(url) ? 3_000_000 : 1_500_000;

function normalizeResourceKind(kind: PublicationResourceKind, url: string): PublicationResourceKind {
  return kind === 'video' && isAnimatedResource(url) ? 'image' : kind;
}

function resourceKind(block: Block, key: string): PublicationResourceKind | null {
  const normalized = key.toLowerCase();
  if (normalized.includes('music') || normalized.includes('audio')) return 'audio';
  if (block.type === 'cinematicHero' && normalized === 'videourl') return 'video';
  if (block.type === 'cinematicHero' && normalized === 'poster') return 'image';
  if (block.type === 'video' && normalized === 'url') return 'video';
  if (block.type === 'video' && normalized === 'poster') return 'image';
  if (['image', 'element', 'beforeAfter', 'story'].includes(block.type) && /url|image|before|after|photo|qr/.test(normalized)) return 'image';
  if (/image|photo|before|after|qr/.test(normalized)) return 'image';
  if (/href|url|link|share/.test(normalized)) return 'link';
  return null;
}

function scanValue(block: Block, value: unknown, path: string, result: PublicationResource[]) {
  if (typeof value === 'string') {
    const url = value.trim();
    if (!/^(https?:|data:|mailto:|tel:|\/(?!\/))/i.test(url)) return;
    const key = path.split('.').filter(part => !/^\d+$/.test(part)).pop() || path;
    const kind = resourceKind(block, key);
    if (kind) result.push({ url, kind: normalizeResourceKind(kind, url), label: `${block.type} · ${key}`, blockId: block.id });
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
    if (typeof url === 'string' && url.trim()) resources.push({ url: url.trim(), kind: normalizeResourceKind(kind, url), label });
  };
  add(data.cover_image_url, 'image', 'Portada principal');
  add(data.gallery_url, 'link', 'Galería externa');
  add(data.config?.musicUrl, 'audio', 'Música');
  add(data.config.limone?.artImage, 'image', 'Casa Limone · acuarela');
  add(data.config.atelier?.artImage, 'image', 'Atelier · decoración flotante');
  add(data.config.silk?.artImage, 'image', 'Jardín de Seda · acuarela');
  const ma=data.config.mariaMario;
  if(ma)Object.entries(ma).forEach(([key,value])=>{if(key.endsWith('Image'))add(value,'image','María · '+key);if(key.endsWith('Video'))add(value,'video','María · '+key);if(key.endsWith('Images')&&Array.isArray(value))value.forEach(url=>add(url,'image','María · '+key));});
  ma?.hotels?.forEach(h=>{add(h.image,'image',h.name);add(h.url,'link',h.name);});
  add(ma?.playlistUrl,'link','Playlist');
  const km=data.config.karlaMauricio;
  if(km)Object.entries(km).forEach(([key,value])=>{if(key.endsWith('Image'))add(value,'image','Karla · '+key);});
  add(km?.registryUrl,'link','Lista de regalos');
  const pj=data.config.paulaJuanFelipe;
  if(pj)Object.entries(pj).forEach(([key,value])=>{if(key.endsWith('Image'))add(value,'image','Paula · '+key);if(key.endsWith('Images')&&Array.isArray(value))value.forEach((url,i)=>add(url,'image','Paula · '+key+' '+(i+1)));});
  const mj=data.config.marianaJesus;
  if(mj)Object.entries(mj).forEach(([key,url])=>{if(key.endsWith('Image'))add(url,'image','Mariana · '+key);if(key.endsWith('Video'))add(url,'video','Mariana · '+key);});
  add(mj?.hotelUrl,'link','Contacto hospedaje');
  const mm=data.config.manuelMaya;
  [mm?.coverImages,mm?.firstImages,mm?.secondImages,mm?.closingImages,mm?.collageImages,mm?.registryImages].forEach((list,group)=>list?.forEach((url,i)=>add(url,'image',`Manuel galería ${group+1} · foto ${i+1}`)));
  [mm?.backgroundImage,mm?.entryLeftImage,mm?.entryRightImage,mm?.sealImage,mm?.churchImage].forEach((url,i)=>add(url,'image',`Manuel recurso ${i+1}`));
  mm?.registryUrls?.forEach(url=>add(url,'link','Lista de regalos'));
  const nf=data.config.nicoleFrancisco;
  [nf?.collageImages,nf?.portraitImages,nf?.closingImages].forEach((list,group)=>list?.forEach((url,i)=>add(url,'image',`Nicole galería ${group+1} · foto ${i+1}`)));
  [nf?.backgroundImage,nf?.flowersImage,nf?.monogramImage,nf?.envelopeImage,nf?.registryImage].forEach((url,i)=>add(url,'image',`Nicole recurso ${i+1}`));
  const ry=data.config.rolyYeliana;
  [ry?.firstImages,ry?.secondImages,ry?.thirdImages,ry?.closingImages].forEach((list,group)=>list?.forEach((url,i)=>add(url,'image',`Roly carrusel ${group+1} · foto ${i+1}`)));
  [ry?.backgroundImage,ry?.dressImage,ry?.registryImage].forEach((url,i)=>add(url,'image',`Roly recurso ${i+1}`));
  const la = data.config?.designKey === 'annie-y-micky' ? data.config?.annieMicky : data.config?.lauraAndres;
  [la?.coverImages, la?.portraitImages, la?.closingImages, data.config?.annieMicky?.wideImages].forEach((list, group) => list?.forEach((url, i) => add(url, 'image', `Carrusel ${group + 1} · foto ${i + 1}`)));
  [la?.sealImage, la?.envelopeImage, la?.dividerImage].forEach(url => add(url, 'image', 'Papelería de la invitación'));

  if (data.config?.entry?.enabled !== false && data.config?.entry?.style === 'cinematic') {
    add(data.config?.entry?.videoUrl, 'video', 'Entrada cinematográfica · video');
    add(data.config?.entry?.poster, 'image', 'Entrada cinematográfica · poster');
  }
  data.config?.galleryImages?.forEach((url, index) => add(url, 'image', `Galería · foto ${index + 1}`));
  Object.entries(data.config?.sectionImages ?? {}).forEach(([key, url]) => add(url, 'image', `Sección · ${key}`));
  Object.entries(data.config?.sectionIcons ?? {}).forEach(([key, url]) => {
    if (/^https?:|^data:/i.test(url)) add(url, 'image', `Icono · ${key}`);
  });
  const layout = data.config?.layout;
  const blocks = flattenPublicationBlocks(layout ? resolveLayoutBindings(layout, data).blocks : []);
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
    animatedImages: resources.filter(resource => resource.kind === 'image' && isAnimatedResource(resource.url)).length,
    videos: resources.filter(resource => resource.kind === 'video').length,
    links: resources.filter(resource => resource.kind === 'link').length,
    animatedBlocks: animations.length,
    animationStyles: new Set(animations).size,
    approximateDocumentKb: Math.max(1, Math.ceil(new TextEncoder().encode(JSON.stringify(data)).byteLength / 1024)),
  };
}
