import type { BuilderConfig, InvitationParsed } from './types';
import { travesiaDate, travesiaNames } from './travesia';
import { VESPERA_MUSIC, VESPERA_ORIGINALS as originals } from './vespera-assets';

export const VESPERA_KEY = 'vespera' as const;
export const VESPERA_ASSETS = {
  hero: '/invitations/vespera/hero.webp',
  detail: '/invitations/vespera/detail.webp',
  celebration: '/invitations/vespera/celebration.webp',
} as const;

/** Independent Grazia-inspired edition. Seda retains its own original starter. */
export function vesperaStarter() {
  const config: BuilderConfig = {
    designKey: VESPERA_KEY, city: 'Cochabamba',
    welcomeTitle: 'La noche que soñamos compartir',
    introMessage: 'Después de tantos caminos recorridos juntos, elegimos uno para toda la vida. Nos hará felices celebrar este comienzo contigo.',
    storyTitle: 'Nuestra historia',
    storyMessage: 'Entre conversaciones que se alargaron, pequeños viajes y sueños compartidos, encontramos nuestro lugar favorito: estar juntos. Hoy comienza un nuevo capítulo, y queremos vivirlo cerca de quienes más queremos.',
    blessing: 'Con el cariño de nuestras familias',
    ceremonyDesc: 'Ceremonia', receptionDesc: 'Recepción social',
    dressCodeTitle: 'Código de vestimenta',
    galleryMessage: 'Comparte las miradas, las risas y los recuerdos que hagan especial nuestra noche.',
    rsvpMessage: 'Nos encantará contar contigo. Confirma tu asistencia para que podamos preparar cada detalle de nuestra celebración.',
    noKidsMessage: 'Hemos preparado una celebración para adultos. Gracias por acompañarnos y disfrutar juntos de esta noche.',
    theme: { primary: '#967f60', primaryDeep: '#5c4a36', bg: '#fbf8f4', text: '#292622', onPrimary: '#ffffff' },
    entry: { enabled: true, label: 'Abrir nuestra invitación' },
    motion: { preset: 'elegant' }, musicUrl: VESPERA_MUSIC.localPath, analytics: { enabled: false },
    sectionImages: { vesperaDetail: VESPERA_ASSETS.detail, vesperaCelebration: VESPERA_ASSETS.celebration },
    galleryImages: [VESPERA_ASSETS.hero, VESPERA_ASSETS.detail, VESPERA_ASSETS.celebration],
    galleryCaptions: [
      { image: VESPERA_ASSETS.hero, title: 'Bajo el mismo cielo', caption: 'La mejor parte de cada noche es compartirla contigo.', alt: 'Pareja adulta ficticia junto a un lago nocturno con fuegos dorados, fotografía creada con IA' },
      { image: VESPERA_ASSETS.detail, title: 'Promesas que nos unen', caption: 'Pequeños detalles para un recuerdo de toda la vida.', alt: 'Retrato de una pareja adulta ficticia al atardecer, fotografía creada con IA' },
      { image: VESPERA_ASSETS.celebration, title: 'Una noche para recordar', caption: 'Un lugar imaginario preparado para celebrar juntos.', alt: 'Mesa de boda ficticia en un jardín al anochecer con velas y flores marfil, fotografía creada con IA' },
    ],
  };
  return {
    template: 'grazia' as const, status: 'draft' as const, type: 'boda' as const,
    names: 'Camila & Nicolás', event_date: '2027-11-20',
    ceremony_time: '16:00', ceremony_place: 'Capilla de la Luz', ceremony_address: 'Ubicación de muestra',
    reception_time: '18:00', reception_place: 'Jardín Véspera', reception_address: 'Ubicación de muestra',
    guest_name: null, guest_passes: 2, message: null,
    dress_code: 'Elegante. Elige un conjunto especial para celebrar y bailar con nosotros.', no_kids: true,
    parents_bride: ['Elena Rojas', 'Gabriel Castillo'], parents_groom: ['Clara Vargas', 'Andrés Molina'],
    sponsors: [{ role: 'Nuestros padrinos', names: 'Lucía y Martín' }],
    itinerary: [
      { time: '15:30', label: 'Un encuentro esperado', icon: originals.embrace.localPath },
      { time: '16:00', label: 'Nuestra ceremonia', icon: originals.ceremony.localPath },
      { time: '18:00', label: 'La recepción', icon: originals.reception.localPath },
      { time: '18:30', label: 'La entrada de los novios', icon: originals.couple.localPath },
      { time: '19:00', label: 'Compartimos la cena', icon: originals.dinner.localPath },
      { time: '20:30', label: 'A bailar', icon: originals.party.localPath },
      { time: '22:00', label: 'Un momento dulce', icon: originals.cake.localPath },
      { time: '23:30', label: 'Hasta nuestro próximo encuentro', icon: originals.farewell.localPath },
    ],
    gift_message: 'Tu presencia es nuestro mejor regalo. Si deseas tener un detalle con nosotros, un sobre nos ayudará a construir nuestros próximos sueños.',
    bank_account: null, cover_image_url: VESPERA_ASSETS.hero, gallery_url: null,
    color_primary: '#967f60', color_secondary: '#fbf8f4', color_accent: '#967f60',
    phone_whatsapp: null, builder_config: config,
  };
}

export function vesperaDemo(): InvitationParsed {
  const starter = vesperaStarter();
  return { ...starter, id: 'demo-vespera', slug: VESPERA_KEY, config: starter.builder_config,
    builder_config: JSON.stringify(starter.builder_config), is_active: true, expires_at: null, views_count: 0,
    host_email: null, host_password_hash: null, rsvp_deadline: null, whatsapp_template: null,
    created_at: '2026-10-23T00:00:00Z', phone_raw: null };
}

export const vesperaDate = travesiaDate;
export const vesperaNames = travesiaNames;
