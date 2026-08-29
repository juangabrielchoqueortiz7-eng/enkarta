import type { BuilderConfig, Invitation } from './types';
import { isCurrentContract, isPackage, PACKAGE_CATALOG } from './packages';
import { eventDay, isRevision, isUuid } from './rsvp-contract';

export type ValidityMode = 'legacy' | 'automatic';
export interface ValidityFields {
  validity_mode?: ValidityMode;
  validity_extra_days?: number;
  validity_revision?: number;
}
export type ValiditySource = ValidityFields & Pick<Invitation, 'event_date' | 'expires_at' | 'status' | 'is_active'> & { config?: BuilderConfig };
export interface ValiditySummary {
  mode: ValidityMode; eventDate: string | null; expiresAt: string | null;
  packageDays: number | null; extraDays: number; revision: number;
  daysLeft: number | null; state: 'pending' | 'unlimited' | 'active' | 'soon' | 'today' | 'expired';
  paused: boolean;
}
export interface ValidityEvent {
  id: string; action: 'activate' | 'extend' | 'set_expiry' | 'recalculate'; days: number | null;
  reason: string; before_expires_at: string | null; after_expires_at: string | null;
  before_revision: number; after_revision: number; created_at: string;
}
export interface ValiditySnapshot { validity: ValiditySummary; history: ValidityEvent[] }
export interface ValidityCommand {
  id: string; action: 'activate' | 'extend' | 'set_expiry'; days: number | null;
  expiresAt: string | null; reason: string; expectedRevision: number; requestId: string;
}

/** DATE, not an instant. Round-trip validation rejects JS date normalization. */
export function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function addDays(value: string, days: number): string {
  if (!validDay(value) || !Number.isInteger(days)) throw new Error('INVALID_INPUT');
  const date = new Date(value + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86_400_000);
}
export function packageDays(config?: BuilderConfig): number | null {
  return isCurrentContract(config) && isPackage(config?.package) ? PACKAGE_CATALOG[config.package].days : null;
}
/** Use stored expiry for saved data; preview=true explicitly models unsaved event/package edits. */
export function invitationValidity(data: ValiditySource, today = eventDay(), preview = false): ValiditySummary {
  const mode = data.validity_mode ?? 'legacy';
  const eventDate = data.event_date?.slice(0, 10) ?? null;
  const base = packageDays(data.config);
  const extraDays = data.validity_extra_days ?? 0;
  const pending = mode === 'automatic' && (!eventDate || !validDay(eventDate) || base === null || (!preview && !data.expires_at));
  const expiresAt = pending ? null : preview && mode === 'automatic' ? addDays(eventDate!, base! + extraDays) : data.expires_at?.slice(0, 10) ?? null;
  const daysLeft = expiresAt ? daysBetween(today, expiresAt) : null;
  return { mode, eventDate, expiresAt, packageDays: base, extraDays, revision: data.validity_revision ?? 0, daysLeft,
    state: pending ? 'pending' : daysLeft === null ? 'unlimited' : daysLeft < 0 ? 'expired' : daysLeft === 0 ? 'today' : daysLeft <= 7 ? 'soon' : 'active',
    paused: data.is_active === false || data.status === 'disabled' || data.status === 'expired' };
}
export function validityLabel(value: ValiditySummary): string {
  switch (value.state) {
    case 'pending': return 'Falta la fecha del evento';
    case 'unlimited': return 'Sin vencimiento acordado';
    case 'expired': return 'Vigencia finalizada';
    case 'today': return 'Vence hoy';
    case 'soon': return `Vence en ${value.daysLeft} ${value.daysLeft === 1 ? 'día' : 'días'}`;
    default: return 'Vigencia disponible';
  }
}
export function formatValidityDate(value: string | null): string {
  return value && validDay(value) ? new Date(value + 'T12:00:00Z').toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha';
}
export function parseValidityCommand(body: Record<string, unknown>): ValidityCommand {
  if (!isUuid(body.id) || !isUuid(body.requestId) || !isRevision(body.expectedRevision)
    || !['activate', 'extend', 'set_expiry'].includes(String(body.action))
    || typeof body.reason !== 'string' || body.reason.trim().length < 3 || body.reason.length > 300) throw new Error('INVALID_INPUT');
  if (body.action === 'extend' && (typeof body.days !== 'number' || !Number.isInteger(body.days) || body.days < 1 || body.days > 3650)) throw new Error('INVALID_INPUT');
  if (body.action === 'set_expiry' && body.expiresAt !== null && !validDay(body.expiresAt)) throw new Error('INVALID_INPUT');
  return { id: body.id, requestId: body.requestId, expectedRevision: body.expectedRevision,
    action: body.action as ValidityCommand['action'], reason: body.reason.trim(),
    days: body.action === 'extend' ? body.days as number : null,
    expiresAt: body.action === 'set_expiry' ? body.expiresAt as string | null : null };
}
