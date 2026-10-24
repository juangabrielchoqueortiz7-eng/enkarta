import type { BuilderConfig, InvitationParsed } from './types';
import { travesiaDate, travesiaNames } from './travesia';
import { SERENATA_MUSIC, SERENATA_ORIGINALS as originals } from './serenata-assets';

export const SERENATA_KEY = 'serenata' as const;
export const SERENATA_ASSETS = {
  hero: '/invitations/serenata/hero.webp',
  detail: '/invitations/serenata/detail.webp',
  celebration: '/invitations/serenata/celebration.webp',
} as const;

/** An independent botanical edition; Oliva/Dolcevita keeps its original defaults. */
export function serenataStarter() {
  const config: BuilderConfig = {
    designKey: SERENATA_KEY, city: 'Cochabamba',
    welcomeTitle: 'Nuestra vida, juntos',
    introMessage: 'Hay encuentros que lo cambian todo. El nuestro nos trajo hasta aquí: a elegirnos para toda la vida y a querer compartir este día contigo.',
    storyTitle: 'El amor está en los pequeños momentos',
    storyMessage: 'En una mirada que nos entiende, en las conversaciones sin reloj y en cada camino que elegimos recorrer juntos. Hoy empieza una nueva historia, y nos hará felices escribirla cerca de ti.',
    blessing: 'Con el amor de nuestras familias',
    ceremonyDesc: 'Ceremonia religiosa', receptionDesc: 'Recepción social',
    dressCodeTitle: 'El estilo de nuestra celebración',
    galleryMessage: 'Los recuerdos más bonitos también se cuentan a través de tus fotografías.',
    rsvpMessage: 'Tu presencia hará que este día sea todavía más especial. Nos encantará saber si nos acompañas.',
    noKidsMessage: 'Hemos preparado una celebración para adultos. Gracias por ayudarnos a disfrutar de esta noche especial.',
    theme: { primary: '#51765d', primaryDeep: '#2d4c2e', bg: '#fcfbf6', text: '#2b342b', onPrimary: '#fcfbf6' },
    entry: { enabled: true, label: 'Abrir nuestra invitación' },
    motion: { preset: 'elegant' }, musicUrl: SERENATA_MUSIC.localPath, analytics: { enabled: false },
    sectionImages: { serenataDetail: SERENATA_ASSETS.detail, serenataCelebration: SERENATA_ASSETS.celebration },
    galleryImages: [SERENATA_ASSETS.hero, SERENATA_ASSETS.detail, SERENATA_ASSETS.celebration],
    galleryCaptions: [
      { image: SERENATA_ASSETS.hero, title: 'Donde queremos estar', caption: 'Juntos, en cada nuevo comienzo.', alt: 'Pareja adulta ficticia en un jardín de olivos, fotografía creada con IA' },
      { image: SERENATA_ASSETS.detail, title: 'Palabras para toda la vida', caption: 'Los detalles que cuentan nuestra historia.', alt: 'Manos adultas, cuaderno de votos y flores blancas, imagen creada con IA' },
      { image: SERENATA_ASSETS.celebration, title: 'Un lugar para celebrar', caption: 'La mejor parte será compartirlo contigo.', alt: 'Mesa de boda en un jardín imaginario al atardecer, imagen creada con IA' },
    ],
  };
  return {
    template: 'dolcevita' as const, status: 'draft' as const, type: 'boda' as const,
    names: 'Valeria & Diego', event_date: '2027-10-23',
    ceremony_time: '16:00', ceremony_place: 'Capilla del Encuentro', ceremony_address: 'Ubicación de muestra',
    reception_time: '18:00', reception_place: 'Casa de los Olivos', reception_address: 'Ubicación de muestra',
    guest_name: null, guest_passes: 2, message: null,
    dress_code: 'Vestimenta formal. Ven con un conjunto especial en el que puedas celebrar y bailar toda la noche.', no_kids: true,
    parents_bride: ['Elena Álvarez', 'Gabriel Ríos'], parents_groom: ['Clara Medina', 'Andrés Vega'],
    sponsors: [{ role: 'Nuestros padrinos', names: 'Lucía y Martín' }],
    itinerary: [
      { time: '16:00', label: 'Ceremonia religiosa', icon: originals.ceremony.localPath },
      { time: '17:00', label: 'Ceremonia civil', place: 'Jardín Serenata', note: 'Ubicación de muestra', icon: originals.civilTimeline.localPath },
      { time: '18:00', label: 'A celebrar', icon: originals.party.localPath },
      { time: '19:00', label: 'La cena', icon: originals.dinner.localPath },
      { time: '20:00', label: 'Nuestro primer baile', icon: originals.firstDance.localPath },
      { time: '21:00', label: 'Un momento dulce', icon: originals.cake.localPath },
    ],
    gift_message: 'Tu compañía es nuestro mejor regalo. Si deseas tener un detalle con nosotros, un sobre nos ayudará a hacer realidad nuestros próximos sueños.',
    bank_account: null, cover_image_url: SERENATA_ASSETS.hero, gallery_url: null,
    color_primary: '#51765d', color_secondary: '#fcfbf6', color_accent: '#967f60',
    phone_whatsapp: null, builder_config: config,
  };
}

export function serenataDemo(): InvitationParsed {
  const starter = serenataStarter();
  return { ...starter, id: 'demo-serenata', slug: SERENATA_KEY, config: starter.builder_config,
    builder_config: JSON.stringify(starter.builder_config), is_active: true, expires_at: null, views_count: 0,
    host_email: null, host_password_hash: null, rsvp_deadline: null, whatsapp_template: null,
    created_at: '2026-10-23T00:00:00Z', phone_raw: null };
}

export const serenataDate = travesiaDate;
export const serenataNames = travesiaNames;
