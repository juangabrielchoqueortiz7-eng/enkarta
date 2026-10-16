import type { Guest } from './types';
import { isRevision, isUuid } from './rsvp-contract';

/** Explicit private preview only; keep the established canvas guest contract. */
export function parseManagedGuestPreview(value: unknown, expectedId: string): Guest {
  const guest = value && typeof value === 'object' && 'guest' in value ? value.guest : null;
  const invalid = () => new Error('No pudimos verificar la vista personal. Vuelve a solicitarla.');
  if (!guest || typeof guest !== 'object' || !('id' in guest)) throw invalid();
  const g = guest as Record<string, unknown>;
  if (!isUuid(g.id) || g.id !== expectedId || !isRevision(g.responseRevision)
    || typeof g.publicId !== 'string' || !g.publicId || g.publicId.length > 120
    || typeof g.name !== 'string' || !g.name.trim() || g.name.length > 80
    || !Number.isInteger(g.passes) || Number(g.passes) < 1 || Number(g.passes) > 20
    || typeof g.allowKids !== 'boolean' || typeof g.sent !== 'boolean'
    || typeof g.status !== 'string' || !['pending', 'confirmed', 'declined'].includes(g.status)) throw invalid();
  const result: Record<string, unknown> = { id: g.id, publicId: g.publicId, name: g.name, passes: g.passes,
    allowKids: g.allowKids, sent: g.sent, status: g.status, responseRevision: g.responseRevision };
  for (const key of ['tableNo','confirmName','message','respondedAt','accessToken','accessCode','phone','group','eventAccess']) {
    if (g[key] === undefined || g[key] === null) continue;
    if (typeof g[key] !== 'string') throw invalid();
    result[key] = g[key];
  }
  if (g.confirmedPasses !== undefined && g.confirmedPasses !== null) {
    if (!Number.isInteger(g.confirmedPasses) || Number(g.confirmedPasses) < (g.status === 'confirmed' ? 1 : 0) || Number(g.confirmedPasses) > Number(g.passes)) throw invalid();
    result.confirmedPasses = g.confirmedPasses;
  }
  return result as unknown as Guest;
}
