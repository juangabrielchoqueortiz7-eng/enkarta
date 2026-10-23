import type { BuilderConfig, InvitationParsed } from './types';

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
  };
  return {
    template: 'paradise' as const, status: 'draft' as const, type: 'boda' as const,
    names: 'Laura & Elvis', event_date: '2026-03-29',
    ceremony_time: null, ceremony_place: null, ceremony_address: null,
    reception_time: null, reception_place: null, reception_address: null,
    guest_name: 'Daniel Martinez', guest_passes: 2, message: null, dress_code: null, no_kids: false,
    parents_groom: [], parents_bride: [], sponsors: [], itinerary: [],
    gift_message: null, bank_account: null, cover_image_url: PARADISE_REFERENCE_COVER,
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
function headingDate(value: string | null): string {
  const date = value?.slice(0, 10) ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return '';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year.slice(-2)}`;
}

/** Keep empty edits empty instead of reviving the reference's sample values. */
export function paradiseReferenceHeading(data: InvitationParsed) {
  const [bride = '', ...remainingNames] = (data.names ?? '').split(/\s*&\s*|\s+y\s+/i);
  return {
    bride: bride.trim(),
    groom: remainingNames.join(' y ').trim(),
    brideLast: data.config.brideLast ?? '',
    groomLast: data.config.groomLast ?? '',
    dateLine: headingDate(data.event_date),
    city: data.config.city ?? '',
    coverImage: data.cover_image_url ?? '',
  };
}
