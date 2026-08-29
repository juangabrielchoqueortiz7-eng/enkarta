import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, canReviewInvitation } from '@/lib/host-session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { readReviewNoteStorage, readVersionStorageMeta, reviewNoteTextForStorage, versionSnapshotForStorage, type BuilderVersion, type ReviewNote } from '@/lib/builder-versions';
import type { BuilderRole, ReviewStatus } from '@/lib/types';
import { clientInvitation } from '@/lib/client-invitation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type VersionRow = {
  id: string; invitation_id: string; label: string; source: BuilderVersion['source']; snapshot: BuilderVersion['data']; created_at: string;
};
type NoteRow = {
  id: string; invitation_id: string; text: string; author: string; block_id: string | null; resolved: boolean; created_at: string;
};

const SOURCES = new Set<BuilderVersion['source']>(['manual', 'save', 'publish', 'restore']);

function versionFromRow(row: VersionRow): BuilderVersion {
  const decoded = readVersionStorageMeta(row.snapshot);
  return { id: row.id, invitationId: row.invitation_id, label: row.label, source: row.source, data: decoded.data, summary: decoded.summary, role: decoded.role, publicationState: decoded.publicationState, publishAt: decoded.publishAt, createdAt: new Date(row.created_at).getTime() };
}

function noteFromRow(row: NoteRow): ReviewNote {
  const decoded = readReviewNoteStorage(row.text);
  const legacy = !row.text.startsWith('@@enkarta-note:');
  const status = legacy ? (row.resolved ? 'approved' : 'pending') : decoded.status;
  return { id: row.id, invitationId: row.invitation_id, text: decoded.text, author: row.author, role: decoded.role, status, blockId: row.block_id || undefined, resolved: row.resolved, createdAt: new Date(row.created_at).getTime() };
}

function versionToRow(value: BuilderVersion, invitationId: string) {
  if (!value?.id || !value?.data || !SOURCES.has(value.source)) return null;
  return {
    id: String(value.id).slice(0, 100), invitation_id: invitationId,
    label: String(value.label || 'Versión sin nombre').slice(0, 120), source: value.source,
    snapshot: versionSnapshotForStorage(value), created_at: new Date(Number(value.createdAt) || Date.now()).toISOString(),
  };
}

function noteToRow(value: ReviewNote, invitationId: string) {
  if (!value?.id || !String(value.text || '').trim()) return null;
  return {
    id: String(value.id).slice(0, 100), invitation_id: invitationId,
    text: reviewNoteTextForStorage({ ...value, text: String(value.text).trim().slice(0, 1200) }), author: String(value.author || 'Equipo').trim().slice(0, 80),
    block_id: value.blockId ? String(value.blockId).slice(0, 120) : null,
    resolved: Boolean(value.resolved), created_at: new Date(Number(value.createdAt) || Date.now()).toISOString(),
  };
}

function storageError(error: { message?: string; code?: string } | null) {
  if (!error) return null;
  const migrationRequired = error.code === '42P01' || /does not exist|schema cache/i.test(error.message || '');
  return NextResponse.json({ error: migrationRequired ? 'Falta aplicar la migración 004' : error.message, migrationRequired }, { status: migrationRequired ? 503 : 500 });
}

async function actorRole(invitationId: string): Promise<'admin' | 'client' | null> {
  if (!invitationId) return null;
  if (await getAdminSession()) return 'admin';
  return await canReviewInvitation(invitationId) ? 'client' : null;
}

export async function GET(request: NextRequest) {
  const invitationId = new URL(request.url).searchParams.get('invitationId') || '';
  const actor = await actorRole(invitationId);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const [versionsResult, notesResult] = await Promise.all([
    supabaseAdmin.from('builder_versions').select('*').eq('invitation_id', invitationId).order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('builder_review_notes').select('*').eq('invitation_id', invitationId).order('created_at', { ascending: false }).limit(200),
  ]);
  const failure = storageError(versionsResult.error || notesResult.error);
  if (failure) return failure;
  return NextResponse.json({
    versions: ((versionsResult.data || []) as VersionRow[]).map(row => { const version = versionFromRow(row); return actor === 'client' ? { ...version, data: clientInvitation(version.data, true) } : version; }),
    notes: ((notesResult.data || []) as NoteRow[]).map(noteFromRow),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as null | {
    invitationId?: string; version?: BuilderVersion; note?: ReviewNote; versions?: BuilderVersion[]; notes?: ReviewNote[]; action?: 'publish' | 'schedule';
  };
  const invitationId = String(body?.invitationId || '');
  const actor = await actorRole(invitationId);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (actor === 'client' && (body?.version || body?.versions?.length || body?.action)) return NextResponse.json({ error: 'El cliente puede revisar, pero no crear ni publicar versiones' }, { status: 403 });

  const versions = [...(Array.isArray(body?.versions) ? body!.versions : []), ...(body?.version ? [body.version] : [])]
    .slice(0, 30).map(value => versionToRow(value, invitationId)).filter(Boolean);
  const incomingNotes = [...(Array.isArray(body?.notes) ? body!.notes : []), ...(body?.note ? [body.note] : [])]
    .map(note => actor === 'client' ? { ...note, role: 'client' as const, author: 'Cliente' } : note);
  if (actor === 'client') {
    // Un upsert por id no debe permitir apropiarse de una nota del equipo u otro evento.
    for (const note of incomingNotes.slice(0, 200)) {
      const { data: existing, error } = await supabaseAdmin.from('builder_review_notes').select('invitation_id,text').eq('id', note.id).maybeSingle();
      const failure = storageError(error); if (failure) return failure;
      if (existing && (existing.invitation_id !== invitationId || readReviewNoteStorage(existing.text).role !== 'client')) return NextResponse.json({ error: 'Solo puedes modificar tus propias observaciones' }, { status: 403 });
    }
  }
  const notes = incomingNotes
    .slice(0, 200).map(value => noteToRow(value, invitationId)).filter(Boolean);
  if (!versions.length && !notes.length) return NextResponse.json({ error: 'Contenido inválido' }, { status: 400 });

  if (versions.length) {
    const { error } = await supabaseAdmin.from('builder_versions').upsert(versions, { onConflict: 'id' });
    const failure = storageError(error); if (failure) return failure;
    const { data: overflow } = await supabaseAdmin.from('builder_versions').select('id').eq('invitation_id', invitationId).order('created_at', { ascending: false }).range(30, 1000);
    const ids = (overflow || []).map(row => row.id);
    if (ids.length) await supabaseAdmin.from('builder_versions').delete().in('id', ids).eq('invitation_id', invitationId);
  }
  if (notes.length) {
    const { error } = await supabaseAdmin.from('builder_review_notes').upsert(notes, { onConflict: 'id' });
    const failure = storageError(error); if (failure) return failure;
  }
  if (body?.action === 'publish' && versions.some(version => version?.source === 'publish')) {
    const { error } = await supabaseAdmin.from('invitations').update({ status: 'ready' }).eq('id', invitationId);
    const failure = storageError(error);
    if (failure) {
      const publishIds = versions.filter(version => version?.source === 'publish').map(version => version!.id);
      if (publishIds.length) await supabaseAdmin.from('builder_versions').delete().in('id', publishIds).eq('invitation_id', invitationId);
      return failure;
    }
  }
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null) as null | { invitationId?: string; id?: string; resolved?: boolean; text?: string; status?: ReviewStatus; role?: BuilderRole };
  const invitationId = String(body?.invitationId || '');
  const actor = await actorRole(invitationId);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!body?.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const { data: current } = await supabaseAdmin.from('builder_review_notes').select('text').eq('id', body.id).eq('invitation_id', invitationId).maybeSingle();
  const decoded = readReviewNoteStorage(current?.text || '');
  if (actor === 'client' && decoded.role !== 'client') return NextResponse.json({ error: 'Solo puedes modificar tus propias observaciones' }, { status: 403 });
  const patch: { resolved?: boolean; text?: string } = {};
  if (typeof body.resolved === 'boolean') patch.resolved = body.resolved;
  if (body.status) patch.resolved = body.status === 'approved';
  if (typeof body.text === 'string' || body.status || body.role) {
    patch.text = reviewNoteTextForStorage({
      id: body.id, invitationId, author: '', createdAt: Date.now(), blockId: undefined,
      text: typeof body.text === 'string' ? body.text.trim().slice(0, 1200) : decoded.text,
      status: body.status ?? decoded.status, role: actor === 'client' ? 'client' : (body.role ?? decoded.role),
      resolved: (body.status ?? decoded.status) === 'approved',
    });
  }
  const { error } = await supabaseAdmin.from('builder_review_notes').update(patch).eq('id', body.id).eq('invitation_id', invitationId);
  return storageError(error) || NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const invitationId = params.get('invitationId') || '';
  const entity = params.get('entity');
  const id = params.get('id');
  const actor = await actorRole(invitationId);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!id || !['version', 'note'].includes(entity || '')) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  if (actor === 'client') {
    if (entity === 'version') return NextResponse.json({ error: 'El cliente no puede eliminar versiones' }, { status: 403 });
    const { data: current } = await supabaseAdmin.from('builder_review_notes').select('text').eq('id', id).eq('invitation_id', invitationId).maybeSingle();
    if (readReviewNoteStorage(current?.text || '').role !== 'client') return NextResponse.json({ error: 'Solo puedes eliminar tus propias observaciones' }, { status: 403 });
  }
  const table = entity === 'version' ? 'builder_versions' : 'builder_review_notes';
  const { error } = await supabaseAdmin.from(table).delete().eq('id', id).eq('invitation_id', invitationId);
  return storageError(error) || NextResponse.json({ success: true });
}
