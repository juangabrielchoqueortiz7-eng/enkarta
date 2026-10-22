'use client';

// Tarjeta de confirmación con código QR + ID de acceso. Se muestra dentro de
// SmartRsvp tras confirmar. El QR codifica el access_token del invitado; el
// personal de puerta lo escanea para cargar al grupo y hacer el check-in.

import { useEffect, useRef, useState } from 'react';
import { boundedInvitationTask } from '@/lib/invitation-request';
import type { BlockTheme } from '@/components/invitations/blocks/theme';

interface Props {
  t: BlockTheme;
  accessToken: string;
  accessCode: string;
  guestName: string;
  tableNo?: string;
  passes: number;
}

export default function QrCard({ t, accessToken, accessCode, guestName, tableNo, passes }: Props) {
  const [image, setImage] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const activeDownload = useRef<AbortController | null>(null);
  const details = JSON.stringify([accessToken, accessCode, guestName, tableNo, passes]);
  const context = useRef({ details });
  if (context.current.details !== details) context.current = { details };
  const owner = context.current;
  const qr = image?.token === accessToken ? image.url : '';
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    activeDownload.current?.abort(); activeDownload.current = null;
    setImage(null); setError(''); setDownloading(false);
    boundedInvitationTask(async signal => {
      const { default: QRCode } = await import('qrcode');
      if (signal.aborted) throw new Error('QR generation canceled');
      return QRCode.toDataURL(accessToken, { margin: 1, width: 320, color: { dark: '#1a1a1a', light: '#ffffff' } });
    }, { signal: controller.signal, timeout: 12000 })
      .then(url => { if (alive.current && context.current === owner) setImage({ token: accessToken, url }); })
      .catch(() => { if (alive.current && context.current === owner && !controller.signal.aborted) setError('No se pudo generar el QR. Usa el ID de acceso o actualiza la página.'); });
    return () => { alive.current = false; controller.abort(); activeDownload.current?.abort(); };
  }, [accessToken, owner]);

  const download = async () => {
    if (!alive.current || context.current !== owner || activeDownload.current || !qr) return;
    const controller = new AbortController();
    activeDownload.current = controller;
    const current = () => alive.current && context.current === owner && activeDownload.current === controller;
    setDownloading(true); setError('');
    try {
      const { blob, filename } = await boundedInvitationTask(async signal => {
        const { accessPassPng, passFilename } = await import('@/lib/access-pass');
        if (signal.aborted) throw new Error('Pass download canceled');
        return { blob: await accessPassPng({ accessToken, accessCode, guestName, tableNo, passes }), filename: passFilename(accessCode) };
      }, { signal: controller.signal, timeout: 15000 });
      if (!current()) return;
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
      } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch { if (current()) setError('No se pudo descargar el pase. Puedes guardar una captura o volver a intentarlo.'); }
    finally { if (current()) { activeDownload.current = null; setDownloading(false); } }
  };

  return (
    <div className="mx-auto mt-6 rounded-2xl overflow-hidden" style={{ maxWidth: 320, background: '#fff', border: `1px solid ${t.line}`, boxShadow: '0 18px 44px rgba(0,0,0,0.12)' }}>
      <div className="px-5 py-4 text-center" style={{ background: t.primary, color: t.onPrimary }}>
        <p className="font-cinzel uppercase tracking-[0.18em] text-[11px] opacity-90">Pase de acceso</p>
        <p className="font-great text-3xl leading-tight break-words">{guestName}</p>
      </div>

      <div className="p-5 text-center">
        {qr ? (
          // Data-URL generado en el cliente: next/image no puede optimizarlo.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Código QR de acceso" width={176} height={176} className="mx-auto w-44 h-44" />
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
              <p className="font-playfair font-bold text-xl break-words" style={{ color: t.primary }}>{tableNo}</p>
              <p className="font-outfit text-[10px] uppercase tracking-wide" style={{ color: t.muted }}>Mesa</p>
            </div>
          )}
        </div>

        <p className="font-cormorant italic mt-4 text-sm" style={{ color: t.muted }}>
          Presenta este código en la entrada del evento.
        </p>
        <button type="button" disabled={downloading || !qr} aria-busy={downloading} onClick={() => void download()} className="mt-4 min-h-11 w-full rounded-xl border px-3 py-2 text-sm font-outfit disabled:opacity-50" style={{ borderColor: t.line, color: t.text }}>{downloading ? 'Preparando imagen…' : 'Descargar pase PNG'}</button>
        <p className="mt-2 text-xs" style={{ color: t.muted }}>Guárdalo en tu galería para mostrarlo sin conexión.</p>
        {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
