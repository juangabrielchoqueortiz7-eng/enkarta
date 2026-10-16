import type { Guest, GuestMetadata } from './types';
import { normalizeGuestPhone } from './guest-import';

/** Only an operational DTO may carry contact data. {} is an intentional clear. */
export function guestMetadata(value: unknown): GuestMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const item = value as Record<string, unknown>;
  return {
    ...(typeof item.phone === 'string' ? { phone: item.phone } : {}),
    ...(typeof item.group === 'string' ? { group: item.group } : {}),
    ...(typeof item.eventAccess === 'string' && ['both', 'ceremony', 'reception'].includes(item.eventAccess) ? { eventAccess: item.eventAccess as GuestMetadata['eventAccess'] } : {}),
  };
}

/** Validate only supplied fields. Empty strings deliberately remove a value. */
export function parseGuestMetadata(input: Record<string, unknown>): GuestMetadata {
  const result: GuestMetadata = {};
  if (input.phone !== undefined) {
    if (typeof input.phone !== 'string' || input.phone.length > 40) throw new Error('INVALID_GUEST_CONTACT');
    const source = input.phone.trim(), phone = normalizeGuestPhone(source);
    if (source && (!/^[+\d\s().-]+$/.test(source) || !phone)) throw new Error('INVALID_GUEST_CONTACT');
    result.phone = phone;
  }
  if (input.group !== undefined) {
    if (typeof input.group !== 'string' || input.group.trim().length > 40) throw new Error('INVALID_GUEST_GROUP');
    result.group = input.group.trim();
  }
  if (input.eventAccess !== undefined) {
    if (typeof input.eventAccess !== 'string' || !['both', 'ceremony', 'reception'].includes(input.eventAccess)) throw new Error('INVALID_GUEST_PREFERENCE');
    result.eventAccess = input.eventAccess as GuestMetadata['eventAccess'];
  }
  return result;
}

/** Pre-migration read compatibility only. Canonical empty values beat legacy data. */
export function withGuestMetadata(guest: Guest, legacy?: GuestMetadata): Guest {
  return guest.metadataStored ? guest : { ...guest, ...guestMetadata(legacy) };
}

export function publicGuest(guest: Guest): Guest {
  const result = { ...guest };
  delete result.phone; delete result.group; delete result.eventAccess; delete result.metadataStored;
  return result;
}
