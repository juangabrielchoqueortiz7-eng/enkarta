import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyHostSession, verifyAdminSession, verifyReviewSession, verifyDoorSession } from '@/lib/access';
import { isUuid } from './rsvp-contract';
import { allowsService, isCurrentContract, type OperationalService } from './packages';
import { invitationServiceConfig } from './package-services-server';

// Sesiones del servidor. Hay dos accesos independientes:
//  - Admin (equipo Enkarta): cookie 'enkarta-admin' (password global, /admin).
//  - Anfitrión/cliente: cookie 'enkarta-host' firmada = un solo evento (/panel).
// Solo se usa en el servidor (API routes / server components).

export const HOST_COOKIE = 'enkarta-host';
export const REVIEW_COOKIE = 'enkarta-review';
export const DOOR_COOKIE = 'enkarta-door';

export async function getDoorSession(): Promise<string | null> {
  const value = (await cookies()).get(DOOR_COOKIE)?.value;
  if (!value) return null;
  const id = value.split('.')[0];
  if (!isUuid(id)) return null;
  const { data, error } = await supabaseAdmin.from('invitations').select('door_email,door_password_hash').eq('id', id).maybeSingle();
  return !error && data?.door_email && data?.door_password_hash && verifyDoorSession(value, data.door_password_hash) ? id : null;
}

/** No reutilizar este permiso para listas, exportaciones o edición de invitados. */
export async function canScanInvitation(invitationId: string): Promise<boolean> {
  if (await getDoorSession() === invitationId) return allowsService((await invitationServiceConfig(invitationId)).config, 'qrAccess');
  return canManageInvitation(invitationId, 'qrAccess');
}

/** invitationId del cliente logueado, o null. */
export async function getHostSession(strict = false): Promise<string | null> {
  const c = (await cookies()).get(HOST_COOKIE)?.value;
  if (!c) return null;
  const id = c.slice(0, c.lastIndexOf('.'));
  if (!isUuid(id)) return null;
  const { data, error } = await supabaseAdmin.from('invitations').select('host_email,host_password_hash').eq('id', id).maybeSingle();
  // El panel en vivo debe distinguir una caída de conexión de una revocación real.
  if (error && strict) throw error;
  return !error && data?.host_email && data?.host_password_hash ? verifyHostSession(c, data.host_password_hash) : null;
}

export async function getReviewSession(): Promise<string | null> {
  const value = (await cookies()).get(REVIEW_COOKIE)?.value;
  if (!value) return null;
  const id = value.slice(0, value.lastIndexOf('.'));
  if (!isUuid(id)) return null;
  const { data, error } = await supabaseAdmin.from('invitations').select('review_email,review_password_hash').eq('id', id).maybeSingle();
  return !error && data?.review_email && data?.review_password_hash && verifyReviewSession(value, data.review_password_hash) ? id : null;
}
export async function canReviewInvitation(invitationId: string): Promise<boolean> {
  if (await getAdminSession()) return true;
  if (await getReviewSession() === invitationId) return true;
  // Los contratos anteriores conservan el acceso combinado; los nuevos separan los alcances.
  if (await getHostSession() !== invitationId) return false;
  return !isCurrentContract((await invitationServiceConfig(invitationId)).config);
}

/** true si el equipo Enkarta está autenticado (cookie admin firmada). */
export async function getAdminSession(): Promise<boolean> {
  return verifyAdminSession((await cookies()).get('enkarta-admin')?.value);
}

/** Guard para páginas server del admin: redirige al login si no hay sesión. */
export async function requireAdminPage(): Promise<void> {
  if (!(await getAdminSession())) redirect('/admin');
}

/**
 * ¿Puede el solicitante gestionar esta invitación? El admin puede con cualquiera;
 * el cliente solo con la suya. Se usa para proteger las mutaciones de invitados
 * y de control de acceso.
 */
export async function canManageInvitation(invitationId: string, service?: OperationalService): Promise<boolean> {
  const admin = await getAdminSession();
  const host = await getHostSession();
  if (!admin && host !== invitationId) return false;
  const { config } = await invitationServiceConfig(invitationId);
  if (!admin && !allowsService(config, 'hostPanel')) return false;
  return !service || allowsService(config, service);
}

/** Planilla de solo lectura; no concede gestión, escaneo ni revisión del diseño. */
export async function canReadResponses(invitationId: string): Promise<boolean> {
  if (await getAdminSession()) return true;
  if (await getHostSession() !== invitationId) return false;
  return allowsService((await invitationServiceConfig(invitationId)).config, 'rsvp');
}

/** Resuelve el invitationId dueño de un invitado (para validar permisos). */
export async function invitationIdOfGuest(guestId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('guests').select('invitation_id').eq('id', guestId).maybeSingle();
  return data?.invitation_id ?? null;
}

/** Resuelve el invitationId dueño de un asiento (attendee → guest → invitation). */
export async function invitationIdOfAttendee(attendeeId: string): Promise<string | null> {
  const { data: att } = await supabaseAdmin.from('attendees').select('guest_id').eq('id', attendeeId).maybeSingle();
  if (!att?.guest_id) return null;
  return invitationIdOfGuest(att.guest_id);
}
