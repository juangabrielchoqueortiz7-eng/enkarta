import type { BuilderConfig, InvitationParsed } from './types';
import { PARADISE_REFERENCE_ASSETS as assets } from './paradise-reference-assets';

/** A separate, incremental study; never replaces the Verdealma starter. */
export const PARADISE_REFERENCE_KEY = 'paradise-referencia' as const;
export const PARADISE_REFERENCE_COVER = '/invitations/paradise-referencia/2025-12-pasport.webp';

export function paradiseReferenceStarter() {
  const config: BuilderConfig = {
    designKey: PARADISE_REFERENCE_KEY,
    brideLast: 'Ruggeri',
    groomLast: 'Garrido',
    city: 'Santa Cruz',
    theme: { primary: '#637753', primaryDeep: '#637753', bg: '#637753', text: '#ede4d2', onPrimary: '#ede4d2' },
    entry: { enabled: true, label: 'Ver invitación' },
    motion: { preset: 'none' },
    introMessage: 'Nuestro gran día se aproxima y nos encantaría que formaras parte de él. Nos hace mucha ilusión invitarlos a nuestra boda.',
    verse: 'Dos son mejor que uno, porque obtienen más fruto de su esfuerzo. Si caen, el uno levanta al otro.',
    verseRef: 'Eclesiastés 4:9-10',
    blessing: 'Con la bendición de Dios y guiados por el amor de nuestros padres:',
    ceremonyDesc: 'Ceremonia Religiosa',
    receptionDesc: 'Ceremonia Civil',
    musicUrl: assets.music,
    secondaryImage: assets.gallery[0],
    galleryImages: [...assets.gallery],
    footerImage: assets.closingGallery[0],
    sectionImages: { paradiseClosingSecond: assets.closingGallery[1] },
    galleryMessage: 'Te invitamos a capturar y compartir los momentos especiales de nuestro evento, para que juntos podamos revivir esta ocasión tan especial.',
    lodgingTitle: 'Sugerencia de hospedaje',
    lodging: [
      { ...assets.hotels[0] },
      { ...assets.hotels[1], name: 'Madisson Inn hotel & Luxury suites' },
    ],
    noKidsMessage: 'Amamos a sus niños y queremos que ustedes disfruten y bailen sin parar, es por ello que la invitación es solo para adultos',
    rsvpMessage: 'Es muy importante para nosotros confirmar tu asistencia. Por favor, confirma tu presencia para poder organizar todo adecuadamente.',
    rsvpClosing: 'Creemos que mereces una noche alegre y divertida es por eso que esperamos contar con tu presencia',
    giftRegistryLabel: 'Ver la Mesa de Regalos',
  };
  return {
    template: 'paradise' as const, status: 'draft' as const, type: 'boda' as const,
    names: 'Laura & Elvis', event_date: '2026-03-29',
    ceremony_time: '18:00', ceremony_place: 'Centro de Eventos Notre Dame', ceremony_address: 'Santa Cruz',
    reception_time: '20:00', reception_place: 'Centro de Eventos Notre Dame', reception_address: 'Santa Cruz',
    guest_name: 'Daniel Martinez', guest_passes: 2, message: null, dress_code: 'Formal', no_kids: true,
    parents_groom: ['Liduzmila Damián Acosta', 'José Zeña Santamaría'],
    parents_bride: ['Alicia Mariluz Roca', 'Jorge Pachas Avalos'], sponsors: [],
    // The reference repeats contradictory times. Keep one editable event schedule.
    itinerary: [
      { time: '18:00', label: 'Ceremonia Religiosa', icon: assets.icons.ceremony },
      { time: '20:00', label: 'Recepción Social', icon: assets.icons.reception },
      { time: '20:30', label: 'Vals y Brindis', icon: assets.icons.firstDance },
      { time: '21:00', label: 'Cena', icon: assets.icons.dinner },
      { time: '21:30', label: 'A bailar', icon: assets.icons.dance },
      { time: '00:00', label: 'Fin de la fiesta', icon: assets.icons.farewell },
    ],
    gift_message: 'Su presencia y sus buenos deseos son nuestro mejor regalo. Si desean hacernos llegar algún presente estaremos muy agradecidos.',
    bank_account: null, cover_image_url: PARADISE_REFERENCE_COVER,
    gallery_url: null, color_primary: '#637753', color_secondary: '#637753', color_accent: '#ede4d2',
    phone_whatsapp: null, builder_config: config,
  };
}

export function paradiseReferenceDemo(): InvitationParsed {
  const starter = paradiseReferenceStarter();
  return {
    ...starter, id: 'demo-paradise-referencia', slug: PARADISE_REFERENCE_KEY,
    config: starter.builder_config, builder_config: JSON.stringify(starter.builder_config),
    is_active: true, expires_at: null, views_count: 0, host_email: null, host_password_hash: null,
    rsvp_deadline: null, whatsapp_template: null, created_at: '2026-10-22T00:00:00Z', phone_raw: null,
  };
}

/** The editable event date is the single source for the vertical label. */
export function paradiseReferenceDate(value: string | null) {
  const date = value?.slice(0, 10) ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const [year, month, day] = date.split('-');
  return { iso: date, day, month, year, dateLine: `${day}/${month}/${year.slice(-2)}`,
    label: new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parsed) };
}

/** Strict local clock: never label malformed editor input as a different time. */
export function paradiseReferenceClock(value: string | null): string {
  const time = value?.slice(0, 5) ?? '';
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) ? `${time} h` : '';
}

/** Calendar uses the same editable date/time, without a fabricated UTC suffix. */
export function paradiseReferenceCalendar(data: InvitationParsed): string | null {
  const date = paradiseReferenceDate(data.event_date);
  const clock = paradiseReferenceClock(data.ceremony_time) || paradiseReferenceClock(data.reception_time);
  if (!date) return null;
  const compact = date.iso.replace(/-/g, '');
  const start = clock ? `${compact}T${clock.slice(0, 5).replace(':', '')}00` : compact;
  const end = clock ? (() => {
    const later = new Date(`${date.iso}T${clock.slice(0, 5)}:00Z`);
    later.setUTCHours(later.getUTCHours() + 2);
    return later.toISOString().slice(0, 19).replace(/[-:]/g, '');
  })() : (() => {
    const next = new Date(`${date.iso}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10).replace(/-/g, '');
  })();
  return 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
    action: 'TEMPLATE', text: data.names ?? '', dates: `${start}/${end}`,
    ctz: 'America/La_Paz',
    location: [data.ceremony_place, data.ceremony_address].filter(Boolean).join(', '),
  }).toString();
}

/** Always builds a Maps search URL; text cannot become an executable href. */
export function paradiseReferenceMaps(place: string | null, address: string | null): string | null {
  const query = [place?.trim(), address?.trim()].filter(Boolean).join(', ');
  return query ? 'https://www.google.com/maps/search/?' + new URLSearchParams({ api: '1', query }).toString() : null;
}

/** Keep empty edits empty instead of reviving the reference's sample values. */
export function paradiseReferenceHeading(data: InvitationParsed) {
  const [bride = '', ...remainingNames] = (data.names ?? '').split(/\s*&\s*|\s+y\s+/i);
  return {
    bride: bride.trim(),
    groom: remainingNames.join(' y ').trim(),
    brideLast: data.config.brideLast ?? '',
    groomLast: data.config.groomLast ?? '',
    dateLine: paradiseReferenceDate(data.event_date)?.dateLine ?? '',
    city: data.config.city ?? '',
    coverImage: data.cover_image_url ?? '',
  };
}
