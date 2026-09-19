'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatBs, PARTNER_PLANS, type PartnerPlanKey, type SubscriptionState } from '@/lib/partner-plans';

// Cartera del programa de socios: quién está al día y qué pagos esperan revisión.
// Aprobar un pago aquí es lo único que extiende la suscripción de un socio.

interface PartnerSummary {
  id: string; email: string; name: string; avatar: string; brand: string;
  phone: string; city: string; status: 'active' | 'suspended'; createdAt: string;
  subscription: SubscriptionState;
  quota: { limit: number; used: number; unlimited: boolean; reached: boolean };
  invitations: { total: number; published: number };
}

interface PaymentRow {
  id: string; reference: string; partner_id: string; plan_key: PartnerPlanKey; months: number;
  amount_bs: number; method: string; status: 'pending' | 'approved' | 'rejected';
  payer_note: string; review_note: string; created_at: string; period_end: string | null;
  receiptUrl?: string;
  partner: { name: string; email: string; brand: string } | null;
}

interface Payload {
  partners: PartnerSummary[];
  payments: PaymentRow[];
  summary: { total: number; active: number; pendingPayments: number; mrrBs: number; revenueBs: number };
}

const TONE: Record<SubscriptionState['tone'], string> = {
  active: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  pending: 'bg-sky-50 text-sky-800',
  inactive: 'bg-gray-100 text-gray-600',
};

const dateLabel = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function PartnersDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<'pagos' | 'socios'>('pagos');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/partners');
      const result = await res.json();
      if (!res.ok) { setError(result.error || 'No se pudo cargar la cartera'); setData(null); return; }
      setError('');
      setData(result);
    } catch {
      setError('Error de conexión');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (action: string, id: string, note = '') => {
    setBusy(id);
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, note }),
      });
      const result = await res.json();
      if (!res.ok) { setError(result.error || 'No se pudo completar la acción'); return; }
      setError('');
      await load();
    } finally {
      setBusy(null);
    }
  };

  const approve = (payment: PaymentRow) => {
    const who = payment.partner?.brand || payment.partner?.name || payment.partner?.email || 'este socio';
    if (!confirm(`¿Aprobar ${formatBs(Number(payment.amount_bs))} de ${who}? Se activan ${payment.months} ${payment.months === 1 ? 'mes' : 'meses'} del plan ${PARTNER_PLANS[payment.plan_key]?.label ?? payment.plan_key}.`)) return;
    void act('approve', payment.id);
  };

  const reject = (payment: PaymentRow) => {
    const note = prompt('Motivo del rechazo (lo verá el socio):', 'No pudimos verificar el pago.');
    if (note === null) return;
    void act('reject', payment.id, note);
  };

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
        <p className="font-playfair text-lg text-amber-900">Programa de socios no disponible</p>
        <p className="mt-2 font-outfit text-sm text-amber-800">{error}</p>
        <button onClick={load} className="mt-4 rounded-full bg-amber-900 px-5 py-2 font-outfit text-xs text-white">Reintentar</button>
      </div>
    );
  }
  if (!data) return <p className="font-outfit text-sm text-gray-500">Cargando cartera de socios…</p>;

  const pending = data.payments.filter(payment => payment.status === 'pending');
  const reviewed = data.payments.filter(payment => payment.status !== 'pending');

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-playfair text-2xl text-gray-900">Socios</h2>
          <p className="mt-1 font-outfit text-sm text-gray-500">Revendedores con suscripción mensual al sistema.</p>
        </div>
        <button onClick={load} className="rounded-full border border-gray-200 px-4 py-2 font-outfit text-xs text-gray-600 transition hover:border-gray-300">Actualizar</button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Socios', String(data.summary.total)],
          ['Al día', String(data.summary.active)],
          ['Ingreso mensual', formatBs(data.summary.mrrBs)],
          ['Cobrado histórico', formatBs(data.summary.revenueBs)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="font-outfit text-[10px] uppercase tracking-[0.16em] text-gray-400">{label}</p>
            <p className="mt-1.5 font-playfair text-xl text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {error && <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 font-outfit text-sm text-red-700">{error}</p>}

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {([['pagos', `Pagos por revisar${pending.length ? ` (${pending.length})` : ''}`], ['socios', 'Cartera']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 font-outfit text-sm transition ${tab === key ? 'border-[#B8975A] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pagos' ? (
        <div className="space-y-4">
          {!pending.length && <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center font-outfit text-sm text-gray-500">No hay pagos esperando revisión.</p>}
          {pending.map(payment => (
            <article key={payment.id} className="rounded-2xl border border-sky-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-playfair text-lg text-gray-900">
                    {payment.partner?.brand || payment.partner?.name || 'Socio'}
                    <span className="ml-2 font-outfit text-xs text-gray-400">{payment.partner?.email}</span>
                  </p>
                  <p className="mt-1 font-outfit text-sm text-gray-600">
                    {PARTNER_PLANS[payment.plan_key]?.label ?? payment.plan_key} · {payment.months} {payment.months === 1 ? 'mes' : 'meses'} ·{' '}
                    <strong className="text-gray-900">{formatBs(Number(payment.amount_bs))}</strong>
                  </p>
                  <p className="mt-1 font-outfit text-xs text-gray-500">
                    Referencia <span className="tracking-[0.06em] text-gray-700">{payment.reference}</span> · {dateLabel(payment.created_at)}
                  </p>
                  {payment.payer_note && <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 font-outfit text-xs text-gray-600">{payment.payer_note}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {payment.receiptUrl
                    ? <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="rounded-full border border-gray-200 px-4 py-2 font-outfit text-xs text-gray-700 transition hover:border-gray-300">Ver comprobante</a>
                    : <span className="rounded-full bg-amber-50 px-3 py-2 font-outfit text-xs text-amber-800">Sin comprobante</span>}
                  <button onClick={() => reject(payment)} disabled={busy === payment.id} className="rounded-full border border-red-200 px-4 py-2 font-outfit text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50">Rechazar</button>
                  <button onClick={() => approve(payment)} disabled={busy === payment.id} className="rounded-full bg-emerald-600 px-5 py-2 font-outfit text-xs text-white transition hover:bg-emerald-700 disabled:opacity-50">
                    {busy === payment.id ? '…' : 'Aprobar y activar'}
                  </button>
                </div>
              </div>
            </article>
          ))}

          {reviewed.length > 0 && (
            <div className="pt-6">
              <h3 className="font-playfair text-lg text-gray-900">Revisados</h3>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-gray-100 font-outfit text-[10px] uppercase tracking-[0.14em] text-gray-400">
                      <th className="px-4 py-3">Socio</th><th className="px-4 py-3">Referencia</th>
                      <th className="px-4 py-3">Monto</th><th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Cubre hasta</th>
                    </tr>
                  </thead>
                  <tbody className="font-outfit text-xs">
                    {reviewed.map(payment => (
                      <tr key={payment.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 text-gray-700">{payment.partner?.brand || payment.partner?.name || payment.partner?.email || '—'}</td>
                        <td className="px-4 py-3 tracking-[0.05em] text-gray-600">{payment.reference}</td>
                        <td className="px-4 py-3 text-gray-700">{formatBs(Number(payment.amount_bs))}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 ${payment.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {payment.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                          </span>
                          {payment.review_note && <span className="ml-2 text-gray-400">{payment.review_note}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{dateLabel(payment.period_end)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-gray-100 font-outfit text-[10px] uppercase tracking-[0.14em] text-gray-400">
                <th className="px-4 py-3">Socio</th><th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Estado</th><th className="px-4 py-3">Vence</th>
                <th className="px-4 py-3">Publicadas</th><th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="font-outfit text-xs">
              {!data.partners.length && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Todavía no hay socios registrados.</td></tr>
              )}
              {data.partners.map(partner => (
                <tr key={partner.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{partner.brand || partner.name || '—'}</p>
                    <p className="text-gray-400">{partner.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{PARTNER_PLANS[partner.subscription.plan]?.label}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 ${TONE[partner.subscription.tone]}`}>{partner.subscription.label}</span>
                    {partner.status === 'suspended' && <span className="ml-2 rounded-full bg-red-50 px-2.5 py-1 text-red-600">Suspendido</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{dateLabel(partner.subscription.periodEnd)}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {partner.invitations.published}
                    <span className="text-gray-400"> / {partner.quota.unlimited ? '∞' : partner.quota.limit}</span>
                    <span className="ml-2 text-gray-400">({partner.invitations.total} creadas)</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {partner.phone
                      ? <a href={`https://wa.me/${partner.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-[#B8975A] underline-offset-2 hover:underline">{partner.phone}</a>
                      : '—'}
                    {partner.city && <span className="ml-2">{partner.city}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => act(partner.status === 'suspended' ? 'restore' : 'suspend', partner.id)}
                      disabled={busy === partner.id}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 transition hover:border-gray-300 disabled:opacity-50"
                    >
                      {partner.status === 'suspended' ? 'Reactivar' : 'Suspender'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
