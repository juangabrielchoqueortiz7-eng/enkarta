'use client';

import { useEffect, useState } from 'react';
import type { AdditionalServiceStatus, AdditionalServicesConfig, InvitationLocale, InvitationParsed } from '@/lib/types';
import type { SaveDateResponse } from '@/lib/save-date';
import {
  ADDITIONAL_SERVICE_KEYS,
  ADDITIONAL_SERVICE_META,
  additionalServiceChecks,
  additionalServiceProgress,
  additionalServices,
  navigationCandidates,
  normalizeHostname,
  type AdditionalServiceKey,
} from '@/lib/additional-services';
import ImageUploader from '../ImageUploader';

const STATUS: { value: AdditionalServiceStatus; label: string }[] = [
  { value: 'not_contracted', label: 'No contratado' },
  { value: 'contracted', label: 'Contratado' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'ready', label: 'Entregado' },
];
const LOCALES: { value: InvitationLocale; label: string }[] = [
  { value: 'es-BO', label: 'Español (Bolivia)' }, { value: 'en-US', label: 'English' },
  { value: 'pt-BR', label: 'Português' }, { value: 'fr-FR', label: 'Français' },
];

const input = 'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-enkarta-gold font-outfit';
const check = 'h-4 w-4 rounded border-gray-300 accent-enkarta-gold';

function SaveDateSummary({ id, enabled }: { id: string; enabled: boolean }) {
  const [state, setState] = useState<{ responses: SaveDateResponse[]; metrics: { total: number; interested: number; maybe: number; unavailable: number; estimatedGuests: number } } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetch(`/api/save-the-date?id=${encodeURIComponent(id)}`, { cache: 'no-store' }).then(async response => {
      const body = await response.json(); if (!response.ok) throw new Error(body.code === 'MIGRATION_REQUIRED' ? 'Activa la migración 011 para recibir preconfirmaciones.' : body.error || 'No se pudieron cargar las preconfirmaciones.');
      if (active) setState(body);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las preconfirmaciones.'); });
    return () => { active = false; };
  }, [id, enabled]);
  if (!enabled) return null;
  if (error) return <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[10px] text-amber-700">{error}</p>;
  if (!state) return <p className="text-[10px] text-gray-400">Consultando preconfirmaciones…</p>;
  return <div className="rounded-2xl border border-gray-100 bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Respuestas previas</p><div className="mt-2 grid grid-cols-4 gap-1.5 text-center"><div><strong className="block text-sm text-gray-700">{state.metrics.total}</strong><span className="text-[8px] text-gray-400">Total</span></div><div><strong className="block text-sm text-emerald-700">{state.metrics.interested}</strong><span className="text-[8px] text-gray-400">Sí</span></div><div><strong className="block text-sm text-amber-700">{state.metrics.maybe}</strong><span className="text-[8px] text-gray-400">Quizás</span></div><div><strong className="block text-sm text-violet-700">{state.metrics.estimatedGuests}</strong><span className="text-[8px] text-gray-400">Personas</span></div></div>{state.responses.slice(0, 4).map(item => <p key={item.id} className="mt-2 flex justify-between gap-2 border-t border-gray-50 pt-2 text-[10px] text-gray-500"><span className="truncate">{item.name}</span><span>{item.interest === 'interested' ? 'Sí' : item.interest === 'maybe' ? 'Quizás' : 'No'} · {item.guests}</span></p>)}</div>;
}

export default function AdditionalServicesPanel({ data, onChange }: { data: InvitationParsed; onChange: (config: InvitationParsed['config']) => void }) {
  const services = additionalServices(data.config);
  const update = <K extends AdditionalServiceKey>(key: K, patch: Partial<NonNullable<AdditionalServicesConfig[K]>>) => {
    const current = (services[key] ?? {}) as NonNullable<AdditionalServicesConfig[K]>;
    onChange({ ...data.config, additionalServices: { ...services, [key]: { ...current, ...patch, updatedAt: new Date().toISOString() } } });
  };
  const candidates = navigationCandidates(data.config.layout);

  const body = (key: AdditionalServiceKey) => {
    if (key === 'domain') {
      const item = services.domain ?? {};
      return <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] text-gray-500 sm:col-span-2">Dominio asignado<input className={input} value={item.hostname ?? ''} onChange={event => update('domain', { hostname: event.target.value })} onBlur={event => update('domain', { hostname: normalizeHostname(event.target.value) })} placeholder="invitacion.ejemplo.com" /></label>
        <label className="text-[11px] text-gray-500">Titular o cuenta<input className={input} value={item.accountOwner ?? ''} onChange={event => update('domain', { accountOwner: event.target.value })} placeholder="Cliente / Enkarta" /></label>
        <label className="text-[11px] text-gray-500">Vence o se renueva<input type="date" className={input} value={item.expiresAt?.slice(0, 10) ?? ''} onChange={event => update('domain', { expiresAt: event.target.value })} /></label>
        {[['ownershipVerified', 'Titularidad comprobada'], ['dnsVerified', 'DNS conectado'], ['httpsVerified', 'HTTPS activo'], ['autoRenew', 'Renovación automática']] .map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-2.5 text-[11px] text-gray-600"><input type="checkbox" className={check} checked={item[field as keyof typeof item] === true} onChange={event => update('domain', { [field]: event.target.checked })} />{label}</label>)}
      </div>;
    }
    if (key === 'language') {
      const item = services.language ?? {};
      return <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-gray-500">Idioma original<select className={input} value={item.sourceLocale ?? 'es-BO'} onChange={event => update('language', { sourceLocale: event.target.value as InvitationLocale })}>{LOCALES.map(locale => <option key={locale.value} value={locale.value}>{locale.label}</option>)}</select></label>
          <label className="text-[11px] text-gray-500">Idioma de entrega<select className={input} value={item.targetLocale ?? 'en-US'} onChange={event => update('language', { targetLocale: event.target.value as InvitationLocale })}>{LOCALES.map(locale => <option key={locale.value} value={locale.value}>{locale.label}</option>)}</select></label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[['contentTranslated', 'Contenido traducido'], ['formsTranslated', 'Formularios y botones'], ['datesLocalized', 'Fechas localizadas'], ['systemMessagesTranslated', 'Mensajes del sistema'], ['clientReviewed', 'Revisado por el cliente']] .map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-2.5 text-[11px] text-gray-600"><input type="checkbox" className={check} checked={item[field as keyof typeof item] === true} onChange={event => update('language', { [field]: event.target.checked })} />{label}</label>)}
        </div>
        <p className="text-[10px] leading-relaxed text-gray-400">La selección localiza automáticamente los controles del sistema. Los textos editoriales se traducen directamente en sus bloques y esta lista confirma que fueron revisados.</p>
      </div>;
    }
    if (key === 'saveDate') {
      const item = services.saveDate ?? {};
      return <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-[11px] text-gray-500">Texto superior<input className={input} value={item.eyebrow ?? ''} onChange={event => update('saveDate', { eyebrow: event.target.value })} placeholder="Reserva la fecha" /></label>
          <label className="text-[11px] text-gray-500">Título<input className={input} value={item.title ?? ''} onChange={event => update('saveDate', { title: event.target.value })} placeholder={data.names ?? 'Nos casamos'} /></label>
        </div>
        <label className="text-[11px] text-gray-500">Mensaje<textarea rows={3} className={input} value={item.message ?? ''} onChange={event => update('saveDate', { message: event.target.value })} placeholder="Muy pronto compartiremos todos los detalles…" /></label>
        <label className="text-[11px] text-gray-500">Texto del botón<input className={input} value={item.buttonLabel ?? ''} onChange={event => update('saveDate', { buttonLabel: event.target.value })} placeholder="Guardar mi preconfirmación" /></label>
        <ImageUploader value={item.heroImage ?? ''} onChange={heroImage => update('saveDate', { heroImage })} folder="save-the-date" ownerId={data.id} aspect="portrait" hint="Foto vertical para la página previa. Se reutiliza la infraestructura segura de medios." />
        <div className="grid gap-2 sm:grid-cols-3">
          {[['enabled', 'Página activa'], ['preconfirmationEnabled', 'Preconfirmación'], ['published', 'Publicada']] .map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-2.5 text-[11px] text-gray-600"><input type="checkbox" className={check} checked={item[field as keyof typeof item] === true} onChange={event => update('saveDate', { [field]: event.target.checked })} />{label}</label>)}
        </div>
        <a href={`/save/${data.slug}?preview=1`} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center justify-center rounded-xl border border-enkarta-gold/30 bg-white px-3 text-[10px] font-semibold uppercase tracking-wider text-enkarta-gold">Abrir vista previa ↗</a>
        <SaveDateSummary id={data.id} enabled={item.preconfirmationEnabled === true} />
      </div>;
    }
    if (key === 'personalization') {
      const item = services.personalization ?? {};
      return <div className="space-y-3">
        <label className="text-[11px] text-gray-500">Brief del cliente<textarea rows={5} className={input} value={item.brief ?? ''} onChange={event => update('personalization', { brief: event.target.value })} placeholder="Evento, estilo, emociones, imprescindibles y elementos a evitar…" /></label>
        <label className="text-[11px] text-gray-500">Referencias · una URL por línea<textarea rows={3} className={input} value={(item.references ?? []).join('\n')} onChange={event => update('personalization', { references: event.target.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean).slice(0, 12) })} placeholder="https://…" /></label>
        <label className="text-[11px] text-gray-500">Versión de propuesta<input className={input} value={item.proposalLabel ?? ''} onChange={event => update('personalization', { proposalLabel: event.target.value })} placeholder="Propuesta 2 · Editorial oliva" /></label>
        <div className="grid grid-cols-2 gap-2">{[['proposalReady', 'Propuesta lista'], ['clientApproved', 'Aprobada por cliente']] .map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-2.5 text-[11px] text-gray-600"><input type="checkbox" className={check} checked={item[field as keyof typeof item] === true} onChange={event => update('personalization', { [field]: event.target.checked, ...(field === 'clientApproved' ? { approvedAt: event.target.checked ? new Date().toISOString() : undefined } : {}) })} />{label}</label>)}</div>
      </div>;
    }
    if (key === 'navigation') {
      const item = services.navigation ?? {};
      const selected = new Map((item.items ?? []).map(entry => [entry.blockId, entry]));
      return <div className="space-y-3">
        {!data.config.layout?.blocks?.length && <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] text-amber-700">El menú verificable está disponible para invitaciones por bloques, donde cada destino tiene un identificador estable.</p>}
        <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-gray-500">Posición<select className={input} value={item.position ?? 'bottom'} onChange={event => update('navigation', { position: event.target.value as 'top' | 'bottom' })}><option value="bottom">Inferior</option><option value="top">Superior</option></select></label><label className="text-[11px] text-gray-500">Estilo<select className={input} value={item.style ?? 'glass'} onChange={event => update('navigation', { style: event.target.value as 'glass' | 'solid' | 'minimal' })}><option value="glass">Cristal</option><option value="solid">Sólido</option><option value="minimal">Minimal</option></select></label></div>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2">
          {candidates.map(candidate => { const current = selected.get(candidate.blockId); return <div key={candidate.blockId} className="flex items-center gap-2 rounded-xl bg-gray-50 p-2"><input type="checkbox" className={check} checked={!!current} onChange={event => { const items = event.target.checked ? [...(item.items ?? []), candidate] : (item.items ?? []).filter(entry => entry.blockId !== candidate.blockId); update('navigation', { items, enabled: items.length > 0 }); }} /><input aria-label={`Etiqueta de ${candidate.label}`} disabled={!current} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] disabled:opacity-40" value={current?.label ?? candidate.label} onChange={event => update('navigation', { items: (item.items ?? []).map(entry => entry.blockId === candidate.blockId ? { ...entry, label: event.target.value.slice(0, 24) } : entry) })} /></div>; })}
          {!candidates.length && <p className="p-3 text-center text-[11px] text-gray-400">No hay secciones compatibles todavía.</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">{[['enabled', 'Menú visible'], ['mobileVerified', 'Probado en celular']] .map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-2.5 text-[11px] text-gray-600"><input type="checkbox" className={check} checked={item[field as keyof typeof item] === true} onChange={event => update('navigation', { [field]: event.target.checked })} />{label}</label>)}</div>
      </div>;
    }
    const item = services.visibility ?? {};
    return <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 p-3 text-center"><div><p className="text-[9px] uppercase tracking-wider text-violet-500">Días adicionales</p><p className="mt-1 text-lg font-semibold text-violet-800">{data.validity_extra_days ?? 0}</p></div><div><p className="text-[9px] uppercase tracking-wider text-violet-500">Nueva fecha</p><p className="mt-1 text-xs font-semibold text-violet-800">{data.expires_at || 'Pendiente'}</p></div></div>
      <p className="text-[10px] leading-relaxed text-gray-400">Aplica la ampliación desde el panel de vigencia que aparece debajo; así queda registrada en el historial protegido.</p>
      <div className="grid grid-cols-2 gap-2">{[['extensionRegistered', 'Ampliación registrada'], ['clientNotified', 'Cliente notificado']] .map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-2.5 text-[11px] text-gray-600"><input type="checkbox" className={check} checked={item[field as keyof typeof item] === true} onChange={event => update('visibility', { [field]: event.target.checked })} />{label}</label>)}</div>
    </div>;
  };

  return <section className="space-y-3 border-t border-gray-100 pt-5 font-outfit">
    <div><h3 className="text-sm font-semibold text-gray-800">Adicionales con entrega verificable</h3><p className="mt-1 text-[11px] leading-relaxed text-gray-400">Cada servicio conserva alcance, responsable, fecha y comprobaciones. “Entregado” exige completar su lista.</p></div>
    {ADDITIONAL_SERVICE_KEYS.map(key => {
      const service = services[key];
      const status = service?.status ?? 'not_contracted';
      const progress = additionalServiceProgress(key, data);
      const checks = additionalServiceChecks(key, data);
      return <details key={key} className="group overflow-hidden rounded-2xl border border-gray-200 bg-[#fcfbf8]" open={status !== 'not_contracted'}>
        <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${status === 'ready' ? 'bg-emerald-100 text-emerald-700' : status === 'blocked' ? 'bg-red-100 text-red-700' : status === 'not_contracted' ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-700'}`}>{status === 'ready' ? '✓' : `${progress}%`}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-gray-700">{ADDITIONAL_SERVICE_META[key].label}</span><span className="block truncate text-[10px] text-gray-400">{ADDITIONAL_SERVICE_META[key].description}</span></span><span className="text-gray-300 transition group-open:rotate-180">⌄</span></summary>
        <div className="space-y-4 border-t border-gray-100 p-3.5">
          <div className="grid gap-2 sm:grid-cols-3"><label className="text-[10px] uppercase tracking-wider text-gray-400">Estado<select className={input} value={status} onChange={event => update(key, { status: event.target.value as AdditionalServiceStatus })}>{STATUS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="text-[10px] uppercase tracking-wider text-gray-400">Responsable<input className={input} value={service?.owner ?? ''} onChange={event => update(key, { owner: event.target.value })} placeholder="Equipo / cliente" /></label><label className="text-[10px] uppercase tracking-wider text-gray-400">Entrega comprometida<input type="date" className={input} value={service?.dueAt?.slice(0, 10) ?? ''} onChange={event => update(key, { dueAt: event.target.value })} /></label></div>
          {status !== 'not_contracted' && body(key)}
          {status !== 'not_contracted' && checks.length > 0 && <div className="rounded-2xl border border-gray-100 bg-white p-3"><div className="mb-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-enkarta-gold transition-all" style={{ width: `${progress}%` }} /></div><div className="grid gap-1.5 sm:grid-cols-2">{checks.map(item => <p key={item.label} className={`flex gap-1.5 text-[10px] ${item.done ? 'text-emerald-700' : 'text-gray-400'}`}><span>{item.done ? '✓' : '○'}</span>{item.label}</p>)}</div></div>}
          {status !== 'not_contracted' && <label className="text-[11px] text-gray-500">Notas internas<textarea rows={2} className={input} value={service?.notes ?? ''} onChange={event => update(key, { notes: event.target.value.slice(0, 1000) })} placeholder="Pendientes, acuerdos o bloqueos…" /></label>}
        </div>
      </details>;
    })}
  </section>;
}
