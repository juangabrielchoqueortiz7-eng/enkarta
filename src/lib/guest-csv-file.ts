import { parseGuestCsv, type ParsedGuestCsv } from './guest-import';

export const MAX_GUEST_CSV_BYTES = 1024 * 1024;
export interface GuestCsvFile { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }
export interface GuestCsvSource { name: string; encoding: 'UTF-8' | 'UTF-16 LE' | 'UTF-16 BE' }
export interface GuestCsvRead { parsed: ParsedGuestCsv; source: GuestCsvSource }

/** Decode locally and strictly: never replace unreadable names with replacement characters. */
export async function readGuestCsvFile(file: GuestCsvFile): Promise<GuestCsvRead> {
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) throw new Error('Elige un CSV, TSV o TXT exportado desde Excel. Los archivos XLS/XLSX deben guardarse como CSV UTF-8 o Texto Unicode.');
  if (!Number.isInteger(file.size) || file.size <= 0) throw new Error('El archivo está vacío. Exporta una lista con encabezados y al menos un invitado.');
  if (file.size > MAX_GUEST_CSV_BYTES) throw new Error('El archivo supera 1 MB. Divide la lista antes de importarla.');
  let buffer: ArrayBuffer;
  try { buffer = await file.arrayBuffer(); } catch { throw new Error('No pudimos leer el archivo. Vuelve a seleccionarlo o exporta una copia nueva.'); }
  if (buffer.byteLength !== file.size || buffer.byteLength > MAX_GUEST_CSV_BYTES) throw new Error('La lectura del archivo está incompleta. Vuelve a seleccionarlo.');
  const bytes = new Uint8Array(buffer);
  if ((bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf)) throw new Error('Este archivo es un libro de Excel, aunque su nombre indique CSV. Expórtalo como CSV UTF-8 o Texto Unicode.');
  const encoding: GuestCsvSource['encoding'] = bytes[0] === 0xff && bytes[1] === 0xfe ? 'UTF-16 LE' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'UTF-16 BE' : 'UTF-8';
  let text: string;
  try { text = new TextDecoder(encoding.toLowerCase().replace(' ', ''), { fatal: true }).decode(buffer); }
  catch { throw new Error('No pudimos reconocer los caracteres del archivo. En Excel, guárdalo como CSV UTF-8 o Texto Unicode y vuelve a elegirlo.'); }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ufffd]/.test(text)) throw new Error('El archivo contiene caracteres no válidos. Expórtalo de nuevo como CSV UTF-8 o Texto Unicode.');
  const parsed = parseGuestCsv(text);
  if (!parsed.headers.length || !parsed.rows.length) throw new Error('La lista no tiene invitados. Incluye encabezados y al menos un registro de datos.');
  return { parsed, source: { name: file.name, encoding } };
}

/** A slow or rejected previous selection must never overwrite the latest draft. */
export function createGuestCsvReader(scope: string, read: (file: GuestCsvFile) => Promise<GuestCsvRead> = readGuestCsvFile) {
  let generation = 0, pending = false;
  return {
    scope,
    get pending() { return pending; },
    cancel() { generation++; pending = false; },
    async read(file: GuestCsvFile): Promise<{ status: 'ready'; value: GuestCsvRead } | { status: 'error'; error: string } | { status: 'superseded' }> {
      const current = ++generation; pending = true;
      try {
        const value = await read(file);
        if (generation !== current) return { status: 'superseded' };
        return { status: 'ready', value };
      } catch (failure) {
        if (generation !== current) return { status: 'superseded' };
        return { status: 'error', error: failure instanceof Error ? failure.message : 'No pudimos leer el archivo. Vuelve a seleccionarlo.' };
      } finally { if (generation === current) pending = false; }
    },
  };
}
