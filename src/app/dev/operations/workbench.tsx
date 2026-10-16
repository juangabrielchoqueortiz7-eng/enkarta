'use client';

import { useState } from 'react';
import QrCard from '@/components/invitations/QrCard';
import ScannerWorkbench from './scanner-workbench';
import { DEFAULT_BLOCK_THEME } from '@/components/invitations/blocks/theme';
import { accessPassPng, passFilename } from '@/lib/access-pass';

// Development only. No guests are created, modified or sent to WhatsApp.
const pass = { accessToken: 'QA-ONLY-NOT-A-REAL-ACCESS-TOKEN-2026', accessCode: 'ENK-QA2026', guestName: 'Familia de prueba Pérez', tableNo: '7', passes: 4 };
export default function OperationsWorkbench() {
  const [result, setResult] = useState('');
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    setBusy(true); setResult('Generando PNG y leyendo su QR…');
    let reader: import('html5-qrcode').Html5Qrcode | undefined;
    try {
      const blob = await accessPassPng(pass);
      const { Html5Qrcode } = await import('html5-qrcode');
      reader = new Html5Qrcode('qa-pass-reader');
      const decoded = await reader.scanFile(new File([blob], passFilename(pass.accessCode), { type: 'image/png' }), false);
      if (decoded !== pass.accessToken) throw new Error('El QR no coincide con el pase.');
      if (image) URL.revokeObjectURL(image);
      setImage(URL.createObjectURL(blob));
      setResult(`Correcto: PNG local de ${blob.size} bytes; QR decodificado y token coincidente.`);
    } catch (error) { setResult(`Error: ${error instanceof Error ? error.message : String(error)}`); }
    finally { reader?.clear(); setBusy(false); }
  };
  return <main className="mx-auto max-w-5xl space-y-6 bg-[#faf7f2] p-4 pb-16 text-gray-900">
    <h1 className="text-2xl">Prueba de pase y recepción</h1>
    <p>Datos ficticios. El QR de esta página no permite acceder a un evento.</p>
    <div className="grid gap-6 md:grid-cols-2"><section>
      <QrCard {...pass} t={DEFAULT_BLOCK_THEME} />
      <button type="button" disabled={busy} onClick={() => void verify()} className="mt-4 min-h-11 w-full rounded-xl bg-gray-800 px-3 text-sm text-white">Verificar PNG con lector QR independiente</button>
      <p role="status" className="my-3 break-words text-sm">{result}</p>
      <div id="qa-pass-reader" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {image && <img src={image} alt="PNG del pase generado y verificado" className="mx-auto w-full max-w-sm" />}
    </section><ScannerWorkbench /></div>
  </main>;
}
