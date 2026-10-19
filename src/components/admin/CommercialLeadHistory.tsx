'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { leadStatusLabel } from '@/lib/commercial';
import type { CommercialLead } from '@/lib/commercial-lookup';
import { requestCommercialHistory, type CommercialHistoryPage } from '@/lib/commercial-history';

const button = 'min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 font-outfit text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:opacity-50';

type Props = { lead: Pick<CommercialLead, 'id' | 'reference' | 'revision'>; transport?: typeof fetch };
type LoadedPage = { identity: string; page: CommercialHistoryPage };

/** History is loaded only while this disclosure is open; closing discards its data. */
export default function CommercialLeadHistory({ lead, transport = fetch }: Props) {
  const id = useId(), identity = `${lead.id}:${lead.reference}:${lead.revision}`;
  const [open, setOpen] = useState(false), [loaded, setLoaded] = useState<LoadedPage | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const active = useRef<AbortController | null>(null), sequence = useRef(0), attemptedCursor = useRef<string | null>(null);
  const page = loaded?.identity === identity ? loaded.page : null;

  const cancel = useCallback(() => { sequence.current += 1; active.current?.abort(); active.current = null; }, []);
  const load = useCallback(async (cursor: string | null) => {
    cancel();
    const request = sequence.current, controller = new AbortController(); active.current = controller;
    attemptedCursor.current = cursor;
    setLoading(true); setError('');
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    try {
      const result = await requestCommercialHistory({ id: lead.id, reference: lead.reference }, cursor, transport, controller.signal);
      if (request === sequence.current && !controller.signal.aborted) setLoaded({ identity, page: result });
    } catch (cause) {
      if (request === sequence.current) setError(timedOut ? 'El historial tardó demasiado en responder. Vuelve a intentarlo.' : cause instanceof Error ? cause.message : 'No se pudo cargar el historial. Vuelve a intentarlo.');
    } finally {
      clearTimeout(timer);
      if (request === sequence.current) { active.current = null; setLoading(false); }
    }
  }, [cancel, identity, lead.id, lead.reference, transport]);

  useEffect(() => {
    setLoaded(null); setError(''); attemptedCursor.current = null;
    if (open) void load(null);
    return cancel;
  }, [open, load, cancel]);

  const close = () => { cancel(); setOpen(false); setLoaded(null); setError(''); setLoading(false); attemptedCursor.current = null; };
  return <section className="mt-4 min-w-0 border-t border-gray-200 pt-4">
    <button type="button" aria-label={`${open ? 'Ocultar' : 'Ver'} historial de ${lead.reference}`} aria-expanded={open} aria-controls={`${id}-panel`} className={button} onClick={() => open ? close() : setOpen(true)}>{open ? 'Ocultar historial' : 'Ver historial'}</button>
    <div id={`${id}-panel`} hidden={!open} className="mt-4 min-w-0 space-y-4">
      {open && <>
        <div>
          <h4 className="font-outfit text-base font-semibold text-gray-900">Historial de seguimiento</h4>
          <p className="mt-1 max-w-2xl font-outfit text-sm leading-6 text-gray-600">Consulta de solo lectura. Cada registro muestra el estado, el ingreso y la nota guardados en ese momento. No confirma cobros ni envíos de WhatsApp.</p>
        </div>
        {loading && <p role="status" className="font-outfit text-sm text-gray-700">Cargando historial…</p>}
        {error && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p role="alert" className="font-outfit text-sm leading-6 text-amber-950">{page ? 'No se pudo actualizar el historial. Los registros visibles corresponden a la consulta anterior. ' : ''}{error}</p>
          <button type="button" disabled={loading} className={button} onClick={() => void load(attemptedCursor.current)}>Reintentar consulta</button>
        </div>}
        {page && <>
          <p role="status" className="font-outfit text-sm leading-6 text-gray-600">Hasta {new Date(page.asOf).toLocaleString('es-BO')}. {page.entries.length} registro(s) en esta página, del más reciente al más antiguo.</p>
          {page.entries.length === 0 ? <p role="status" className="font-outfit text-sm leading-6 text-gray-700">Aún no hay cambios registrados.</p> : <ol className="min-w-0 divide-y divide-gray-200">
            {page.entries.map(entry => <li key={entry.id} className="min-w-0 space-y-3 py-4 first:pt-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 font-outfit text-sm font-semibold leading-6 text-gray-900">
                  {entry.from_status === entry.to_status ? <><p>Seguimiento actualizado</p><p className="font-normal text-gray-700">Estado registrado: {leadStatusLabel(entry.to_status)}</p></> : <p>De {leadStatusLabel(entry.from_status)} a {leadStatusLabel(entry.to_status)}</p>}
                </div>
                <time dateTime={entry.created_at} className="shrink-0 font-outfit text-sm leading-6 text-gray-600">{new Date(entry.created_at).toLocaleString('es-BO')}</time>
              </div>
              <dl className="min-w-0 space-y-2 font-outfit text-sm leading-6">
                <div><dt className="text-gray-600">Ingreso registrado</dt><dd className="tabular-nums text-gray-900">{entry.revenue_bs === null ? 'Sin registrar' : `${entry.revenue_bs.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`}</dd></div>
                <div className="min-w-0"><dt className="text-gray-600">Nota guardada</dt><dd className="whitespace-pre-wrap break-words text-gray-900 [overflow-wrap:anywhere]">{entry.note || 'Sin nota'}</dd></div>
              </dl>
            </li>)}
          </ol>}
          <nav aria-label={`Páginas del historial de ${lead.reference}`} className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
            <button type="button" disabled={loading} className={button} onClick={() => void load(null)}>Volver al más reciente</button>
            <button type="button" disabled={loading || !page.pagination.hasMore} className={button} onClick={() => { if (page.pagination.nextCursor) void load(page.pagination.nextCursor); }}>Ver 20 anteriores</button>
          </nav>
        </>}
      </>}
    </div>
  </section>;
}
