import type { Guest, RsvpEntry } from './types';

export interface RsvpSessionState {
  canRespond: boolean;
  closedReason?: string;
  guest?: Guest;
  entry?: RsvpEntry;
  hasUsedPasses?: boolean;
}

export const SERVICE_ERRORS: Record<string, { status: number; message: string }> = {
  SERVICE_NOT_INCLUDED: { status: 403, message: 'Este servicio no está incluido en el paquete contratado. Contacta al equipo Enkarta.' },
  NOT_FOUND: { status: 404, message: 'No encontramos esta invitación o acceso.' },
  EVENT_CLOSED: { status: 403, message: 'Esta invitación no está disponible para confirmar o registrar ingresos.' },
  RSVP_CLOSED: { status: 403, message: 'La fecha límite de confirmación ya pasó. Contacta a los anfitriones para cambios.' },
  INVALID_INPUT: { status: 400, message: 'Revisa los datos del formulario.' },
  INVALID_GUEST_CONTACT: { status: 400, message: 'Revisa el teléfono: usa un número válido con código de país y hasta 15 dígitos.' },
  INVALID_GUEST_GROUP: { status: 400, message: 'El grupo debe ser un texto de hasta 40 caracteres.' },
  INVALID_GUEST_PREFERENCE: { status: 400, message: 'Selecciona Todo el evento, Ceremonia o Recepción como preferencia informativa.' },
  INVALID_PASSES: { status: 400, message: 'El número de personas debe ser entero y no superar los pases asignados.' },
  CONFIRMED_LIMIT: { status: 409, message: 'No puedes reducir los pases por debajo de los ya confirmados.' },
  USED_PASSES: { status: 409, message: 'Ya se utilizaron pases de este grupo. No se pueden cancelar ni reducir esos cupos.' },
  STALE_RESPONSE: { status: 409, message: 'La respuesta cambió en otra sesión. Actualiza y revisa los datos antes de guardar.' },
  STALE_SCAN: { status: 409, message: 'Otro dispositivo actualizó este pase. Actualiza el grupo antes de continuar.' },
  DUPLICATE_SCAN: { status: 409, message: 'Este movimiento ya está registrado. No se volvió a contabilizar.' },
  NOT_CONFIRMED: { status: 409, message: 'Este pase no tiene un cupo confirmado disponible.' },
  REQUEST_REUSED: { status: 409, message: 'El reintento no coincide con la operación original. Actualiza antes de continuar.' },
  SAVE_DATE_CLOSED: { status: 403, message: 'La preconfirmación de esta fecha no está disponible.' },
  STALE_SAVE_DATE: { status: 409, message: 'La preconfirmación cambió en otra sesión. Actualiza antes de guardar.' },
};

export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isRevision = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const validPasses = (value: unknown, minimum = 0): value is number => typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= 20;
function validGuest(value: unknown, publicId: string): value is Guest {
  return record(value) && typeof value.id === 'string' && !!value.id && value.publicId === publicId && typeof value.name === 'string'
    && validPasses(value.passes, 1) && isRevision(value.responseRevision) && typeof value.status === 'string' && ['pending', 'confirmed', 'declined'].includes(value.status)
    && (value.confirmedPasses === undefined || (validPasses(value.confirmedPasses, value.status === 'confirmed' ? 1 : 0) && value.confirmedPasses <= value.passes));
}
function validEntry(value: unknown): value is RsvpEntry {
  return record(value) && typeof value.id === 'string' && !!value.id && typeof value.name === 'string' && isRevision(value.revision)
    && typeof value.attending === 'string' && ['yes', 'no'].includes(value.attending) && validPasses(value.passes, value.attending === 'yes' ? 1 : 0);
}

/** Check both shape and recipient before placing a private reply in the UI. */
export function isRsvpSession(value: unknown, publicId?: string): value is RsvpSessionState {
  return record(value) && typeof value.canRespond === 'boolean'
    && (value.closedReason === undefined || typeof value.closedReason === 'string')
    && (value.hasUsedPasses === undefined || typeof value.hasUsedPasses === 'boolean')
    && ((value.canRespond === false && value.guest === undefined && value.entry === undefined)
      || (publicId ? validGuest(value.guest, publicId) && value.entry === undefined : value.guest === undefined && (value.entry === undefined || validEntry(value.entry))));
}

export interface RsvpAcknowledgement { ok: true; guest?: Guest; entry?: RsvpEntry }
export function isRsvpAcknowledgement(value: unknown, publicId?: string, expectedRevision = 0, entryId?: string): value is RsvpAcknowledgement {
  if (!record(value) || value.ok !== true) return false;
  return publicId
    ? validGuest(value.guest, publicId) && value.guest.status !== 'pending' && value.guest.responseRevision! > expectedRevision && (value.guest.status !== 'confirmed' || validPasses(value.guest.confirmedPasses, 1))
    : validEntry(value.entry) && value.entry.revision! > expectedRevision && (value.entry.attending !== 'no' || value.entry.passes === 0) && (!entryId || value.entry.id === entryId);
}

export function parseRsvpInput(body: Record<string, unknown>) {
  const name = typeof (body.confirmName ?? body.name) === 'string' ? String(body.confirmName ?? body.name).trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!name || name.length > 120 || message.length > 400 || !['yes', 'no'].includes(String(body.attending)) || !isUuid(body.requestId) || !isRevision(body.expectedRevision)) {
    throw new Error('INVALID_INPUT');
  }
  if (body.attending === 'yes' && (typeof body.passes !== 'number' || !Number.isInteger(body.passes) || body.passes < 1 || body.passes > 20)) throw new Error('INVALID_PASSES');
  return { name, message, attending: body.attending as 'yes' | 'no', passes: body.attending === 'yes' ? body.passes as number : 0, requestId: body.requestId, expectedRevision: body.expectedRevision };
}

/** Fechas DATE inclusivas según la zona horaria operativa de Enkarta. */
export function eventDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Un único formulario integrado por pantalla; los dispositivos pueden tener variantes. */
export function hasRsvpForm(blocks: import('./types').Block[], viewport?: 'mobile' | 'desktop'): boolean {
  return blocks.some(block => {
    const hidden = viewport ? block.layout?.[viewport]?.hidden ?? block.layout?.hideOn === viewport : false;
    return block.enabled !== false && !hidden && ((block.type === 'rsvp' && block.props.mode === 'form') || hasRsvpForm(block.children ?? [], viewport));
  });
}
