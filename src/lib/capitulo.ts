import type { BuilderConfig, InvitationParsed } from './types';
import { travesiaDate, travesiaNames } from './travesia';

/** Own editorial edition. The existing Primicia/Áurea design stays intact. */
export const CAPITULO_KEY = 'capitulo' as const;
export const CAPITULO_ASSETS = {
  hero: '/invitations/capitulo/hero.webp',
  detail: '/invitations/capitulo/detail.webp',
  celebration: '/invitations/capitulo/celebration.webp',
} as const;

export function capituloStarter() {
  const config: BuilderConfig = {
    designKey: CAPITULO_KEY, city: 'Sucre',
    welcomeTitle: 'Una historia para compartir',
    introMessage: 'Los días que recordamos siempre tienen algo en común: las personas que estuvieron allí. Queremos escribir este nuevo comienzo contigo.',
    storyTitle: 'Todo lo que nos trajo hasta aquí',
    storyMessage: 'Aprendimos a reconocernos en lo cotidiano: un café sin prisa, una conversación que se alarga, un camino que elegimos recorrer juntos. Ahora queremos celebrar el siguiente capítulo con quienes forman parte de nuestra historia.',
    blessing: 'Nos acompañan nuestras familias',
    ceremonyDesc: 'El comienzo', receptionDesc: 'La celebración',
    dressCodeTitle: 'Para una ocasión que recordaremos',
    galleryMessage: 'Guarda ese instante que nadie más vio. Tus fotografías también serán parte de este capítulo.',
    rsvpMessage: 'Nos hará felices saber que estarás allí.',
    noKidsMessage: 'Esta celebración está preparada para adultos. Gracias por acompañarnos y disfrutar de la noche.',
    theme: { primary: '#242825', primaryDeep: '#242825', bg: '#f8f7f3', text: '#242825', onPrimary: '#ffffff' },
    entry: { enabled: true, label: 'Abrir este capítulo' },
    motion: { preset: 'none' }, musicUrl: '', analytics: { enabled: false },
    sectionImages: { capituloDetail: CAPITULO_ASSETS.detail, capituloCelebration: CAPITULO_ASSETS.celebration },
  };
  return {
    template: 'primicia' as const, status: 'draft' as const, type: 'boda' as const,
    names: 'Valentina & Mateo', event_date: '2027-09-18',
    ceremony_time: '16:30', ceremony_place: 'Jardín de los Olivos', ceremony_address: 'Ubicación de muestra',
    reception_time: '18:00', reception_place: 'Patio del Encuentro', reception_address: 'Ubicación de muestra',
    guest_name: null, guest_passes: 2, message: null,
    dress_code: 'Vestimenta formal. Elige un conjunto en el que te sientas tú y puedas celebrar toda la noche.', no_kids: false,
    parents_bride: ['Irene y Julián'], parents_groom: ['Lucía y Esteban'], sponsors: [],
    itinerary: [
      { time: '16:30', label: 'Nuestra ceremonia' }, { time: '18:00', label: 'Un brindis por lo que viene' },
      { time: '19:30', label: 'Cena entre historias' }, { time: '21:00', label: 'La pista es nuestra' },
    ],
    gift_message: null, bank_account: null, cover_image_url: CAPITULO_ASSETS.hero,
    gallery_url: null, color_primary: '#242825', color_secondary: '#e4e1d9', color_accent: '#8c453b',
    phone_whatsapp: null, builder_config: config,
  };
}

export function capituloDemo(): InvitationParsed {
  const starter = capituloStarter();
  return {
    ...starter, id: 'demo-capitulo', slug: CAPITULO_KEY,
    config: starter.builder_config, builder_config: JSON.stringify(starter.builder_config),
    is_active: true, expires_at: null, views_count: 0, host_email: null, host_password_hash: null,
    rsvp_deadline: null, whatsapp_template: null, created_at: '2026-10-23T00:00:00Z', phone_raw: null,
  };
}

// Pure calendar/name validation is shared; visual defaults are not.
export const capituloDate = travesiaDate;
export const capituloNames = travesiaNames;
