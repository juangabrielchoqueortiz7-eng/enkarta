import QRCode from 'qrcode';

export interface AccessPassDetails { accessToken: string; accessCode: string; guestName: string; tableNo?: string; passes: number }
export function passFilename(code: string) { return `pase-${code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'evento'}.png`; }

/** All rendering is local. The token is encoded only in the QR, never sent to
 * an external QR service, included in the filename or painted as readable text. */
export async function accessPassPng(pass: AccessPassDetails): Promise<Blob> {
  if (!pass.accessToken || !pass.accessCode || !pass.guestName.trim() || !Number.isInteger(pass.passes) || pass.passes < 1 || pass.passes > 20) throw new Error('No se pudo preparar un pase válido.');
  const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 1360;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Este navegador no permite crear la imagen.');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 900, 1360);
  ctx.fillStyle = '#f6f3eb'; ctx.fillRect(0, 0, 900, 250);
  ctx.fillStyle = '#34392f'; ctx.textAlign = 'center'; ctx.font = '24px sans-serif'; ctx.fillText('PASE DE ACCESO', 450, 70);
  const lines = (text: string, max: number) => {
    const rows: string[] = []; let line = '';
    for (const char of text.replace(/\s+/g, ' ').trim()) {
      if (line && ctx.measureText(line + char).width > max) { rows.push(line.trim()); line = ''; }
      line += char;
    }
    if (line) rows.push(line.trim()); return rows;
  };
  ctx.font = '42px serif'; const names = lines(pass.guestName, 760);
  names.slice(0, 3).forEach((line, index) => ctx.fillText(index === 2 && names.length > 3 ? `${line.slice(0, -1)}…` : line, 450, 132 + index * 46));
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, pass.accessToken, { width: 520, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } });
  ctx.drawImage(qr, 190, 290, 520, 520);
  ctx.fillStyle = '#34392f'; ctx.font = 'bold 48px monospace'; ctx.fillText(pass.accessCode, 450, 878);
  ctx.font = 'bold 40px sans-serif'; ctx.fillText(`${pass.passes} ${pass.passes === 1 ? 'persona confirmada' : 'personas confirmadas'}`, 450, 965);
  ctx.font = '32px sans-serif';
  const table = lines(pass.tableNo ? `Mesa ${pass.tableNo}` : 'Mesa por asignar', 760);
  table.slice(0, 2).forEach((line, index) => ctx.fillText(line, 450, 1030 + index * 40));
  ctx.fillStyle = '#666b61'; ctx.font = '26px sans-serif';
  ctx.fillText('Presenta este pase en la entrada.', 450, 1160);
  ctx.fillText('Puedes llegar con tu grupo en distintos momentos.', 450, 1205);
  ctx.font = '22px sans-serif'; ctx.fillText('Guárdalo en tu galería · No compartas este acceso', 450, 1290);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo crear la imagen del pase.')), 'image/png'));
}
