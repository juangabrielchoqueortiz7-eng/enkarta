'use client';

import { useEffect, useRef, useState } from 'react';
import type { BuilderConfig, InvitationPackage, PackageExtra, PackageFeatureOverrides, RsvpMode } from '@/lib/types';
import type { LegacyDraft } from '../useLegacyDraft';
import { adoptServiceContract, contractErrors, isCurrentContract, PACKAGE_CATALOG, PACKAGE_ORDER, resolveEntitlements, resolveFeatures, RSVP_LABELS, SERVICE_FIELDS } from '@/lib/packages';

const fieldClass = 'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm';
const display = (value: boolean | number | RsvpMode) => typeof value === 'boolean' ? value ? 'Sí' : 'No' : typeof value === 'number' ? `${value} fotos` : RSVP_LABELS[value];

interface PackageForm {
  scope: string;
  selection: InvitationPackage;
  acknowledged: boolean;
  feature: keyof PackageFeatureOverrides;
  value: string;
  reason: string;
  error: string;
}

export default function PackageSettings({ config, onChange, draft }: { config: BuilderConfig; onChange: (config: BuilderConfig) => void; draft?: LegacyDraft }) {
  const scope = draft?.destination('package') ?? 'standalone';
  const initialForm = (): PackageForm => ({ scope, selection: config.package || 'plus', acknowledged: false, feature: 'galleryMax', value: '12', reason: '', error: '' });
  const [storedForm, setForm] = useState(initialForm);
  const form = storedForm.scope === scope ? storedForm : initialForm();
  const formRef = useRef(form); formRef.current = form;
  const configRef = useRef(config); configRef.current = config;
  const mounted = useRef(true);
  const scopeRef = useRef(scope); scopeRef.current = scope;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const canChange = () => mounted.current && scopeRef.current === scope && (!draft || draft.isCurrent());
  const updateForm = (patch: Partial<PackageForm>) => {
    if (!canChange()) return;
    formRef.current = { ...formRef.current, ...patch };
    setForm(formRef.current);
  };
  const { selection, acknowledged, feature, value, reason, error } = form;
  const current = isCurrentContract(config);
  const entitlements = resolveEntitlements(config);
  const active = resolveFeatures(config);
  const extras = config.serviceContract?.extras || [];
  const apply = (change: (config: BuilderConfig) => BuilderConfig | null) => {
    if (!canChange()) return false;
    const candidate = change(draft?.get().config ?? configRef.current);
    if (!candidate) return false;
    const errors = contractErrors(candidate);
    if (errors.length) { updateForm({ error: errors.join(' ') }); return false; }
    updateForm({ error: '' });
    configRef.current = candidate;
    if (draft) draft.config(candidate); else onChange(candidate);
    return true;
  };
  const adoptPackage = () => {
    if (!canChange() || !formRef.current.acknowledged) return;
    if (apply(config => adoptServiceContract(config, formRef.current.selection))) updateForm({ acknowledged: false });
  };
  const setFeature = (key: keyof PackageFeatureOverrides, value: boolean | number) => apply(config => {
    if (!isCurrentContract(config)) return null;
    const entitled = resolveEntitlements(config)[key];
    if (typeof value === 'boolean' && !entitled) return null;
    return { ...config, features: { ...config.features, [key]: typeof value === 'number' ? Math.min(Number(entitled), Math.max(0, value)) : value } };
  });
  const removeExtra = (id: string) => apply(config => {
    const extras = config.serviceContract?.extras ?? [];
    return isCurrentContract(config) && extras.some(extra => extra.id === id)
      ? { ...config, serviceContract: { ...config.serviceContract!, extras: extras.filter(extra => extra.id !== id) } } : null;
  });
  const addExtra = () => {
    if (!canChange()) return;
    const { feature, value, reason } = formRef.current;
    if (reason.trim().length < 3) return;
    const accepted = apply(config => {
      if (!isCurrentContract(config)) return null;
      const field = SERVICE_FIELDS.find(item => item.key === feature)!;
      const actual = field.kind === 'number' ? Number(value) : field.kind === 'boolean' ? value === 'true' : value as RsvpMode;
      const active = resolveFeatures(config);
      const grants: Partial<Record<keyof PackageFeatureOverrides, PackageExtra['value']>> = { [feature]: actual };
      // Registrar también las dependencias anunciadas junto al formulario del adicional.
      if (feature === 'qrAccess' && actual === true) Object.assign(grants, { hostPanel: true, guestNames: true, passes: true, rsvpMode: active.rsvpMode === 'whatsapp' ? 'form' : active.rsvpMode });
      if (feature === 'hostPanel' && actual === true) grants.guestNames = true;
      if (feature === 'rsvpMode' && actual === 'smart') Object.assign(grants, { hostPanel: true, guestNames: true });
      const recordedAt = new Date().toISOString();
      const added = Object.entries(grants).map(([key, granted]) => ({ id: crypto.randomUUID(), feature: key as keyof PackageFeatureOverrides, value: granted!, reason: reason.trim(), source: 'contracted' as const, recordedAt }));
      const extras = config.serviceContract?.extras ?? [];
      const candidate = { ...config, features: { ...config.features }, serviceContract: { ...config.serviceContract!, extras: [...extras.filter(e => !(e.feature in grants)), ...added] } };
      for (const key of Object.keys(grants)) delete candidate.features[key as keyof PackageFeatureOverrides];
      if ('rsvpMode' in grants) delete candidate.features.smartRsvp;
      return candidate;
    });
    if (accepted) updateForm({ reason: '' });
  };

  return <section className="space-y-4 border-t border-gray-100 pt-5 font-outfit">
    <div><h3 className="text-sm font-semibold text-gray-800">Paquete y servicios</h3><p className="mt-1 text-xs leading-relaxed text-gray-500">La oferta, las opciones visibles y los permisos usan la misma matriz. No se realizan cobros desde aquí.</p></div>
    {!current && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Invitación anterior: conserva su comportamiento y accesos actuales. No aplicaremos los nuevos límites automáticamente. Al registrar un paquete, los permisos anteriores se documentarán como excepciones; revisa su alcance antes de publicar.</p>}
    <div className="grid grid-cols-3 gap-2">{[...PACKAGE_ORDER].reverse().map(key => <button type="button" key={key} aria-pressed={selection === key} onClick={() => updateForm({ selection: key, acknowledged: false })} className={`rounded-xl border px-1 py-3 text-xs ${selection === key ? 'border-enkarta-gold bg-amber-50 text-amber-900' : 'border-gray-200 bg-white text-gray-600'}`}><span className="block font-semibold">{PACKAGE_CATALOG[key].label}</span><span className="mt-1 block">{PACKAGE_CATALOG[key].bs} Bs</span></button>)}</div>
    {(!current || selection !== config.package) && <div className="space-y-3 rounded-xl bg-gray-50 p-3">
      <label className="flex items-start gap-2 text-xs leading-relaxed text-gray-600"><input type="checkbox" checked={acknowledged} onChange={e => updateForm({ acknowledged: e.target.checked })} className="mt-0.5" />He revisado el cambio de paquete. Los adicionales se conservarán; las opciones incluidas se restablecerán a las del paquete elegido.</label>
      <button type="button" disabled={!acknowledged} onClick={adoptPackage} className="w-full rounded-xl bg-enkarta-dark px-3 py-2 text-xs text-white disabled:opacity-40">{current ? 'Aplicar cambio de paquete' : 'Registrar paquete y conservar excepciones'}</button>
    </div>}
    {current && <>
      <p className="text-xs text-gray-500">Contrato activo: <strong>{PACKAGE_CATALOG[config.package!].label}</strong>. Puedes ocultar una función incluida sin cambiar el contrato.</p>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 px-3">{SERVICE_FIELDS.map(field => {
        const extra = extras.find(item => item.feature === field.key);
        const granted = entitlements[field.key];
        return <div key={field.key} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0"><p className="text-xs font-medium text-gray-700">{field.label}</p><p className="mt-0.5 text-[11px] text-gray-500">{extra ? extra.source === 'legacy' ? 'Acuerdo anterior' : 'Adicional registrado' : 'Paquete base'} · {display(granted)}</p></div>
          {field.kind === 'boolean' ? <input type="checkbox" aria-label={`Mostrar ${field.label}`} checked={Boolean(active[field.key])} disabled={!granted} onChange={e => setFeature(field.key, e.target.checked)} /> : field.kind === 'number' ? <input aria-label="Máximo de fotos visibles" type="number" min={0} max={entitlements.galleryMax} value={active.galleryMax} onChange={e => setFeature('galleryMax', Number(e.target.value))} className="w-16 rounded-lg border border-gray-200 p-1.5 text-xs" /> : <span className="max-w-[110px] text-right text-[11px] text-gray-500">{RSVP_LABELS[active.rsvpMode]}</span>}
        </div>;
      })}</div>
      <div className="space-y-3 rounded-2xl border border-[#e7dcc7] bg-[#fcfaf6] p-3">
        <h4 className="text-xs font-semibold text-gray-800">Registrar adicional o excepción</h4>
        <label className="block text-xs text-gray-600">Servicio<select value={feature} onChange={e => { const f = SERVICE_FIELDS.find(item => item.key === e.target.value)!; updateForm({ feature: f.key, value: f.kind === 'number' ? '12' : f.kind === 'rsvp' ? 'form' : 'true' }); }} className={fieldClass}>{SERVICE_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label>
        <label className="block text-xs text-gray-600">Valor acordado{SERVICE_FIELDS.find(f => f.key === feature)!.kind === 'number' ? <input type="number" min={0} max={99} value={value} onChange={e => updateForm({ value: e.target.value })} className={fieldClass} /> : <select value={value} onChange={e => updateForm({ value: e.target.value })} className={fieldClass}>{feature === 'rsvpMode' ? Object.entries(RSVP_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>) : <><option value="true">Incluido</option><option value="false">No incluido</option></>}</select>}</label>
        {((feature === 'qrAccess' && value === 'true') || (feature === 'rsvpMode' && value === 'smart') || (feature === 'hostPanel' && value === 'true')) && <p className="text-[11px] leading-relaxed text-amber-800">Este servicio requiere permisos relacionados. Se registrarán también nombres y panel operativo; para QR, además, pases y formulario. Todos quedarán asociados al mismo motivo.</p>}
        <label className="block text-xs text-gray-600">Motivo o referencia del acuerdo<textarea maxLength={300} value={reason} onChange={e => updateForm({ reason: e.target.value })} placeholder="Ej.: adicional acordado con el cliente el 28/08" className={fieldClass} /></label>
        <button type="button" disabled={reason.trim().length < 3} onClick={addExtra} className="w-full rounded-xl bg-enkarta-dark p-2.5 text-xs text-white disabled:opacity-40">Registrar adicional</button>
      </div>
      {extras.length > 0 && <ul className="space-y-2">{extras.map(extra => <li key={extra.id} className="rounded-xl border border-gray-200 p-3 text-xs"><div className="flex justify-between gap-2"><strong className="text-gray-700">{SERVICE_FIELDS.find(f => f.key === extra.feature)?.label}: {display(extra.value)}</strong><button type="button" aria-label={`Quitar adicional ${extra.feature}`} className="text-red-600" onClick={() => removeExtra(extra.id)}>Quitar</button></div><p className="mt-1 break-words text-gray-500">{extra.reason}</p><p className="mt-1 text-[10px] text-gray-400">{extra.source === 'legacy' ? 'Acuerdo anterior' : 'Adicional'} · {extra.recordedAt.slice(0, 10)}</p></li>)}</ul>}
    </>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
  </section>;
}
