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
    responseRevision: r.response_revision ?? 0,
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
    revision: r.revision ?? 0,
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

// La materialización y los cambios de estado se realizan dentro de las RPC de
// 006, en la misma transacción que la confirmación. Nunca borrar desde un GET.
