import { createHash } from 'crypto';
import type { AdditionalServicesConfig, InvitationParsed } from './types';
import { isRevision, isUuid } from './rsvp-contract';
import { publicAdditionalServices } from './additional-services';

export type SaveDateInterest = 'interested' | 'maybe' | 'unavailable';
export interface SaveDateResponse {
  id: string; name: string; interest: SaveDateInterest; guests: number; message: string;
  revision: number; updatedAt: string;
}

export function parseSaveDateInput(body: Record<string, unknown>) {
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  const responseKey = typeof body.responseKey === 'string' ? body.responseKey : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const interest = String(body.interest) as SaveDateInterest;
  const guests = interest === 'unavailable' ? 0 : body.guests;
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !isUuid(responseKey) || !name || name.length > 120
    || !['interested', 'maybe', 'unavailable'].includes(interest) || typeof guests !== 'number' || !Number.isInteger(guests)
    || guests < 0 || guests > 20 || (interest !== 'unavailable' && guests < 1) || message.length > 400
    || !isUuid(body.requestId) || !isRevision(body.expectedRevision)) throw new Error('INVALID_INPUT');
  const fingerprint = createHash('sha256').update(JSON.stringify({ slug, responseKey, name, interest, guests, message })).digest('hex');
  return { slug, responseKeyHash: createHash('sha256').update(responseKey).digest('hex'), name, interest, guests, message, requestId: body.requestId, expectedRevision: body.expectedRevision, fingerprint };
}

export function mapSaveDateResponse(value: Record<string, unknown>): SaveDateResponse {
  return { id: String(value.id), name: String(value.name), interest: value.interest as SaveDateInterest, guests: Number(value.guests), message: String(value.message ?? ''), revision: Number(value.revision), updatedAt: String(value.updated_at ?? value.updatedAt ?? '') };
}

export function publishedSaveDate(data: InvitationParsed): NonNullable<AdditionalServicesConfig['saveDate']> | null {
  const config = publicAdditionalServices(data.config.additionalServices)?.saveDate;
  return config?.status === 'ready' && config.enabled && config.published ? config : null;
}
