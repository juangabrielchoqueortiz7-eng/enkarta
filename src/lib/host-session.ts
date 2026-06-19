import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyHostSession, verifyAdminSession } from '@/lib/access';

// Sesiones del servidor. Hay dos accesos independientes:
//  - Admin (equipo Enkarta): cookie 'enkarta-admin' (password global, /admin).
//  - Anfitrión/cliente: cookie 'enkarta-host' firmada = un solo evento (/panel).
// Solo se usa en el servidor (API routes / server components).

export const HOST_COOKIE = 'enkarta-host';

/** invitationId del cliente logueado, o null. */
export async function getHostSession(): Promise<string | null> {
  const c = (await cookies()).get(HOST_COOKIE)?.value;
  return verifyHostSession(c);
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
export async function canManageInvitation(invitationId: string): Promise<boolean> {
  if (await getAdminSession()) return true;
  const host = await getHostSession();
  return host !== null && host === invitationId;
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
