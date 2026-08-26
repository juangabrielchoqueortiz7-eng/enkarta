import type { Guest, GuestEventAccess } from './types';

export type GuestImportField = 'ignore' | 'name' | 'phone' | 'passes' | 'tableNo' | 'group' | 'allowKids' | 'eventAccess';

export interface ParsedGuestCsv {
  headers: string[];
  rows: string[][];
  delimiter: ',' | ';' | '\t';
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

function parseLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(value.trim()); value = '';
    } else value += char;
  }
  cells.push(value.trim());
  return cells;
}

function delimiterScore(line: string, delimiter: string): number {
  return parseLine(line, delimiter).length;
}

export function parseGuestCsv(text: string): ParsedGuestCsv {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [], delimiter: ',' };
  const delimiters = [',', ';', '\t'] as const;
  const delimiter = delimiters.reduce((best, candidate) => delimiterScore(lines[0], candidate) > delimiterScore(lines[0], best) ? candidate : best, delimiters[0]);
  const matrix = lines.map(line => parseLine(line, delimiter));
  const width = Math.max(...matrix.map(row => row.length));
  const headers = Array.from({ length: width }, (_, index) => matrix[0][index]?.trim() || `Columna ${index + 1}`);
  const rows = matrix.slice(1).map(row => Array.from({ length: width }, (_, index) => row[index] ?? ''));
  return { headers, rows, delimiter };
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
  if (/acceso|evento|ceremonia|recepcion|reception/.test(value)) return 'eventAccess';
  return 'ignore';
}

export function normalizeGuestPhone(raw: string): string {
  const source = raw.trim();
  if (!source) return '';
  let digits = source.replace(/[^\d]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `591${digits}`;
  return digits.length >= 8 ? `+${digits}` : '';
}

function boolValue(value: string): boolean {
  const normalized = plain(value);
  if (['no', 'false', '0', 'sin ninos', 'solo adultos', 'adultos'].includes(normalized)) return false;
  return true;
}

function accessValue(value: string): GuestEventAccess {
  const normalized = plain(value);
  if (normalized.includes('ceremon')) return 'ceremony';
  if (normalized.includes('recep') || normalized.includes('fiesta')) return 'reception';
  return 'both';
}

function duplicateKey(name: string, phone?: string): string {
  return `${plain(name).replace(/\s+/g, ' ')}|${(phone || '').replace(/\D/g, '')}`;
}

export function mapGuestCsvRows(
  parsed: ParsedGuestCsv,
  mapping: Record<number, GuestImportField>,
  existing: Guest[] = [],
): { rows: GuestImportRow[]; duplicates: number; invalid: number } {
  const seen = new Set(existing.map(guest => duplicateKey(guest.name, guest.phone)));
  const rows: GuestImportRow[] = [];
  let duplicates = 0;
  let invalid = 0;

  parsed.rows.forEach(source => {
    const read = (field: GuestImportField) => {
      const index = Object.entries(mapping).find(([, mapped]) => mapped === field)?.[0];
      return index === undefined ? '' : source[Number(index)]?.trim() || '';
    };
    const name = read('name').slice(0, 80);
    const phone = normalizeGuestPhone(read('phone')) || undefined;
    if (!name) { invalid += 1; return; }
    const key = duplicateKey(name, phone);
    if (seen.has(key)) { duplicates += 1; return; }
    seen.add(key);
    rows.push({
      name,
      phone,
      passes: Math.max(1, Math.min(20, Number.parseInt(read('passes'), 10) || 1)),
      tableNo: read('tableNo').slice(0, 20) || undefined,
      group: read('group').slice(0, 40) || undefined,
      allowKids: boolValue(read('allowKids')),
      eventAccess: accessValue(read('eventAccess')),
    });
  });
  return { rows, duplicates, invalid };
}
