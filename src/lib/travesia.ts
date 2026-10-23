import type { BuilderConfig, InvitationParsed } from './types';
import { paradiseReferenceDate } from './paradise-reference';

/** Own travel edition. The existing Passport/Atlas family is never replaced. */
export const TRAVESIA_KEY = 'travesia' as const;
export const TRAVESIA_ASSETS = {
  hero: '/invitations/travesia/hero.webp',
  story: '/invitations/travesia/story.webp',
  celebration: '/invitations/travesia/celebration.webp',
} as const;

export function travesiaStarter() {
  const config: BuilderConfig = {
    designKey: TRAVESIA_KEY,
    city: 'Santa Cruz de la Sierra',
    welcomeTitle: 'Nuestro destino favorito es estar juntos',
    introMessage: 'Hay viajes que cambian la vida. El nuestro comienza contigo, celebrando el lugar que elegimos construir juntos.',
    blessing: 'Con el cariño de nuestras familias',
    ceremonyDesc: 'La primera parada', receptionDesc: 'La celebración',
    galleryMessage: 'Cada mirada cuenta una historia. Comparte con nosotros los recuerdos de este día.',
    storyTitle: 'Y de todos los destinos, nos elegimos.',
    storyMessage: 'Nos quedamos con las conversaciones largas, los caminos sin prisa y la alegría de volver a encontrarnos. Queremos que este nuevo comienzo también lleve tu recuerdo.',
    rsvpMessage: 'Tu lugar en esta aventura',
    noKidsMessage: 'Esta celebración está preparada para adultos. Gracias por acompañarnos y disfrutar de la noche.',
    theme: { primary: '#153e45', primaryDeep: '#153e45', bg: '#f4f1e8', text: '#153e45', onPrimary: '#ffffff' },
    entry: { enabled: true, label: 'Comenzar el viaje' },
    motion: { preset: 'none' }, musicUrl: '',
    sectionImages: { travesiaStory: TRAVESIA_ASSETS.story, travesiaCelebration: TRAVESIA_ASSETS.celebration },
    analytics: { enabled: false },
  };
  return {
    template: 'passport' as const, status: 'draft' as const, type: 'boda' as const,
    names: 'Mía & Adrián', event_date: '2027-06-19',
    ceremony_time: '16:00', ceremony_place: 'Jardín del Alba', ceremony_address: 'Ubicación de muestra',
    reception_time: '18:00', reception_place: 'Casa del Horizonte', reception_address: 'Ubicación de muestra',
    guest_name: null, guest_passes: 2, message: null,
    dress_code: 'Vestidos largos y trajes en tonos naturales. Reservamos el blanco para la novia.', no_kids: false,
    parents_bride: ['Elena y Rafael'], parents_groom: ['Clara y Gabriel'], sponsors: [],
    itinerary: [
      { time: '16:00', label: 'Ceremonia' }, { time: '18:00', label: 'Brindis de bienvenida' },
      { time: '19:00', label: 'La mesa está servida' }, { time: '20:30', label: 'Bailar bajo las estrellas' },
    ],
    gift_message: null, bank_account: null, cover_image_url: TRAVESIA_ASSETS.hero,
    gallery_url: null, color_primary: '#153e45', color_secondary: '#dce8e3', color_accent: '#af6550',
    phone_whatsapp: null, builder_config: config,
  };
}

export function travesiaDemo(): InvitationParsed {
  const starter = travesiaStarter();
  return {
    ...starter, id: 'demo-travesia', slug: TRAVESIA_KEY,
    config: starter.builder_config, builder_config: JSON.stringify(starter.builder_config),
    is_active: true, expires_at: null, views_count: 0, host_email: null, host_password_hash: null,
    rsvp_deadline: null, whatsapp_template: null, created_at: '2026-10-23T00:00:00Z', phone_raw: null,
  };
}

const WEEKDAYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export function travesiaDate(value: string | null) {
  const date = paradiseReferenceDate(value);
  if (!date) return null;
  const parsed = new Date(`${date.iso}T12:00:00Z`), month = MONTHS[parsed.getUTCMonth()];
  return { iso: date.iso, day: date.day, year: date.year, month, weekday: WEEKDAYS[parsed.getUTCDay()], entryLine: `${date.day} de ${month.toLowerCase()} de ${date.year}` };
}

export function travesiaNames(names: string | null) {
  const [first = '', ...rest] = (names ?? '').split(/\s*&\s*|\s+y\s+/i);
  return { first: first.trim(), second: rest.join(' y ').trim() };
}
