import { supabaseAdmin } from '@/lib/supabase/server';
import type { RsvpEntry } from '@/lib/types';

// Confirmaciones abiertas (RSVP sin link personalizado ?g=). Viven en la tabla
// `rsvps` (migración 003): cada confirmación es un INSERT atómico. El sistema
// anterior (rsvps/<id>.json en Storage) leía y reescribía el archivo completo,
// así que dos confirmaciones simultáneas podían perderse. Mientras la migración
// no esté aplicada, todo cae al JSON legacy sin romperse; y los JSON históricos
// se importan a la tabla (y se eliminan) en la primera lectura.

const BUCKET = 'invitations';
const legacyPath = (invitationId: string) => `rsvps/${invitationId}.json`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(r: any): RsvpEntry {
  return {
    id: r.id,
    name: r.name,
    attending: r.attending === 'no' ? 'no' : 'yes',
    passes: r.passes ?? 1,
    message: r.message ?? '',
    at: r.at,
  };
}

/** ¿El error indica que la tabla `rsvps` aún no existe (migración 003 pendiente)? */
function isMissingTable(error: { code?: string } | null): boolean {
  return !!error && (error.code === '42P01' || error.code === 'PGRST205');
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

async function appendLegacy(invitationId: string, entry: RsvpEntry): Promise<string | null> {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  const list = await readLegacy(invitationId);
  list.push(entry);
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(legacyPath(invitationId), Buffer.from(JSON.stringify(list)), { contentType: 'application/json', upsert: true });
  return error ? error.message : null;
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
  return (data ?? []).map(mapRow);
}

/** Guarda una confirmación (INSERT atómico; cae al JSON si falta la tabla). */
export async function insertRsvp(invitationId: string, entry: RsvpEntry): Promise<string | null> {
  const { error } = await supabaseAdmin.from('rsvps').insert({
    id: entry.id,
    invitation_id: invitationId,
    name: entry.name,
    attending: entry.attending,
    passes: entry.passes ?? 1,
    message: entry.message ?? '',
    at: entry.at,
  });
  if (!error) return null;
  if (isMissingTable(error)) return appendLegacy(invitationId, entry);
  return error.message;
}
