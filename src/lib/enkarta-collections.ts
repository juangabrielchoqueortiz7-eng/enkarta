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

export function collectionFor(template?: string | null): EnkartaCollection {
  if (template && template in ENKARTA_COLLECTIONS) return ENKARTA_COLLECTIONS[template as InvitationTemplate];
  return {
    key: 'azure', name: 'Edición Enkarta', series: 'Atelier', tag: 'Personalizado',
    description: 'Diseño personalizado de Enkarta', artDirection: 'Dirección artística a medida.',
    image: '/catalog/azure.jpg', accent: '#B8975A', ink: '#2C2519', premium: true, available: false,
  };
}

export function publicTemplateName(template?: string | null): string {
  return collectionFor(template).name;
}
