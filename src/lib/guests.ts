import { supabaseAdmin } from '@/lib/supabase/server';
import type { Guest, Attendee } from '@/lib/types';

// Acceso a la tabla `guests` (Postgres). La escritura/confirmación vive en las
// API routes; aquí están la lectura server-side (para /i[slug] y el panel) y el
// mapeo snake_case ↔ camelCase + la materialización de asientos (attendees).

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapGuestRow(r: any): Guest {
  return {
    id: r.id,
    publicId: r.public_id,
    name: r.name,
    tableNo: r.table_no ?? undefined,
    passes: r.passes ?? 1,
    allowKids: r.allow_kids ?? true,
    sent: r.sent ?? false,
    status: r.status ?? 'pending',
    confirmedPasses: r.confirmed_passes ?? undefined,
    confirmName: r.confirm_name ?? undefined,
    message: r.message ?? undefined,
    respondedAt: r.responded_at ?? undefined,
    accessToken: r.access_token ?? undefined,
    accessCode: r.access_code ?? undefined,
  };
}

export function mapAttendeeRow(r: any): Attendee {
  return {
    id: r.id,
    guestId: r.guest_id,
    seatNo: r.seat_no,
    label: r.label ?? undefined,
    state: r.state ?? 'out',
    checkedInAt: r.checked_in_at ?? undefined,
    checkedOutAt: r.checked_out_at ?? undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Todos los invitados de una invitación (panel/dashboard). */
export async function readGuests(invitationId: string): Promise<Guest[]> {
  const { data, error } = await supabaseAdmin
    .from('guests')
    .select('*')
    .eq('invitation_id', invitationId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map(mapGuestRow);
}

/** Un invitado por su id público (link ?g=). */
export async function findGuestByPublicId(invitationId: string, publicId: string): Promise<Guest | null> {
  const { data } = await supabaseAdmin
    .from('guests')
    .select('*')
    .eq('invitation_id', invitationId)
    .eq('public_id', publicId)
    .maybeSingle();
  return data ? mapGuestRow(data) : null;
}

/**
 * Crea los asientos 1..passes de un invitado si faltan y elimina los sobrantes
 * (cuando bajan los pases). Idempotente: conserva los asientos ya existentes y
 * su estado de check-in. Devuelve la lista de asientos resultante.
 */
export async function materializeAttendees(guestId: string, passes: number): Promise<Attendee[]> {
  const { data: existing } = await supabaseAdmin.from('attendees').select('*').eq('guest_id', guestId);
  const rows = existing ?? [];
  const have = new Set(rows.map(r => r.seat_no));

  const toAdd: { guest_id: string; seat_no: number }[] = [];
  for (let s = 1; s <= passes; s++) if (!have.has(s)) toAdd.push({ guest_id: guestId, seat_no: s });
  if (toAdd.length) await supabaseAdmin.from('attendees').insert(toAdd);

  const extra = rows.filter(r => r.seat_no > passes).map(r => r.id);
  if (extra.length) await supabaseAdmin.from('attendees').delete().in('id', extra);

  const { data } = await supabaseAdmin.from('attendees').select('*').eq('guest_id', guestId).order('seat_no');
  return (data ?? []).map(mapAttendeeRow);
}
