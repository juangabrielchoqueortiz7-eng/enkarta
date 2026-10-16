import { isRevision, isUuid } from './rsvp-contract';
import type { QueuePurpose } from './whatsapp-queue';

export interface WhatsAppReview {
  id: string; purpose: QueuePurpose; ids: string[]; position: number; prepared: string[]; revision: number; updatedAt: number;
}
type ReviewStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const REVIEW_MAX_AGE = 24 * 60 * 60 * 1000;
export const whatsappReviewKey = (invitationId: string) => `enkarta:wa-review:v1:${invitationId}`;

/** Store only review identity and progress, never guest data, links or messages. */
export function whatsappReviewRecord(invitationId: string, value: WhatsAppReview) {
  if (!isUuid(invitationId) || !value || !isUuid(value.id) || !['invitation', 'reminder'].includes(value.purpose)
    || !Array.isArray(value.ids) || !value.ids.length || value.ids.length > 200 || !value.ids.every(isUuid)
    || new Set(value.ids).size !== value.ids.length || !isRevision(value.position) || value.position > value.ids.length
    || !isRevision(value.revision) || !isRevision(value.updatedAt) || !Array.isArray(value.prepared)
    || value.prepared.length > value.ids.length || new Set(value.prepared).size !== value.prepared.length
    || value.prepared.some(id => !value.ids.includes(id))) throw new Error('INVALID_REVIEW');
  return { version: 1, invitationId, review: { id: value.id, purpose: value.purpose, ids: [...value.ids], position: value.position,
    prepared: [...value.prepared], revision: value.revision, updatedAt: value.updatedAt } };
}

export function restoreWhatsAppReview(raw: string | null, invitationId: string, now = Date.now()): WhatsAppReview | null {
  if (!raw || raw.length > 20000) return null;
  try {
    const record = JSON.parse(raw);
    if (record?.version !== 1 || record.invitationId !== invitationId) return null;
    const { review } = whatsappReviewRecord(invitationId, record.review);
    if (review.updatedAt > now || now - review.updatedAt > REVIEW_MAX_AGE) return null;
    return review;
  } catch { return null; }
}

export function advanceWhatsAppReview(review: WhatsAppReview, now = Date.now()): WhatsAppReview {
  if (review.position >= review.ids.length) return review;
  return { ...review, position: review.position + 1, revision: review.revision + 1, updatedAt: now };
}
/** Save intent before requesting WhatsApp; closing must not offer the same opening again. */
export function prepareWhatsAppReview(review: WhatsAppReview, guestId: string, now = Date.now()): WhatsAppReview {
  if (!review.ids.includes(guestId) || review.prepared.includes(guestId)) return review;
  return { ...review, prepared: [...review.prepared, guestId], revision: review.revision + 1, updatedAt: now };
}

/** Compare review identity and revision so a stale panel cannot overwrite newer progress. */
export function saveWhatsAppReview(storage: ReviewStorage, invitationId: string, review: WhatsAppReview, now = Date.now()) {
  const key = whatsappReviewKey(invitationId), raw = storage.getItem(key);
  const record = whatsappReviewRecord(invitationId, review), previous = restoreWhatsAppReview(raw, invitationId, now);
  if (raw) {
    if (!previous || previous.id !== review.id) return false;
    if (previous.revision === review.revision) {
      if (JSON.stringify(previous) !== JSON.stringify(record.review)) return false;
    } else if (previous.revision !== review.revision - 1) return false;
  } else if (review.revision !== 0) return false;
  storage.setItem(key, JSON.stringify(record)); return true;
}

export function clearWhatsAppReview(storage: ReviewStorage, invitationId: string, review: WhatsAppReview, now = Date.now()) {
  const key = whatsappReviewKey(invitationId), current = restoreWhatsAppReview(storage.getItem(key), invitationId, now);
  if (!current || !canClearWhatsAppReview(current, review)) return false;
  storage.removeItem(key); return true;
}

/** Memory-only progress may supersede an older stored copy, never a newer one. */
export function canClearWhatsAppReview(stored: WhatsAppReview, current: WhatsAppReview, allowOlder = false) {
  return stored.id === current.id && stored.revision <= current.revision && (allowOlder || stored.revision === current.revision);
}
