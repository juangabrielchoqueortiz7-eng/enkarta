import { NextRequest, NextResponse } from 'next/server';
import { actorOwnerKey, builderActor, unauthorized } from '@/lib/builder-access';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { UserSection } from '@/lib/user-sections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SectionRow = { id: string; name: string; blocks: UserSection['blocks']; created_at: string };
const fromRow = (row: SectionRow): UserSection => ({ id: row.id, name: row.name, blocks: row.blocks, createdAt: new Date(row.created_at).getTime() });
// Cada actor guarda en su propio owner_key: el socio no ve ni pisa la biblioteca
// del equipo Enkarta, y viceversa.
const toRow = (section: UserSection, owner: string) => section?.id && Array.isArray(section.blocks) ? {
  id: String(section.id).slice(0, 100), owner_key: owner, name: String(section.name || 'Mi sección').slice(0, 120),
  blocks: section.blocks.slice(0, 100), created_at: new Date(Number(section.createdAt) || Date.now()).toISOString(),
} : null;

function storageError(error: { message?: string; code?: string } | null) {
  if (!error) return null;
  const migrationRequired = error.code === '42P01' || /does not exist|schema cache/i.test(error.message || '');
  return NextResponse.json({ error: migrationRequired ? 'Falta aplicar la migración 004' : error.message, migrationRequired }, { status: migrationRequired ? 503 : 500 });
}

export async function GET() {
  const actor = await builderActor();
  if (!actor) return unauthorized();
  const { data, error } = await supabaseAdmin.from('builder_user_sections').select('*').eq('owner_key', actorOwnerKey(actor)).order('created_at', { ascending: false }).limit(40);
  return storageError(error) || NextResponse.json(((data || []) as SectionRow[]).map(fromRow));
}

export async function POST(request: NextRequest) {
  const actor = await builderActor();
  if (!actor) return unauthorized();
  const owner = actorOwnerKey(actor);
  const body = await request.json().catch(() => null) as null | { section?: UserSection; sections?: UserSection[] };
  const rows = [...(Array.isArray(body?.sections) ? body!.sections : []), ...(body?.section ? [body.section] : [])]
    .slice(0, 40).map(section => toRow(section, owner))
    .filter((row): row is NonNullable<typeof row> => row !== null);
  if (!rows.length) return NextResponse.json({ error: 'Sección inválida' }, { status: 400 });

  // Un upsert por id no debe permitir sobrescribir la sección de otra biblioteca.
  const { data: foreign, error: lookupError } = await supabaseAdmin.from('builder_user_sections')
    .select('id').in('id', rows.map(row => row.id)).neq('owner_key', owner);
  const lookupFailure = storageError(lookupError);
  if (lookupFailure) return lookupFailure;
  if (foreign?.length) return NextResponse.json({ error: 'Esa sección pertenece a otra biblioteca' }, { status: 403 });

  const { error } = await supabaseAdmin.from('builder_user_sections').upsert(rows, { onConflict: 'id' });
  return storageError(error) || NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const actor = await builderActor();
  if (!actor) return unauthorized();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const { error } = await supabaseAdmin.from('builder_user_sections').delete().eq('id', id).eq('owner_key', actorOwnerKey(actor));
  return storageError(error) || NextResponse.json({ success: true });
}
