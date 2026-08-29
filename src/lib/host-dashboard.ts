import type { Guest } from './types';
import type { ValiditySummary } from './invitation-validity';
import { deliveryState, DELIVERY_LABELS } from './guest-delivery';
import { RESPONSE_LABELS, type ResponseRow } from './response-sheet';

/** Datos operativos mínimos: sin tokens QR, credenciales ni recibos de RSVP. */
export type HostGuest = Omit<Guest, 'accessToken'> & { inside: number };
export interface HostMetrics {
  total: number; passes: number; sent: number; confirmed: number; pending: number;
  declined: number; confirmedPasses: number; checkedIn: number; unassigned: number;
}
export interface HostSnapshot {
  syncedAt: string;
  mode: 'operations' | 'responses';
  services: { guestManagement: boolean; qrAccess: boolean; tableAssignment: boolean };
  guests: HostGuest[];
  rows: ResponseRow[];
  metrics: HostMetrics | null;
  validity?: ValiditySummary;
}
/** Misma hora en SSR y navegador, independientemente de la zona del servidor. */
export function formatSyncTime(value: string): string {
  return new Date(value).toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
export function hostMetrics(guests: HostGuest[]): HostMetrics {
  return guests.reduce<HostMetrics>((m, g) => {
    m.total++; m.passes += g.passes; m.sent += Number(g.sent);
    m[g.status]++;
    m.confirmedPasses += g.status === 'confirmed' ? g.confirmedPasses ?? g.passes : 0;
    m.checkedIn += g.inside;
    m.unassigned += Number(g.status === 'confirmed' && !g.tableNo?.trim());
    return m;
  }, { total: 0, passes: 0, sent: 0, confirmed: 0, pending: 0, declined: 0, confirmedPasses: 0, checkedIn: 0, unassigned: 0 });
}
export interface RosterFilter { search: string; status: string; delivery: string; table: string; access: string; sort: string }
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
export function filterRoster(guests: HostGuest[], filter: RosterFilter): HostGuest[] {
  const q = normalized(filter.search);
  return guests.filter(g => {
    if (q && ![g.name, g.confirmName, g.phone, g.group, g.tableNo, g.accessCode].some(v => v && normalized(v).includes(q))) return false;
    if (filter.status !== 'all' && g.status !== filter.status) return false;
    if (filter.delivery && filter.delivery !== 'all' && deliveryState(g) !== filter.delivery) return false;
    if (filter.table === 'unassigned' ? !!g.tableNo?.trim() : filter.table !== 'all' && g.tableNo !== filter.table) return false;
    if (filter.access === 'inside' && !g.inside) return false;
    if (filter.access === 'waiting' && (g.status !== 'confirmed' || g.inside >= (g.confirmedPasses ?? g.passes))) return false;
    return true;
  }).sort((a, b) => filter.sort === 'recent'
    ? (b.respondedAt || '').localeCompare(a.respondedAt || '') || a.name.localeCompare(b.name, 'es')
    : filter.sort === 'table'
      ? (a.tableNo || '\uffff').localeCompare(b.tableNo || '\uffff', 'es', { numeric: true }) || a.name.localeCompare(b.name, 'es')
      : a.name.localeCompare(b.name, 'es'));
}
export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function rosterCsv(guests: HostGuest[], services: HostSnapshot['services']): string {
  const header = ['Nombre', 'Grupo', 'Respuesta', 'Seguimiento', 'Recordatorios preparados', 'Pases asignados', 'Pases confirmados', ...(services.tableAssignment ? ['Mesa'] : []), ...(services.qrAccess ? ['Dentro ahora'] : [])];
  const rows = guests.map(g => [g.name, g.group || '', RESPONSE_LABELS[g.status], DELIVERY_LABELS[deliveryState(g)], g.reminderCount ?? 0, g.passes, g.status === 'confirmed' ? g.confirmedPasses ?? g.passes : 0, ...(services.tableAssignment ? [g.tableNo || 'Sin asignar'] : []), ...(services.qrAccess ? [g.inside] : [])]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
}
