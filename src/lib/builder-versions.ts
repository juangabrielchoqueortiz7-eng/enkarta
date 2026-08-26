import type { BuilderRole, InvitationParsed, ReviewStatus } from './types';

export interface BuilderVersion {
  id: string;
  invitationId: string;
  label: string;
  createdAt: number;
  source: 'manual' | 'save' | 'publish' | 'restore';
  summary?: string;
  role?: BuilderRole;
  publicationState?: 'published' | 'scheduled';
  publishAt?: string;
  data: InvitationParsed;
}

export interface ReviewNote {
  id: string;
  invitationId: string;
  text: string;
  author: string;
  createdAt: number;
  resolved: boolean;
  status: ReviewStatus;
  role: BuilderRole;
  blockId?: string;
}

const VERSION_KEY = 'enkarta_builder_versions_v1';
const NOTE_KEY = 'enkarta_builder_review_notes_v1';
const API = '/api/admin/builder-state';
const VERSION_META_KEY = '__enkartaVersion';
const NOTE_META_PREFIX = '@@enkarta-note:';

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try { const value = JSON.parse(window.localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value as T[] : []; } catch { return []; }
}
function write<T>(key: string, value: T[]) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* el espejo local es best-effort */ }
}

function replaceInvitationItems<T extends { invitationId: string }>(key: string, invitationId: string, items: T[]) {
  write(key, [...read<T>(key).filter(item => item.invitationId !== invitationId), ...items]);
}

function queueCloud(body: object) {
  if (typeof window === 'undefined') return;
  void fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}

function mergeById<T extends { id: string }>(local: T[], cloud: T[]) {
  const merged = new Map(local.map(item => [item.id, item]));
  cloud.forEach(item => merged.set(item.id, item));
  return Array.from(merged.values());
}

export function listBuilderVersions(invitationId: string): BuilderVersion[] {
  const versions = read<BuilderVersion>(VERSION_KEY).filter(version => version.invitationId === invitationId);
  return Array.from(new Map(versions.map(version => [version.id, version])).values()).sort((a, b) => b.createdAt - a.createdAt);
}

type PublicationVersionOptions = Pick<BuilderVersion, 'publicationState' | 'publishAt'>;

function createBuilderVersion(data: InvitationParsed, label: string, source: BuilderVersion['source'], summary = '', role: BuilderRole = 'admin', publication?: PublicationVersionOptions) {
  const all = read<BuilderVersion>(VERSION_KEY);
  const current = all.filter(version => version.invitationId === data.id);
  const latest = current.sort((a, b) => b.createdAt - a.createdAt)[0];
  const signature = JSON.stringify(data.config?.layout ?? data.config);
  if (source === 'save' && latest && JSON.stringify(latest.data.config?.layout ?? latest.data.config) === signature && Date.now() - latest.createdAt < 60_000) {
    return { versions: listBuilderVersions(data.id), version: null as BuilderVersion | null };
  }
  const clean = JSON.parse(JSON.stringify(data)) as InvitationParsed;
  if (clean.config?.activeGuest) delete clean.config.activeGuest;
  const createdAt = Math.max(Date.now(), (latest?.createdAt ?? 0) + 1);
  const version: BuilderVersion = { id: `version-${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 7)}`, invitationId: data.id, label: label.trim() || 'Versión sin nombre', createdAt, source, summary: summary.trim() || undefined, role, ...publication, data: clean };
  const other = all.filter(item => item.invitationId !== data.id);
  const nextForInvitation = [version, ...current].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
  write(VERSION_KEY, [...other, ...nextForInvitation]);
  return { versions: nextForInvitation, version };
}

export function saveBuilderVersion(data: InvitationParsed, label: string, source: BuilderVersion['source'] = 'manual', summary = '', role: BuilderRole = 'admin', publication?: PublicationVersionOptions): BuilderVersion[] {
  const created = createBuilderVersion(data, label, source, summary, role, publication);
  if (created.version) queueCloud({ invitationId: data.id, version: created.version });
  return created.versions;
}

/** Publicaciones y rollbacks esperan a que la copia compartida exista antes de continuar. */
export async function persistBuilderVersion(data: InvitationParsed, label: string, source: BuilderVersion['source'], summary = '', role: BuilderRole = 'admin', action?: 'publish' | 'schedule', publication?: PublicationVersionOptions): Promise<{ versions: BuilderVersion[]; version: BuilderVersion }> {
  const created = createBuilderVersion(data, label, source, summary, role, publication);
  if (!created.version) throw new Error('No se pudo crear la versión');
  try {
    const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invitationId: data.id, version: created.version, action }) });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'No se pudo sincronizar la versión');
    }
    return { versions: created.versions, version: created.version };
  } catch (error) {
    // Una publicación fallida no debe aparecer localmente como si hubiera quedado en línea.
    write(VERSION_KEY, read<BuilderVersion>(VERSION_KEY).filter(version => version.id !== created.version!.id));
    throw error;
  }
}

export function deleteBuilderVersion(invitationId: string, id: string): BuilderVersion[] {
  const next = read<BuilderVersion>(VERSION_KEY).filter(version => version.id !== id);
  write(VERSION_KEY, next);
  if (typeof window !== 'undefined') void fetch(`${API}?invitationId=${encodeURIComponent(invitationId)}&entity=version&id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  return next.filter(version => version.invitationId === invitationId).sort((a, b) => b.createdAt - a.createdAt);
}

export function listReviewNotes(invitationId: string): ReviewNote[] {
  const notes = read<ReviewNote>(NOTE_KEY)
    .filter(note => note.invitationId === invitationId)
    .map(note => ({ ...note, status: note.status ?? (note.resolved ? 'approved' : 'pending'), role: note.role ?? 'admin' }));
  return Array.from(new Map(notes.map(note => [note.id, note])).values()).sort((a, b) => b.createdAt - a.createdAt);
}

function createReviewNote(invitationId: string, text: string, author: string, blockId?: string, role: BuilderRole = 'admin', status: ReviewStatus = 'pending') {
  const all = read<ReviewNote>(NOTE_KEY);
  const latestAt = all.filter(note => note.invitationId === invitationId).reduce((value, note) => Math.max(value, note.createdAt), 0);
  const createdAt = Math.max(Date.now(), latestAt + 1);
  const note = { id: `note-${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 7)}`, invitationId, text: text.trim(), author: author.trim() || 'Equipo', createdAt, resolved: status === 'approved', status, role, blockId: blockId || undefined } satisfies ReviewNote;
  all.push(note);
  write(NOTE_KEY, all);
  return { note, notes: listReviewNotes(invitationId) };
}

export function addReviewNote(invitationId: string, text: string, author: string, blockId?: string, role: BuilderRole = 'admin', status: ReviewStatus = 'pending'): ReviewNote[] {
  const created = createReviewNote(invitationId, text, author, blockId, role, status);
  queueCloud({ invitationId, note: created.note });
  return created.notes;
}

/** Los comentarios del cliente esperan confirmación del servidor para mostrar un estado fiable. */
export async function persistReviewNote(invitationId: string, text: string, author: string, blockId?: string, role: BuilderRole = 'client', status: ReviewStatus = 'pending'): Promise<ReviewNote[]> {
  const created = createReviewNote(invitationId, text, author, blockId, role, status);
  try {
    const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invitationId, note: created.note }) });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'No se pudo enviar la observación');
    }
    return created.notes;
  } catch (error) {
    write(NOTE_KEY, read<ReviewNote>(NOTE_KEY).filter(note => note.id !== created.note.id));
    throw error;
  }
}

export function patchReviewNote(invitationId: string, id: string, patch: Partial<ReviewNote>): ReviewNote[] {
  const next = read<ReviewNote>(NOTE_KEY).map(note => {
    const normalized = { ...note, status: note.status ?? (note.resolved ? 'approved' : 'pending'), role: note.role ?? 'admin' };
    return note.id === id ? { ...normalized, ...patch, ...(patch.status ? { resolved: patch.status === 'approved' } : {}) } : normalized;
  });
  write(NOTE_KEY, next);
  if (typeof window !== 'undefined') void fetch(API, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invitationId, id, resolved: patch.resolved, status: patch.status, role: patch.role, text: patch.text }) }).catch(() => {});
  return next.filter(note => note.invitationId === invitationId).sort((a, b) => b.createdAt - a.createdAt);
}

/** Guarda metadatos de Fase 8 dentro del JSON existente, sin exigir otra migración. */
export function versionSnapshotForStorage(version: BuilderVersion): InvitationParsed {
  return {
    ...version.data,
    config: {
      ...(version.data.config ?? {}),
      [VERSION_META_KEY]: { summary: version.summary, role: version.role, publicationState: version.publicationState, publishAt: version.publishAt },
    },
  };
}

export function readVersionStorageMeta(snapshot: InvitationParsed): { data: InvitationParsed; summary?: string; role?: BuilderRole; publicationState?: BuilderVersion['publicationState']; publishAt?: string } {
  const config = { ...(snapshot.config ?? {}) };
  const meta = config[VERSION_META_KEY] as { summary?: string; role?: BuilderRole; publicationState?: BuilderVersion['publicationState']; publishAt?: string } | undefined;
  delete config[VERSION_META_KEY];
  return { data: { ...snapshot, config }, summary: meta?.summary, role: meta?.role, publicationState: meta?.publicationState, publishAt: meta?.publishAt };
}

export function effectivePublicationTime(version: BuilderVersion): number {
  if (version.publicationState === 'scheduled' && version.publishAt) return Date.parse(version.publishAt) || Number.POSITIVE_INFINITY;
  return version.createdAt;
}

/** Último snapshot que ya debe estar visible; una programación futura no reemplaza la publicación actual. */
export function activePublishedVersion(versions: BuilderVersion[], at = Date.now()): BuilderVersion | null {
  return versions
    .filter(version => version.source === 'publish' && effectivePublicationTime(version) <= at)
    .sort((left, right) => effectivePublicationTime(right) - effectivePublicationTime(left))[0] ?? null;
}

export function nextScheduledVersion(versions: BuilderVersion[], at = Date.now()): BuilderVersion | null {
  return versions
    .filter(version => version.source === 'publish' && version.publicationState === 'scheduled' && effectivePublicationTime(version) > at)
    .sort((left, right) => effectivePublicationTime(left) - effectivePublicationTime(right))[0] ?? null;
}

export function reviewNoteTextForStorage(note: ReviewNote): string {
  return `${NOTE_META_PREFIX}${JSON.stringify({ status: note.status, role: note.role })}\n${note.text}`;
}

export function readReviewNoteStorage(text: string): { text: string; status: ReviewStatus; role: BuilderRole } {
  if (!text.startsWith(NOTE_META_PREFIX)) return { text, status: 'pending', role: 'admin' };
  const newline = text.indexOf('\n');
  try {
    const meta = JSON.parse(text.slice(NOTE_META_PREFIX.length, newline < 0 ? undefined : newline)) as { status?: ReviewStatus; role?: BuilderRole };
    return { text: newline < 0 ? '' : text.slice(newline + 1), status: meta.status ?? 'pending', role: meta.role ?? 'admin' };
  } catch { return { text, status: 'pending', role: 'admin' }; }
}

export function deleteReviewNote(invitationId: string, id: string): ReviewNote[] {
  const next = read<ReviewNote>(NOTE_KEY).filter(note => note.id !== id);
  write(NOTE_KEY, next);
  if (typeof window !== 'undefined') void fetch(`${API}?invitationId=${encodeURIComponent(invitationId)}&entity=note&id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  return next.filter(note => note.invitationId === invitationId).map(note => ({ ...note, status: note.status ?? (note.resolved ? 'approved' : 'pending'), role: note.role ?? 'admin' })).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Hidrata el espejo local con el estado compartido. Los registros que solo
 * existían en el navegador se suben en segundo plano para migrarlos sin perderlos.
 */
export async function hydrateBuilderState(invitationId: string): Promise<{ versions: BuilderVersion[]; notes: ReviewNote[]; cloud: boolean }> {
  const localVersions = listBuilderVersions(invitationId);
  const localNotes = listReviewNotes(invitationId);
  if (typeof window === 'undefined') return { versions: localVersions, notes: localNotes, cloud: false };
  try {
    const response = await fetch(`${API}?invitationId=${encodeURIComponent(invitationId)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('cloud-unavailable');
    const payload = await response.json() as { versions?: BuilderVersion[]; notes?: ReviewNote[] };
    const versions = mergeById(localVersions, Array.isArray(payload.versions) ? payload.versions : []).sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
    const notes = mergeById(localNotes, Array.isArray(payload.notes) ? payload.notes : []).sort((a, b) => b.createdAt - a.createdAt);
    replaceInvitationItems(VERSION_KEY, invitationId, versions);
    replaceInvitationItems(NOTE_KEY, invitationId, notes);
    if (localVersions.length || localNotes.length) queueCloud({ invitationId, versions: localVersions, notes: localNotes });
    return { versions, notes, cloud: true };
  } catch {
    return { versions: localVersions, notes: localNotes, cloud: false };
  }
}
