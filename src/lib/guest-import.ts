import type { Guest, GuestEventAccess } from './types';

export type GuestImportField = 'ignore' | 'name' | 'phone' | 'passes' | 'tableNo' | 'group' | 'allowKids' | 'eventAccess';

export interface ParsedGuestCsv {
  headers: string[];
  rows: string[][];
  delimiter: ',' | ';' | '\t';
  invalidRows?: number[];
}

export interface GuestImportRow {
  name: string;
  phone?: string;
  passes: number;
  tableNo?: string;
  group?: string;
  allowKids: boolean;
  eventAccess: GuestEventAccess;
}

export interface GuestImportIssue { record: number; name: string; kind: 'invalid' | 'duplicate'; reason: string }
export interface GuestImportResult {
  rows: GuestImportRow[]; duplicates: number; invalid: number;
  issues: GuestImportIssue[]; mappingErrors: string[];
}
export const GUEST_IMPORT_FIELDS: { value: GuestImportField; label: string }[] = [
  { value: 'ignore', label: 'Ignorar columna' }, { value: 'name', label: 'Nombre' },
  { value: 'phone', label: 'Teléfono' }, { value: 'passes', label: 'Pases' },
  { value: 'tableNo', label: 'Mesa' }, { value: 'group', label: 'Grupo' },
  { value: 'allowKids', label: 'Permite niños' }, { value: 'eventAccess', label: 'Preferencia informativa' },
];
export const guestImportTemplate = () => '\uFEFFNombre;Teléfono;Pases;Mesa;Grupo;Niños;Preferencia\r\nFamilia de ejemplo;;4;7;Familia;Sí;Todo el evento\r\n';

export function parseQuickGuestList(text: string): GuestImportRow[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 200) throw new Error('Importa hasta 200 invitados por lote. Divide la lista para continuar.');
  return lines.map((line, index) => {
    const match = line.match(/^(.*?),\s*([^,]+)$/);
    const name = (match ? match[1] : line).trim();
    const passes = match ? Number(match[2]) : 1;
    if (!name || name.length > 80 || !Number.isInteger(passes) || passes < 1 || passes > 20) throw new Error(`Revisa la línea ${index + 1}: nombre de hasta 80 caracteres y pases enteros entre 1 y 20.`);
    return { name, passes, allowKids: true, eventAccess: 'both' };
  });
}

export function parseGuestCsv(text: string): ParsedGuestCsv {
  if (text.length > 1024 * 1024) throw new Error('El CSV supera 1 MB. Divide la lista antes de importarla.');
  const source = text.replace(/^\uFEFF/, '').replace(/^[\r\n]+|[\r\n]+$/g, '');
  if (!source.trim()) return { headers: [], rows: [], delimiter: ',' };
  const delimiters = [',', ';', '\t'] as const;
  const scores = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') { if (quoted && source[i + 1] === '"') i++; else quoted = !quoted; }
    else if (!quoted && /[\r\n]/.test(char)) break;
    else if (!quoted && delimiters.includes(char as typeof delimiters[number])) scores[char as keyof typeof scores]++;
  }
  const delimiter = delimiters.reduce((best, candidate) => scores[candidate] > scores[best] ? candidate : best, delimiters[0]);
  const matrix: string[][] = [];
  let row: string[] = [], value = '', closed = false;
  quoted = false;
  const endCell = () => { row.push(value.trim()); value = ''; closed = false; };
  const endRow = () => { endCell(); if (row.some(cell => cell !== '')) matrix.push(row); row = []; };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else value += char;
    } else if (char === delimiter) endCell();
    else if (char === '\r' || char === '\n') { if (char === '\r' && source[i + 1] === '\n') i++; endRow(); }
    else if (char === '"' && !value.trim() && !closed) { value = ''; quoted = true; }
    else if (closed && char.trim()) throw new Error('El CSV contiene texto fuera de un campo entre comillas. Revisa su formato.');
    else value += char;
  }
  if (quoted) throw new Error('El CSV tiene un campo con comillas sin cerrar. Corrígelo antes de importar.');
  endRow();
  if (!matrix.length) return { headers: [], rows: [], delimiter };
  if (matrix.length > 5001 || matrix[0]?.length > 40) throw new Error('Usa un CSV de hasta 5.000 filas y 40 columnas.');
  const headers = matrix[0].map((cell, i) => cell || `Columna ${i + 1}`);
  const rows = matrix.slice(1);
  return { headers, rows, delimiter, invalidRows: rows.flatMap((cells, index) => cells.length === headers.length ? [] : [index]) };
}

function plain(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export function guessGuestColumn(header: string): GuestImportField {
  const value = plain(header);
  if (/nombre|invitado|name/.test(value)) return 'name';
  if (/telefono|celular|movil|whatsapp|phone/.test(value)) return 'phone';
  if (/pases|cupos|personas|passes|tickets/.test(value)) return 'passes';
  if (/mesa|table/.test(value)) return 'tableNo';
  if (/grupo|familia|segmento|categoria|group/.test(value)) return 'group';
  if (/ninos|niños|kids|children/.test(header.toLowerCase())) return 'allowKids';
  if (/acceso|evento|ceremonia|recepcion|reception|preferencia/.test(value)) return 'eventAccess';
  return 'ignore';
}

export function normalizeGuestPhone(raw: string): string {
  const source = raw.trim().replace(/^'(?=\+\d)/, ''); // exported spreadsheet-safe phone
  if (!source) return '';
  if (!/^[+\d\s().-]+$/.test(source)) return '';
  let digits = source.replace(/[^\d]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `591${digits}`;
  return digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0') ? `+${digits}` : '';
}

function boolValue(value: string): boolean | undefined {
  const normalized = plain(value);
  if (['no', 'false', '0', 'sin ninos', 'solo adultos', 'adultos'].includes(normalized)) return false;
  if (['', 'si', 'true', '1', 'permitidos'].includes(normalized)) return true;
  return undefined;
}

function accessValue(value: string): GuestEventAccess | undefined {
  const normalized = plain(value);
  if (['ceremony','ceremonia','solo ceremonia'].includes(normalized)) return 'ceremony';
  if (['reception','recepcion','solo recepcion','fiesta'].includes(normalized)) return 'reception';
  if (['','both','todo','todo el evento','ambos'].includes(normalized)) return 'both';
  return undefined;
}

function duplicateKey(name: string, phone?: string): string {
  return `${plain(name).replace(/\s+/g, ' ')}|${(phone || '').replace(/\D/g, '')}`;
}

export function mapGuestCsvRows(
  parsed: ParsedGuestCsv,
  mapping: Record<number, GuestImportField>,
  existing: Guest[] = [],
): GuestImportResult {
  const fields = Object.entries(mapping).filter(([index, field]) => Number(index) < parsed.headers.length && field !== 'ignore').map(([,field]) => field);
  const mappingErrors: string[] = [];
  if (!fields.includes('name')) mappingErrors.push('Asigna una columna a Nombre.');
  if (new Set(fields).size !== fields.length) mappingErrors.push('Asigna cada campo una sola vez; ignora las columnas repetidas.');
  if (mappingErrors.length) return { rows: [], duplicates: 0, invalid: 0, issues: [], mappingErrors };
  const seen = new Set(existing.map(guest => duplicateKey(guest.name, normalizeGuestPhone(guest.phone || ''))));
  const rows: GuestImportRow[] = [];
  const issues: GuestImportIssue[] = [];
  let duplicates = 0;
  let invalid = 0;

  parsed.rows.forEach((source, rowIndex) => {
    const read = (field: GuestImportField) => {
      const index = Object.entries(mapping).find(([, mapped]) => mapped === field)?.[0];
      return index === undefined ? '' : source[Number(index)]?.trim() || '';
    };
    const name = read('name').replace(/\s+/g, ' ');
    const phone = normalizeGuestPhone(read('phone')) || undefined;
    const passesText = read('passes');
    const passes = passesText ? Number(passesText) : 1;
    const allowKids = boolValue(read('allowKids')), eventAccess = accessValue(read('eventAccess'));
    const reason = parsed.invalidRows?.includes(rowIndex) ? 'La cantidad de columnas no coincide con el encabezado.'
      : !name || name.length > 80 ? 'Nombre requerido, de hasta 80 caracteres.'
      : read('phone') && !phone ? 'Teléfono inválido; usa código de país o 8 dígitos de Bolivia.'
      : !Number.isInteger(passes) || passes < 1 || passes > 20 ? 'Pases: entero entre 1 y 20.'
      : read('tableNo').length > 20 ? 'Mesa: máximo 20 caracteres.'
      : read('group').length > 40 ? 'Grupo: máximo 40 caracteres.'
      : allowKids === undefined ? 'Niños: escribe Sí o No.'
      : eventAccess === undefined ? 'Preferencia: Todo el evento, Ceremonia o Recepción.' : '';
    if (reason) { invalid += 1; issues.push({ record: rowIndex + 1, name, kind: 'invalid', reason }); return; }
    const key = duplicateKey(name, phone);
    if (seen.has(key)) { duplicates += 1; issues.push({ record: rowIndex + 1, name, kind: 'duplicate', reason: 'Mismo nombre y teléfono que otro registro de la lista o del padrón.' }); return; }
    seen.add(key);
    rows.push({
      name,
      phone,
      passes,
      tableNo: read('tableNo').slice(0, 20) || undefined,
      group: read('group').slice(0, 40) || undefined,
      allowKids: allowKids!,
      eventAccess: eventAccess!,
    });
  });
  return { rows, duplicates, invalid, issues, mappingErrors };
}
