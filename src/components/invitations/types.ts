// Shared content model for the Invitali-style premium invitations.
// Self-contained (no DB dependency) so templates can be previewed with sample data
// and later wired to real Supabase data.

import type { TemplateTheme, TemplateDecor } from '@/lib/types';

export type { TemplateTheme, TemplateDecor };

export interface ItineraryStep {
  /** Nombre SVG clásico ('church','rings',...) o ruta Lottie ('/lottie/boda/marriage.json') */
  icon: string;
  label: string;
  time: string;
  /** Colores editados del ícono Lottie: { '#origen': '#nuevo' | 'transparent' } */
  iconColors?: Record<string, string>;
  /** Velocidad del ícono Lottie (1 = normal). */
  iconSpeed?: number;
}

/**
 * Personalización de iconos compartida por todas las plantillas premium:
 * elegir icono por sección, recolorear/transparentar y velocidad.
 */
export interface IconCustomization {
  /** Icono por sección (key → nombre SVG / ruta Lottie / URL imagen) */
  icons?: Record<string, string>;
  /** Colores editados por sección para iconos Lottie (key → { '#origen': '#nuevo' | 'transparent' }) */
  iconColorsMap?: Record<string, Record<string, string>>;
  /** Velocidad por sección para iconos Lottie (key → número) */
  iconSpeedsMap?: Record<string, number>;
  /** Color de iconos SVG por defecto (override opcional) */
  iconColor?: string;
  /** Escala de iconos (1 = normal) */
  iconScale?: number;
}

export interface GiftBank {
  bank: string;
  account: string;
  ci?: string;
  holder: string;
}

export interface InvitationContent extends IconCustomization {
  // Couple
  groom: string;
  bride: string;
  initials: [string, string]; // ['L', 'M']

  // Guest personalization
  guestName?: string;
  guestPasses?: string; // e.g. "2 pases"

  // Date / time (ISO for countdown + display parts)
  isoDate: string;        // '2026-07-04T16:00:00'
  weekday: string;        // 'Sábado'
  day: string;            // '04'
  month: string;          // 'Julio'
  year: string;           // '2026'
  city: string;           // 'Bogotá'

  // Intro (shown right after entering)
  introMessage: string;   // 'Nos llena el corazón de gran alegría...'

  welcomeTitle: string;

  // Parents / blessing
  blessing: string;
  parentsGroom: string[]; // two lines
  parentsBride: string[];

  // Ceremony + reception
  ceremony: { time: string; place: string; address: string; mapsUrl: string };
  reception: { time: string; place: string; address: string; mapsUrl: string };

  // Dress code
  dressCode: { men: string; women: string };

  // Itinerary
  itinerary: ItineraryStep[];

  // Gift
  gift: { message: string; bank: GiftBank; qrUrl?: string };

  // Gallery
  gallery: { message: string; shareUrl: string };

  // RSVP
  rsvp: { message: string; whatsappUrl: string };

  // Optional music track
  musicUrl?: string;

  // Optional cover photo + uploaded gallery
  coverImage?: string;
  galleryImages?: string[];

  // Tema y decoración editables
  theme?: TemplateTheme;
  decor?: TemplateDecor;
}

export interface PrimiciaContent extends IconCustomization {
  groom: string;
  bride: string;
  initials: [string, string];
  guestName?: string;
  guestPasses?: string;
  isoDate: string;
  dateWeekday: string;
  dateDay: string;
  dateMonth: string;
  dateYear: string;
  dateLine: string;
  coupleMessage: string[];
  parentsBride: string[];
  parentsGroom: string[];
  itinerary: ItineraryStep[];
  dressCode: string;
  locations: Array<{
    name: string;
    time: string;
    place: string;
    desc: string;
    maps: string;
  }>;
  rsvpMessage: string;
  giftMessage: string;
  giftAccount: {
    no: string;
    cci: string;
  };
  whatsapp: string;
  photoUrl: string;
  musicUrl?: string;
  galleryImages?: string[];
  theme?: TemplateTheme;
  decor?: TemplateDecor;
}

export interface ParadiseContent extends IconCustomization {
  groom: string;
  bride: string;
  brideLast?: string;   // apellido de la novia (script): "Ruggeri"
  groomLast?: string;   // apellido del novio (script): "Garrido"
  guestName?: string;
  guestPasses?: string;
  isoDate: string;
  dateLabel: string;    // "29/03/26" (vertical en portada)
  city: string;         // "SANTA CRUZ"

  coverImage?: string;     // foto principal (marco arco)
  secondaryImage?: string; // foto junto al countdown
  footerImage?: string;    // foto grande final

  introMessage: string;
  blessing: string;     // "CON LA BENDICIÓN DE DIOS Y GUIADOS..."
  verse: string;
  verseRef: string;

  parentsBride: string[];
  parentsGroom: string[];

  ceremonyReligious: { time: string; place: string; maps: string };
  ceremonyCivil?: { time: string; place: string; maps: string };
  dressCode: string;

  itinerary: ItineraryStep[];

  giftMessage: string;
  giftRegistryUrl?: string;
  giftRegistryLabel?: string; // "falabella."
  giftQrUrl?: string;

  lodgingTitle?: string;
  lodging: { name: string; image: string }[];

  noKids: string;
  galleryMsg: string;
  galleryUrl: string;

  rsvpMessage: string;  // "Es muy importante para nosotros..."
  rsvpDeadline?: string;
  rsvpClosing: string;  // "CREEMOS QUE MERECES UNA NOCHE..."
  whatsapp: string;

  musicUrl?: string;
  galleryImages?: string[];
  theme?: TemplateTheme;
  decor?: TemplateDecor;
}

export interface GraziaContent extends IconCustomization {
  groom: string;
  bride: string;
  groomName?: string;   // nombre completo bajo foto circular: "Lorenzo Bianchi"
  brideName?: string;   // "Isabella Moretti"
  guestName?: string;
  guestPasses?: string;

  isoDate: string;
  dateText: string;     // "19 de Octubre 2025"
  timeText: string;     // "16:00 hrs."
  coverLabel?: string;  // "La boda de"

  coverImage?: string;
  groomPhoto?: string;  // foto circular novio (Save the Date)
  bridePhoto?: string;  // foto circular novia

  saveDateMsg: string;
  parentsGroom: string[];
  parentsBride: string[];

  ceremonyReligious: { date: string; time: string; place: string; maps: string };
  reception?: { date: string; time: string; place: string; maps: string };

  itinerary: ItineraryStep[];

  lodgingTitle?: string;
  lodging: { name: string; image: string; desc?: string }[];
  lodgingContact?: string;

  giftMessage: string;
  giftAccounts: { name: string; account: string }[];
  giftQrUrl?: string;

  storyTitle?: string;
  storyMessage: string;
  galleryImages: string[];

  noKids: string;
  dressCode: string;
  dressCodeTitle?: string;

  galleryMsg: string;
  galleryUrl: string;
  rsvpMessage: string;
  whatsapp: string;

  musicUrl?: string;
  theme?: TemplateTheme;
  decor?: TemplateDecor;
}

export interface DolceVitaContent extends IconCustomization {
  groom: string;
  bride: string;
  guestName?: string;
  guestPasses?: string;
  isoDate: string;
  dateCity: string;      // "LA PAZ"
  dateWeekday: string;   // "Domingo"
  dateDay: string;       // "04"
  dateMonth: string;     // "Septiembre"
  dateYear: string;      // "2026"

  coverImage?: string;
  introMessage: string;
  blessing: string;
  parentsGroom: string[];
  parentsBride: string[];
  padrinos: string[];

  ceremonyReligious: { time: string; place: string; maps: string };
  ceremonyCivil?: { time: string; place: string; maps: string };
  reception?: { time: string; place: string; maps: string };
  dressCode: string;

  itinerary: ItineraryStep[];
  galleryImages: string[];

  lodgingTitle?: string;
  lodging: { name: string; image: string; desc?: string }[];
  lodgingContact?: string;

  galleryMsg: string;
  galleryUrl: string;
  noKids: string;

  giftMessage: string;
  giftThanks?: string;
  giftCash?: string;     // "Efectivo en sobres (Habrá un buzón)"
  giftBank?: { bank: string; account: string; holder: string };
  giftQrUrl?: string;
  giftOther?: string;    // "Obsequios tradicionales (Escríbenos)"

  rsvpClosing: string;
  thanksMessage?: string;
  whatsapp: string;

  musicUrl?: string;
  theme?: TemplateTheme;
  decor?: TemplateDecor;
}

export interface ObsidianaContent extends IconCustomization {
  groom: string;
  bride: string;
  guestName?: string;
  guestPasses?: string;
  isoDate: string;
  dateWeekday: string;  // "Sábado"
  dateDay: string;      // "30"
  dateMonth: string;    // "Agosto"
  datePlace: string;    // "Italacume 2025" o lugar

  coverImage?: string;
  aboutImage?: string;  // sección "Nosotros"
  footerImage?: string;

  introMessage: string;
  blessing: string;
  parentsBride: string[];
  parentsGroom: string[];

  ceremonyReligious: { time: string; place: string; maps: string };
  reception?: { time: string; place: string; maps: string };
  dressCode: string;

  itinerary: ItineraryStep[];

  lodgingTitle?: string;
  lodging: { name: string; image: string }[];

  giftMessage: string;
  giftEnvelopes?: string;   // "Lluvia de sobres"
  giftQrUrl?: string;
  giftRegistryUrl?: string;

  thanksTitle?: string;     // "Agradecimiento"
  thanksMessage: string;
  padrinos: { role: string; names: string[] }[];

  galleryMsg: string;
  galleryUrl: string;

  rsvpClosing: string;
  rsvpMessage: string;
  whatsapp: string;

  musicUrl?: string;
  galleryImages?: string[];
  theme?: TemplateTheme;
  decor?: TemplateDecor;
}

export interface PassportContent extends IconCustomization {
  groom: string;
  bride: string;
  initials: [string, string];
  guestName?: string;
  guestPasses?: string;
  isoDate: string;
  announce: string;
  verse: string;
  verseRef: string;
  callout: string;
  callout2: string;
  parentsBride: string[];
  parentsGroom: string[];
  escala: {
    place: string;
    time: string;
    maps: string;
  };
  dress: {
    note: string;
    women: string[];
    men: string[];
  };
  itinerary: ItineraryStep[];
  noKids: string;
  galleryMsg: string;
  galleryUrl: string;
  whatsapp: string;
  musicUrl?: string;
  coverImage?: string;
  galleryImages?: string[];
  theme?: TemplateTheme;
  decor?: TemplateDecor;
}
