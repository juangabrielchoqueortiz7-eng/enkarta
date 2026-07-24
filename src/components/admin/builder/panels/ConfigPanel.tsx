'use client';

import { useState, useEffect } from 'react';
import { InvitationParsed, InvitationTemplate, InvitationPackage } from '@/lib/types';
import { PACKAGE_PRESETS, PACKAGE_LABELS, resolveFeatures } from '@/lib/packages';
import type { BuilderValidation } from '@/lib/builder-validation';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
  onDelete?: () => void;
  validation: BuilderValidation;
}

const PREMIUM_TEMPLATES: { value: InvitationTemplate; label: string; available: boolean }[] = [
  { value: 'azure',     label: 'Azure',      available: true  },
  { value: 'primicia',  label: 'Primicia',   available: true  },
  { value: 'passport',  label: 'Passport',   available: true  },
  { value: 'paradise',  label: 'Paradise',   available: true  },
  { value: 'obsidiana', label: 'Obsidiana',  available: true  },
  { value: 'dolcevita', label: 'Dolce Vita', available: true  },
  { value: 'grazia',    label: 'Grazia',     available: true  },
  { value: 'carmesi_v2', label: 'Carmesí',   available: true  },
  { value: 'napoly',    label: 'Napoly',     available: true  },
  { value: 'perla_v2',  label: 'Perla',      available: false },
  { value: 'euforia',   label: 'Euforia',    available: true  },
  { value: 'rosegold',  label: 'Rose Gold',  available: true  },
  { value: 'allegria',  label: 'Allegria',   available: true  },
  { value: 'provenza',  label: 'Provenza',   available: true  },
];

function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
      <p className="text-xs text-gray-500 font-outfit mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs text-gray-600 truncate font-mono">{url}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(`https://${url}`).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }).catch(() => {});
          }}
          className="px-2.5 py-1 text-xs font-outfit rounded-lg border border-gray-200 hover:bg-white transition-colors flex-shrink-0"
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}

// Acceso del cliente: correo + contraseña con que el anfitrión entra a /panel a
// gestionar SUS invitados y el escáner. Lo fija el equipo Enkarta.
function HostAccessSection({ id }: { id: string; slug: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deadline, setDeadline] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/host-credentials?id=${id}`)
      .then(r => r.json())
      .then(d => { setEmail(d.hostEmail || ''); setHasPassword(!!d.hasPassword); setDeadline(d.rsvpDeadline ? String(d.rsvpDeadline).slice(0, 10) : ''); })
      .catch(() => {});
  }, [id]);

  const save = () => {
    setSaving(true);
    fetch('/api/admin/host-credentials', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, email, password: password || undefined, rsvpDeadline: deadline }),
    })
      .then(r => r.json())
      .then(() => { if (password) setHasPassword(true); setPassword(''); setSaved(true); setTimeout(() => setSaved(false), 2000); })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://enkarta.com';

  return (
    <div className="border-t border-gray-100 pt-5">
      <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-1">🔐 Acceso del Cliente</h4>
      <p className="text-xs text-gray-400 font-outfit mb-3">
        Credenciales para que el cliente entre a <code className="text-gray-500">{base}/panel</code> a gestionar sus
        invitados y el control de acceso. No verá el diseño ni el panel de administración.
      </p>
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-gray-500 font-outfit mb-1">Correo del cliente</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@correo.com" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none font-outfit" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-outfit mb-1">
            Contraseña {hasPassword && <span className="text-green-600">· ya configurada</span>}
          </label>
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder={hasPassword ? 'Escribe para cambiarla' : 'Define una contraseña'} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none font-outfit" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-outfit mb-1">Fecha límite de confirmación</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none font-outfit" />
          <p className="text-[11px] text-gray-400 font-outfit mt-1">Pasada esta fecha, el formulario de confirmación se bloquea para los invitados.</p>
        </div>
        <button type="button" onClick={save} disabled={saving || !email} className="w-full py-2.5 rounded-xl bg-enkarta-dark text-white text-sm font-outfit font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar acceso del cliente'}
        </button>
        <p className="text-[11px] text-gray-400 font-outfit text-center">
          Comparte con el cliente: <strong>{base}/panel</strong> + su correo y contraseña.
        </p>
      </div>
    </div>
  );
}

export default function ConfigPanel({ data, onChange, onDelete, validation }: Props) {
  // Calcular si está expirada
  const isExpired = data.expires_at ? new Date(data.expires_at) < new Date() : false;

  return (
    <div className="space-y-6 p-4">

      {/* Acceso del cliente (panel /panel) */}
      <HostAccessSection id={data.id} slug={data.slug} />

      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Checklist de Publicación</h4>
        <div className={`p-3 rounded-xl border mb-3 ${
          validation.errors.length
            ? 'bg-red-50 border-red-200 text-red-700'
            : validation.warnings.length
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <p className="text-sm font-outfit font-medium">
            {validation.errors.length
              ? `Hay ${validation.errors.length} error(es) que bloquean la publicación`
              : validation.warnings.length
                ? `Hay ${validation.warnings.length} advertencia(s) para revisar`
                : 'La invitación está lista para publicar'}
          </p>
          <p className="text-xs mt-0.5">
            El botón Publicar ahora valida nombres, fecha, RSVP, galería, paquete y estructura visible.
          </p>
        </div>
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="space-y-2">
            {validation.errors.map((issue, i) => (
              <div key={`err-${i}`} className="p-2.5 rounded-xl border border-red-100 bg-red-50">
                <p className="text-sm text-red-700 font-outfit font-medium">{issue.title}</p>
                <p className="text-xs text-red-500 font-outfit mt-0.5">{issue.detail}</p>
              </div>
            ))}
            {validation.warnings.map((issue, i) => (
              <div key={`warn-${i}`} className="p-2.5 rounded-xl border border-amber-100 bg-amber-50">
                <p className="text-sm text-amber-700 font-outfit font-medium">{issue.title}</p>
                <p className="text-xs text-amber-600 font-outfit mt-0.5">{issue.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estado del link */}
      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Estado del Link</h4>

        <div className={`p-3 rounded-xl border mb-3 ${
          !data.is_active
            ? 'bg-red-50 border-red-200 text-red-700'
            : isExpired
            ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          <p className="text-sm font-outfit font-medium">
            {!data.is_active ? '🔴 Link dado de baja' : isExpired ? '⏰ Link vencido' : '🟢 Link activo'}
          </p>
          <p className="text-xs mt-0.5">
            {!data.is_active
              ? 'Los invitados verán una página de "evento terminado"'
              : isExpired
              ? 'La fecha de expiración ya pasó'
              : `enkarta.com/i/${data.slug}`}
          </p>
        </div>

        {/* Toggle activo/inactivo */}
        <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-outfit text-gray-700">Invitación activa</p>
            <p className="text-xs text-gray-400 font-outfit">Desactívala para dar de baja el link</p>
          </div>
          <div
            onClick={() => onChange({ is_active: !data.is_active })}
            className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${data.is_active ? 'bg-enkarta-gold' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${data.is_active ? 'left-7' : 'left-1'}`} />
          </div>
        </label>
      </div>

      {/* Paquete contratado */}
      {(() => {
        const cfg = data.config ?? {};
        const feats = resolveFeatures(cfg);
        const setPackage = (pkg: InvitationPackage | '') =>
          onChange({ config: { ...cfg, package: pkg || undefined, features: undefined } });
        const setFeature = (key: keyof NonNullable<typeof cfg.features>, value: boolean | number) =>
          onChange({ config: { ...cfg, features: { ...(cfg.features ?? {}), [key]: value } } });
        const TOGGLES: { key: 'music' | 'guestNames' | 'passes' | 'lodging' | 'calendar' | 'smartRsvp'; label: string }[] = [
          { key: 'smartRsvp',  label: '🤖 Confirmación inteligente' },
          { key: 'music',      label: '🎵 Música de fondo' },
          { key: 'guestNames', label: '👤 Nombre del invitado' },
          { key: 'passes',     label: '🎟️ Tickets / pases' },
          { key: 'lodging',    label: '🏨 Sugerencia de hospedaje' },
          { key: 'calendar',   label: '📅 Agendar (Google Calendar)' },
        ];
        return (
          <div className="border-t border-gray-100 pt-5">
            <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">📦 Paquete del Cliente</h4>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {([['', 'Libre'], ['exclusive', PACKAGE_LABELS.exclusive], ['premium', PACKAGE_LABELS.premium], ['plus', PACKAGE_LABELS.plus]] as const).map(([v, label]) => (
                <button
                  key={v || 'none'}
                  type="button"
                  onClick={() => setPackage(v)}
                  className={`py-2 rounded-xl border-2 text-xs font-outfit transition-all ${
                    (cfg.package ?? '') === v
                      ? 'border-enkarta-gold bg-enkarta-gold/5 text-enkarta-gold font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {!cfg.package ? (
              <p className="text-xs text-gray-400 font-outfit">
                Sin paquete asignado: todas las funciones están activas. Elige el paquete que
                contrató el cliente y la invitación mostrará solo lo incluido (puedes ajustar
                cada función abajo si pagó extras).
              </p>
            ) : (
              <div className="space-y-2">
                {TOGGLES.map(({ key, label }) => {
                  const on = feats[key] as boolean;
                  const included = PACKAGE_PRESETS[cfg.package!][key] as boolean;
                  return (
                    <label key={key} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50">
                      <div>
                        <p className="text-sm font-outfit text-gray-700">{label}</p>
                        <p className="text-[11px] text-gray-400 font-outfit">
                          {included ? 'Incluida en el paquete' : 'No incluida'}{on !== included && ' · ajustada manualmente'}
                        </p>
                      </div>
                      <div
                        onClick={() => setFeature(key, !on)}
                        className={`w-11 h-6 rounded-full transition-all cursor-pointer relative flex-shrink-0 ${on ? 'bg-enkarta-gold' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
                      </div>
                    </label>
                  );
                })}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50">
                  <div>
                    <p className="text-sm font-outfit text-gray-700">📷 Galería de fotos</p>
                    <p className="text-[11px] text-gray-400 font-outfit">Máximo de fotos visibles</p>
                  </div>
                  <select
                    value={feats.galleryMax}
                    onChange={e => setFeature('galleryMax', parseInt(e.target.value))}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:border-enkarta-gold outline-none font-outfit"
                  >
                    {[0, 8, 12, 20, 99].map(n => (
                      <option key={n} value={n}>{n === 0 ? 'Sin galería' : n === 99 ? 'Ilimitada' : `${n} fotos`}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-gray-400 font-outfit">
                  El sobre de entrada {feats.entry ? 'está incluido' : 'no está incluido'} en este
                  paquete; puedes forzarlo en la sección Pantalla de Entrada.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Pantalla de entrada / sobre */}
      {(() => {
        const cfg = data.config ?? {};
        const entry = cfg.entry ?? {};
        const enabled = entry.enabled ?? resolveFeatures(cfg).entry;
        const base = `enkarta.com/i/${data.slug}`;
        const setEntry = (patch: { enabled?: boolean; label?: string }) =>
          onChange({ config: { ...cfg, entry: { ...entry, ...patch } } });
        return (
          <div className="border-t border-gray-100 pt-5">
            <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">✉️ Pantalla de Entrada</h4>

            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-outfit text-gray-700">Mostrar portada / sobre</p>
                <p className="text-xs text-gray-400 font-outfit">El invitado pulsa &quot;Ver invitación&quot; para entrar</p>
              </div>
              <div
                onClick={() => setEntry({ enabled: !enabled })}
                className={`w-12 h-6 rounded-full transition-all cursor-pointer relative flex-shrink-0 ${enabled ? 'bg-enkarta-gold' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-7' : 'left-1'}`} />
              </div>
            </label>

            {enabled && (
              <div className="mt-3">
                <label className="block text-xs text-gray-500 font-outfit mb-1">Texto del botón</label>
                <input
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
                  value={entry.label ?? ''}
                  onChange={e => setEntry({ label: e.target.value })}
                  placeholder="Ver invitación"
                />
              </div>
            )}

            {/* Los 2 enlaces */}
            <div className="mt-3 space-y-2">
              <LinkRow label="🔗 Enlace principal (con portada)" url={base} />
              <LinkRow label="➡️ Enlace directo (sin portada)" url={`${base}?full=1`} />
            </div>
          </div>
        );
      })()}

      {/* Expiración */}
      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">⏰ Expiración Automática</h4>

        <div>
          <label className="block text-xs text-gray-500 font-outfit mb-1">Fecha de expiración (opcional)</label>
          <input
            type="date"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
            value={data.expires_at?.slice(0, 10) ?? ''}
            onChange={e => onChange({ expires_at: e.target.value || null })}
          />
          <p className="text-xs text-gray-400 font-outfit mt-1">
            El link se desactivará automáticamente en esta fecha. Dejar vacío = sin expiración.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: '+7 días',  days: 7 },
            { label: '+30 días', days: 30 },
            { label: '+90 días', days: 90 },
          ].map(({ label, days }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + days);
                onChange({ expires_at: d.toISOString().slice(0, 10) });
              }}
              className="py-2 text-xs font-outfit rounded-xl border border-gray-200 hover:border-enkarta-gold/50 hover:bg-enkarta-gold/5 text-gray-600 transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Plantilla */}
      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">🎨 Plantilla</h4>
        <div className="grid grid-cols-3 gap-2">
          {PREMIUM_TEMPLATES.map(t => (
            <button
              key={t.value}
              type="button"
              disabled={!t.available}
              onClick={() => t.available && onChange({ template: t.value })}
              className={`p-2 rounded-xl border-2 text-center transition-all text-xs font-outfit ${
                data.template === t.value
                  ? 'border-enkarta-gold bg-enkarta-gold/5 text-enkarta-gold font-medium'
                  : t.available
                  ? 'border-gray-200 hover:border-gray-300 text-gray-700'
                  : 'border-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              {t.label}
              {!t.available && <span className="block text-gray-300" style={{ fontSize: 9 }}>Próx.</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">📊 Estadísticas</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl text-center">
            <p className="text-2xl font-playfair text-enkarta-gold">{data.views_count ?? 0}</p>
            <p className="text-xs text-gray-500 font-outfit">Vistas totales</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl text-center">
            <p className="text-2xl font-playfair text-enkarta-gold">{data.guest_passes}</p>
            <p className="text-xs text-gray-500 font-outfit">Pases asignados</p>
          </div>
        </div>
      </div>

      {/* Peligro */}
      {onDelete && (
        <div className="border-t border-red-100 pt-5">
          <h4 className="text-xs font-outfit font-semibold text-red-400 uppercase tracking-wider mb-3">Zona de Peligro</h4>
          <button
            type="button"
            onClick={onDelete}
            className="w-full py-2.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-outfit hover:bg-red-50 transition-all"
          >
            🗑️ Eliminar invitación permanentemente
          </button>
        </div>
      )}

    </div>
  );
}
