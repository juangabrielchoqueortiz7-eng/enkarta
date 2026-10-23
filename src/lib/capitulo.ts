import type { BuilderConfig, InvitationParsed } from './types';
import { travesiaDate, travesiaNames } from './travesia';
import { CAPITULO_MUSIC, CAPITULO_ORIGINALS as originals } from './capitulo-assets';

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
    entry: { enabled: true, label: 'Ver invitación' },
    motion: { preset: 'elegant' }, musicUrl: CAPITULO_MUSIC.localPath, analytics: { enabled: false },
    sectionImages: { capituloDetail: CAPITULO_ASSETS.detail, capituloCelebration: CAPITULO_ASSETS.celebration },
    galleryImages: [CAPITULO_ASSETS.hero, CAPITULO_ASSETS.detail, CAPITULO_ASSETS.celebration],
    galleryCaptions: [
      { image: CAPITULO_ASSETS.hero, title: 'Un camino compartido', caption: 'El siguiente capítulo lo escribimos juntos.', alt: 'Pareja ficticia caminando por una calle, fotografía creada con IA' },
      { image: CAPITULO_ASSETS.detail, title: 'Las palabras que nos unen', caption: 'Todo lo que queremos decirnos.', alt: 'Manos de una pareja ficticia sosteniendo un cuaderno de votos, fotografía creada con IA' },
      { image: CAPITULO_ASSETS.celebration, title: 'Aquí empieza la celebración', caption: 'Un lugar para encontrarnos y celebrar.', alt: 'Patio imaginario preparado para una boda, fotografía creada con IA' },
    ],
  };
  return {
    template: 'primicia' as const, status: 'draft' as const, type: 'boda' as const,
    names: 'Valentina & Mateo', event_date: '2027-09-18',
    ceremony_time: '16:30', ceremony_place: 'Jardín de los Olivos', ceremony_address: 'Ubicación de muestra',
    reception_time: '18:00', reception_place: 'Patio del Encuentro', reception_address: 'Ubicación de muestra',
    guest_name: null, guest_passes: 2, message: null,
    dress_code: 'Vestimenta formal. Elige un conjunto en el que te sientas tú y puedas celebrar toda la noche.', no_kids: true,
    parents_bride: ['Irene y Julián'], parents_groom: ['Lucía y Esteban'], sponsors: [],
    itinerary: [
      { time: '16:30', label: 'Nuestra ceremonia', icon: originals.ceremony.localPath },
      { time: '18:00', label: 'Recepción social', icon: originals.reception.localPath },
      { time: '18:30', label: 'Nuestro vals y brindis', icon: originals.firstDance.localPath },
      { time: '19:30', label: 'Cena entre historias', icon: originals.dinner.localPath },
      { time: '21:00', label: 'La pista es nuestra', icon: originals.dance.localPath },
      { time: '00:00', label: 'Hasta la próxima historia', icon: originals.farewell.localPath },
    ],
    gift_message: 'Tu compañía es el regalo que más nos ilusiona. Gracias por formar parte de nuestra historia.', bank_account: null, cover_image_url: CAPITULO_ASSETS.hero,
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
