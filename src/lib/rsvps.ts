import { supabaseAdmin } from '@/lib/supabase/server';
import type { RsvpEntry } from '@/lib/types';

// Confirmaciones abiertas (RSVP sin link personalizado ?g=). Viven en la tabla
// `rsvps` (migración 003): las nuevas respuestas se crean o corrigen en una transacción. El sistema
// anterior (rsvps/<id>.json en Storage) leía y reescribía el archivo completo,
// así que dos confirmaciones simultáneas podían perderse. La lectura conserva
// compatibilidad con archivos históricos; los JSON históricos
// se importan a la tabla (y se eliminan) en la primera lectura. Las escrituras
// nuevas usan exclusivamente la RPC de 006, sin fallback a Storage público.

const BUCKET = 'invitations';
const legacyPath = (invitationId: string) => `rsvps/${invitationId}.json`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapRsvpRow(r: any): RsvpEntry {
  return {
    id: r.id,
    name: r.name,
    attending: r.attending === 'no' ? 'no' : 'yes',
    passes: r.passes ?? 1,
    message: r.message ?? '',
    at: r.at,
    revision: r.response_revision ?? 0,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

async function readLegacy(invitationId: string): Promise<RsvpEntry[]> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(legacyPath(invitationId));
  if (error || !data) return [];
  try {
    const arr = JSON.parse(await data.text());
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Importa el JSON legacy a la tabla (idempotente por id) y elimina el archivo. */
async function importLegacy(invitationId: string): Promise<void> {
  const legacy = await readLegacy(invitationId);
  if (!legacy.length) return;
  const rows = legacy.map(e => ({
    id: e.id,
    invitation_id: invitationId,
    name: e.name || 'Invitado',
    attending: e.attending === 'no' ? 'no' : 'yes',
    passes: e.passes ?? 1,
    message: e.message ?? '',
    at: e.at,
  }));
  const { error } = await supabaseAdmin.from('rsvps').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (!error) await supabaseAdmin.storage.from(BUCKET).remove([legacyPath(invitationId)]);
}

/** Confirmaciones de una invitación, más antiguas primero. */
export async function readRsvps(invitationId: string): Promise<RsvpEntry[]> {
  await importLegacy(invitationId).catch(() => {});
  const { data, error } = await supabaseAdmin
    .from('rsvps')
    .select('*')
    .eq('invitation_id', invitationId)
    .order('at', { ascending: true });
  if (error) return readLegacy(invitationId); // tabla aún no creada
  return (data ?? []).map(mapRsvpRow);
}
