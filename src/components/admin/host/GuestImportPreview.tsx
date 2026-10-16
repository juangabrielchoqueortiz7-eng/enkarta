'use client';

import { GUEST_IMPORT_FIELDS, guestImportTemplate, type GuestImportField, type GuestImportResult, type ParsedGuestCsv } from '@/lib/guest-import';
import { csvCell } from '@/lib/host-dashboard';

function downloadCsv(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function GuestImportTemplate() {
  return <button type="button" onClick={() => downloadCsv(guestImportTemplate(), 'plantilla-invitados.csv')} className="min-h-10 text-xs font-medium underline">Descargar plantilla CSV</button>;
}
export default function GuestImportPreview({ parsed, mapping, changeMapping, result, tables }: {
  parsed: ParsedGuestCsv; mapping: Record<number, GuestImportField>; changeMapping: (index: number, field: GuestImportField) => void;
  result: GuestImportResult; tables: boolean;
}) {
  const exportIssues = () => downloadCsv('\uFEFF' + [['Registro de datos', 'Nombre', 'Motivo'], ...result.issues.map(issue => [issue.record, issue.name, issue.reason])].map(row => row.map(csvCell).join(';')).join('\r\n'), 'invitados-por-revisar.csv');
  return <div className="min-w-0 space-y-3 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700">
    <p className="font-medium">Revisa las columnas antes de importar</p>
    {parsed.headers.map((header, index) => <label key={index} className="grid min-w-0 grid-cols-2 items-center gap-2"><span className="break-words">{header}</span><select aria-label={`Asignar columna ${index + 1}: ${header}`} value={mapping[index] ?? 'ignore'} onChange={event => changeMapping(index, event.target.value as GuestImportField)} className="min-h-10 min-w-0 rounded-lg border px-2">{GUEST_IMPORT_FIELDS.filter(field => tables || field.value !== 'tableNo').map(field => <option key={field.value} value={field.value}>{field.label}</option>)}</select></label>)}
    {result.mappingErrors.map(error => <p role="alert" key={error} className="text-rose-800">{error}</p>)}
    <p role="status"><b>{result.rows.length}</b> listos · {result.duplicates} duplicados · {result.invalid} inválidos</p>
    {result.rows.length > 200 && <p role="alert" className="text-amber-900">Máximo 200 por lote. Divide el archivo antes de importar.</p>}
    {!!result.rows.length && <div className="overflow-x-auto"><table className="w-full text-left"><caption className="mb-2 text-left text-gray-500">Vista previa · primeros {Math.min(5, result.rows.length)} registros válidos</caption><thead><tr>{['Nombre', 'Pases', 'Grupo'].map(title => <th key={title} className="p-1">{title}</th>)}</tr></thead><tbody>{result.rows.slice(0, 5).map((guest, index) => <tr key={index}><td className="max-w-40 break-words p-1">{guest.name}</td><td className="p-1">{guest.passes}</td><td className="max-w-32 break-words p-1">{guest.group || '—'}</td></tr>)}</tbody></table></div>}
    {!!result.issues.length && <div className="space-y-2 rounded-lg bg-amber-50 p-2"><p className="font-medium">Registros omitidos</p><p>El número cuenta registros de datos, sin el encabezado; un campo multilínea sigue siendo un registro.</p><ul className="space-y-1">{result.issues.slice(0, 5).map(issue => <li key={issue.record} className="break-words">Registro {issue.record}: {issue.name || 'sin nombre'} · {issue.reason}</li>)}</ul><button type="button" onClick={exportIssues} className="min-h-10 underline">Descargar los {result.issues.length} registros por revisar</button></div>}
    <p className="text-gray-500">Solo se añadirán los registros válidos. No modifica invitados existentes.</p>
  </div>;
}
