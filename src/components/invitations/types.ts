// Shared content model for the Invitali-style premium invitations.
// Self-contained (no DB dependency) so templates can be previewed with sample data
// and later wired to real Supabase data.

export interface ItineraryStep {
  icon: 'church' | 'rings' | 'cheers' | 'dance' | 'dinner' | 'party';
  label: string;
  time: string;
}

export interface GiftBank {
  bank: string;
  account: string;
  ci?: string;
  holder: string;
}

export interface InvitationContent {
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
}
