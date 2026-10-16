'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { HistoryRequestError, historyOperatorLabel, readCheckinHistory, type CheckinHistory as HistoryPage } from '@/lib/checkin-history';

const button = 'min-h-11 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#516749] disabled:opacity-50';
const formatter = new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'medium' });
const time = (at: string) => formatter.format(new Date(at));

/** Mounted with an event/guest/session key. Nothing persists to browser storage. */
export default function CheckinHistory({ invitationId, guestId, sessionKey, scope, revisionKey, transport = fetch }: {
  invitationId: string; guestId: string; sessionKey: string; scope: 'host' | 'door'; revisionKey: string; transport?: typeof fetch;
}) {
  const id = useId();
  const [open, setOpen] = useState(false), [page, setPage] = useState<HistoryPage | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [readRevision, setReadRevision] = useState('');
  const [older, setOlder] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0), currentRevision = useRef(revisionKey);
  currentRevision.current = revisionKey;
  useEffect(() => () => { sequence.current++; controller.current?.abort(); }, []);
  const load = async (cursor: string | null) => {
    controller.current?.abort();
    const request = new AbortController(), attempt = ++sequence.current, revision = currentRevision.current;
    controller.current = request;
    const timeout = setTimeout(() => request.abort(), 12000);
    setLoading(true); setError('');
    try {
      const result = await readCheckinHistory({ invitationId, guestId, sessionKey, scope }, cursor, request.signal, transport);
      if (attempt !== sequence.current) return;
      setPage(result); setReadRevision(revision); setOlder(!!cursor);
    } catch (failure) {
      if (attempt !== sequence.current) return;
      if (failure instanceof HistoryRequestError && failure.forbidden) setPage(null);
      setError(failure instanceof HistoryRequestError ? failure.message : 'No pudimos verificar el historial. Comprueba tu conexión y vuelve a consultar.');
    } finally { clearTimeout(timeout); if (attempt === sequence.current) setLoading(false); }
  };
  const toggle = () => {
    if (open) { sequence.current++; controller.current?.abort(); setLoading(false); }
    else void load(null);
    setOpen(!open);
  };
  return <section className="border-t border-gray-200 px-5 py-3 font-outfit text-gray-700 selection:bg-[#516749] selection:text-white">
    <h3><button type="button" aria-expanded={open} aria-controls={id} onClick={toggle} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left text-sm font-medium hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#516749]">
      Historial de ingresos y salidas<svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={`h-5 w-5 shrink-0 ${open ? 'rotate-180' : ''}`}><path d="m5 7.5 5 5 5-5" /></svg>
    </button></h3>
    <div id={id} hidden={!open} aria-busy={loading} className="space-y-3 pb-2 text-sm">
      <p className="text-xs leading-relaxed text-gray-600">Movimientos de este grupo, del más reciente al más antiguo. Cada ingreso y salida cuenta como un movimiento; los pases dentro se muestran arriba. Los nombres corresponden a los pases actuales.</p>
      <p role="status" aria-atomic="true" className="text-xs text-gray-600">{loading && 'Consultando movimientos… '}{page && `${older ? 'Movimientos anteriores' : 'Movimientos más recientes'} · Última consulta: ${time(page.readAt)} · Hora de este dispositivo.`}</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}{page && ' Se conserva la última consulta; puede estar desactualizada.'}</p>}
      {page && readRevision !== revisionKey && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">El estado del grupo cambió. Consulta los movimientos más recientes.</p>}
      {page && <>
        {page.movements.length === 0 ? <p className="py-3 text-sm">Todavía no hay ingresos ni salidas registrados para este grupo.</p> : <ol aria-label="Movimientos de este grupo" className="divide-y divide-gray-100">
          {page.movements.map(item => <li key={item.id} className="py-3">
            <p className="break-words font-medium"><span className={item.action === 'in' ? 'text-[#3d6b4f]' : 'text-red-700'}>{item.action === 'in' ? 'Ingreso' : 'Salida'}</span> · {item.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600"><time dateTime={item.at}>{time(item.at)}</time> · {historyOperatorLabel(item.operatorRole)}</p>
          </li>)}
        </ol>}
        {!page.nextCursor && page.movements.length > 0 && <p className="text-xs text-gray-600">No hay movimientos anteriores en este grupo.</p>}
      </>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={loading} onClick={() => void load(null)} className={button}>{error ? 'Volver a consultar los más recientes' : 'Consultar movimientos recientes'}</button>
        {!!page?.movements.length && <button type="button" disabled={loading || !page.nextCursor} onClick={() => void load(page.nextCursor)} className={button}>Ver movimientos anteriores</button>}
      </div>
    </div>
  </section>;
}
