'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Block, InvitationParsed, ReviewStatus } from '@/lib/types';
import { hydrateBuilderState, persistReviewNote, type BuilderVersion, type ReviewNote } from '@/lib/builder-versions';
import { ROLE_META } from '@/lib/builder-workflow';

interface Props { invitation: InvitationParsed }

const STATUS = {
  pending: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  approved: { label: 'Aprobado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  changes: { label: 'Solicita cambios', cls: 'bg-rose-50 text-rose-700 border-rose-100' },
} as const;

function flattenBlocks(blocks: Block[], depth = 0): { id: string; name: string }[] {
  return blocks.flatMap(block => {
    const title = typeof block.props?.title === 'string' && block.props.title.trim() ? block.props.title.trim() : block.type.replace(/-/g, ' ');
    return [{ id: block.id, name: `${depth ? '↳ ' : ''}${title}` }, ...flattenBlocks(block.children ?? [], depth + 1)];
  });
}

export default function ClientReviewPanel({ invitation }: Props) {
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [published, setPublished] = useState<BuilderVersion | null>(null);
  const [author, setAuthor] = useState('Cliente');
  const [text, setText] = useState('');
  const [blockId, setBlockId] = useState('');
  const [status, setStatus] = useState<ReviewStatus>('changes');
  const [state, setState] = useState<'loading' | 'ready' | 'sending' | 'sent' | 'error'>('loading');
  const blocks = useMemo(() => flattenBlocks(invitation.config?.layout?.blocks ?? []), [invitation.config?.layout?.blocks]);

  useEffect(() => {
    let active = true;
    hydrateBuilderState(invitation.id).then(result => {
      if (!active) return;
      setNotes(result.notes);
      setPublished(result.versions.find(version => version.source === 'publish') ?? null);
      setState('ready');
    });
    return () => { active = false; };
  }, [invitation.id]);

  const submit = async (nextStatus = status) => {
    const message = text.trim() || (nextStatus === 'approved' ? 'La versión fue aprobada por el cliente.' : 'El cliente solicita una nueva revisión.');
    setState('sending');
    try {
      const next = await persistReviewNote(invitation.id, message, author, blockId || undefined, 'client', nextStatus);
      setNotes(next);
      setText('');
      setStatus(nextStatus);
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-[#e5ded4] bg-white shadow-sm">
      <div className="bg-[linear-gradient(135deg,#29263b_0%,#645171_100%)] p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-md">
            <p className="font-outfit text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Revisión del diseño</p>
            <h2 className="mt-1 font-playfair text-2xl">Tu opinión, dentro del proyecto</h2>
            <p className="mt-2 font-outfit text-xs leading-relaxed text-white/65">Abre el borrador privado, deja observaciones sobre una sección y aprueba cuando todo esté listo. Tus invitados seguirán viendo la última versión publicada.</p>
          </div>
          <a href={`/i/${invitation.slug}?preview=1`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-4 py-2.5 font-outfit text-xs font-semibold text-[#43384e] shadow-lg">Ver borrador privado ↗</a>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 font-outfit text-[10px]">
          <span className="rounded-full bg-white/10 px-2.5 py-1.5">Borrador privado</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1.5">Comentarios compartidos</span>
          <span className={`rounded-full px-2.5 py-1.5 ${published ? 'bg-emerald-300/20 text-emerald-100' : 'bg-amber-300/20 text-amber-100'}`}>{published ? `Publicada: ${published.label}` : 'Aún sin publicación'}</span>
        </div>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)]">
        <div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="mb-1 block font-outfit text-[10px] font-semibold uppercase tracking-wider text-gray-400">Tu nombre</span><input value={author} onChange={event => setAuthor(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-outfit text-sm outline-none focus:border-[#9a7cab]" /></label>
            <label className="block"><span className="mb-1 block font-outfit text-[10px] font-semibold uppercase tracking-wider text-gray-400">Sección</span><select value={blockId} onChange={event => setBlockId(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-outfit text-sm text-gray-600 outline-none focus:border-[#9a7cab]"><option value="">Toda la invitación</option>{blocks.map(block => <option key={block.id} value={block.id}>{block.name}</option>)}</select></label>
          </div>
          <label className="mt-3 block"><span className="mb-1 block font-outfit text-[10px] font-semibold uppercase tracking-wider text-gray-400">Observación</span><textarea value={text} onChange={event => setText(event.target.value)} rows={4} placeholder="Ej: cambiar esta foto, aumentar el texto o probar otro color…" className="w-full rounded-2xl border border-gray-200 px-3 py-3 font-outfit text-sm leading-relaxed outline-none focus:border-[#9a7cab]" /></label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setStatus('changes'); void submit('changes'); }} disabled={state === 'sending'} className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 font-outfit text-xs font-semibold text-rose-700 disabled:opacity-50">Solicitar cambios</button>
            <button type="button" onClick={() => { setStatus('approved'); void submit('approved'); }} disabled={state === 'sending'} className="rounded-xl bg-emerald-600 px-3 py-2.5 font-outfit text-xs font-semibold text-white shadow-sm disabled:opacity-50">Aprobar versión</button>
          </div>
          {state === 'sent' && <p className="mt-2 rounded-xl bg-emerald-50 p-2.5 font-outfit text-xs text-emerald-700">Tu respuesta quedó guardada y ya es visible para el equipo.</p>}
          {state === 'error' && <p className="mt-2 rounded-xl bg-red-50 p-2.5 font-outfit text-xs text-red-600">No pudimos enviar la observación. Revisa tu conexión e inténtalo de nuevo.</p>}
        </div>

        <div className="min-h-[220px] rounded-2xl bg-[#f8f6f2] p-3">
          <div className="flex items-center justify-between"><h3 className="font-outfit text-xs font-semibold uppercase tracking-wider text-gray-500">Actividad reciente</h3><span className="rounded-full bg-white px-2 py-1 font-outfit text-[9px] text-gray-400">{notes.length}</span></div>
          <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1">
            {state === 'loading' && <p className="py-8 text-center font-outfit text-xs text-gray-400">Cargando revisión…</p>}
            {state !== 'loading' && notes.length === 0 && <p className="py-8 text-center font-outfit text-xs leading-relaxed text-gray-400">Aún no hay comentarios.<br />Puedes iniciar la revisión aquí.</p>}
            {notes.slice(0, 20).map(note => {
              const role = ROLE_META[note.role];
              return <article key={note.id} className="rounded-xl border border-gray-100 bg-white p-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full font-outfit text-[10px] font-bold text-white" style={{ background: role.color }}>{note.author.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate font-outfit text-[11px] font-semibold text-gray-700">{note.author}</p><p className="font-outfit text-[9px] text-gray-400">{role.label} · {new Date(note.createdAt).toLocaleDateString('es-BO')}</p></div><span className={`rounded-full border px-2 py-1 font-outfit text-[8px] font-semibold ${STATUS[note.status].cls}`}>{STATUS[note.status].label}</span></div><p className="mt-2 font-outfit text-xs leading-relaxed text-gray-600">{note.text}</p>{note.blockId && <p className="mt-1.5 font-outfit text-[9px] text-violet-500">Vinculado a una sección del diseño</p>}</article>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
