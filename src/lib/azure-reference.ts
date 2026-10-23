import type { BuilderConfig, InvitationParsed } from './types';
import { paradiseReferenceDate } from './paradise-reference';

/**
 * Independent study of the public Azure sample. It never replaces the existing
 * `azure` template, its preset or its resources.
 */
export const AZURE_REFERENCE_KEY = 'azure-referencia' as const;

const local = '/invitations/azure-referencia/';
/** Original bytes, matched by full source URL in Iconos INVITALI/azure-referencia-recursos.json. */
export const AZURE_REFERENCE_ASSETS = {
  leaves: local + '2025-03-Fondo-hojas-Azul.webp',
  orchidsTopLeft: local + '2025-07-Recurso-2ORQUIDEAS-SKETCH.webp',
  orchidsBottomRight: local + '2025-07-Recurso-1ORQUIDEAS-SKETCH.webp',
  orchidsBottomLeft: local + '2025-07-Recurso-3ORQUIDEAS-SKETCH-2.webp',
  heroFlowers: local + '2025-07-Recurso-4Adornos-orquideas-trazos-flores-copia.webp',
  ring: local + '2025-07-Recurso-4aro-anillo-trazos.svg',
  seed: local + '2025-07-Diente-de-leon-azul.png',
  monogram: local + '2025-06-Recurso-1logo-laura-y-mateo.svg',
  scrollRight: local + '2024-04-ROBERTORecurso-10oro.svg',
  scrollLeft: local + '2024-04-ROBERTORecurso-11oro.svg',
  separator: '/invitations/karla-y-mauricio/separador-adorno-flores.webp',
  ceremony: '/invitations/karla-y-mauricio/Recurso-2iconos.svg',
  reception: '/invitations/karla-y-mauricio/Recurso-1iconos.svg',
  dress: local + '2025-07-Recurso-3iconos.svg',
  hall: local + '2025-07-Recurso-4iconos.svg',
  camera: local + '2025-07-Recurso-6ico-cam.svg',
  music: '/audio/invitali-originales/2025-07-Kenny-G-Forever-In-Love-Offiical-Video.mp3',
  hearts: '/lottie/boda/annie-corazones-original.json',
} as const;

/** Filters declared by the reference for each element; the originals keep their bytes. */
export const AZURE_REFERENCE_FILTERS = {
  hearts: 'brightness(40%) contrast(122%) saturate(180%) hue-rotate(252deg)',
  music: 'brightness(51%) contrast(194%) saturate(87%) hue-rotate(227deg)',
  monogram: 'brightness(82%) contrast(133%) saturate(200%)',
  scrolls: 'brightness(59%) contrast(157%) saturate(159%) hue-rotate(177deg)',
} as const;

/** Dandelion seeds as declared by the sample script (sizes px, durations s, spawn ms). */
export const AZURE_REFERENCE_SEEDS = {
  size: [10, 50], duration: [7, 12], rise: [150, 550], drift: 100, sway: 20, spawnMs: [1000, 3000], initial: 5,
} as const;

export function azureReferenceStarter() {
  const config: BuilderConfig = {
    designKey: AZURE_REFERENCE_KEY,
    city: 'Bogotá',
    welcomeTitle: 'Bienvenidos a la invitación de nuestra boda',
    introMessage: 'Nos llena el corazón de gran alegría, poder compartir con ustedes este momento tan especial, y tener el honor de invitarte a celebrar con nosotros nuestro matrimonio.',
    blessing: 'CON LA BENDICIÓN DE DIOS Y DE NUESTROS PADRES',
    ceremonyDesc: 'Ceremonia Religiosa',
    receptionDesc: 'Recepción Social',
    dressCodeTitle: 'DRESS CODE',
    galleryMessage: 'Te invitamos a compartir los momentos especiales de nuestro evento a través de tus fotografías. Apreciamos que capturen y compartan sus recuerdos para que todos podamos revivir esta ocasión tan especial.',
    rsvpMessage: 'Es muy importante que nos confirmes tu asistencia',
    theme: { primary: '#002d63', primaryDeep: '#002d63', bg: '#fffcf9', text: '#002d63', onPrimary: '#ffffff' },
    entry: { enabled: true, label: 'Ingresar a mi invitación' },
    motion: { preset: 'none' },
    musicUrl: AZURE_REFERENCE_ASSETS.music,
    sectionImages: { azureMonogram: AZURE_REFERENCE_ASSETS.monogram },
  };
  return {
    template: 'azure' as const, status: 'draft' as const, type: 'boda' as const,
    names: 'Lorena & Marcos', event_date: '2026-07-04',
    ceremony_time: '16:00', ceremony_place: 'Capilla de los Santos Apóstoles', ceremony_address: 'Gimnasio Moderno',
    reception_time: '18:00', reception_place: 'Club Los Lagartos', reception_address: 'Salón Principal',
    guest_name: 'Daniel Martinez', guest_passes: 2, message: null,
    dress_code: 'Hombres: Smoking\nDamas: Traje de noche', no_kids: false,
    parents_bride: ['Juan Pablo Castaño Herrera', 'Ana Sofía Morales Uribe'],
    parents_groom: ['Carlos Andrés Pinzón López', 'Laura Fernanda Cubillos Martínez'], sponsors: [],
    itinerary: [
      { time: '16:00', label: 'Ceremonia Religiosa', icon: AZURE_REFERENCE_ASSETS.ceremony },
      { time: '18:00', label: 'Cóctel de Bienvenida', icon: AZURE_REFERENCE_ASSETS.reception },
      { time: '19:00', label: 'Ingreso al salón principal', icon: AZURE_REFERENCE_ASSETS.hall },
    ],
    gift_message: 'Siendo su compañía el mejor de los regalos, estaremos muy agradecidos con su apoyo en esta nueva etapa de nuestra vida juntos.',
    // The sample bank details belong to the reference; a demo never displays real accounts.
    bank_account: null, cover_image_url: null,
    gallery_url: null, color_primary: '#002d63', color_secondary: '#4c5b75', color_accent: '#ffffff',
    phone_whatsapp: null, builder_config: config,
  };
}

export function azureReferenceDemo(): InvitationParsed {
  const starter = azureReferenceStarter();
  return {
    ...starter, id: 'demo-azure-referencia', slug: AZURE_REFERENCE_KEY,
    config: starter.builder_config, builder_config: JSON.stringify(starter.builder_config),
    is_active: true, expires_at: null, views_count: 0, host_email: null, host_password_hash: null,
    rsvp_deadline: null, whatsapp_template: null, created_at: '2026-10-22T00:00:00Z', phone_raw: null,
  };
}

const WEEKDAYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

/** Weekday, day, month and year come from the editable event date only. */
export function azureReferenceDate(value: string | null) {
  const date = paradiseReferenceDate(value);
  if (!date) return null;
  const parsed = new Date(`${date.iso}T12:00:00Z`);
  const month = MONTHS[parsed.getUTCMonth()];
  return {
    iso: date.iso, day: date.day, year: date.year, month,
    weekday: WEEKDAYS[parsed.getUTCDay()],
    entryLine: `${month.charAt(0)}${month.slice(1).toLowerCase()}  ${date.day}  ${date.year}`,
  };
}

/** Empty edits stay empty instead of reviving the sample couple. */
export function azureReferenceNames(names: string | null) {
  const [first = '', ...rest] = (names ?? '').split(/\s*&\s*|\s+y\s+/i);
  return { first: first.trim(), second: rest.join(' y ').trim() };
}
