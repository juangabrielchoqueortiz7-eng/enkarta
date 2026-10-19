import { leadStatusLabel } from '@/lib/commercial';
import type { CommercialLead } from '@/lib/commercial-lookup';

/** Read-only snapshot: the existing roster remains the single editing surface. */
export default function CommercialLeadSummary({ lead }: { lead: CommercialLead }) {
  return <article className="space-y-3 break-words p-4 font-outfit text-sm text-gray-700 sm:p-5">
    <h4 className="font-mono font-semibold text-[#765f39]" translate="no">{lead.reference}</h4>
    <dl className="grid min-w-0 gap-4 sm:grid-cols-3">
      <div><dt className="text-gray-600">Estado consultado</dt><dd className="mt-1 font-medium text-gray-900">{leadStatusLabel(lead.status)}</dd></div>
      <div><dt className="text-gray-600">Diseño y paquete</dt><dd className="mt-1 text-gray-900">{lead.design || 'Sin diseño'} · {lead.package_key === 'general' ? 'Sin paquete' : lead.package_key}</dd></div>
      <div><dt className="text-gray-600">Creado</dt><dd className="mt-1 text-gray-900">{new Date(lead.created_at).toLocaleString('es-BO')}</dd></div>
    </dl>
    {lead.notes && <p className="whitespace-pre-wrap">{lead.notes}</p>}
    <p className="text-gray-600">Consulta de solo lectura. Usa «Buscar referencia» para volver a comprobar el estado.</p>
  </article>;
}
