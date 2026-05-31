export type InvitationStatus = 'draft' | 'ready';

export type InvitationTemplate = 'perla' | 'marmol' | 'terra' | 'sobre' | 'carmesi' | 'gerbera';

export type InvitationType = 'boda' | 'xv' | 'cumpleanos' | 'baby_shower' | 'bautizo';

export interface Sponsor {
  role: string;
  names: string;
}

export interface ItineraryItem {
  time: string;
  label: string;
}

export interface Invitation {
  id: string;
  slug: string;
  status: InvitationStatus;
  template: InvitationTemplate;
  type: InvitationType;

  // Main data
  names: string | null;
  event_date: string | null;
  ceremony_time: string | null;
  ceremony_place: string | null;
  ceremony_address: string | null;
  reception_time: string | null;
  reception_place: string | null;
  reception_address: string | null;

  // Guest personalization
  guest_name: string | null;
  guest_passes: number;

  // Optional content
  message: string | null;
  dress_code: string | null;
  no_kids: boolean;
  parents_groom: string | null; // JSON string
  parents_bride: string | null; // JSON string
  sponsors: string | null; // JSON string
  itinerary: string | null; // JSON string
  gift_message: string | null;
  bank_account: string | null;
  cover_image_url: string | null;
  gallery_url: string | null;

  // Custom colors
  color_primary: string;
  color_secondary: string;
  color_accent: string;

  // Metadata
  created_at: string;
  phone_raw: string | null;
}

// Parsed versions of JSON fields
export interface InvitationParsed extends Omit<Invitation, 'parents_groom' | 'parents_bride' | 'sponsors' | 'itinerary'> {
  parents_groom: string[];
  parents_bride: string[];
  sponsors: Sponsor[];
  itinerary: ItineraryItem[];
}

// Helper to parse JSON fields
export function parseInvitation(inv: Invitation): InvitationParsed {
  return {
    ...inv,
    parents_groom: safeParseJSON<string[]>(inv.parents_groom, []),
    parents_bride: safeParseJSON<string[]>(inv.parents_bride, []),
    sponsors: safeParseJSON<Sponsor[]>(inv.sponsors, []),
    itinerary: safeParseJSON<ItineraryItem[]>(inv.itinerary, []),
  };
}

function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// Form data for creating/editing
export interface InvitationFormData {
  slug: string;
  template: InvitationTemplate;
  type: InvitationType;
  names: string;
  event_date: string;
  ceremony_time: string;
  ceremony_place: string;
  ceremony_address: string;
  reception_time: string;
  reception_place: string;
  reception_address: string;
  guest_name: string;
  guest_passes: number;
  message: string;
  dress_code: string;
  no_kids: boolean;
  parents_groom: string[];
  parents_bride: string[];
  sponsors: Sponsor[];
  itinerary: ItineraryItem[];
  gift_message: string;
  bank_account: string;
  cover_image_url: string;
  gallery_url: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
}

export const TEMPLATE_OPTIONS: { value: InvitationTemplate; label: string; description: string }[] = [
  { value: 'perla', label: 'Perla', description: 'Elegante con hojas verdes y dorado' },
  { value: 'marmol', label: 'Mármol', description: 'Sofisticado con texturas de mármol' },
  { value: 'terra', label: 'Terra', description: 'Tonos tierra, rústico y cálido' },
  { value: 'sobre', label: 'Sobre', description: 'Clásico estilo sobre real' },
  { value: 'carmesi', label: 'Carmesí', description: 'Dramático en rojos profundos' },
  { value: 'gerbera', label: 'Gerbera', description: 'Floral y vibrante con atardecer' },
];

export const TYPE_OPTIONS: { value: InvitationType; label: string }[] = [
  { value: 'boda', label: 'Boda' },
  { value: 'xv', label: 'XV Años' },
  { value: 'cumpleanos', label: 'Cumpleaños' },
  { value: 'baby_shower', label: 'Baby Shower' },
  { value: 'bautizo', label: 'Bautizo' },
];
