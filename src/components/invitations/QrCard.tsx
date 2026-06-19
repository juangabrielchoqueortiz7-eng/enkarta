'use client';

// Tarjeta de confirmación con código QR + ID de acceso. Se muestra dentro de
// SmartRsvp tras confirmar. El QR codifica el access_token del invitado; el
// personal de puerta lo escanea para cargar al grupo y hacer el check-in.

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
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
  const [qr, setQr] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(accessToken, { margin: 1, width: 320, color: { dark: '#1a1a1a', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [accessToken]);

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
          <div className="mx-auto w-44 h-44 flex items-center justify-center text-xs text-gray-400 font-outfit">Generando…</div>
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
      </div>
    </div>
  );
}
