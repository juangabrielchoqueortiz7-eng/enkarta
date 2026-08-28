import { LAYOUT_VERSION, type Block, type BuilderConfig, type InvitationParsed, type PageLayout } from './types';
import { MARFIL_THEME, MARFIL_TOKENS, MARFIL_SPACE as space, MARFIL_WIDTH as width } from './marfil-visual-system';
export { MARFIL_THEME, MARFIL_TOKENS } from './marfil-visual-system';

const COVER = '/catalog/solar-original.png';
const PORTRAIT = '/catalog/marfil/portrait.webp';
const PHOTOS = [PORTRAIT, '/catalog/marfil/table.webp', '/catalog/marfil/rings.webp'];

function section(id: string, type: Block['type'], props: Block['props'], style: Block['style'] = {}, bindings?: Block['bindings']): Block {
  return { id: `marfil-${id}`, type, props, style: { bgKind: 'none', padTop: space.section, padBottom: space.section, ...style }, animation: { preset: 'fadeUp' }, ...(bindings ? { bindings } : {}) };
}

/** Documento nativo; no depende del registry de componentes ni clona una web externa. */
export function createMarfilVivoLayout(isoDate: string): PageLayout {
  return {
    version: LAYOUT_VERSION, basePreset: 'grazia', presetKey: 'marfil-vivo',
    blocks: [
      { ...section('cover', 'cinematicHero', {
        poster: COVER, videoUrl: '', mediaAlt: 'Una pareja camina entre olivos y arquitectura de piedra al sol.',
        groom: 'Elena', bride: 'Mateo', eyebrow: 'Un día. Toda una vida.', tagline: 'Nos casamos', dateLabel: '',
        nameFont: 'serif', nameSize: 82, namesLayout: 'inline', position: 'top', align: 'center', height: 'tall',
        focal: '50% 64%', overlayColor: '#252C20', overlayStrength: 76, gradient: 'full', textColor: '#FFFCF6', accentColor: '#FFFCF6',
        fadeToPage: true, showScrollCue: true, autoplay: true, loop: true,
      }, {}, { groom: 'couple.groom', bride: 'couple.bride', poster: 'media.coverImage', dateLabel: 'event.date.label' }), animation: { preset: 'none' } },
      section('opening', 'editorialChapter', {
        variant: 'statement', number: '01', eyebrow: 'El comienzo de todo', title: 'Lo mejor de la vida es compartirla.',
        body: 'Elegimos seguir caminando juntos. Y no imaginamos este nuevo capítulo sin las personas que han sido parte de nuestra historia.',
        note: 'Con mucho amor, {{couple.full}}', image: '',
      }, { maxWidth: width.reading, padTop: space.wide, padBottom: space.tight }),
      section('countdown', 'countdown', { label: 'Cada vez más cerca', isoDate, display: 'minimal', showSeconds: false }, { maxWidth: width.reading, padTop: space.gutter, padBottom: space.gutter }, { isoDate: 'event.isoDate' }),
      section('calendar', 'calendar', { title: 'Nuestra boda', isoDate, duration: 8, location: '', label: 'Reservar la fecha' }, { padTop: space.inline, padBottom: space.section }, { title: 'calendar.title', isoDate: 'event.isoDate', location: 'calendar.location' }),
      section('details', 'editorialDetails', {
        eyebrow: '02 · El encuentro', title: 'Todo empieza aquí', layout: 'ledger', footer: 'Guarda la fecha. Nosotros nos encargamos de los recuerdos.',
        items: [
          { label: 'La fecha', value: '{{event.date.day}} de {{event.date.month}} de {{event.date.year}}', note: '{{event.city}}' },
          { label: 'Ceremonia', value: '{{event.ceremony.place}}', note: '{{event.ceremony.time}} · {{event.ceremony.address}}' },
          { label: 'Recepción', value: '{{event.reception.place}}', note: '{{event.reception.time}} · {{event.reception.address}}' },
        ],
      }, { bgKind: 'soft', maxWidth: width.reading }),
      section('directions', 'button', { label: 'Cómo llegar a la ceremonia', href: '', filled: false }, { bgKind: 'soft', padTop: 0, padBottom: space.section }, { href: 'event.ceremony.mapsUrl' }),
      section('story', 'editorialChapter', {
        variant: 'split', number: '03', eyebrow: 'Nuestra historia', title: 'El lugar al que siempre queremos volver.',
        body: 'Entre conversaciones, viajes y pequeños momentos cotidianos, construimos nuestro lugar favorito: estar juntos.',
        image: PORTRAIT, imageAlt: 'Elena y Mateo comparten una sonrisa bajo un olivo.', imageAspect: 'portrait', imageSide: 'left', focal: '50% 42%', note: 'Y esto apenas comienza',
      }, { padTop: space.wide, padBottom: space.wide }),
      section('itinerary', 'itinerary', {
        title: 'El ritmo de nuestro día', layout: 'editorial', showNumbers: true, showConnectors: false, items: [],
      }, { maxWidth: width.reading, bgKind: 'soft' }, { items: 'event.itinerary' }),
      section('photos', 'gallery', {
        eyebrow: '04 · Para recordar', title: 'Instantes que se quedan', message: 'Desliza y abre cada fotografía para verla completa.',
        layout: 'filmstrip', images: PHOTOS, lightbox: true, showCaptions: true, showCounter: true,
        captions: [
          { image: PHOTOS[0], title: 'Juntos, sin prisa', caption: 'La aventura de elegirnos cada día.', alt: 'Elena y Mateo sonríen bajo un olivo.' },
          { image: PHOTOS[1], title: 'Un lugar para celebrar', caption: 'Cada detalle, pensado con cariño.', alt: 'Una mesa de lino y cerámica marfil entre olivos.' },
          { image: PHOTOS[2], title: 'Lo que viene', caption: 'Nos esperan recuerdos inolvidables.', alt: 'Dos alianzas doradas sobre lino marfil.' },
        ],
      }, { maxWidth: width.gallery, padTop: space.wide, padBottom: space.section }, { images: 'media.galleryImages' }),
      section('guests', 'editorialDetails', {
        eyebrow: 'Pequeños detalles', title: 'Para disfrutar sin prisas', layout: 'columns',
        items: [
          { label: 'Vestimenta', value: '{{content.dress.men}}', note: 'Agradecemos reservar el blanco para la novia.' },
          { label: 'Regalos', value: 'Tu presencia es lo importante', note: 'Nos hace felices compartir este día contigo.' },
          { label: 'Puntualidad', value: 'Un poquito antes', note: 'Llega 15 minutos antes para encontrar tu lugar.' },
        ],
      }, { maxWidth: width.content }),
      section('closing', 'editorialChapter', {
        variant: 'letter', number: '∞', eyebrow: 'El mejor capítulo', title: 'Solo faltas tú.',
        body: 'Hay días que se recuerdan para siempre. Este será uno de ellos porque lo compartiremos contigo.', note: 'Con cariño, {{couple.full}}', image: '',
      }, { bgKind: 'soft', maxWidth: width.reading, padBottom: space.gutter }),
      section('rsvp', 'rsvp', { mode: 'form', message: '¿Nos acompañas?', buttonLabel: 'Confirmar mi asistencia' }, { bgKind: 'soft', padTop: space.gutter, padBottom: space.wide }),
    ],
  };
}

export function marfilVivoStarter(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 4, 15));
  date.setUTCDate(date.getUTCDate() + (6 - date.getUTCDay() + 7) % 7);
  const eventDate = date.toISOString().slice(0, 10);
  const itinerary = [
    { time: '16:00', label: 'El sí, quiero', place: 'Capilla del jardín', note: 'Llegar 15 minutos antes', icon: 'church' },
    { time: '17:30', label: 'Un brindis por nosotros', place: 'Terraza de los olivos', duration: '60 min', icon: 'cheers' },
    { time: '19:00', label: 'La mesa está servida', place: 'Salón principal', icon: 'dinner' },
    { time: '21:00', label: 'Nuestra primera canción', place: 'Pista de baile', icon: 'dance' },
    { time: '22:00', label: 'A celebrar la vida', note: 'Hasta el último baile', icon: 'party' },
  ];
  const config: BuilderConfig = {
    designMode: 'guided', fontHeading: 'Playfair Display', fontBody: 'Outfit',
    theme: { ...MARFIL_THEME }, tokens: { ...MARFIL_TOKENS, typeScale: { ...MARFIL_TOKENS.typeScale } }, designKitId: 'marfil-vivo', city: 'Santa Cruz de la Sierra', welcomeTitle: 'Nos casamos',
    decor: { background: 'solid', texture: 'none', corners: { on: false }, floating: { on: false }, dividers: 'line', loader: 'none' },
    motion: { preset: 'minimal', intensity: 0.55, tempo: 'balanced', scrollFlow: 'free', progress: 'line', parallax: 0 },
    entry: { enabled: true, style: 'template', label: 'Abrir nuestra historia' },
    galleryImages: [...PHOTOS], layout: createMarfilVivoLayout(`${eventDate}T16:00:00`),
  };
  return {
    status: 'draft' as const, template: 'grazia' as const, type: 'boda' as const, names: 'Elena & Mateo',
    event_date: eventDate, ceremony_time: '16:00', ceremony_place: 'Capilla del jardín', ceremony_address: 'Santa Cruz de la Sierra',
    reception_time: '17:30', reception_place: 'Terraza de los olivos', reception_address: 'Santa Cruz de la Sierra',
    guest_name: null, guest_passes: 2, message: 'Queremos compartir este nuevo capítulo contigo.', dress_code: 'Formal', no_kids: false,
    parents_groom: [], parents_bride: [], sponsors: [], itinerary, gift_message: 'Tu presencia es nuestro mejor regalo.', bank_account: null,
    cover_image_url: COVER, gallery_url: null, color_primary: MARFIL_THEME.primary!, color_secondary: MARFIL_THEME.bg!, color_accent: MARFIL_THEME.text!,
    phone_whatsapp: null, builder_config: config,
  };
}

export function marfilVivoDemo(now = new Date()): InvitationParsed {
  const starter = marfilVivoStarter(now);
  return {
    ...starter, id: 'marfil-vivo-demo', slug: 'marfil-vivo', config: starter.builder_config, builder_config: JSON.stringify(starter.builder_config),
    is_active: true, expires_at: null, views_count: 0, host_email: null, host_password_hash: null,
    rsvp_deadline: null, whatsapp_template: null, created_at: now.toISOString(), phone_raw: null,
  };
}
