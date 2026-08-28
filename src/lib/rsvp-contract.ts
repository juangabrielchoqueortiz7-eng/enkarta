import type { Guest, RsvpEntry } from './types';

export interface RsvpSessionState {
  canRespond: boolean;
  closedReason?: string;
  guest?: Guest;
  entry?: RsvpEntry;
  hasUsedPasses?: boolean;
}

export const SERVICE_ERRORS: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: 'No encontramos esta invitación o acceso.' },
  EVENT_CLOSED: { status: 403, message: 'Esta invitación no está disponible para confirmar o registrar ingresos.' },
  RSVP_CLOSED: { status: 403, message: 'La fecha límite de confirmación ya pasó. Contacta a los anfitriones para cambios.' },
  INVALID_INPUT: { status: 400, message: 'Revisa los datos del formulario.' },
  INVALID_PASSES: { status: 400, message: 'El número de personas debe ser entero y no superar los pases asignados.' },
  CONFIRMED_LIMIT: { status: 409, message: 'No puedes reducir los pases por debajo de los ya confirmados.' },
  USED_PASSES: { status: 409, message: 'Ya se utilizaron pases de este grupo. No se pueden cancelar ni reducir esos cupos.' },
  STALE_RESPONSE: { status: 409, message: 'La respuesta cambió en otra sesión. Actualiza y revisa los datos antes de guardar.' },
  STALE_SCAN: { status: 409, message: 'Otro dispositivo actualizó este pase. Actualiza el grupo antes de continuar.' },
  DUPLICATE_SCAN: { status: 409, message: 'Este movimiento ya está registrado. No se volvió a contabilizar.' },
  NOT_CONFIRMED: { status: 409, message: 'Este pase no tiene un cupo confirmado disponible.' },
  REQUEST_REUSED: { status: 409, message: 'El reintento no coincide con la operación original. Actualiza antes de continuar.' },
};

export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isRevision = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

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
