import type { Guest } from './types';
import { parseGuestMetadata } from './guest-metadata';
import { isRevision, isUuid } from './rsvp-contract';

export interface GuestEditValues {
  name: string; phone: string; group: string; eventAccess: string;
  passes: string; tableNo: string; allowKids: boolean;
}
export type GuestEditErrors = Partial<Record<keyof GuestEditValues, string>>;
export interface GuestEditCommand {
  id: string; expectedRevision: number; name: string; phone: string; group: string;
  eventAccess: 'both' | 'ceremony' | 'reception'; passes: number; allowKids: boolean; tableNo?: string;
}
export const guestEditValues = (guest: Guest): GuestEditValues => ({ name: guest.name, phone: guest.phone ?? '', group: guest.group ?? '',
  eventAccess: guest.eventAccess ?? 'both', passes: String(guest.passes), tableNo: guest.tableNo ?? '', allowKids: guest.allowKids });

/** Compare only editable fields. Live RSVP/delivery/access changes stay on the server snapshot. */
export function guestEditDirty(base: Guest, values: GuestEditValues, tables: boolean) {
  const initial = guestEditValues(base);
  return (Object.keys(initial) as (keyof GuestEditValues)[]).some(key => (tables || key !== 'tableNo') && values[key] !== initial[key]);
}
export const guestEditStale = (base: Guest, latest?: Guest) => !latest || latest.id !== base.id || latest.responseRevision !== base.responseRevision;

export function validateGuestEdit(base: Guest, values: GuestEditValues, tables: boolean): { errors: GuestEditErrors; command?: GuestEditCommand } {
  const errors: GuestEditErrors = {};
  if (!values.name.trim() || values.name.trim().length > 80) errors.name = 'Escribe un nombre de 1 a 80 caracteres.';
  let phone = '';
  try { phone = parseGuestMetadata({ phone: values.phone }).phone ?? ''; }
  catch { errors.phone = 'Usa un teléfono válido con código de país o deja el campo vacío.'; }
  if (values.group.trim().length > 40) errors.group = 'Usa un grupo de hasta 40 caracteres.';
  if (!['both', 'ceremony', 'reception'].includes(values.eventAccess)) errors.eventAccess = 'Selecciona una preferencia de la lista.';
  const passes = values.passes.trim() ? Number(values.passes) : NaN;
  if (!Number.isInteger(passes) || passes < 1 || passes > 20) errors.passes = 'Asigna un número entero de 1 a 20 pases.';
  else if (base.status === 'confirmed' && passes < (base.confirmedPasses ?? base.passes)) errors.passes = `Hay ${base.confirmedPasses ?? base.passes} pases confirmados. No puedes asignar menos.`;
  if (tables && values.tableNo.trim().length > 20) errors.tableNo = 'Usa una mesa de hasta 20 caracteres.';
  if (Object.keys(errors).length || !isUuid(base.id) || !isRevision(base.responseRevision)) return { errors };
  return { errors, command: { id: base.id, expectedRevision: base.responseRevision, name: values.name.trim(), phone,
    group: values.group.trim(), eventAccess: values.eventAccess as GuestEditCommand['eventAccess'], passes, allowKids: values.allowKids,
    ...(tables ? { tableNo: values.tableNo.trim() } : {}) } };
}

/** A 200 is insufficient: do not discard the draft for a foreign/incomplete receipt. */
export function verifyGuestEditReceipt(value: unknown, command: GuestEditCommand): void {
  const body = value as { ok?: unknown; guest?: Partial<Guest> } | null;
  const guest = body?.guest;
  if (body?.ok !== true || !guest || guest.id !== command.id || !isRevision(guest.responseRevision)
    || guest.responseRevision < command.expectedRevision || guest.responseRevision > command.expectedRevision + 1
    || typeof guest.status !== 'string' || !['pending', 'confirmed', 'declined'].includes(guest.status)
    || guest.name !== command.name || guest.passes !== command.passes || guest.allowKids !== command.allowKids
    || (guest.phone ?? '') !== command.phone || (guest.group ?? '') !== command.group || (guest.eventAccess ?? 'both') !== command.eventAccess
    || (command.tableNo !== undefined && (guest.tableNo ?? '') !== command.tableNo)) {
    throw new Error('No pudimos verificar el cambio guardado. Conservamos tu edición; actualiza y revisa los datos antes de reintentar.');
  }
}
