import type { BuilderConfig, InvitationParsed } from './types';
import { travesiaDate, travesiaNames } from './travesia';
import { OPERA_MUSIC, OPERA_ORIGINALS as originals } from './opera-assets';

export const OPERA_KEY = 'opera' as const;
export const OPERA_ASSETS = {
  hero: '/invitations/opera/hero.webp',
  detail: '/invitations/opera/detail.webp',
  celebration: '/invitations/opera/celebration.webp',
} as const;

/** Independent Obsidiana-inspired edition. Nocturna retains its original starter. */
export function operaStarter() {
  const config: BuilderConfig = {
    designKey: OPERA_KEY, city: 'Cochabamba',
    welcomeTitle: 'Una historia para celebrar',
    verse: 'En cada camino, en cada sueño y en cada nuevo comienzo, elegimos estar juntos.', verseRef: '',
    introMessage: 'Hay momentos que merecen vivirse cerca de quienes queremos. El nuestro empieza al elegirnos para toda la vida, y nos hará felices compartirlo contigo.',
    storyTitle: 'Nuestra historia',
    storyMessage: 'Todo comenzó con una conversación que no queríamos terminar. Desde entonces, cada día compartido nos ha traído hasta aquí: a este sí, a nuestros sueños y a una noche que queremos recordar juntos.',
    blessing: 'Con el amor de nuestras familias',
    ceremonyDesc: 'Ceremonia religiosa', receptionDesc: 'Recepción social',
    dressCodeTitle: 'Código de vestimenta',
    galleryMessage: 'Cada mirada cuenta una historia. Comparte las fotografías que hagan de esta noche un recuerdo para toda la vida.',
    rsvpMessage: 'Tu compañía hará que esta noche sea especial. Confirma tu asistencia para que podamos preparar cada detalle de nuestra celebración.',
    noKidsMessage: 'Hemos preparado una celebración para adultos. Gracias por acompañarnos y disfrutar juntos de esta noche.',
    theme: { primary: '#f7e0a5', primaryDeep: '#17150f', bg: '#090909', text: '#f7e0a5', onPrimary: '#090909' },
    entry: { enabled: true, label: 'Abrir nuestra invitación' },
    motion: { preset: 'elegant' }, musicUrl: OPERA_MUSIC.localPath, analytics: { enabled: false },
    sectionImages: { operaDetail: OPERA_ASSETS.detail, operaCelebration: OPERA_ASSETS.celebration },
    galleryImages: [OPERA_ASSETS.hero, OPERA_ASSETS.detail, OPERA_ASSETS.celebration],
    galleryCaptions: [
      { image: OPERA_ASSETS.hero, title: 'Nuestro gran comienzo', caption: 'El mejor lugar siempre será a tu lado.', alt: 'Pareja adulta ficticia en una celebración de boda nocturna, fotografía creada con IA' },
      { image: OPERA_ASSETS.detail, title: 'Promesas para toda la vida', caption: 'Una mirada, un instante y todos nuestros sueños.', alt: 'Retrato de una pareja adulta ficticia con iluminación cálida de noche, fotografía creada con IA' },
      { image: OPERA_ASSETS.celebration, title: 'Una noche inolvidable', caption: 'Un lugar imaginario preparado para celebrar contigo.', alt: 'Mesa de boda ficticia con velas y detalles dorados en un espacio nocturno, fotografía creada con IA' },
    ],
  };
  return {
    template: 'obsidiana' as const, status: 'draft' as const, type: 'boda' as const,
    names: 'Isabel & Gabriel', event_date: '2027-12-11',
    ceremony_time: '16:00', ceremony_place: 'Capilla del Alba', ceremony_address: 'Ubicación de muestra',
    reception_time: '18:00', reception_place: 'Salón Ópera', reception_address: 'Ubicación de muestra',
    guest_name: null, guest_passes: 2, message: null,
    dress_code: 'Etiqueta. Traje oscuro y vestido largo para una noche especial.', no_kids: true,
    parents_bride: ['Elena Rojas', 'Gabriel Castillo'], parents_groom: ['Clara Vargas', 'Andrés Molina'],
    sponsors: [{ role: 'Nuestros padrinos', names: 'Lucía y Martín' }],
    itinerary: [
      { time: '16:00', label: 'Nuestra ceremonia', icon: originals.ceremony.localPath },
      { time: '18:00', label: 'Comienza la recepción', icon: originals.receptionTimeline.localPath },
      { time: '19:00', label: 'Compartimos la cena', icon: originals.dinner.localPath },
      { time: '20:00', label: 'Un momento dulce', icon: originals.cake.localPath },
      { time: '20:30', label: 'Lanzamiento del ramo', icon: originals.bouquet.localPath },
      { time: '21:00', label: 'Que empiece la fiesta', icon: originals.party.localPath },
    ],
    gift_message: 'Tu presencia es nuestro mejor regalo. Si deseas tener un detalle con nosotros, un sobre nos ayudará a construir nuestros próximos sueños.',
    bank_account: null, cover_image_url: OPERA_ASSETS.hero, gallery_url: null,
    color_primary: '#f7e0a5', color_secondary: '#090909', color_accent: '#897a59',
    phone_whatsapp: null, builder_config: config,
  };
}

export function operaDemo(): InvitationParsed {
  const starter = operaStarter();
  return { ...starter, id: 'demo-opera', slug: OPERA_KEY, config: starter.builder_config,
    builder_config: JSON.stringify(starter.builder_config), is_active: true, expires_at: null, views_count: 0,
    host_email: null, host_password_hash: null, rsvp_deadline: null, whatsapp_template: null,
    created_at: '2026-10-24T00:00:00Z', phone_raw: null };
}

export const operaDate = travesiaDate;
export const operaNames = travesiaNames;
