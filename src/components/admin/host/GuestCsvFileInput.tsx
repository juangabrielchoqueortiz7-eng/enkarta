'use client';
import { useId } from 'react';
import type { GuestCsvSource } from '@/lib/guest-csv-file';

export default function GuestCsvFileInput({ reading, source, error, read, cancel, keepPrevious }: {
  reading: string; source: GuestCsvSource | null; error: string; read: (file: File) => void; cancel: () => void; keepPrevious?: () => void;
}) {
  const id = useId();
  return <div className="min-w-0 space-y-2 text-sm text-gray-700">
    <label htmlFor={id} className="block font-medium">O elegir una lista desde Excel</label>
    <input id={id} name="guest-csv-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" aria-describedby={`${id}-help ${id}-status${error ? ` ${id}-error` : ''}`} aria-invalid={!!error}
      onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) read(file); }} className="block min-h-11 w-full min-w-0 rounded-xl border border-gray-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-800 hover:file:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#516749]" />
    <p id={`${id}-help`} className="text-xs leading-relaxed text-gray-600">CSV, TSV o TXT · máximo 1 MB y 200 invitados por lote. En Excel: «CSV UTF-8» o «Texto Unicode». La lectura y la vista previa se hacen en este dispositivo; no añaden invitados.</p>
    <p id={`${id}-status`} role="status" aria-atomic="true" className="break-words text-xs text-gray-600">{reading ? `Leyendo ${reading}… La edición anterior se conserva hasta validar el archivo.` : source ? `Archivo de la vista previa: ${source.name} · ${source.encoding}. Revisa las columnas antes de añadir.` : 'Todavía no se ha cargado un archivo para revisar.'}</p>
    {reading && <button type="button" onClick={cancel} className="min-h-11 rounded-lg px-2 text-sm underline underline-offset-4 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#516749]">Cancelar lectura</button>}
    {error && <p id={`${id}-error`} role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error} Se conservó tu edición anterior.</p>}
    {error && keepPrevious && <button type="button" onClick={keepPrevious} className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#516749]">Continuar con la edición anterior</button>}
  </div>;
}
