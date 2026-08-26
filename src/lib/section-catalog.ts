import type { Block, BlockType, InvitationTemplate } from './types';

export type SectionMoment = 'Apertura' | 'Historia' | 'Evento' | 'Información' | 'Confirmación' | 'Cierre';
export type SectionStyle = 'Romántico' | 'Editorial' | 'Minimal' | 'Botánico' | 'Viaje' | 'Festivo';
export type SectionPreviewKind = 'hero' | 'message' | 'quote' | 'countdown' | 'events' | 'schedule' | 'map' | 'details' | 'story' | 'gallery' | 'cinema' | 'video' | 'family' | 'gift' | 'interactive' | 'closing';

export interface SectionCatalogMeta {
  moment: SectionMoment;
  styles: SectionStyle[];
  preview: SectionPreviewKind;
  tags: string[];
  featured?: boolean;
}

export const SECTION_MOMENTS: Array<'Todas' | SectionMoment> = ['Todas', 'Apertura', 'Historia', 'Evento', 'Información', 'Confirmación', 'Cierre'];
export const SECTION_STYLES: Array<'Todos' | SectionStyle> = ['Todos', 'Romántico', 'Editorial', 'Minimal', 'Botánico', 'Viaje', 'Festivo'];

const META: Record<string, SectionCatalogMeta> = {
  'cover-photo': { moment: 'Apertura', styles: ['Romántico', 'Editorial', 'Botánico'], preview: 'hero', tags: ['portada', 'foto', 'nombres'], featured: true },
  welcome: { moment: 'Apertura', styles: ['Romántico', 'Minimal'], preview: 'message', tags: ['bienvenida', 'mensaje'] },
  verse: { moment: 'Apertura', styles: ['Romántico', 'Botánico', 'Minimal'], preview: 'quote', tags: ['versículo', 'frase', 'cita'] },
  'save-date': { moment: 'Apertura', styles: ['Editorial', 'Minimal', 'Festivo'], preview: 'countdown', tags: ['fecha', 'contador', 'calendario'], featured: true },
  events: { moment: 'Evento', styles: ['Romántico', 'Editorial', 'Minimal'], preview: 'events', tags: ['ceremonia', 'recepción', 'lugar'], featured: true },
  schedule: { moment: 'Evento', styles: ['Editorial', 'Minimal', 'Viaje', 'Festivo'], preview: 'schedule', tags: ['itinerario', 'horario', 'agenda'], featured: true },
  directions: { moment: 'Evento', styles: ['Minimal', 'Viaje'], preview: 'map', tags: ['mapa', 'ubicación', 'dirección'] },
  details: { moment: 'Información', styles: ['Editorial', 'Minimal'], preview: 'details', tags: ['vestimenta', 'avisos', 'adultos'] },
  story: { moment: 'Historia', styles: ['Romántico', 'Botánico'], preview: 'story', tags: ['historia', 'timeline', 'recuerdos'], featured: true },
  gallery: { moment: 'Historia', styles: ['Romántico', 'Editorial', 'Festivo'], preview: 'gallery', tags: ['galería', 'fotos', 'mosaico'], featured: true },
  cinema: { moment: 'Historia', styles: ['Editorial', 'Romántico'], preview: 'cinema', tags: ['cinematográfico', 'scroll', 'foto'] },
  video: { moment: 'Historia', styles: ['Editorial', 'Festivo'], preview: 'video', tags: ['video', 'mensaje'] },
  'then-now': { moment: 'Historia', styles: ['Romántico', 'Festivo'], preview: 'gallery', tags: ['antes', 'después', 'comparación'] },
  family: { moment: 'Información', styles: ['Romántico', 'Minimal'], preview: 'family', tags: ['padres', 'familia', 'padrinos'] },
  'guests-info': { moment: 'Información', styles: ['Minimal', 'Viaje'], preview: 'details', tags: ['invitados', 'hospedaje', 'vestimenta'] },
  gifts: { moment: 'Información', styles: ['Romántico', 'Minimal'], preview: 'gift', tags: ['regalo', 'banco', 'qr'] },
  guestbook: { moment: 'Confirmación', styles: ['Romántico', 'Festivo'], preview: 'interactive', tags: ['mensajes', 'firmas', 'recuerdos'] },
  tables: { moment: 'Confirmación', styles: ['Editorial', 'Festivo'], preview: 'interactive', tags: ['mesa', 'invitados', 'buscar'] },
  closing: { moment: 'Cierre', styles: ['Romántico', 'Editorial', 'Botánico'], preview: 'closing', tags: ['confirmación', 'rsvp', 'cierre'], featured: true },
  'xv-welcome': { moment: 'Apertura', styles: ['Romántico', 'Festivo'], preview: 'hero', tags: ['xv', 'quinceaños', 'corona'] },
  'xv-party': { moment: 'Evento', styles: ['Festivo', 'Romántico'], preview: 'schedule', tags: ['xv', 'vals', 'fiesta'] },
  'xv-court': { moment: 'Información', styles: ['Romántico', 'Festivo'], preview: 'family', tags: ['xv', 'damas', 'chambelanes'] },
  birthday: { moment: 'Apertura', styles: ['Festivo'], preview: 'hero', tags: ['cumpleaños', 'fiesta', 'pastel'] },
  'baby-shower': { moment: 'Apertura', styles: ['Romántico', 'Festivo'], preview: 'hero', tags: ['baby shower', 'bebé'] },
  baptism: { moment: 'Apertura', styles: ['Romántico', 'Minimal'], preview: 'quote', tags: ['bautizo', 'bendición'] },
};

const GROUP_FALLBACK: Record<string, SectionMoment> = {
  Inicio: 'Apertura',
  'El evento': 'Evento',
  'Fotos y recuerdos': 'Historia',
  Invitados: 'Información',
  'XV Años': 'Evento',
  'Otros eventos': 'Apertura',
};

export function sectionCatalogMeta(key: string, group: string): SectionCatalogMeta {
  return META[key] ?? {
    moment: GROUP_FALLBACK[group] ?? 'Información',
    styles: ['Minimal'],
    preview: 'message',
    tags: [],
  };
}

const TEMPLATE_STYLES: Partial<Record<InvitationTemplate, SectionStyle[]>> = {
  azure: ['Botánico', 'Romántico'],
  primicia: ['Editorial', 'Minimal'],
  passport: ['Viaje', 'Editorial'],
  paradise: ['Botánico', 'Romántico'],
  obsidiana: ['Editorial', 'Minimal'],
  dolcevita: ['Romántico', 'Botánico'],
  grazia: ['Minimal', 'Editorial'],
  carmesi_v2: ['Editorial', 'Romántico'],
  napoly: ['Festivo', 'Romántico'],
  euforia: ['Festivo', 'Editorial'],
  rosegold: ['Romántico', 'Editorial'],
  allegria: ['Botánico', 'Minimal'],
  provence: ['Botánico', 'Editorial'],
};

export function isSectionRecommended(meta: SectionCatalogMeta, template: InvitationTemplate): boolean {
  const wanted = TEMPLATE_STYLES[template] ?? ['Minimal'];
  return meta.styles.some(style => wanted.includes(style));
}

const DESIGN_KEYS = new Set([
  'font', 'size', 'display', 'showSeconds', 'layout', 'wreath', 'color', 'color2', 'color3', 'color4',
  'rounded', 'maxHeight', 'focal', 'overlay', 'height', 'filled', 'style', 'width', 'motif', 'columns',
  'mode', 'zoom', 'imageRotate', 'imageFlipH', 'imageFlipV', 'brightness', 'contrast', 'imageSaturation', 'grayscale', 'sepia',
  'temperature', 'blur', 'mask', 'overlayColor', 'overlayOpacity', 'overlayMode', 'overlayBlend',
]);

function flatten(blocks: Block[]): Block[] {
  return blocks.flatMap(block => [block, ...(block.children ? flatten(block.children) : [])]);
}

/** Conserva el contenido compatible al reemplazar una composición por otra. */
export function transferSectionContent(created: Block[], existing: Block[]): Block[] {
  const queues = new Map<BlockType, Block[]>();
  flatten(existing).forEach(block => queues.set(block.type, [...(queues.get(block.type) ?? []), block]));

  const visit = (target: Block): Block => {
    const source = queues.get(target.type)?.shift();
    const sourceContent = source
      ? Object.fromEntries(Object.entries(source.props).filter(([key]) => !DESIGN_KEYS.has(key)))
      : {};
    return {
      ...target,
      props: { ...target.props, ...sourceContent },
      bindings: source?.bindings ?? target.bindings,
      children: target.children?.map(visit),
    };
  };

  return created.map(visit);
}
