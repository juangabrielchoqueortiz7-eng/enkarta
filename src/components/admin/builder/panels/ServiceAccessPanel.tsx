'use client';

import { useEffect, useRef, useState } from 'react';
import type { BuilderConfig } from '@/lib/types';
import { allowsService } from '@/lib/packages';

const UNCONFIRMED_SAVE_MESSAGE = 'No pudimos confirmar si el acceso se guardó. Conservamos los datos del editor; la solicitud puede haberse recibido y no se reintentó automáticamente.';

function AccessForm({ id, scope, operational }: { id: string; scope: 'review' | 'host' | 'door'; operational: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deadline, setDeadline] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState<{ email: string; deadline: string; passwordRevision: number } | null>(null);
  const draft = useRef({ email: '', password: '', deadline: '', passwordRevision: 0 });
  const persistedPassword = useRef(false);
  const mounted = useRef(false), ready = useRef(false), generation = useRef(0);
  const operation = useRef<{ generation: number } | null>(null);
  const contextGeneration = generation.current;
  const title = scope === 'door' ? 'Personal de puerta' : scope === 'review' ? 'Revisión del diseño' : operational ? 'Gestión del evento' : 'Consulta de confirmaciones';
  const path = scope === 'door' ? '/puerta' : scope === 'review' ? '/revision' : '/panel';
  useEffect(() => {
    let active = true;
    const cycle = generation.current + 1;
    generation.current = cycle;
    mounted.current = true; ready.current = false; operation.current = null;
    setLoading(true); setLoadError(''); setSaving(false); setMessage(''); setError(''); setAcknowledged(null);
    const current = () => active && mounted.current && generation.current === cycle;
    fetch(`/api/admin/host-credentials?id=${encodeURIComponent(id)}&scope=${scope}`).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el acceso');
      if (current()) {
        draft.current = { email: data.email || '', password: '', deadline: String(data.rsvpDeadline || '').slice(0, 10), passwordRevision: 0 };
        persistedPassword.current = !!data.hasPassword;
        setEmail(draft.current.email); setPassword(''); setHasPassword(persistedPassword.current); setDeadline(draft.current.deadline);
        ready.current = true;
      }
    }).catch(e => { if (current()) setLoadError(e instanceof Error ? e.message : 'No se pudo cargar el acceso'); }).finally(() => { if (current()) setLoading(false); });
    return () => {
      active = false;
      if (generation.current === cycle) { mounted.current = false; ready.current = false; operation.current = null; }
    };
  }, [id, scope]);
  const edit = (field: 'email' | 'password' | 'deadline', value: string) => {
    if (!mounted.current || !ready.current || generation.current !== contextGeneration) return;
    draft.current = { ...draft.current, [field]: value, passwordRevision: draft.current.passwordRevision + (field === 'password' ? 1 : 0) };
    if (field === 'email') setEmail(value);
    else if (field === 'password') setPassword(value);
    else setDeadline(value);
  };
  const save = async () => {
    if (!mounted.current || !ready.current || generation.current !== contextGeneration || operation.current) return;
    const attempt = { generation: generation.current };
    const submitted = { ...draft.current, hasPassword: persistedPassword.current };
    operation.current = attempt;
    const current = () => mounted.current && ready.current && generation.current === attempt.generation && operation.current === attempt;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/host-credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, scope, email: submitted.email, password: submitted.password || undefined, ...(scope === 'host' ? { rsvpDeadline: submitted.deadline } : {}) }) });
      const data = await response.json();
      if (!current()) return;
      if (!response.ok) { setError(typeof data?.error === 'string' && data.error ? data.error : 'No se pudo guardar'); return; }
      if (data?.ok !== true) { setError(UNCONFIRMED_SAVE_MESSAGE); return; }
      persistedPassword.current = submitted.email.trim() ? !!submitted.password || submitted.hasPassword : false;
      setHasPassword(persistedPassword.current);
      if (draft.current.passwordRevision === submitted.passwordRevision) { draft.current = { ...draft.current, password: '' }; setPassword(''); }
      setAcknowledged({ email: submitted.email, deadline: submitted.deadline, passwordRevision: submitted.passwordRevision });
      setMessage(submitted.email.trim() ? 'Acceso guardado. Comparte estas credenciales por un canal seguro.' : 'Acceso deshabilitado.');
    } catch {
      if (current()) setError(UNCONFIRMED_SAVE_MESSAGE);
    } finally {
      if (current()) { operation.current = null; setSaving(false); }
    }
  };
  const laterChanges = acknowledged && (email !== acknowledged.email || (scope === 'host' && deadline !== acknowledged.deadline) || draft.current.passwordRevision !== acknowledged.passwordRevision);
  return <details className="rounded-2xl border border-gray-200 bg-white p-3" open={scope === 'review'}>
    <summary className="cursor-pointer text-xs font-semibold text-gray-700">{title} · {path}</summary>
    <p className="my-3 text-xs leading-relaxed text-gray-500">{scope === 'door' ? 'Acceso independiente para el equipo de puerta de este evento: validar QR o código y registrar entradas/salidas. Sin lista completa, exportaciones, edición ni diseño. La sesión dura 12 horas.' : scope === 'review' ? 'Solo permite ver el borrador y comentar. Sin invitados, planilla ni QR.' : operational ? 'Permite gestionar invitados. El escáner se habilita únicamente si está incluido.' : 'Solo lectura y exportación de respuestas. Sin edición de invitados ni escáner.'}</p>
    {loading ? <p className="text-xs text-gray-400">Cargando acceso…</p> : loadError ? <p role="alert" className="text-xs text-red-700">{loadError}</p> : <div className="space-y-3">
      <label className="block text-xs text-gray-600">Correo · {title}<input type="email" autoComplete="off" value={email} onChange={e => edit('email', e.target.value)} className="mt-1 w-full rounded-xl border p-2 text-sm" /></label>
      <label className="block text-xs text-gray-600">Contraseña · {title}{hasPassword && <span className="text-green-700"> · configurada</span>}<input type="password" autoComplete="new-password" minLength={8} maxLength={200} value={password} onChange={e => edit('password', e.target.value)} placeholder={hasPassword ? 'Vacío para conservarla' : 'Mínimo 8 caracteres'} className="mt-1 w-full rounded-xl border p-2 text-sm" /></label>
      {scope === 'host' && <label className="block text-xs text-gray-600">Fecha límite de confirmación<input type="date" value={deadline} onChange={e => edit('deadline', e.target.value)} className="mt-1 w-full rounded-xl border p-2 text-sm" /></label>}
      <p className="text-[11px] text-gray-500">Borra el correo y guarda para deshabilitar este acceso. Cambiar la contraseña también cierra sus sesiones anteriores. Cada acceso es independiente.</p>
      <button type="button" onClick={save} disabled={saving} aria-busy={saving || undefined} className="w-full rounded-xl bg-enkarta-dark p-2.5 text-xs text-white disabled:opacity-50">{saving ? 'Guardando…' : `Guardar ${title.toLowerCase()}`}</button>
      {message && <p role="status" className="text-xs text-green-700">{message}{laterChanges && ' Hay cambios posteriores sin guardar.'}</p>}{error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>}
  </details>;
}

export default function ServiceAccessPanel({ id, config }: { id: string; config: BuilderConfig }) {
  const operational = allowsService(config, 'hostPanel');
  return <section className="space-y-3 font-outfit"><h3 className="text-sm font-semibold text-gray-800">Accesos privados separados</h3><AccessForm key={`${id}:review`} id={id} scope="review" operational={false} />{operational || allowsService(config, 'rsvp') ? <AccessForm key={`${id}:host`} id={id} scope="host" operational={operational} /> : <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">Este paquete confirma por WhatsApp. No incluye planilla ni panel operativo.</p>}<AccessForm key={`${id}:door`} id={id} scope="door" operational={false} />{!allowsService(config, 'qrAccess') && <p className="text-xs text-gray-500">Para activar puerta se necesita el servicio QR. Puedes revocar un acceso anterior aunque ya no esté incluido.</p>}</section>;
}
