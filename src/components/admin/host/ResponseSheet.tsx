'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { responseCsv, RESPONSE_LABELS, type ResponseRow } from '@/lib/response-sheet';
import SessionExit from './SessionExit';

export default function ResponseSheet({ name, rows, embedded = false, onRefresh, refreshing: externalRefreshing = false }: { name: string; rows: ResponseRow[]; embedded?: boolean; onRefresh?: () => void; refreshing?: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, startTransition] = useTransition();
  const visible = useMemo(() => rows.filter(r => (filter === 'all' || r.status === filter) && r.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [rows, search, filter]);
  const exportRows = () => {
    const url = URL.createObjectURL(new Blob([responseCsv(visible)], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'confirmaciones.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className={embedded ? 'font-outfit' : 'min-h-screen bg-[#f5f3ee] px-4 py-6 font-outfit'}><div className="mx-auto max-w-6xl space-y-5">
    {!embedded && <header className="flex items-center justify-between gap-4"><div><p className="font-great text-3xl text-enkarta-gold">Enkarta</p><p className="text-xs text-gray-500">Acceso de consulta</p></div><SessionExit /></header>}
    <section className="rounded-2xl border border-[#e5dfd3] bg-white p-5 sm:p-7"><h2 className="font-playfair text-2xl text-gray-800">Confirmaciones de {name}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">Consulta las respuestas y descarga tu planilla. Esta sección es de solo lectura: no modifica invitados, pases ni ingresos.{onRefresh ? ' Las respuestas se actualizan automáticamente.' : ' Usa Actualizar para consultar nuevas respuestas.'}</p>
      <div className="mt-5 grid grid-cols-3 gap-3">{[[rows.length, 'Registros'], [rows.filter(r => r.status === 'confirmed').length, 'Confirmaciones'], [rows.reduce((n, r) => n + r.confirmed, 0), 'Pases confirmados']].map(([n, label]) => <div key={label} className="rounded-xl bg-[#f8f6f1] p-3 text-center"><strong className="font-playfair text-2xl text-[#7b6746]">{n}</strong><span className="mt-1 block text-[11px] text-gray-500">{label}</span></div>)}</div>
    </section>
    <section className="overflow-hidden rounded-2xl border border-[#e5dfd3] bg-white">
      <div className="flex flex-wrap gap-2 p-4"><input aria-label="Buscar en confirmaciones" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre…" className="w-full min-w-0 rounded-xl border px-3 py-2 text-sm sm:w-auto sm:flex-1" /><select aria-label="Filtrar respuestas" value={filter} onChange={e => setFilter(e.target.value)} className="rounded-xl border px-2 py-2 text-sm"><option value="all">Todas</option>{Object.entries(RESPONSE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button type="button" disabled={refreshing || externalRefreshing} onClick={() => onRefresh ? onRefresh() : startTransition(() => router.refresh())} className="rounded-xl border px-3 py-2 text-sm text-gray-600">{refreshing || externalRefreshing ? 'Actualizando…' : 'Actualizar'}</button><button type="button" disabled={!visible.length} onClick={exportRows} className="rounded-xl bg-[#75603d] px-3 py-2 text-sm text-white disabled:opacity-40">Exportar CSV</button></div>
      <ul className="divide-y divide-gray-100 px-4 sm:hidden">{visible.map(r => <li key={r.id} className="py-4"><div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words text-sm font-medium text-gray-800">{r.name}</p><span className="shrink-0 rounded-full bg-[#f5f3ee] px-2 py-1 text-[11px] text-[#75603d]">{RESPONSE_LABELS[r.status]}</span></div><p className="mt-2 text-xs text-gray-500">{r.source === 'personal' ? 'Link personal' : 'Formulario abierto'} · {r.confirmed} pases confirmados{r.assigned !== null ? ` de ${r.assigned}` : ''}</p>{r.message && <p className="mt-2 break-words rounded-xl bg-[#faf9f6] p-3 text-xs leading-relaxed text-gray-600">{r.message}</p>}</li>)}</ul>
      {!visible.length && <p className="p-8 text-center text-sm text-gray-500 sm:hidden">{rows.length ? 'Sin resultados para este filtro.' : 'Todavía no hay respuestas ni invitados registrados.'}</p>}
      <div className="hidden overflow-x-auto sm:block"><table className="w-full text-left text-sm"><caption className="sr-only">Planilla de confirmaciones, solo lectura</caption><thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Nombre', 'Origen', 'Respuesta', 'Pases', 'Mensaje'].map(label => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{visible.map(r => <tr key={r.id}><td className="min-w-[150px] px-4 py-4 text-gray-800">{r.name}</td><td className="px-4 py-4 text-xs text-gray-500">{r.source === 'personal' ? 'Link personal' : 'Formulario abierto'}</td><td className="whitespace-nowrap px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${r.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800' : r.status === 'declined' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{RESPONSE_LABELS[r.status]}</span></td><td className="px-4 py-4 text-gray-600">{r.confirmed}{r.assigned !== null ? ` / ${r.assigned}` : ''}</td><td className="min-w-[170px] max-w-sm break-words px-4 py-4 text-gray-500">{r.message || '—'}</td></tr>)}</tbody></table>{!visible.length && <p className="p-8 text-center text-sm text-gray-500">{rows.length ? 'Sin resultados para este filtro.' : 'Todavía no hay respuestas ni invitados registrados.'}</p>}</div>
      <p className="border-t px-4 py-3 text-xs text-gray-500">{visible.length} de {rows.length} registros. La exportación respeta los filtros. Los formularios abiertos y los links personales se identifican por separado.</p>
    </section>
    {!embedded && <p className="text-center text-xs text-gray-500">Para revisar el diseño, entra con el acceso separado de <a href="/revision" className="underline">revisión privada</a>.</p>}
  </div></div>;
}
