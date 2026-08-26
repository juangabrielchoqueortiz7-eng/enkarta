'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Block, BuilderRole, InvitationParsed, ReviewStatus } from '@/lib/types';
import {
  addReviewNote,
  deleteBuilderVersion,
  deleteReviewNote,
  hydrateBuilderState,
  listBuilderVersions,
  listReviewNotes,
  patchReviewNote,
  saveBuilderVersion,
  activePublishedVersion,
  effectivePublicationTime,
  nextScheduledVersion,
  type BuilderVersion,
} from '@/lib/builder-versions';
import { ROLE_META } from '@/lib/builder-workflow';

interface Props {
  data: InvitationParsed;
  selectedBlockId?: string;
  publishedVersionId?: string;
  onUnpublish: () => Promise<void>;
  onCancelSchedule?: (versionId: string) => void;
  onRestore: (data: InvitationParsed) => void;
  onRollback: (version: BuilderVersion) => Promise<void>;
  onWorkflowChange: (status: ReviewStatus) => void;
  onOpenBlock?: (blockId: string) => void;
}

const SOURCE_META = {
  manual: { label: 'Versión', cls: 'bg-violet-50 text-violet-700' },
  save: { label: 'Guardado', cls: 'bg-sky-50 text-sky-700' },
  publish: { label: 'Publicación', cls: 'bg-emerald-50 text-emerald-700' },
  restore: { label: 'Respaldo', cls: 'bg-amber-50 text-amber-700' },
} as const;

const STATUS_META: Record<ReviewStatus, { label: string; description: string; dot: string; cls: string }> = {
  pending: { label: 'Pendiente', description: 'La versión está lista para revisión.', dot: 'bg-amber-400', cls: 'border-amber-200 bg-amber-50 text-amber-800' },
  approved: { label: 'Aprobada', description: 'El cliente dio el visto bueno.', dot: 'bg-emerald-500', cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  changes: { label: 'Requiere cambios', description: 'Hay observaciones por resolver.', dot: 'bg-rose-500', cls: 'border-rose-200 bg-rose-50 text-rose-800' },
};

function blockName(blocks: Block[], id?: string): string {
  if (!id) return 'Comentario general';
  for (const block of blocks) {
    if (block.id === id) {
      const title = typeof block.props?.title === 'string' ? block.props.title : '';
      return title || block.type.replace(/-/g, ' ');
    }
    const nested = blockName(block.children ?? [], id);
    if (nested !== 'Comentario general') return nested;
  }
  return 'Elemento del diseño';
}

export default function VersionsPanel({ data, selectedBlockId, publishedVersionId, onUnpublish, onCancelSchedule, onRestore, onRollback, onWorkflowChange, onOpenBlock }: Props) {
  const [versions, setVersions] = useState(() => listBuilderVersions(data.id));
  const [notes, setNotes] = useState(() => listReviewNotes(data.id));
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('Equipo Enkarta');
  const [role, setRole] = useState<BuilderRole>('admin');
  const [noteStatus, setNoteStatus] = useState<ReviewStatus>('pending');
  const [noteFilter, setNoteFilter] = useState<'all' | ReviewStatus>('all');
  const [versionName, setVersionName] = useState('');
  const [namingVersion, setNamingVersion] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [cloudState, setCloudState] = useState<'loading' | 'connected' | 'local'>('loading');

  const refresh = async () => {
    setCloudState('loading');
    const state = await hydrateBuilderState(data.id);
    setVersions(state.versions);
    setNotes(state.notes);
    setCloudState(state.cloud ? 'connected' : 'local');
  };

  useEffect(() => {
    let active = true;
    setCloudState('loading');
    hydrateBuilderState(data.id).then(state => {
      if (!active) return;
      setVersions(state.versions);
      setNotes(state.notes);
      setCloudState(state.cloud ? 'connected' : 'local');
    });
    return () => { active = false; };
  }, [data.id, publishedVersionId]);

  const workflow = data.config?.workflow;
  const workflowDecisionAt = Math.max(Date.parse(workflow?.draftUpdatedAt || '') || 0, Date.parse(workflow?.reviewUpdatedAt || '') || 0);
  const clientDecision = notes.find(item => item.role === 'client' && item.status !== 'pending' && item.createdAt > workflowDecisionAt);
  const currentStatus = clientDecision?.status ?? workflow?.reviewStatus ?? 'pending';
  const activePublication = activePublishedVersion(versions);
  const scheduledPublication = nextScheduledVersion(versions);
  const currentPublishId = publishedVersionId || activePublication?.id;
  const published = versions
    .filter(version => version.source === 'publish' && effectivePublicationTime(version) <= Date.now())
    .sort((left, right) => effectivePublicationTime(right) - effectivePublicationTime(left));
  const previousPublish = published.find(version => version.id !== currentPublishId);
  const publicationPaused = data.status === 'disabled';
  const filteredNotes = noteFilter === 'all' ? notes : notes.filter(item => item.status === noteFilter);
  const blocks = data.config?.layout?.blocks ?? [];
  const counters = useMemo(() => ({
    pending: notes.filter(item => item.status === 'pending').length,
    changes: notes.filter(item => item.status === 'changes').length,
    approved: notes.filter(item => item.status === 'approved').length,
  }), [notes]);

  const createVersion = () => {
    const label = versionName.trim();
    if (!label) return;
    setVersions(saveBuilderVersion(data, label, 'manual', 'Punto de control creado manualmente', role));
    setVersionName('');
    setNamingVersion(false);
  };

  const addNote = () => {
    if (!note.trim()) return;
    setNotes(addReviewNote(data.id, note, author, selectedBlockId, role, noteStatus));
    setNote('');
  };

  const restore = (version: BuilderVersion) => {
    if (!window.confirm(`¿Restaurar “${version.label}”? Guardaremos el estado actual antes de volver a esa versión.`)) return;
    setVersions(saveBuilderVersion(data, 'Antes de restaurar', 'restore', `Respaldo previo a restaurar ${version.label}`, 'admin'));
    onRestore(version.data);
  };

  const rollback = async () => {
    if (!previousPublish || !window.confirm(`¿Volver a la publicación “${previousPublish.label}”? La publicación actual quedará guardada en el historial.`)) return;
    setRollingBack(true);
    try {
      await onRollback(previousPublish);
      await refresh();
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div className="space-y-5 p-4">
      <section className="overflow-hidden rounded-[22px] border border-[#e9e1f1] bg-white shadow-sm">
        <div className="bg-gradient-to-br from-[#29243f] via-[#4f416a] to-[#8a6ca0] p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-outfit font-semibold uppercase tracking-[0.18em] text-white/55">Control de versiones</p>
              <h3 className="mt-1 font-playfair text-xl">Publica con tranquilidad</h3>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-outfit ${cloudState === 'connected' ? 'bg-emerald-300/20 text-emerald-100' : cloudState === 'loading' ? 'bg-white/10 text-white/60' : 'bg-amber-300/20 text-amber-100'}`}>
              {cloudState === 'connected' ? '● Nube activa' : cloudState === 'loading' ? 'Sincronizando…' : '● Respaldo local'}
            </span>
          </div>
          <p className="mt-2 max-w-sm text-xs font-outfit leading-relaxed text-white/65">Borrador, vista privada y versión pública están separados. Restaurar nunca borra tu trabajo actual.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center font-outfit">
            <div className="rounded-xl bg-white/10 px-2 py-2"><p className="text-[9px] uppercase tracking-wider text-white/45">Borrador</p><p className="mt-0.5 text-[11px] font-semibold">Editable</p></div>
            <div className="rounded-xl bg-white/10 px-2 py-2"><p className="text-[9px] uppercase tracking-wider text-white/45">Vista privada</p><p className="mt-0.5 text-[11px] font-semibold">En vivo</p></div>
            <div className={`rounded-xl px-2 py-2 ${publicationPaused ? 'bg-amber-300/15' : 'bg-emerald-300/15'}`}><p className={`text-[9px] uppercase tracking-wider ${publicationPaused ? 'text-amber-100/60' : 'text-emerald-100/60'}`}>Pública</p><p className="mt-0.5 text-[11px] font-semibold">{publicationPaused ? 'Pausada' : activePublication ? 'Protegida' : 'Sin publicar'}</p></div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-outfit font-semibold uppercase tracking-wider text-gray-400">Estado de aprobación</p>
              <p className="mt-1 text-xs font-outfit text-gray-500">{STATUS_META[currentStatus].description}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-outfit font-semibold ${STATUS_META[currentStatus].cls}`}><span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[currentStatus].dot}`} />{STATUS_META[currentStatus].label}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {(Object.keys(STATUS_META) as ReviewStatus[]).map(status => (
              <button key={status} type="button" onClick={() => onWorkflowChange(status)} className={`rounded-xl border px-1.5 py-2 text-[10px] font-outfit font-medium transition ${currentStatus === status ? STATUS_META[status].cls : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}>{STATUS_META[status].label}</button>
            ))}
          </div>
        </div>
      </section>

      {(activePublication || scheduledPublication || publicationPaused) && (
        <section className="space-y-2 rounded-[20px] border border-[#e8e1d8] bg-[#fcfaf7] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 font-outfit">Estado público</p>
              <p className="mt-1 text-xs font-semibold text-gray-700 font-outfit">{publicationPaused ? 'El enlace está pausado' : activePublication ? 'Hay una versión visible' : 'Esperando la fecha programada'}</p>
            </div>
            {!publicationPaused && activePublication && <button type="button" onClick={() => void onUnpublish()} className="rounded-xl border border-rose-100 bg-white px-3 py-2 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50 font-outfit">Despublicar</button>}
          </div>
          {publicationPaused && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-700 font-outfit">Tus invitados ven una pausa temporal. Las versiones y cualquier programación se conservan.</p>}
          {scheduledPublication && (
            <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">◷</span>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-sky-900 font-outfit">{scheduledPublication.label}</p><p className="mt-0.5 text-[10px] text-sky-700 font-outfit">Programada para {new Date(scheduledPublication.publishAt || scheduledPublication.createdAt).toLocaleString('es-BO')}</p></div>
              <button type="button" onClick={() => { if (window.confirm(`¿Cancelar la publicación programada “${scheduledPublication.label}”?`)) { setVersions(deleteBuilderVersion(data.id, scheduledPublication.id)); onCancelSchedule?.(scheduledPublication.id); } }} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-[9px] font-semibold text-sky-700 shadow-sm font-outfit">Cancelar</button>
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div><h4 className="text-xs font-outfit font-semibold uppercase tracking-wider text-gray-500">Versiones guardadas</h4><p className="mt-0.5 text-[10px] font-outfit text-gray-400">Hasta 30 puntos de control</p></div>
          <button type="button" onClick={() => setNamingVersion(value => !value)} className="rounded-xl bg-gray-900 px-3 py-2 text-[11px] font-outfit font-semibold text-white">+ Nombrar versión</button>
        </div>

        {namingVersion && (
          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
            <label className="text-[10px] font-outfit font-semibold uppercase tracking-wider text-violet-600">Nombre fácil de reconocer</label>
            <div className="mt-2 flex gap-2">
              <input autoFocus value={versionName} onChange={event => setVersionName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') createVersion(); }} placeholder="Ej: Portada aprobada" className="min-w-0 flex-1 rounded-xl border border-violet-100 bg-white px-3 py-2 text-xs font-outfit outline-none focus:border-violet-400" />
              <button type="button" onClick={createVersion} disabled={!versionName.trim()} className="rounded-xl bg-violet-600 px-3 text-[11px] font-outfit font-semibold text-white disabled:opacity-40">Guardar</button>
            </div>
          </div>
        )}

        {previousPublish && (
          <button type="button" onClick={rollback} disabled={rollingBack} className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left transition hover:bg-amber-100 disabled:opacity-50">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg text-amber-700 shadow-sm">↶</span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-outfit font-semibold text-amber-900">Rollback inmediato</span><span className="block truncate text-[10px] font-outfit text-amber-700">Volver a “{previousPublish.label}” y conservar la actual</span></span>
            <span className="text-[10px] font-outfit font-semibold text-amber-800">{rollingBack ? 'Volviendo…' : 'Volver'}</span>
          </button>
        )}

        {versions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-xs font-outfit text-gray-400">Aún no hay versiones. Crea una antes de un cambio importante.</p>
        ) : versions.map(version => {
          const isPublished = version.id === currentPublishId;
          const isScheduled = version.publicationState === 'scheduled' && effectivePublicationTime(version) > Date.now();
          const source = SOURCE_META[version.source];
          const versionRole = ROLE_META[version.role ?? 'admin'];
          return (
            <article key={version.id} className={`rounded-2xl border bg-white p-3 shadow-sm ${isPublished ? 'border-emerald-200 ring-2 ring-emerald-50' : isScheduled ? 'border-sky-200 ring-2 ring-sky-50' : 'border-gray-100'}`}>
              <div className="flex items-start gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${isPublished ? 'bg-emerald-50 text-emerald-600' : isScheduled ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-500'}`}>{isPublished ? '✓' : '◷'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5"><p className="min-w-0 truncate text-sm font-outfit font-semibold text-gray-700">{version.label}</p>{isPublished && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[8px] font-outfit font-bold uppercase tracking-wide text-white">En línea</span>}{isScheduled && <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[8px] font-outfit font-bold uppercase tracking-wide text-white">Programada</span>}</div>
                  <p className="mt-0.5 text-[10px] font-outfit text-gray-400">{isScheduled ? `Se publicará ${new Date(version.publishAt || version.createdAt).toLocaleString('es-BO')}` : new Date(version.createdAt).toLocaleString('es-BO')} · {versionRole.label}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-outfit font-semibold ${isScheduled ? 'bg-sky-50 text-sky-700' : source.cls}`}>{isScheduled ? 'Programación' : source.label}</span>
              </div>
              {version.summary && <p className="mt-2 rounded-xl bg-gray-50 px-2.5 py-2 text-[10px] font-outfit leading-relaxed text-gray-500">{version.summary}</p>}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => restore(version)} className="flex-1 rounded-xl bg-violet-50 py-2 text-[11px] font-outfit font-semibold text-violet-700">Restaurar al borrador</button>
                {!isPublished && <button type="button" onClick={() => { if (window.confirm(isScheduled ? `¿Cancelar la publicación programada “${version.label}”?` : `¿Eliminar la versión “${version.label}”?`)) { setVersions(deleteBuilderVersion(data.id, version.id)); if (isScheduled) onCancelSchedule?.(version.id); } }} className="rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-outfit text-gray-400 hover:border-red-100 hover:text-red-500">{isScheduled ? 'Cancelar' : 'Eliminar'}</button>}
              </div>
            </article>
          );
        })}
      </section>

      <section className="space-y-3 border-t border-gray-100 pt-5">
        <div>
          <div className="flex items-center justify-between gap-3"><h4 className="text-xs font-outfit font-semibold uppercase tracking-wider text-gray-500">Revisión colaborativa</h4><span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-outfit text-gray-500">{notes.length} notas</span></div>
          <p className="mt-1 text-[11px] font-outfit text-gray-400">{selectedBlockId ? `Vinculada a: ${blockName(blocks, selectedBlockId)}` : 'Selecciona un bloque para comentar un elemento exacto.'}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-[#faf9fb] p-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={author} onChange={event => setAuthor(event.target.value)} placeholder="Nombre del revisor" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-outfit outline-none focus:border-violet-400" />
            <select value={role} onChange={event => setRole(event.target.value as BuilderRole)} className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs font-outfit text-gray-600 outline-none focus:border-violet-400">
              <option value="admin">Administrador</option><option value="designer">Diseñador</option>
            </select>
          </div>
          <textarea value={note} onChange={event => setNote(event.target.value)} rows={3} placeholder="Describe el cambio con claridad…" className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-outfit outline-none focus:border-violet-400" />
          <div className="mt-2 flex gap-2">
            <select value={noteStatus} onChange={event => setNoteStatus(event.target.value as ReviewStatus)} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-2 py-2 text-[11px] font-outfit text-gray-600 outline-none"><option value="pending">Pendiente</option><option value="changes">Solicita cambios</option><option value="approved">Aprobación</option></select>
            <button type="button" onClick={addNote} disabled={!note.trim()} className="rounded-xl bg-gray-900 px-4 py-2 text-[11px] font-outfit font-semibold text-white disabled:opacity-40">Añadir nota</button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {(['all', 'pending', 'changes', 'approved'] as const).map(filter => (
            <button key={filter} type="button" onClick={() => setNoteFilter(filter)} className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] font-outfit font-semibold ${noteFilter === filter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {filter === 'all' ? `Todas ${notes.length}` : `${STATUS_META[filter].label} ${counters[filter]}`}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredNotes.length === 0 && <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-[11px] font-outfit text-gray-400">No hay comentarios en este estado.</p>}
          {filteredNotes.map(item => {
            const meta = STATUS_META[item.status];
            const itemRole = ROLE_META[item.role];
            return (
              <article key={item.id} className={`rounded-2xl border p-3 ${item.status === 'approved' ? 'border-emerald-100 bg-emerald-50/40' : item.status === 'changes' ? 'border-rose-100 bg-rose-50/40' : 'border-amber-100 bg-amber-50/40'}`}>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-outfit font-bold text-white" style={{ background: itemRole.color }}>{item.author.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-outfit font-semibold text-gray-700">{item.author}</p><p className="text-[9px] font-outfit text-gray-400">{itemRole.label} · {new Date(item.createdAt).toLocaleDateString('es-BO')}</p></div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-outfit font-semibold ${meta.cls}`}><span className={`h-1 w-1 rounded-full ${meta.dot}`} />{meta.label}</span>
                </div>
                <p className="mt-2 text-xs font-outfit leading-relaxed text-gray-600">{item.text}</p>
                {item.blockId && <button type="button" onClick={() => onOpenBlock?.(item.blockId!)} className="mt-2 rounded-lg bg-white px-2 py-1 text-[9px] font-outfit font-semibold text-violet-600 shadow-sm">◎ Ver {blockName(blocks, item.blockId)}</button>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(Object.keys(STATUS_META) as ReviewStatus[]).map(status => <button key={status} type="button" onClick={() => setNotes(patchReviewNote(data.id, item.id, { status }))} className={`rounded-lg px-2 py-1 text-[9px] font-outfit ${item.status === status ? STATUS_META[status].cls : 'bg-white text-gray-500'}`}>{STATUS_META[status].label}</button>)}
                  <button type="button" onClick={() => { if (window.confirm('¿Eliminar esta nota?')) setNotes(deleteReviewNote(data.id, item.id)); }} className="ml-auto px-1 py-1 text-[9px] font-outfit text-red-400">Eliminar</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <details className="rounded-2xl border border-gray-100 bg-white p-3">
        <summary className="cursor-pointer text-xs font-outfit font-semibold text-gray-600">Roles y permisos del proyecto</summary>
        <div className="mt-3 space-y-2">
          {(Object.keys(ROLE_META) as BuilderRole[]).map(item => <div key={item} className="flex gap-2.5 rounded-xl bg-gray-50 p-2.5"><span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: ROLE_META[item].color }} /><div><p className="text-[11px] font-outfit font-semibold text-gray-700">{ROLE_META[item].label}</p><p className="mt-0.5 text-[10px] font-outfit leading-relaxed text-gray-400">{ROLE_META[item].description}</p></div></div>)}
        </div>
      </details>
    </div>
  );
}
