export interface ZipEntryInput {
  name: string;
  data: string | Uint8Array | ArrayBuffer | Blob;
}

export interface PdfPage {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  lines: string[];
  footer?: string;
}

const encoder = new TextEncoder();

function uint16(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function uint32(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
}

function joinBytes(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) value = CRC_TABLE[(value ^ bytes[index]) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

async function entryBytes(value: ZipEntryInput['data']) {
  if (typeof value === 'string') return encoder.encode(value);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(await value.arrayBuffer());
}

function cleanEntryName(value: string) {
  return value.replace(/\\/g, '/').replace(/^\/+/, '').split('/').filter(part => part && part !== '.' && part !== '..').join('/').slice(0, 220) || 'archivo';
}

/** ZIP estándar sin compresión: rápido, compatible y sin dependencias externas. */
export async function createStoredZip(entries: ZipEntryInput[]): Promise<Blob> {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const entry of entries) {
    const name = encoder.encode(cleanEntryName(entry.name));
    const bytes = await entryBytes(entry.data);
    const checksum = crc32(bytes);
    const local = joinBytes([
      uint32(0x04034b50), uint16(20), uint16(0x0800), uint16(0), uint16(dosTime), uint16(dosDate),
      uint32(checksum), uint32(bytes.length), uint32(bytes.length), uint16(name.length), uint16(0), name, bytes,
    ]);
    const central = joinBytes([
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0x0800), uint16(0), uint16(dosTime), uint16(dosDate),
      uint32(checksum), uint32(bytes.length), uint32(bytes.length), uint16(name.length), uint16(0), uint16(0),
      uint16(0), uint16(0), uint32(0), uint32(offset), name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDirectory = joinBytes(centrals);
  const end = joinBytes([
    uint32(0x06054b50), uint16(0), uint16(0), uint16(entries.length), uint16(entries.length),
    uint32(centralDirectory.length), uint32(offset), uint16(0),
  ]);
  return new Blob([joinBytes([...locals, centralDirectory, end])], { type: 'application/zip' });
}

function pdfText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '').replace(/([\\()])/g, '\\$1');
}

function wrapPdfLine(value: string, max = 76) {
  const words = pdfText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (`${current} ${word}`.trim().length > max && current) { lines.push(current); current = word; }
    else current = `${current} ${word}`.trim();
  }
  if (current) lines.push(current);
  return lines.length ? lines : [' '];
}

function pdfPageStream(page: PdfPage, index: number, total: number) {
  const commands = [
    'q', '0.965 0.949 0.918 rg', '0 0 595 842 re f', 'Q',
    'q', '0.72 0.57 0.34 RG', '1.2 w', '38 38 519 766 re S', 'Q',
    'BT', '/F1 9 Tf', '0.52 0.42 0.27 rg', `48 782 Td`, `(${pdfText((page.eyebrow || 'ENKARTA').toUpperCase())}) Tj`, 'ET',
  ];
  const titleLines = wrapPdfLine(page.title, 34).slice(0, 2);
  let titleY = 738;
  titleLines.forEach(line => { commands.push('BT', '/F2 28 Tf', '0.13 0.12 0.11 rg', `48 ${titleY} Td`, `(${line}) Tj`, 'ET'); titleY -= 34; });
  let y = titleY - 3;
  if (page.subtitle) {
    for (const line of wrapPdfLine(page.subtitle, 66)) {
      commands.push('BT', '/F1 11 Tf', '0.37 0.34 0.30 rg', `48 ${y} Td`, `(${line}) Tj`, 'ET');
      y -= 16;
    }
    y -= 11;
  }
  commands.push('q', '0.72 0.57 0.34 RG', '.6 w', `48 ${y} m 547 ${y} l S`, 'Q');
  y -= 28;
  for (const raw of page.lines) {
    const wrapped = wrapPdfLine(raw || ' ', 82);
    for (const line of wrapped) {
      if (y < 72) break;
      commands.push('BT', '/F1 10 Tf', '0.20 0.19 0.17 rg', `52 ${y} Td`, `(${line}) Tj`, 'ET');
      y -= 15;
    }
    y -= 4;
  }
  const footer = page.footer || `Enkarta · pagina ${index + 1} de ${total}`;
  commands.push('BT', '/F1 8 Tf', '0.52 0.48 0.43 rg', '48 54 Td', `(${pdfText(footer)}) Tj`, 'ET');
  return commands.join('\n');
}

/** PDF A4 multipágina de texto y formas vectoriales, optimizado para impresión. */
export function createTextPdf(pages: PdfPage[]): Blob {
  const safePages = pages.length ? pages : [{ title: 'Enkarta', lines: ['Sin contenido'] }];
  const objects: string[] = [];
  const catalogId = 1;
  const pagesId = 2;
  const fontRegularId = 3;
  const fontBoldId = 4;
  const pageIds: number[] = [];
  let nextId = 5;
  for (let index = 0; index < safePages.length; index += 1) {
    pageIds.push(nextId);
    nextId += 2;
  }
  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Count ${safePages.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`;
  objects[fontRegularId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[fontBoldId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  safePages.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const stream = pdfPageStream(page, index, safePages.length);
    objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`;
  });

  const chunks: Uint8Array[] = [encoder.encode('%PDF-1.4\n%Enkarta\n')];
  const offsets = [0];
  let length = chunks[0].length;
  for (let id = 1; id < objects.length; id += 1) {
    const chunk = encoder.encode(`${id} 0 obj\n${objects[id]}\nendobj\n`);
    offsets[id] = length;
    chunks.push(chunk);
    length += chunk.length;
  }
  const xrefAt = length;
  const xref = [`xref`, `0 ${objects.length}`, '0000000000 65535 f '];
  for (let id = 1; id < objects.length; id += 1) xref.push(`${String(offsets[id]).padStart(10, '0')} 00000 n `);
  xref.push(`trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>`, `startxref`, String(xrefAt), '%%EOF');
  chunks.push(encoder.encode(`${xref.join('\n')}\n`));
  return new Blob([joinBytes(chunks)], { type: 'application/pdf' });
}
