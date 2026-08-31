'use client';

import { useEffect, useMemo, useState } from 'react';
import { PACKAGE_CATALOG, PACKAGE_ORDER } from '@/lib/packages';
import { SALES_PIPELINE, SALES_REPLY_LABELS, formatSalesQuote, salesQuoteTotals, salesReply, type SalesQuoteInput, type SalesReplyKey } from '@/lib/sales-playbook';
import type { InvitationPackage } from '@/lib/types';

type SalesConfig = { paymentInstructions: string; paymentConfigured: boolean; salesHours: string };

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return <button type="button" onClick={() => void copy()} className="rounded-xl border border-[#d9d0c2] bg-white px-4 py-2 font-outfit text-xs font-semibold text-[#6d5c40] transition-colors hover:border-[#b8975a]">{copied ? 'Copiado' : label}</button>;
}

export default function SalesToolkit() {
  const [input, setInput] = useState<SalesQuoteInput>({ packageKey: 'premium', eventType: 'Boda', extrasBs: 0 });
  const [config, setConfig] = useState<SalesConfig>({ paymentInstructions: '', paymentConfigured: false, salesHours: 'Lunes a sábado · 09:00–19:00' });
  const [show, setShow] = useState(false);
  useEffect(() => { fetch('/api/admin/sales-config', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(value => value && setConfig(value)).catch(() => {}); }, []);
  const current = useMemo(() => ({ ...input, paymentInstructions: config.paymentInstructions }), [input, config.paymentInstructions]);
  const proposal = useMemo(() => formatSalesQuote(current), [current]);
  const totals = useMemo(() => salesQuoteTotals(current), [current]);
  const set = <K extends keyof SalesQuoteInput>(key: K, value: SalesQuoteInput[K]) => setInput(previous => ({ ...previous, [key]: value }));

  return <section className="overflow-hidden rounded-3xl border border-[#dfd7cb] bg-white">
    <button type="button" onClick={() => setShow(value => !value)} className="flex w-full items-start justify-between gap-4 p-5 text-left sm:p-7">
      <div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48655]">Proceso comercial</p><h2 className="mt-1 font-playfair text-3xl text-gray-900">Cotiza y responde sin improvisar</h2><p className="mt-2 max-w-2xl font-outfit text-xs leading-5 text-gray-500">Genera el resumen escrito, calcula reserva y saldo, y copia respuestas consistentes para WhatsApp.</p></div>
      <span className="mt-1 rounded-full bg-[#f3eee6] px-3 py-1.5 font-outfit text-[10px] font-semibold text-[#765f3b]">{show ? 'Cerrar' : 'Abrir herramientas'}</span>
    </button>
    {show && <div className="border-t border-[#eee8df] p-5 sm:p-7">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Cliente<input value={input.clientName || ''} onChange={e => set('clientName', e.target.value)} placeholder="Nombre o familia" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#b8975a]" /></label>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Evento<input value={input.eventType || ''} onChange={e => set('eventType', e.target.value)} placeholder="Boda, XV años…" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#b8975a]" /></label>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Fecha<input type="date" value={input.eventDate || ''} onChange={e => set('eventDate', e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#b8975a]" /></label>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Diseño<input value={input.design || ''} onChange={e => set('design', e.target.value)} placeholder="Lunaria, Marfil Vivo…" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#b8975a]" /></label>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Paquete<select value={input.packageKey} onChange={e => set('packageKey', e.target.value as InvitationPackage)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#b8975a]">{PACKAGE_ORDER.map(key => <option key={key} value={key}>{PACKAGE_CATALOG[key].label} · {PACKAGE_CATALOG[key].bs} Bs</option>)}</select></label>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Adicionales Bs<input type="number" min={0} step="1" value={input.extrasBs || ''} onChange={e => set('extrasBs', Math.max(0, Number(e.target.value) || 0))} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#b8975a]" /></label>
            {Boolean(input.extrasBs) && <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500 sm:col-span-2">Detalle de adicionales<input value={input.extrasLabel || ''} onChange={e => set('extrasLabel', e.target.value)} placeholder="Entrega express, dominio…" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#b8975a]" /></label>}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[['Total', totals.total], ['Reserva', totals.reservation], ['Saldo', totals.balance]].map(([label, value]) => <div key={label} className="rounded-2xl bg-[#f6f2eb] p-3"><p className="font-playfair text-xl text-[#5d513d]">{Number(value).toLocaleString('es-BO')} Bs</p><p className="mt-1 font-outfit text-[9px] uppercase tracking-[.12em] text-gray-400">{label}</p></div>)}
          </div>
          <div className={`mt-4 rounded-2xl border p-4 ${config.paymentConfigured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className={`font-outfit text-xs font-semibold ${config.paymentConfigured ? 'text-emerald-800' : 'text-amber-900'}`}>{config.paymentConfigured ? 'Medio de pago configurado' : 'Falta configurar el medio de pago'}</p><p className={`mt-1 font-outfit text-[10px] leading-4 ${config.paymentConfigured ? 'text-emerald-700' : 'text-amber-800'}`}>{config.paymentConfigured ? 'Se incluirá automáticamente en la propuesta.' : 'Define ENKARTA_PAYMENT_INSTRUCTIONS en producción antes de enviar propuestas definitivas.'} · Horario: {config.salesHours}</p></div>
        </div>
        <div className="rounded-2xl bg-[#29231b] p-5 text-white"><div className="flex items-center justify-between gap-3"><h3 className="font-playfair text-2xl">Resumen listo para enviar</h3><CopyButton value={proposal} label="Copiar propuesta" /></div><pre className="mt-5 max-h-[440px] overflow-auto whitespace-pre-wrap font-outfit text-[11px] leading-5 text-white/70">{proposal}</pre></div>
      </div>

      <div className="mt-7 border-t border-gray-100 pt-7"><h3 className="font-playfair text-2xl text-gray-900">Respuestas rápidas</h3><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{(Object.keys(SALES_REPLY_LABELS) as SalesReplyKey[]).map(key => <article key={key} className="flex flex-col rounded-2xl border border-gray-100 bg-[#faf9f6] p-4"><h4 className="font-outfit text-xs font-semibold text-gray-800">{SALES_REPLY_LABELS[key]}</h4><p className="mt-2 flex-1 font-outfit text-[10px] leading-4 text-gray-500">{salesReply(key, current)}</p><div className="mt-3"><CopyButton value={salesReply(key, current)} label="Copiar" /></div></article>)}</div></div>
      <div className="mt-7 border-t border-gray-100 pt-7"><h3 className="font-playfair text-2xl text-gray-900">Reglas del embudo</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{SALES_PIPELINE.map((step, index) => <article key={step.key} className="rounded-2xl bg-[#f7f3ed] p-4"><span className="font-playfair text-[#a48655]">0{index + 1}</span><h4 className="mt-2 font-outfit text-xs font-semibold text-gray-800">{step.label}</h4><p className="mt-1 font-outfit text-[10px] leading-4 text-gray-500">{step.target}</p></article>)}</div></div>
    </div>}
  </section>;
}
