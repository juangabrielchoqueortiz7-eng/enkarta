'use client';

import { useEffect, useState } from 'react';
import type { BuilderConfig } from '@/lib/types';
import { allowsService } from '@/lib/packages';

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
  const title = scope === 'door' ? 'Personal de puerta' : scope === 'review' ? 'Revisión del diseño' : operational ? 'Gestión del evento' : 'Consulta de confirmaciones';
  const path = scope === 'door' ? '/puerta' : scope === 'review' ? '/revision' : '/panel';
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    fetch(`/api/admin/host-credentials?id=${encodeURIComponent(id)}&scope=${scope}`).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el acceso');
      if (active) { setEmail(data.email || ''); setHasPassword(!!data.hasPassword); setDeadline(String(data.rsvpDeadline || '').slice(0, 10)); }
    }).catch(e => { if (active) setLoadError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, scope]);
  const save = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/host-credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, scope, email, password: password || undefined, ...(scope === 'host' ? { rsvpDeadline: deadline } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar');
      setHasPassword(email ? !!password || hasPassword : false); setPassword(''); setMessage(email ? 'Acceso guardado. Comparte estas credenciales por un canal seguro.' : 'Acceso deshabilitado.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
    finally { setSaving(false); }
  };
  return <details className="rounded-2xl border border-gray-200 bg-white p-3" open={scope === 'review'}>
    <summary className="cursor-pointer text-xs font-semibold text-gray-700">{title} · {path}</summary>
    <p className="my-3 text-xs leading-relaxed text-gray-500">{scope === 'door' ? 'Acceso independiente para el equipo de puerta de este evento: validar QR o código y registrar entradas/salidas. Sin lista completa, exportaciones, edición ni diseño. La sesión dura 12 horas.' : scope === 'review' ? 'Solo permite ver el borrador y comentar. Sin invitados, planilla ni QR.' : operational ? 'Permite gestionar invitados. El escáner se habilita únicamente si está incluido.' : 'Solo lectura y exportación de respuestas. Sin edición de invitados ni escáner.'}</p>
    {loading ? <p className="text-xs text-gray-400">Cargando acceso…</p> : loadError ? <p role="alert" className="text-xs text-red-700">{loadError}</p> : <div className="space-y-3">
      <label className="block text-xs text-gray-600">Correo · {title}<input type="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border p-2 text-sm" /></label>
      <label className="block text-xs text-gray-600">Contraseña · {title}{hasPassword && <span className="text-green-700"> · configurada</span>}<input type="password" autoComplete="new-password" minLength={8} maxLength={200} value={password} onChange={e => setPassword(e.target.value)} placeholder={hasPassword ? 'Vacío para conservarla' : 'Mínimo 8 caracteres'} className="mt-1 w-full rounded-xl border p-2 text-sm" /></label>
      {scope === 'host' && <label className="block text-xs text-gray-600">Fecha límite de confirmación<input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="mt-1 w-full rounded-xl border p-2 text-sm" /></label>}
      <p className="text-[11px] text-gray-500">Borra el correo y guarda para deshabilitar este acceso. Cambiar la contraseña también cierra sus sesiones anteriores. Cada acceso es independiente.</p>
      <button type="button" onClick={save} disabled={saving} className="w-full rounded-xl bg-enkarta-dark p-2.5 text-xs text-white disabled:opacity-50">{saving ? 'Guardando…' : `Guardar ${title.toLowerCase()}`}</button>
      {message && <p role="status" className="text-xs text-green-700">{message}</p>}{error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>}
  </details>;
}

export default function ServiceAccessPanel({ id, config }: { id: string; config: BuilderConfig }) {
  const operational = allowsService(config, 'hostPanel');
  return <section className="space-y-3 font-outfit"><h3 className="text-sm font-semibold text-gray-800">Accesos privados separados</h3><AccessForm id={id} scope="review" operational={false} />{operational || allowsService(config, 'rsvp') ? <AccessForm id={id} scope="host" operational={operational} /> : <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">Este paquete confirma por WhatsApp. No incluye planilla ni panel operativo.</p>}<AccessForm id={id} scope="door" operational={false} />{!allowsService(config, 'qrAccess') && <p className="text-xs text-gray-500">Para activar puerta se necesita el servicio QR. Puedes revocar un acceso anterior aunque ya no esté incluido.</p>}</section>;
}
