import type { Guest, RsvpEntry } from './types';

/** DTO de consulta: no contiene tokens, códigos QR, teléfonos ni credenciales. */
export interface ResponseRow {
  id: string; name: string; source: 'personal' | 'open'; status: 'confirmed' | 'declined' | 'pending';
  assigned: number | null; confirmed: number; message: string; at: string;
}
export const RESPONSE_LABELS = { confirmed: 'Confirmado', declined: 'No asiste', pending: 'Pendiente' };
export function responseRows(guests: Guest[], entries: RsvpEntry[]): ResponseRow[] {
  return [
    ...guests.map(g => ({ id: 'g-' + g.id, name: g.confirmName || g.name, source: 'personal' as const, status: g.status, assigned: g.passes, confirmed: g.status === 'confirmed' ? g.confirmedPasses ?? g.passes : 0, message: g.message || '', at: g.respondedAt || '' })),
    ...entries.map(r => ({ id: 'r-' + r.id, name: r.name, source: 'open' as const, status: r.attending === 'yes' ? 'confirmed' as const : 'declined' as const, assigned: null, confirmed: r.attending === 'yes' ? r.passes ?? 1 : 0, message: r.message || '', at: r.at })),
  ];
}
// Evitar fórmulas activas al abrir contenido escrito por invitados en una planilla.
export function responseCsv(rows: ResponseRow[]): string {
  const cell = (value: string | number | null) => {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const values = [['Nombre', 'Origen', 'Respuesta', 'Pases asignados', 'Pases confirmados', 'Mensaje', 'Fecha'], ...rows.map(r => [r.name, r.source === 'personal' ? 'Link personal' : 'Formulario abierto', RESPONSE_LABELS[r.status], r.assigned, r.confirmed, r.message, r.at])];
  return '\uFEFF' + values.map(row => row.map(cell).join(';')).join('\r\n');
}
