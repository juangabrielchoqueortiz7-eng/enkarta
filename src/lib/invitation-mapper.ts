/**
 * Converts the flat DB `InvitationParsed` record into the rich content
 * objects that each premium template expects.
 */

import { InvitationParsed } from './types';
import { resolveFeatures } from './packages';
import {
  InvitationContent,
  PrimiciaContent,
  PassportContent,
  ParadiseContent,
  ObsidianaContent,
  DolceVitaContent,
  GraziaContent,
  ItineraryStep,
} from '@/components/invitations/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Destino del botón "Confirmar asistencia" de las plantillas. Si la invitación
 * usa confirmación inteligente (paquete), enlaza al formulario in-app inyectado
 * (#enkarta-confirmar); si no, abre WhatsApp con un mensaje listo.
 */
function confirmHref(inv: InvitationParsed): string {
  if (resolveFeatures(inv.config).smartRsvp) return '#enkarta-confirmar';
  return inv.phone_whatsapp
    ? `https://wa.me/${inv.phone_whatsapp.replace(/\D/g, '')}?text=Confirmo+mi+asistencia`
    : '#';
}

/** "Ana & Carlos"  →  ["Ana", "Carlos"] */
function splitNames(names: string | null): [string, string] {
  if (!names) return ['Novio', 'Novia'];
  const parts = names.split(/\s*[&y]\s*/i);
  return [parts[0]?.trim() || 'Novio', parts[1]?.trim() || 'Novia'];
}

/** "2026-07-04" + "16:00" → "2026-07-04T16:00:00" */
function buildIso(date: string | null, time: string | null): string {
  const d = date ?? new Date().toISOString().slice(0, 10);
  const t = time ?? '16:00';
  return `${d}T${t}:00`;
}

/** "16:00" → "16:00 h" */
function fmtTime(t: string | null) {
  return t ? `${t} h` : '—';
}

/** "2026-07-04" → { weekday, day, month, year } in Spanish */
function parseDateParts(dateStr: string | null) {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    weekday: cap(d.toLocaleDateString('es-ES', { weekday: 'long' })),
    day: String(d.getDate()).padStart(2, '0'),
    month: cap(d.toLocaleDateString('es-ES', { month: 'long' })),
    year: String(d.getFullYear()),
  };
}

/** "Banco BCP — 123-456" → { bank, account, holder } */
function parseBank(raw: string | null): InvitationContent['gift']['bank'] {
  if (!raw) return { bank: '', account: '', holder: '' };
  const [bankPart, accountPart] = raw.split(/[-–—]/);
  return {
    bank: bankPart?.trim() ?? '',
    account: accountPart?.trim() ?? '',
    holder: '',
  };
}

/** Dress code "Formal" → { men: 'Traje', women: 'Vestido largo' } */
function parseDressCode(raw: string | null): InvitationContent['dressCode'] {
  if (!raw) return { men: 'Formal', women: 'Formal' };
  if (raw.includes('|')) {
    const [men, women] = raw.split('|');
    return { men: men.trim(), women: women.trim() };
  }
  return { men: raw, women: raw };
}

/** Maps itinerary items to ItineraryStep (supports Lottie paths & classic names) */
function mapItinerary(
  items: Array<{ time: string; label: string; icon?: string; iconColors?: Record<string, string>; iconSpeed?: number }>
): ItineraryStep[] {
  if (!items.length) {
    return [
      { icon: 'church', label: 'Ceremonia', time: '16:00 h' },
      { icon: 'cheers', label: 'Recepción', time: '18:00 h' },
    ];
  }
  return items.map(i => ({
    icon: i.icon ?? 'church',
    label: i.label,
    time: i.time,
    iconColors: i.iconColors,
    iconSpeed: i.iconSpeed,
  }));
}

// ─── Azure Mapper ─────────────────────────────────────────────────────────────

export function mapToAzure(inv: InvitationParsed): InvitationContent {
  const [groom, bride] = splitNames(inv.names);
  const { weekday, day, month, year } = parseDateParts(inv.event_date);
  const config = inv.config;

  return {
    groom,
    bride,
    initials: [groom[0]?.toUpperCase() ?? 'A', bride[0]?.toUpperCase() ?? 'B'],
    guestName: inv.guest_name ?? undefined,
    guestPasses: inv.guest_passes ? `${inv.guest_passes} pases` : undefined,

    isoDate: buildIso(inv.event_date, inv.ceremony_time),
    weekday,
    day,
    month,
    year,
    city: config?.city ?? 'Colombia',

    introMessage:
      inv.message ?? 'Nos llena de alegría poder compartir contigo este momento especial.',
    welcomeTitle:
      config?.welcomeTitle ??
      `Bienvenidos a la invitación de nuestra ${inv.type === 'boda' ? 'boda' : 'celebración'}`,

    blessing: config?.blessing ?? 'Con la bendición de Dios y de nuestros padres',
    parentsGroom: inv.parents_groom.length ? inv.parents_groom : [],
    parentsBride: inv.parents_bride.length ? inv.parents_bride : [],

    ceremony: {
      time: fmtTime(inv.ceremony_time),
      place: inv.ceremony_place ?? '',
      address: inv.ceremony_address ?? '',
      mapsUrl: toMapsUrl(inv.ceremony_address),
    },
    reception: {
      time: fmtTime(inv.reception_time),
      place: inv.reception_place ?? '',
      address: inv.reception_address ?? '',
      mapsUrl: toMapsUrl(inv.reception_address),
    },

    dressCode: parseDressCode(inv.dress_code),
    itinerary: mapItinerary(inv.itinerary),

    gift: {
      message: inv.gift_message ?? 'Tu presencia es el mejor regalo.',
      bank: parseBank(inv.bank_account),
    },
    gallery: {
      message: config?.galleryMessage ?? 'Comparte los recuerdos de este día especial.',
      shareUrl: inv.gallery_url ?? '#',
    },
    rsvp: {
      message: config?.rsvpMessage ?? 'Por favor confirma tu asistencia.',
      whatsappUrl: confirmHref(inv),
    },
    musicUrl: config?.musicUrl,
    coverImage: inv.cover_image_url ?? undefined,
    galleryImages: config?.galleryImages ?? [],
    icons: config?.sectionIcons,
    iconColorsMap: config?.sectionIconColors,
    iconSpeedsMap: config?.sectionIconSpeeds,
    iconColor: config?.iconColor,
    iconScale: config?.iconScale,
    theme: config?.theme,
    decor: config?.decor,
  };
}

// ─── Primicia Mapper ──────────────────────────────────────────────────────────

export function mapToPrimicia(inv: InvitationParsed): PrimiciaContent {
  const [groom, bride] = splitNames(inv.names);
  const { weekday, day, month, year } = parseDateParts(inv.event_date);
  const config = inv.config;

  return {
    groom,
    bride,
    initials: [groom[0]?.toUpperCase() ?? 'A', bride[0]?.toUpperCase() ?? 'B'],
    guestName: inv.guest_name ?? undefined,
    guestPasses: inv.guest_passes ? `${inv.guest_passes} pases` : undefined,

    isoDate: buildIso(inv.event_date, inv.ceremony_time),
    dateWeekday: weekday,
    dateDay: day,
    dateMonth: month,
    dateYear: year,
    dateLine: `${weekday}, ${parseInt(day)} de ${month}, ${year}`,

    coupleMessage: inv.message
      ? inv.message.split('\n').filter(Boolean)
      : ['Nos unimos para celebrar el inicio de nuestra historia juntos.'],

    parentsBride: inv.parents_bride.length ? inv.parents_bride : [],
    parentsGroom: inv.parents_groom.length ? inv.parents_groom : [],
    itinerary: mapItinerary(inv.itinerary),

    dressCode: inv.dress_code ?? 'Formal',

    locations: [
      {
        name: inv.ceremony_place ?? 'Ceremonia',
        time: fmtTime(inv.ceremony_time),
        place: inv.ceremony_place ?? '',
        desc: config?.ceremonyDesc ?? 'Un espacio sagrado donde uniremos nuestras vidas.',
        maps: toMapsUrl(inv.ceremony_address),
      },
      ...(inv.reception_place
        ? [{
            name: inv.reception_place,
            time: fmtTime(inv.reception_time),
            place: inv.reception_place,
            desc: config?.receptionDesc ?? 'Una celebración llena de alegría y amor.',
            maps: toMapsUrl(inv.reception_address),
          }]
        : []),
    ],

    rsvpMessage:
      config?.rsvpMessage ?? 'Los esperamos con toda la alegría y energía.',
    giftMessage: inv.gift_message ?? 'Ya tenemos pensados los sueños, solo falta la aventura.',
    giftAccount: {
      no: inv.bank_account?.split('|')[0]?.trim() ?? '',
      cci: inv.bank_account?.split('|')[1]?.trim() ?? '',
    },

    whatsapp: confirmHref(inv),
    photoUrl: inv.cover_image_url ?? '/catalog/primicia.jpg',
    musicUrl: config?.musicUrl,
    galleryImages: config?.galleryImages ?? [],
    icons: config?.sectionIcons,
    iconColorsMap: config?.sectionIconColors,
    iconSpeedsMap: config?.sectionIconSpeeds,
    iconColor: config?.iconColor,
    iconScale: config?.iconScale,
    theme: config?.theme,
    decor: config?.decor,
  };
}

// ─── Passport Mapper ──────────────────────────────────────────────────────────

export function mapToPassport(inv: InvitationParsed): PassportContent {
  const [groom, bride] = splitNames(inv.names);
  const config = inv.config;

  return {
    groom,
    bride,
    initials: [groom[0]?.toUpperCase() ?? 'A', bride[0]?.toUpperCase() ?? 'B'],
    guestName: inv.guest_name ?? undefined,
    guestPasses: inv.guest_passes ? `${inv.guest_passes} pases` : undefined,

    isoDate: buildIso(inv.event_date, inv.ceremony_time),
    announce: config?.announce ?? 'Nos casamos',
    verse: config?.verse ?? 'La cuerda de tres hilos no se rompe fácilmente: Dios, esposo y esposa.',
    verseRef: config?.verseRef ?? '(Eclesiastés 4:12)',
    callout: config?.callout ?? 'Prepara tus maletas y acompáñanos en esta aventura.',
    callout2: config?.callout2 ?? '¿Te unes?',

    parentsBride: inv.parents_bride.length ? inv.parents_bride : [],
    parentsGroom: inv.parents_groom.length ? inv.parents_groom : [],

    escala: {
      place: inv.ceremony_place ?? '',
      time: fmtTime(inv.ceremony_time),
      maps: toMapsUrl(inv.ceremony_address),
    },

    dress: {
      note: inv.dress_code ?? 'Etiqueta rigurosa',
      women: config?.dressWomen ?? ['Vestido largo'],
      men: config?.dressMen ?? ['Con traje'],
    },

    itinerary: mapItinerary(inv.itinerary),
    noKids: inv.no_kids ? (config?.noKidsMessage ?? 'La invitación es solo para adultos.') : '',

    galleryMsg:
      config?.galleryMessage ?? 'Comparte los momentos especiales del evento.',
    galleryUrl: inv.gallery_url ?? '#',

    whatsapp: confirmHref(inv),
    musicUrl: config?.musicUrl,
    coverImage: inv.cover_image_url ?? undefined,
    galleryImages: config?.galleryImages ?? [],
    icons: config?.sectionIcons,
    iconColorsMap: config?.sectionIconColors,
    iconSpeedsMap: config?.sectionIconSpeeds,
    iconColor: config?.iconColor,
    iconScale: config?.iconScale,
    theme: config?.theme,
    decor: config?.decor,
  };
}

// ─── Paradise Mapper ────────────────────────────────────────────────────────────

export function mapToParadise(inv: InvitationParsed): ParadiseContent {
  // En Paradise se muestra primero la novia y luego el novio.
  const [first, second] = splitNames(inv.names);
  const { day, year } = parseDateParts(inv.event_date);
  const config = inv.config;
  const shortYear = year.slice(-2);

  return {
    bride: first.toUpperCase(),
    groom: second.toUpperCase(),
    brideLast: config?.brideLast,
    groomLast: config?.groomLast,
    guestName: inv.guest_name ?? undefined,
    guestPasses: inv.guest_passes ? `${inv.guest_passes} pases` : undefined,

    isoDate: buildIso(inv.event_date, inv.ceremony_time),
    dateLabel: `${day} / ${String(new Date(`${inv.event_date ?? '2026-01-01'}T12:00:00`).getMonth() + 1).padStart(2, '0')} / ${shortYear}`,
    city: config?.city ?? 'Santa Cruz',

    coverImage: inv.cover_image_url ?? undefined,
    secondaryImage: config?.secondaryImage ?? inv.cover_image_url ?? undefined,
    footerImage: config?.footerImage ?? inv.cover_image_url ?? undefined,

    introMessage:
      inv.message ?? 'Nuestro gran día se aproxima y nos encantaría que formaras parte de él.',
    blessing: config?.blessing ?? 'Con la bendición de Dios y guiados por el amor de nuestros padres:',
    verse: config?.verse ?? 'Dos son mejor que uno, porque obtienen más fruto de su esfuerzo.',
    verseRef: config?.verseRef ?? 'Eclesiastés 4:9-10',

    parentsBride: inv.parents_bride.length ? inv.parents_bride : [],
    parentsGroom: inv.parents_groom.length ? inv.parents_groom : [],

    ceremonyReligious: {
      time: fmtTime(inv.ceremony_time),
      place: inv.ceremony_place ?? '',
      maps: toMapsUrl(inv.ceremony_address),
    },
    ceremonyCivil: inv.reception_place
      ? { time: fmtTime(inv.reception_time), place: inv.reception_place, maps: toMapsUrl(inv.reception_address) }
      : undefined,
    dressCode: inv.dress_code ?? 'Formal',

    itinerary: mapItinerary(inv.itinerary),

    giftMessage: inv.gift_message ?? 'Su presencia y sus buenos deseos son nuestro mejor regalo.',
    giftRegistryUrl: config?.giftRegistryUrl,
    giftRegistryLabel: config?.giftRegistryLabel ?? 'Mesa de regalos',
    giftQrUrl: config?.giftQrUrl,

    lodgingTitle: config?.lodgingTitle ?? 'Sugerencia de hospedaje',
    lodging: config?.lodging ?? [],

    noKids: config?.noKidsMessage ?? 'Amamos a sus niños y queremos que ustedes disfruten y bailen sin parar, es por ello que la invitación es solo para adultos.',
    galleryMsg: config?.galleryMessage ?? 'Comparte los momentos especiales de nuestro evento.',
    galleryUrl: inv.gallery_url ?? '#',

    rsvpMessage: config?.rsvpMessage ?? 'Es muy importante para nosotros confirmar tu asistencia.',
    rsvpClosing: config?.rsvpClosing ?? 'Esperamos contar con tu presencia.',
    whatsapp: confirmHref(inv),

    musicUrl: config?.musicUrl,
    galleryImages: config?.galleryImages ?? [],
    icons: config?.sectionIcons,
    iconColorsMap: config?.sectionIconColors,
    iconSpeedsMap: config?.sectionIconSpeeds,
    iconColor: config?.iconColor,
    iconScale: config?.iconScale,
    theme: config?.theme,
    decor: config?.decor,
  };
}

// ─── Obsidiana Mapper ────────────────────────────────────────────────────────────

export function mapToObsidiana(inv: InvitationParsed): ObsidianaContent {
  const [bride, groom] = splitNames(inv.names);
  const { weekday, day, month } = parseDateParts(inv.event_date);
  const config = inv.config;

  return {
    bride,
    groom,
    guestName: inv.guest_name ?? undefined,
    guestPasses: inv.guest_passes ? `${inv.guest_passes} pases` : undefined,

    isoDate: buildIso(inv.event_date, inv.ceremony_time),
    dateWeekday: weekday,
    dateDay: day,
    dateMonth: month,
    datePlace: config?.datePlace ?? config?.city ?? inv.ceremony_place ?? '',

    coverImage: inv.cover_image_url ?? undefined,
    aboutImage: config?.aboutImage ?? config?.secondaryImage ?? inv.cover_image_url ?? undefined,
    footerImage: config?.footerImage ?? inv.cover_image_url ?? undefined,

    introMessage: inv.message ?? 'Lo que Dios juntó, no lo separe el hombre.',
    blessing: config?.blessing ?? 'Con la bendición de Dios y nuestros padres',
    parentsBride: inv.parents_bride.length ? inv.parents_bride : [],
    parentsGroom: inv.parents_groom.length ? inv.parents_groom : [],

    ceremonyReligious: { time: fmtTime(inv.ceremony_time), place: inv.ceremony_place ?? '', maps: toMapsUrl(inv.ceremony_address) },
    reception: inv.reception_place
      ? { time: fmtTime(inv.reception_time), place: inv.reception_place, maps: toMapsUrl(inv.reception_address) }
      : undefined,
    dressCode: inv.dress_code ?? 'Formal',

    itinerary: mapItinerary(inv.itinerary),

    lodgingTitle: config?.lodgingTitle ?? 'Sugerencia de hospedaje',
    lodging: config?.lodging ?? [],

    giftMessage: inv.gift_message ?? 'Su presencia es nuestro mejor regalo.',
    giftEnvelopes: config?.giftEnvelopes ?? 'Lluvia de sobres',
    giftQrUrl: config?.giftQrUrl,
    giftRegistryUrl: config?.giftRegistryUrl,

    thanksTitle: config?.thanksTitle ?? 'Agradecimiento',
    thanksMessage: config?.thanksMessage ?? 'A Dios, a nuestros padres y a nuestros padrinos por su apoyo incondicional:',
    padrinos: inv.sponsors.map(s => ({
      role: s.role,
      names: (s.names ?? '').split('\n').map(x => x.trim()).filter(Boolean),
    })),

    galleryMsg: config?.galleryMessage ?? 'Comparte los momentos especiales de nuestro evento.',
    galleryUrl: inv.gallery_url ?? '#',

    rsvpClosing: config?.rsvpClosing ?? 'Esperamos contar con tu presencia.',
    rsvpMessage: config?.rsvpMessage ?? 'Es muy importante que nos confirmes tu asistencia.',
    whatsapp: confirmHref(inv),

    musicUrl: config?.musicUrl,
    galleryImages: config?.galleryImages ?? [],
    icons: config?.sectionIcons,
    iconColorsMap: config?.sectionIconColors,
    iconSpeedsMap: config?.sectionIconSpeeds,
    iconColor: config?.iconColor,
    iconScale: config?.iconScale,
    theme: config?.theme,
    decor: config?.decor,
  };
}

// ─── Dolce Vita Mapper ───────────────────────────────────────────────────────────

export function mapToDolceVita(inv: InvitationParsed): DolceVitaContent {
  const [groom, bride] = splitNames(inv.names);
  const { weekday, day, month, year } = parseDateParts(inv.event_date);
  const config = inv.config;

  return {
    groom,
    bride,
    guestName: inv.guest_name ?? undefined,
    guestPasses: inv.guest_passes ? `${inv.guest_passes} pases` : undefined,

    isoDate: buildIso(inv.event_date, inv.ceremony_time),
    dateCity: config?.dateCity ?? config?.city ?? 'La Paz',
    dateWeekday: weekday,
    dateDay: day,
    dateMonth: month,
    dateYear: year,

    coverImage: inv.cover_image_url ?? undefined,
    introMessage: inv.message ?? 'Casarse es de locos, pero es que nos queremos con locura.',
    blessing: config?.blessing ?? 'Con la bendición de Dios y de nuestros padres',
    parentsGroom: inv.parents_groom.length ? inv.parents_groom : [],
    parentsBride: inv.parents_bride.length ? inv.parents_bride : [],
    padrinos: inv.sponsors.flatMap(s => (s.names ?? '').split('\n').map(x => x.trim()).filter(Boolean)),

    ceremonyReligious: { time: fmtTime(inv.ceremony_time), place: inv.ceremony_place ?? '', maps: toMapsUrl(inv.ceremony_address) },
    reception: inv.reception_place
      ? { time: fmtTime(inv.reception_time), place: inv.reception_place, maps: toMapsUrl(inv.reception_address) }
      : undefined,
    dressCode: inv.dress_code ?? 'Formal',

    itinerary: mapItinerary(inv.itinerary),
    galleryImages: config?.galleryImages ?? [],

    lodgingTitle: config?.lodgingTitle ?? 'Sugerencia de hospedaje',
    lodging: config?.lodging ?? [],
    lodgingContact: config?.lodgingContact,

    galleryMsg: config?.galleryMessage ?? 'Comparte los momentos especiales de nuestro evento.',
    galleryUrl: inv.gallery_url ?? '#',
    noKids: config?.noKidsMessage ?? 'Amamos a sus niños, pero la invitación es solo para adultos.',

    giftMessage: inv.gift_message ?? 'Su presencia y sus buenos deseos son nuestro mejor regalo.',
    giftThanks: config?.giftThanks ?? 'Gracias por tu muestra de cariño',
    giftCash: config?.giftCash,
    giftBank: inv.bank_account ? parseBank(inv.bank_account) : undefined,
    giftQrUrl: config?.giftQrUrl,
    giftOther: config?.giftOther,

    rsvpClosing: config?.rsvpClosing ?? 'No olvides confirmar tu asistencia',
    thanksMessage: config?.thanksMessage,
    whatsapp: confirmHref(inv),

    musicUrl: config?.musicUrl,
    icons: config?.sectionIcons,
    iconColorsMap: config?.sectionIconColors,
    iconSpeedsMap: config?.sectionIconSpeeds,
    iconColor: config?.iconColor,
    iconScale: config?.iconScale,
    theme: config?.theme,
    decor: config?.decor,
  };
}

// ─── Grazia Mapper ───────────────────────────────────────────────────────────────

export function mapToGrazia(inv: InvitationParsed): GraziaContent {
  const [groom, bride] = splitNames(inv.names);
  const { day, month, year } = parseDateParts(inv.event_date);
  const config = inv.config;
  const dateText = `${parseInt(day)} de ${month} ${year}`;
  const ceremonyDate = `${parseInt(day)} ${month.toLowerCase()} ${year}`;

  return {
    groom,
    bride,
    groomName: config?.groomName,
    brideName: config?.brideName,
    guestName: inv.guest_name ?? undefined,
    guestPasses: inv.guest_passes ? `${inv.guest_passes} pases` : undefined,

    isoDate: buildIso(inv.event_date, inv.ceremony_time),
    dateText,
    timeText: inv.ceremony_time ? `${inv.ceremony_time} hrs.` : '',
    coverLabel: config?.coverLabel ?? 'La boda de',

    coverImage: inv.cover_image_url ?? undefined,
    groomPhoto: config?.groomPhoto ?? inv.cover_image_url ?? undefined,
    bridePhoto: config?.bridePhoto ?? inv.cover_image_url ?? undefined,

    saveDateMsg: config?.saveDateMsg ?? inv.message ?? 'Después de mucho tiempo caminando juntos hemos decidido unir nuestras vidas en matrimonio.',
    parentsGroom: inv.parents_groom.length ? inv.parents_groom : [],
    parentsBride: inv.parents_bride.length ? inv.parents_bride : [],

    ceremonyReligious: { date: ceremonyDate, time: fmtTime(inv.ceremony_time), place: inv.ceremony_place ?? '', maps: toMapsUrl(inv.ceremony_address) },
    reception: inv.reception_place
      ? { date: ceremonyDate, time: fmtTime(inv.reception_time), place: inv.reception_place, maps: toMapsUrl(inv.reception_address) }
      : undefined,

    itinerary: mapItinerary(inv.itinerary),

    lodgingTitle: config?.lodgingTitle ?? 'Sugerencia de hospedaje',
    lodging: config?.lodging ?? [],
    lodgingContact: config?.lodgingContact,

    giftMessage: inv.gift_message ?? 'El mejor regalo que nos das es tu presencia.',
    giftAccounts: config?.giftAccounts ?? (inv.bank_account
      ? [{ name: parseBank(inv.bank_account).holder || groom, account: parseBank(inv.bank_account).account }]
      : []),
    giftQrUrl: config?.giftQrUrl,

    storyTitle: config?.storyTitle ?? 'Nuestra Historia',
    storyMessage: config?.storyMessage ?? inv.message ?? 'Nuestros caminos se unieron de una forma inesperada.',
    galleryImages: config?.galleryImages ?? [],

    noKids: config?.noKidsMessage ?? 'La invitación es solo para adultos.',
    dressCode: inv.dress_code ?? 'Elegante',
    dressCodeTitle: config?.dressCodeTitle ?? 'Código de vestimenta',

    galleryMsg: config?.galleryMessage ?? 'Comparte los momentos especiales de nuestro evento.',
    galleryUrl: inv.gallery_url ?? '#',
    rsvpMessage: config?.rsvpMessage ?? 'Es muy importante para nosotros confirmar tu asistencia.',
    whatsapp: confirmHref(inv),

    musicUrl: config?.musicUrl,
    icons: config?.sectionIcons,
    iconColorsMap: config?.sectionIconColors,
    iconSpeedsMap: config?.sectionIconSpeeds,
    iconColor: config?.iconColor,
    iconScale: config?.iconScale,
    theme: config?.theme,
    decor: config?.decor,
  };
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function toMapsUrl(address: string | null): string {
  if (!address) return '#';
  if (address.startsWith('http')) return address;
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}
