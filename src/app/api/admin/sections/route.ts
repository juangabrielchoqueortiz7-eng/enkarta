import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/host-session';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { UserSection } from '@/lib/user-sections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OWNER = 'admin';
const unauthorized = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });

type SectionRow = { id: string; name: string; blocks: UserSection['blocks']; created_at: string };
const fromRow = (row: SectionRow): UserSection => ({ id: row.id, name: row.name, blocks: row.blocks, createdAt: new Date(row.created_at).getTime() });
const toRow = (section: UserSection) => section?.id && Array.isArray(section.blocks) ? {
  id: String(section.id).slice(0, 100), owner_key: OWNER, name: String(section.name || 'Mi sección').slice(0, 120),
  blocks: section.blocks.slice(0, 100), created_at: new Date(Number(section.createdAt) || Date.now()).toISOString(),
} : null;

function storageError(error: { message?: string; code?: string } | null) {
  if (!error) return null;
  const migrationRequired = error.code === '42P01' || /does not exist|schema cache/i.test(error.message || '');
  return NextResponse.json({ error: migrationRequired ? 'Falta aplicar la migración 004' : error.message, migrationRequired }, { status: migrationRequired ? 503 : 500 });
}

export async function GET() {
  if (!(await getAdminSession())) return unauthorized();
  const { data, error } = await supabaseAdmin.from('builder_user_sections').select('*').eq('owner_key', OWNER).order('created_at', { ascending: false }).limit(40);
  return storageError(error) || NextResponse.json(((data || []) as SectionRow[]).map(fromRow));
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return unauthorized();
  const body = await request.json().catch(() => null) as null | { section?: UserSection; sections?: UserSection[] };
  const rows = [...(Array.isArray(body?.sections) ? body!.sections : []), ...(body?.section ? [body.section] : [])]
    .slice(0, 40).map(toRow).filter(Boolean);
  if (!rows.length) return NextResponse.json({ error: 'Sección inválida' }, { status: 400 });
  const { error } = await supabaseAdmin.from('builder_user_sections').upsert(rows, { onConflict: 'id' });
  return storageError(error) || NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await getAdminSession())) return unauthorized();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const { error } = await supabaseAdmin.from('builder_user_sections').delete().eq('id', id).eq('owner_key', OWNER);
  return storageError(error) || NextResponse.json({ success: true });
}

