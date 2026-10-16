'use client';

// Tarjeta de confirmación con código QR + ID de acceso. Se muestra dentro de
// SmartRsvp tras confirmar. El QR codifica el access_token del invitado; el
// personal de puerta lo escanea para cargar al grupo y hacer el check-in.

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { BlockTheme } from '@/components/invitations/blocks/theme';
import { accessPassPng, passFilename } from '@/lib/access-pass';

interface Props {
  t: BlockTheme;
  accessToken: string;
  accessCode: string;
  guestName: string;
  tableNo?: string;
  passes: number;
}

export default function QrCard({ t, accessToken, accessCode, guestName, tableNo, passes }: Props) {
  const [qr, setQr] = useState<string>('');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setQr(''); setError('');
    QRCode.toDataURL(accessToken, { margin: 1, width: 320, color: { dark: '#1a1a1a', light: '#ffffff' } })
      .then(value => { if (active) setQr(value); })
      .catch(() => { if (active) setError('No se pudo generar el QR. Usa el ID de acceso o actualiza la página.'); });
    return () => { active = false; };
  }, [accessToken]);

  const download = async () => {
    if (downloading) return;
    setDownloading(true); setError('');
    try {
      const blob = await accessPassPng({ accessToken, accessCode, guestName, tableNo, passes });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = passFilename(accessCode); link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo descargar el pase. Puedes guardar una captura.'); }
    finally { setDownloading(false); }
  };

  return (
    <div className="mx-auto mt-6 rounded-2xl overflow-hidden" style={{ maxWidth: 320, background: '#fff', border: `1px solid ${t.line}`, boxShadow: '0 18px 44px rgba(0,0,0,0.12)' }}>
      <div className="px-5 py-4 text-center" style={{ background: t.primary, color: t.onPrimary }}>
        <p className="font-cinzel uppercase tracking-[0.18em] text-[11px] opacity-90">Pase de acceso</p>
        <p className="font-great text-3xl leading-tight">{guestName}</p>
      </div>

      <div className="p-5 text-center">
        {qr ? (
          // Data-URL generado en el cliente: next/image no puede optimizarlo.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Código QR de acceso" className="mx-auto w-44 h-44" />
        ) : (
          <div role="status" className="mx-auto w-44 h-44 flex items-center justify-center text-xs text-gray-400 font-outfit">{error ? 'Usa el ID de acceso' : 'Generando…'}</div>
        )}

        <div className="mt-4 inline-block rounded-lg px-4 py-1.5" style={{ background: t.bg, border: `1px dashed ${t.line}` }}>
          <p className="font-outfit text-[10px] uppercase tracking-[0.16em]" style={{ color: t.muted }}>ID de acceso</p>
          <p className="font-playfair font-bold text-lg tracking-[0.12em]" style={{ color: t.text }}>{accessCode}</p>
        </div>

        <div className="mt-4 flex justify-center gap-6 text-center">
          <div>
            <p className="font-playfair font-bold text-xl" style={{ color: t.primary }}>{passes}</p>
            <p className="font-outfit text-[10px] uppercase tracking-wide" style={{ color: t.muted }}>{passes === 1 ? 'Pase' : 'Pases'}</p>
          </div>
          {tableNo && (
            <div>
              <p className="font-playfair font-bold text-xl" style={{ color: t.primary }}>{tableNo}</p>
              <p className="font-outfit text-[10px] uppercase tracking-wide" style={{ color: t.muted }}>Mesa</p>
            </div>
          )}
        </div>

        <p className="font-cormorant italic mt-4 text-sm" style={{ color: t.muted }}>
          Presenta este código en la entrada del evento.
        </p>
        <button type="button" disabled={downloading || !qr} onClick={() => void download()} className="mt-4 min-h-11 w-full rounded-xl border px-3 py-2 text-sm font-outfit disabled:opacity-50" style={{ borderColor: t.line, color: t.text }}>{downloading ? 'Preparando imagen…' : 'Descargar pase PNG'}</button>
        <p className="mt-2 text-xs" style={{ color: t.muted }}>Guárdalo en tu galería para mostrarlo sin conexión.</p>
        {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
