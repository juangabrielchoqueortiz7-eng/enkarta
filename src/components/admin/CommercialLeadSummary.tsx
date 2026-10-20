'use client';

import { leadStatusLabel } from '@/lib/commercial';
import type { CommercialLead } from '@/lib/commercial-lookup';
import CommercialLeadHistory from '@/components/admin/CommercialLeadHistory';

/** Read-only snapshot: the existing roster remains the single editing surface. */
export default function CommercialLeadSummary({ lead, transport, onOpen, onQuote }: { lead: CommercialLead; transport?: typeof fetch; onOpen?: () => void; onQuote?: () => void }) {
  return <article className="space-y-3 break-words p-4 font-outfit text-sm text-gray-700 sm:p-5">
    <h4 className="font-mono font-semibold text-[#765f39]" translate="no">{lead.reference}</h4>
    <dl className="grid min-w-0 gap-4 sm:grid-cols-3">
      <div><dt className="text-gray-600">Estado consultado</dt><dd className="mt-1 font-medium text-gray-900">{leadStatusLabel(lead.status)}</dd></div>
      <div><dt className="text-gray-600">Diseño y paquete</dt><dd className="mt-1 text-gray-900">{lead.design || 'Sin diseño'} · {lead.package_key === 'general' ? 'Sin paquete' : lead.package_key}</dd></div>
      <div><dt className="text-gray-600">Creado</dt><dd className="mt-1 text-gray-900">{new Date(lead.created_at).toLocaleString('es-BO')}</dd></div>
    </dl>
    {lead.notes && <p className="whitespace-pre-wrap">{lead.notes}</p>}
    <p className="text-gray-600">Consulta de solo lectura. Usa «Buscar referencia» para volver a comprobar el estado.</p>
    {onOpen && <div className="space-y-2"><button type="button" onClick={onOpen} className="min-h-11 rounded-xl bg-[#765f39] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5d4a2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39]">Abrir seguimiento</button><p className="text-gray-600">Abre su ficha para actualizar el estado, las notas o el importe, aunque sea anterior a los últimos 180 días.</p></div>}
    {onQuote && <div className="space-y-2"><button type="button" onClick={onQuote} className="min-h-11 rounded-xl border border-[#765f39] bg-white px-5 py-2 text-sm font-semibold text-[#5d4a2c] hover:bg-[#faf7f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39]">Preparar cotización</button><p className="text-gray-600">Lleva la referencia, el evento, el diseño y el paquete al cotizador. Podrás revisar antes de reemplazar el borrador.</p></div>}
    <CommercialLeadHistory lead={lead} transport={transport} />
  </article>;
}
