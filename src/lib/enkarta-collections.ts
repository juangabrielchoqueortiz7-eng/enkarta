import {CLEAN_DESIGNS} from './clean-designs';
import type { InvitationTemplate } from '@/lib/types';

/**
 * Identidad pública de las colecciones Enkarta.
 *
 * Las claves técnicas se conservan deliberadamente para que las invitaciones
 * ya publicadas, enlaces de muestra y filas de base de datos sigan funcionando.
 * Ninguna interfaz debe mostrar esas claves directamente: el nombre visible,
 * la voz y la dirección artística viven únicamente en este registro.
 */
export interface EnkartaCollection {
  key: InvitationTemplate;
  name: string;
  series: 'Origen' | 'Atelier';
  tag: string;
  description: string;
  artDirection: string;
  image: string;
  accent: string;
  ink: string;
  premium: boolean;
  available: boolean;
  demoKey?: string;
}

export const ENKARTA_COLLECTIONS: Record<InvitationTemplate, EnkartaCollection> = {
  azure: {
    key: 'azure', name: 'Lunaria', series: 'Origen', tag: 'Botánico',
    description: 'Azul orquídea de líneas etéreas',
    artDirection: 'Acuarela fría, orquídeas lineales y mucho aire editorial.',
    image: '/catalog/azure.jpg', accent: '#3A72A6', ink: '#173957', premium: true, available: true,
  },
  primicia: {
    key: 'primicia', name: 'Áurea', series: 'Origen', tag: 'Editorial',
    description: 'Editorial nocturna con acentos dorados',
    artDirection: 'Tipografía de gran formato, ritmo periodístico y oro cálido sobre tinta.',
    image: '/catalog/primicia.jpg', accent: '#C89828', ink: '#20170D', premium: true, available: true,
  },
  passport: {
    key: 'passport', name: 'Atlas', series: 'Origen', tag: 'Viajero',
    description: 'Bitácora de viaje botánica',
    artDirection: 'Sellos, mapas, papel de viaje y verde oliva contemporáneo.',
    image: '/catalog/passport.jpg', accent: '#6A8A45', ink: '#314020', premium: true, available: true,
  },
  paradise: {
    key: 'paradise', name: 'Verdealma', series: 'Origen', tag: 'Jardín',
    description: 'Jardín tropical en salvia y oro',
    artDirection: 'Vegetación envolvente, arcos orgánicos y contraste de bosque.',
    image: '/catalog/paradise.jpg', accent: '#5F6B47', ink: '#354126', premium: true, available: true,
  },
  obsidiana: {
    key: 'obsidiana', name: 'Nocturna', series: 'Origen', tag: 'Luxe',
    description: 'Contraste negro, marfil y oro',
    artDirection: 'Escena nocturna, mármol sobrio y destellos metálicos contenidos.',
    image: '/catalog/obsidiana.jpg', accent: '#C6A86A', ink: '#17150F', premium: true, available: true,
  },
  dolcevita: {
    key: 'dolcevita', name: 'Oliva', series: 'Origen', tag: 'Mediterráneo',
    description: 'Marfil botánico de espíritu mediterráneo',
    artDirection: 'Papel marfil, ramas de olivo y composición romántica luminosa.',
    image: '/catalog/dolcevita.jpg', accent: '#4F7A52', ink: '#344535', premium: true, available: true,
  },
  grazia: {
    key: 'grazia', name: 'Seda', series: 'Origen', tag: 'Minimal',
    description: 'Champán minimalista y luminoso',
    artDirection: 'Simetría delicada, champán mate y jerarquía tipográfica silenciosa.',
    image: '/catalog/grazia.jpg', accent: '#BCA478', ink: '#3B352A', premium: true, available: true,
  },
  carmesi_v2: {
    key: 'carmesi_v2', name: 'Granate', series: 'Origen', tag: 'Dramático',
    description: 'Vino profundo, rosas y destellos dorados',
    artDirection: 'Rojos de bodega, rosas escultóricas y encuadres cinematográficos.',
    image: '/catalog/carmesi.jpg', accent: '#871A2F', ink: '#4B1722', premium: true, available: true, demoKey: 'carmesi',
  },
  napoly: {
    key: 'napoly', name: 'Nácar', series: 'Origen', tag: 'Sereno',
    description: 'Taupe suave y rosa empolvado',
    artDirection: 'Capas nacaradas, rosa mineral y elegancia clásica de bajo contraste.',
    image: '/catalog/perla.jpg', accent: '#B98A86', ink: '#5A4542', premium: true, available: true,
  },
  perla_v2: {
    key: 'perla_v2', name: 'Lirio Atelier', series: 'Atelier', tag: 'Botánico',
    description: 'Marfil, lirios y oro delicado',
    artDirection: 'Ilustración botánica de estudio y marcos de joyería fina.',
    image: '/catalog/perla.jpg', accent: '#B8975A', ink: '#4D493F', premium: true, available: false,
  },
  euforia: {
    key: 'euforia', name: 'Terracota', series: 'Origen', tag: 'Acuarela',
    description: 'Acuarela cálida en tonos mocha',
    artDirection: 'Manchas pictóricas, tierra tostada y movimiento festivo.',
    image: '/catalog/euforia.jpg', accent: '#8A7257', ink: '#4D4033', premium: true, available: true,
  },
  rosegold: {
    key: 'rosegold', name: 'Aurora Rosa', series: 'Origen', tag: 'Romántico',
    description: 'Blush floral con brillo satinado',
    artDirection: 'Luz rosada, flores suaves y detalles metálicos sin exceso.',
    image: '/catalog/rosegold.jpg', accent: '#B97F86', ink: '#66484D', premium: true, available: true,
  },
  allegria: {
    key: 'allegria', name: 'Salvia', series: 'Origen', tag: 'Orgánico',
    description: 'Minimalismo orgánico y fresco',
    artDirection: 'Salvia pálida, líneas limpias y ritmo visual calmado.',
    image: '/catalog/allegria.jpg', accent: '#8C9A86', ink: '#3E493B', premium: true, available: true,
  },
  provence: {
    key: 'provence', name: 'Solar', series: 'Atelier', tag: 'Mediterráneo',
    description: 'Marfil solar y dorado natural',
    artDirection: 'Arquitectura cálida, olivos y fotografía editorial bañada por el sol.',
    image: '/catalog/solar-original.png', accent: '#B69355', ink: '#55452F', premium: true, available: false,
  },
  esmeralda: {
    key: 'esmeralda', name: 'Esmeralda', series: 'Atelier', tag: 'Bosque',
    description: 'Verde bosque formal y aireado',
    artDirection: 'Verde joya, composición ceremonial y amplios descansos visuales.',
    image: '/catalog/paradise.jpg', accent: '#3D6752', ink: '#203A31', premium: true, available: false,
  },
  perla: {
    key: 'perla', name: 'Lirio', series: 'Atelier', tag: 'Clásico',
    description: 'Hojas verdes y oro delicado', artDirection: 'Clásico botánico y ceremonial.',
    image: '/catalog/perla.jpg', accent: '#B8975A', ink: '#4D493F', premium: false, available: true,
  },
  marmol: {
    key: 'marmol', name: 'Galería', series: 'Atelier', tag: 'Mineral',
    description: 'Texturas minerales sofisticadas', artDirection: 'Mármol claro y composición de galería.',
    image: '/catalog/grazia.jpg', accent: '#A59A86', ink: '#393632', premium: false, available: true,
  },
  terra: {
    key: 'terra', name: 'Raíz', series: 'Atelier', tag: 'Rústico',
    description: 'Tonos tierra, lino y calidez natural', artDirection: 'Materia, fibras y tierra húmeda.',
    image: '/catalog/euforia.jpg', accent: '#A06F4D', ink: '#4E382A', premium: false, available: true,
  },
  sobre: {
    key: 'sobre', name: 'Lacre', series: 'Atelier', tag: 'Ceremonial',
    description: 'Apertura clásica inspirada en papelería', artDirection: 'Papel grueso, pliegues y sello ceremonial.',
    image: '/catalog/grazia.jpg', accent: '#A98252', ink: '#4B4033', premium: false, available: true,
  },
  carmesi: {
    key: 'carmesi', name: 'Rubí', series: 'Atelier', tag: 'Dramático',
    description: 'Rojos profundos y contraste elegante', artDirection: 'Rubí oscuro y composición de gala.',
    image: '/catalog/carmesi.jpg', accent: '#871A2F', ink: '#4B1722', premium: false, available: true,
  },
  gerbera: {
    key: 'gerbera', name: 'Solara', series: 'Atelier', tag: 'Floral',
    description: 'Flores vibrantes y luz de atardecer', artDirection: 'Color solar, pétalos y energía festiva.',
    image: '/catalog/euforia.jpg', accent: '#D27A4B', ink: '#5B382B', premium: false, available: true,
  },
};

export const STARTER_COLLECTION_KEYS = [
  'azure', 'primicia', 'passport', 'paradise', 'obsidiana', 'dolcevita',
  'grazia', 'carmesi_v2', 'napoly', 'euforia', 'rosegold', 'allegria',
] as const satisfies readonly InvitationTemplate[];

export type StarterCollectionKey = (typeof STARTER_COLLECTION_KEYS)[number];

export const STARTER_COLLECTIONS = STARTER_COLLECTION_KEYS.map((key) => ENKARTA_COLLECTIONS[key]) as Array<
  EnkartaCollection & { key: StarterCollectionKey }
>;

/** Un diseño por bloques puede compartir base técnica sin exigir un nuevo enum SQL. */
export const MARFIL_VIVO_DESIGN = {
  key: 'marfil-vivo', baseTemplate: 'grazia', name: 'Marfil Vivo', series: 'Atelier', tag: 'Editorial vivo',
  description: 'Marfil, oliva y fotografía con ritmo editorial',
  artDirection: 'Una apertura luminosa, tipografía serena y capítulos con aire. Completamente editable por bloques.',
  image: '/catalog/solar-original.png', accent: '#8B7651', ink: '#394437', premium: true, available: true,
  demoKey: 'marfil-vivo',
} as const;

export const LAURA_ANDRES_DESIGN = {
  key: 'laura-y-andres', baseTemplate: 'dolcevita', name: 'Laura y Andrés', series: 'Atelier', tag: 'Romántico',
  description: 'Sobre de lacre, fotografía y caligrafía en oliva',
  artDirection: 'La composición completa de Laura y Andrés, con contenidos y medios editables.',
  image: '/invitations/laura-andres/portada-Laura-y-Andres16.webp', accent: '#68693f', ink: '#544e39', premium: true, available: true,
  demoKey: 'laura-y-andres',
} as const;
export const ANNIE_MICKY_DESIGN={key:'annie-y-micky',baseTemplate:'dolcevita',name:'Annie y Micky',series:'Atelier',tag:'Jardín editorial',description:'Marfil, oliva y fotografías originales',artDirection:'Papelería clásica, familia y una celebración entre olivos. Contenido editable.',image:'/invitations/annie-micky/jardin.webp',accent:'#747c5b',ink:'#514d40',premium:true,available:true,demoKey:'annie-y-micky'} as const;
export const ROLY_YELIANA_DESIGN={key:'roly-y-yeliana',baseTemplate:'dolcevita',name:'Roly y Yeliana',series:'Atelier',tag:'Periódico y jardín',description:'Portada de periódico, verde y fotografía',artDirection:'Composición de Roly y Yeliana con carruseles y detalles editables.',image:'/invitations/roly-y-yeliana/portada-YR.webp',accent:'#4e5f49',ink:'#5d6623',premium:true,available:true,demoKey:'roly-y-yeliana'} as const;
export const NICOLE_FRANCISCO_DESIGN={key:'nicole-y-francisco',baseTemplate:'dolcevita',name:'Nicole y Francisco',series:'Atelier',tag:'Orquídeas y jardín',description:'Sobre con sello, orquídeas y fotografías',artDirection:'Composición original con collage, carruseles e itinerario alternado.',image:'/invitations/nicole-y-francisco/Nicole-y-Francisco5.webp',accent:'#848867',ink:'#343b28',premium:true,available:true,demoKey:'nicole-y-francisco'} as const;
export const MANUEL_MAYA_DESIGN={key:'manuel-y-maya',baseTemplate:'dolcevita',name:'Manuel y Maya',series:'Atelier',tag:'Sello negro y destellos',description:'Sobre, carruseles en blanco y negro y destellos',artDirection:'Portada con monograma, familia, ocho momentos y collage con scroll.',image:'/invitations/manuel-y-maya/IMG_5988-copia.webp',accent:'#b5a78c',ink:'#000000',premium:true,available:true,demoKey:'manuel-y-maya'} as const;
export const MARIANA_JESUS_DESIGN={key:'mariana-y-jesus',baseTemplate:'dolcevita',name:'Mariana y Jesús',series:'Atelier',tag:'Mar turquesa',description:'Mar en movimiento y tarjetas translúcidas',artDirection:'Sobre, video de playa, familia y celebración en Cancún.',image:'/invitations/mariana-y-jesus/Mariana-Jesus4.webp',accent:'#428d90',ink:'#428d90',premium:true,available:true,demoKey:'mariana-y-jesus'} as const;
export const PAULA_JUAN_FELIPE_DESIGN={key:'paula-y-juan-felipe',baseTemplate:'dolcevita',name:'Paula y Juan Felipe',series:'Atelier',tag:'Rosas y papel verde',description:'Sello verde, fondo floral y cuatro carruseles',artDirection:'Papelería en arcos, itinerario y collage con movimiento.',image:'/invitations/paula-y-juan-felipe/paula-1.webp',accent:'#517535',ink:'#344e25',premium:true,available:true,demoKey:'paula-y-juan-felipe'} as const;
export const KARLA_MAURICIO_DESIGN={key:'karla-y-mauricio',baseTemplate:'dolcevita',name:'Karla y Mauricio',series:'Atelier',tag:'Orquídeas y perla',description:'Orquídeas nude, franjas beige y fondo perlado',artDirection:'Entrada floral, retrato, corazones originales y detalles editables.',image:'/invitations/karla-y-mauricio/Karlay-Mauricio-portada-scaled.webp',accent:'#c1b6a4',ink:'#b3907a',premium:true,available:true,demoKey:'karla-y-mauricio'} as const;
export const MARIA_MARIO_DESIGN={key:'maria-angelica-y-mario',baseTemplate:'dolcevita',name:'María Angélica y Mario',series:'Atelier',tag:'Viaje y mar azul',description:'Sello azul, playa en video y mapa del viaje',artDirection:'Tarjetas translúcidas, collage e información de hospedaje.',image:'/invitations/maria-angelica-y-mario/Maria-Angelica-Mario4.webp',accent:'#859fb1',ink:'#152e4a',premium:true,available:true,demoKey:'maria-angelica-y-mario'} as const;
export const CLEAN_STARTER_DESIGNS=CLEAN_DESIGNS.map(d=>({...d,baseTemplate:'dolcevita' as const,series:'Atelier' as const,artDirection:d.description,image:d.key==='aurelia'?'/invitations/maria-angelica-y-mario/Maria-Angelica-Mario7.webp':d.key==='velada'?'/invitations/nicole-y-francisco/Nicole-y-Francisco14.webp':d.key==='promesa'?'/invitations/manuel-y-maya/Manuel-Maya2.webp':d.key==='casa-limone'?'/invitations/maria-angelica-y-mario/Maria-Angelica-Mario7.webp':d.key==='jardin-de-seda'?'/invitations/jardin-de-seda/botanica.webp':'/invitations/maria-angelica-y-mario/Maria-Angelica-Mario4.webp',premium:true,available:true,demoKey:d.key}));
export const STARTER_DESIGNS = [...CLEAN_STARTER_DESIGNS,MARIA_MARIO_DESIGN,KARLA_MAURICIO_DESIGN,PAULA_JUAN_FELIPE_DESIGN,MARIANA_JESUS_DESIGN,MANUEL_MAYA_DESIGN,NICOLE_FRANCISCO_DESIGN,ROLY_YELIANA_DESIGN,ANNIE_MICKY_DESIGN, LAURA_ANDRES_DESIGN, MARFIL_VIVO_DESIGN, ...STARTER_COLLECTIONS];
export type StarterDesignKey = (typeof STARTER_DESIGNS)[number]['key'];

export function collectionFor(template?: string | null): EnkartaCollection {
  if (template && template in ENKARTA_COLLECTIONS) return ENKARTA_COLLECTIONS[template as InvitationTemplate];
  return {
    key: 'azure', name: 'Edición Enkarta', series: 'Atelier', tag: 'Personalizado',
    description: 'Diseño personalizado de Enkarta', artDirection: 'Dirección artística a medida.',
    image: '/catalog/azure.jpg', accent: '#B8975A', ink: '#2C2519', premium: true, available: false,
  };
}

export function publicTemplateName(template?: string | null, presetKey?: string): string {
  if (presetKey === 'opera') return 'Ópera';
  if (presetKey === 'vespera') return 'Véspera';
  if (presetKey === 'serenata') return 'Serenata';
  if (presetKey === 'capitulo') return 'Capítulo';
  if (presetKey === 'travesia') return 'Travesía';
  if (presetKey === 'paradise-referencia') return 'Paradise · estudio de referencia';
  if (presetKey === 'azure-referencia') return 'Azure · estudio de referencia';
  const clean=CLEAN_DESIGNS.find(d=>d.key===presetKey);if(clean)return clean.name;
  if (presetKey === MARIA_MARIO_DESIGN.key) return MARIA_MARIO_DESIGN.name;
  if (presetKey === KARLA_MAURICIO_DESIGN.key) return KARLA_MAURICIO_DESIGN.name;
  if (presetKey === PAULA_JUAN_FELIPE_DESIGN.key) return PAULA_JUAN_FELIPE_DESIGN.name;
  if (presetKey === MARIANA_JESUS_DESIGN.key) return MARIANA_JESUS_DESIGN.name;
  if (presetKey === MANUEL_MAYA_DESIGN.key) return MANUEL_MAYA_DESIGN.name;
  if (presetKey === NICOLE_FRANCISCO_DESIGN.key) return NICOLE_FRANCISCO_DESIGN.name;
  if (presetKey === ROLY_YELIANA_DESIGN.key) return ROLY_YELIANA_DESIGN.name;
  if (presetKey === ANNIE_MICKY_DESIGN.key) return ANNIE_MICKY_DESIGN.name;
  if (presetKey === LAURA_ANDRES_DESIGN.key) return LAURA_ANDRES_DESIGN.name;
  if (presetKey === MARFIL_VIVO_DESIGN.key) return MARFIL_VIVO_DESIGN.name;
  return collectionFor(template).name;
}
