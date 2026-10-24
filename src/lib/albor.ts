import type { BuilderConfig, InvitationParsed } from './types';
import { travesiaDate, travesiaNames } from './travesia';
import { ALBOR_MUSIC, ALBOR_ORIGINALS as originals } from './albor-assets';

export const ALBOR_KEY = 'albor' as const;
export const ALBOR_ASSETS = {
  hero: '/invitations/albor/hero.webp',
  detail: '/invitations/albor/detail.webp',
  celebration: '/invitations/albor/celebration.webp',
} as const;

/** Independent Euforia-inspired edition. Terracota retains its original starter. */
export function alborStarter() {
  const config: BuilderConfig = {
    designKey: ALBOR_KEY, city: 'Cochabamba',
    welcomeTitle: 'Un nuevo comienzo, juntos',
    verse: 'Crecer contigo, compartir los días y elegirnos siempre: así empieza nuestra nueva historia.', verseRef: '',
    introMessage: 'Hay encuentros que se convierten en hogar. El nuestro nos trajo hasta este día, y queremos celebrarlo cerca de las personas que llenan de alegría nuestra vida.',
    storyTitle: 'Nuestra historia',
    storyMessage: 'Entre paseos sin prisa, conversaciones que nos acercaron y sueños que empezamos a compartir, descubrimos que nuestro lugar estaba juntos. Hoy elegimos seguir construyendo esa historia, con la ilusión de vivir cada nuevo comienzo a tu lado.',
    blessing: 'Con el cariño de nuestras familias',
    ceremonyDesc: 'Ceremonia religiosa', receptionDesc: 'Recepción social',
    dressCodeTitle: 'Código de vestimenta',
    galleryMessage: 'Comparte las risas, las miradas y los pequeños momentos que hagan especial nuestro día.',
    rsvpMessage: 'Nos encantará compartir este día contigo. Confirma tu asistencia para que podamos preparar cada detalle de nuestra celebración.',
    noKidsMessage: 'Hemos preparado una celebración para adultos. Gracias por acompañarnos y disfrutar juntos de este día especial.',
    theme: { primary: '#8e6f55', primaryDeep: '#67513e', bg: '#f9f6ef', text: '#493c30', onPrimary: '#ffffff' },
    entry: { enabled: true, label: 'Abrir nuestra invitación' },
    motion: { preset: 'elegant' }, musicUrl: ALBOR_MUSIC.localPath, analytics: { enabled: false },
    sectionImages: { alborDetail: ALBOR_ASSETS.detail, alborCelebration: ALBOR_ASSETS.celebration },
    galleryImages: [ALBOR_ASSETS.hero, ALBOR_ASSETS.detail, ALBOR_ASSETS.celebration],
    galleryCaptions: [
      { image: ALBOR_ASSETS.hero, title: 'Juntos, en cada comienzo', caption: 'Nuestro lugar favorito está cerca de ti.', alt: 'Pareja adulta ficticia en un jardín luminoso con flores marfil, fotografía creada con IA' },
      { image: ALBOR_ASSETS.detail, title: 'Los pequeños momentos', caption: 'Una mirada y todos los sueños que compartimos.', alt: 'Retrato de una pareja adulta ficticia en un jardín con luz natural, fotografía creada con IA' },
      { image: ALBOR_ASSETS.celebration, title: 'Un día para recordar', caption: 'Un lugar imaginario preparado para celebrar contigo.', alt: 'Mesa de boda ficticia en un jardín luminoso con flores marfil y follaje verde, fotografía creada con IA' },
    ],
  };
  return {
    template: 'euforia' as const, status: 'draft' as const, type: 'boda' as const,
    names: 'Elena & Tomás', event_date: '2028-04-22',
    ceremony_time: '16:00', ceremony_place: 'Capilla del Jardín', ceremony_address: 'Ubicación de muestra',
    reception_time: '18:00', reception_place: 'Jardín Albor', reception_address: 'Ubicación de muestra',
    guest_name: null, guest_passes: 2, message: null,
    dress_code: 'Elegante. Elige un conjunto especial para celebrar y bailar con nosotros.', no_kids: true,
    parents_bride: ['Clara Ríos', 'Andrés Salas'], parents_groom: ['Lucía Medina', 'Gabriel Torres'],
    sponsors: [{ role: 'Nuestros padrinos', names: 'Isabel y Martín' }],
    itinerary: [
      { time: '16:00', label: 'Nuestra ceremonia', icon: originals.ceremony.localPath },
      { time: '18:30', label: 'Nuestro primer baile', icon: originals.firstDance.localPath },
      { time: '19:00', label: 'Un brindis por nosotros', icon: originals.toast.localPath },
      { time: '19:30', label: 'Compartimos la cena', icon: originals.dinner.localPath },
      { time: '20:30', label: 'A celebrar', icon: originals.party.localPath },
      { time: '21:30', label: 'Un momento dulce', icon: originals.cake.localPath },
      { time: '23:00', label: 'Hasta nuestro próximo encuentro', icon: originals.farewell.localPath },
    ],
    gift_message: 'Tu presencia es nuestro mejor regalo. Si deseas tener un detalle con nosotros, nos ayudará a construir los sueños que empezamos a compartir.',
    bank_account: null, cover_image_url: ALBOR_ASSETS.hero, gallery_url: null,
    color_primary: '#8e6f55', color_secondary: '#f9f6ef', color_accent: '#8e6f55',
    phone_whatsapp: null, builder_config: config,
  };
}

export function alborDemo(): InvitationParsed {
  const starter = alborStarter();
  return { ...starter, id: 'demo-albor', slug: ALBOR_KEY, config: starter.builder_config,
    builder_config: JSON.stringify(starter.builder_config), is_active: true, expires_at: null, views_count: 0,
    host_email: null, host_password_hash: null, rsvp_deadline: null, whatsapp_template: null,
    created_at: '2026-10-24T00:00:00Z', phone_raw: null };
}

export const alborDate = travesiaDate;
export const alborNames = travesiaNames;
