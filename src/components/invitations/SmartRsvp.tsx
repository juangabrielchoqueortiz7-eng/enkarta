'use client';

// Confirmación inteligente in-app. Se inyecta al final de la invitación cuando
// el paquete incluye `smartRsvp`. Si el invitado llegó por su link único
// (?g=<publicId>), su confirmación se registra en la tabla `guests` (POST
// /api/guests/confirm) y al asistir se le muestra su tarjeta con QR + ID de
// acceso. Sin publicId cae en la confirmación abierta (POST /api/rsvp, sin QR).
// El botón "Confirmar" de la plantilla enlaza a la ancla #enkarta-confirmar.

import { useState } from 'react';
import { resolveBlockTheme } from '@/components/invitations/blocks/theme';
import QrCard from '@/components/invitations/QrCard';
import { PetalBurst } from '@/components/invitations/effects';
import type { TemplateTheme, Guest } from '@/lib/types';

interface Props {
  slug: string;
  theme?: TemplateTheme;
  /** Id público del invitado (del link ?g=). Si falta, es confirmación abierta. */
  publicId?: string;
  guestName?: string;
  /** Pases asignados a ese invitado (tope del selector). */
  maxPasses?: number;
  tableNo?: string;
  /** La fecha límite de confirmación ya pasó: el formulario se bloquea. */
  deadlinePassed?: boolean;
}

export default function SmartRsvp({ slug, theme, publicId, guestName, maxPasses, deadlinePassed }: Props) {
  const t = resolveBlockTheme(theme);
  const [name, setName] = useState(guestName ?? '');
  const [attending, setAttending] = useState<'yes' | 'no'>('yes');
  const [passes, setPasses] = useState(1);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | 'yes' | 'no'>(null);
  const [card, setCard] = useState<Guest | null>(null);
  const [error, setError] = useState('');

  const cap = maxPasses && maxPasses > 0 ? maxPasses : 20;
  const field: React.CSSProperties = {
    background: '#fff', border: `1px solid ${t.line}`, color: t.text,
    borderRadius: 10, padding: '11px 13px', fontSize: 15, width: '100%', outline: 'none',
  };

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      if (publicId) {
        const res = await fetch('/api/guests/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, publicId, attending, passes, confirmName: name, message: msg }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'No se pudo confirmar'); setBusy(false); return; }
        if (attending === 'yes' && data.guest?.accessToken) setCard(data.guest as Guest);
      } else {
        await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, name, attending, passes, message: msg }),
        });
      }
      setDone(attending);
    } catch { setError('Sin conexión. Intenta de nuevo.'); }
    setBusy(false);
  };

  return (
    <section id="enkarta-confirmar" className="relative z-10 px-6 py-16" style={{ background: t.bg }}>
      {/* Celebración: pétalos cayendo al confirmar asistencia */}
      {done === 'yes' && <PetalBurst color={t.primary} />}
      <div className="mx-auto text-center" style={{ maxWidth: 420 }}>
        <p className="font-cinzel uppercase tracking-[0.18em]" style={{ color: t.muted, fontSize: 13 }}>Confirmación</p>
        <h3 className="font-great mt-1" style={{ color: t.primary, fontSize: 42, lineHeight: 1.1 }}>
          {guestName ? `${guestName},` : 'Te esperamos'}
        </h3>

        {done ? (
          <>
            <div className="mt-6 rounded-2xl px-6 py-8" style={{ background: '#fff', border: `1px solid ${t.line}` }}>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: done === 'yes' ? t.primary : t.muted }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4">
                  {done === 'yes'
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />}
                </svg>
              </div>
              <p className="font-cinzel uppercase tracking-[0.14em]" style={{ color: t.text, fontSize: 15 }}>
                {done === 'yes' ? '¡Gracias por confirmar!' : 'Gracias por avisarnos'}
              </p>
              <p className="font-cormorant mt-1" style={{ color: t.muted, fontSize: 17 }}>
                {done === 'yes' ? 'Tu lugar está reservado. 🤍' : 'Lamentamos que no puedas acompañarnos.'}
              </p>
            </div>
            {card?.accessToken && card.accessCode && (
              <QrCard t={t} accessToken={card.accessToken} accessCode={card.accessCode} guestName={card.name} tableNo={card.tableNo} passes={card.confirmedPasses ?? card.passes} />
            )}
          </>
        ) : deadlinePassed ? (
          <div className="mt-6 rounded-2xl px-6 py-8 font-cormorant" style={{ background: '#fff', border: `1px solid ${t.line}`, color: t.muted, fontSize: 17 }}>
            El período de confirmación ya cerró. Para cualquier consulta, contacta a los anfitriones.
          </div>
        ) : (
          <div className="mt-6 space-y-3 text-left font-cormorant">
            {!publicId && (
              <input style={field} placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />
            )}
            <div className="flex gap-2">
              {(['yes', 'no'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAttending(v)}
                  className="flex-1 font-cinzel uppercase tracking-[0.12em] text-[11px] py-3 rounded-xl transition-all"
                  style={attending === v
                    ? { background: t.primary, color: t.onPrimary }
                    : { background: '#fff', color: t.muted, border: `1px solid ${t.line}` }}
                >
                  {v === 'yes' ? 'Sí, asistiré' : 'No podré'}
                </button>
              ))}
            </div>
            {attending === 'yes' && cap > 1 && (
              <div className="flex items-center justify-between px-1">
                <span style={{ color: t.muted, fontSize: 16 }}>¿Cuántos asisten?</span>
                <select style={{ ...field, width: 90 }} value={passes} onChange={e => setPasses(parseInt(e.target.value) || 1)}>
                  {Array.from({ length: cap }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
            <textarea style={{ ...field, minHeight: 70 }} placeholder="Mensaje para los novios (opcional)" value={msg} onChange={e => setMsg(e.target.value)} />
            {error && <p className="text-sm text-red-500 font-outfit">{error}</p>}
            <button
              onClick={submit}
              disabled={busy || !name.trim()}
              className="w-full font-cinzel uppercase tracking-[0.18em] text-[12px] py-3.5 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: t.primary, color: t.onPrimary, borderRadius: '22px 6px 22px 6px' }}
            >
              {busy ? 'Enviando…' : 'Confirmar asistencia'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
