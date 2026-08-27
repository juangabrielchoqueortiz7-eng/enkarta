'use client';

import { useState, useEffect } from 'react';
import { BuilderConfig, InvitationParsed, InvitationTemplate, InvitationPackage } from '@/lib/types';
import { PACKAGE_PRESETS, PACKAGE_LABELS, resolveFeatures } from '@/lib/packages';
import type { BuilderValidation } from '@/lib/builder-validation';
import { ENKARTA_COLLECTIONS } from '@/lib/enkarta-collections';
import PublicationAuditPanel from '../PublicationAuditPanel';
import ImageUploader from '../ImageUploader';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
  onDelete?: () => void;
  validation: BuilderValidation;
  onOpenBlock?: (blockId: string) => void;
}

const PREMIUM_TEMPLATES: { value: InvitationTemplate; label: string; available: boolean }[] = [
  ...(['azure', 'primicia', 'passport', 'paradise', 'obsidiana', 'dolcevita', 'grazia', 'carmesi_v2', 'napoly', 'perla_v2', 'euforia', 'rosegold', 'allegria'] as InvitationTemplate[])
    .map(value => ({ value, label: ENKARTA_COLLECTIONS[value].name, available: ENKARTA_COLLECTIONS[value].available })),
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

export default function ConfigPanel({ data, onChange, onDelete, validation, onOpenBlock }: Props) {
  // Calcular si está expirada
  const isExpired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
  const publicationPaused = data.status === 'disabled';

  return (
    <div className="space-y-6 p-4">

      {/* Acceso del cliente (panel /panel) */}
      <HostAccessSection id={data.id} slug={data.slug} />

      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Checklist de Publicación</h4>
        <PublicationAuditPanel data={data} validation={validation} onOpenBlock={onOpenBlock} />
      </div>

      {/* Estado del link */}
      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Estado del Link</h4>

        <div className={`p-3 rounded-xl border mb-3 ${
          publicationPaused || !data.is_active
            ? 'bg-red-50 border-red-200 text-red-700'
            : isExpired
            ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          <p className="text-sm font-outfit font-medium">
            {publicationPaused ? '⏸ Publicación pausada' : !data.is_active ? '🔴 Link deshabilitado' : isExpired ? '⏰ Link vencido' : data.status === 'ready' ? '🟢 Invitación publicada' : '🟣 Vista privada disponible'}
          </p>
          <p className="text-xs mt-0.5">
            {publicationPaused
              ? 'Los invitados verán una pausa temporal; el historial permanece intacto'
              : !data.is_active
              ? 'Los invitados verán una página de "evento terminado"'
              : isExpired
              ? 'La fecha de expiración ya pasó'
              : data.status === 'ready'
              ? `enkarta.com/i/${data.slug}`
              : 'Publica ahora o programa una fecha desde el botón Publicar'}
          </p>
        </div>

        {/* Toggle activo/inactivo */}
        <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-outfit text-gray-700">Link habilitado</p>
            <p className="text-xs text-gray-400 font-outfit">Control técnico independiente del estado de publicación</p>
          </div>
          <div
            onClick={() => onChange({ is_active: !data.is_active })}
            className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${data.is_active ? 'bg-enkarta-gold' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${data.is_active ? 'left-7' : 'left-1'}`} />
          </div>
        </label>
      </div>

      {/* Privacidad y retención de analítica */}
      <div className="border-t border-gray-100 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div><h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-outfit">Analítica y privacidad</h4><p className="mt-1 text-[11px] leading-relaxed text-gray-400 font-outfit">Mide el recorrido de forma agregada, sin guardar IP, teléfono, nombre ni mensajes.</p></div>
          <button type="button" role="switch" aria-checked={data.config?.analytics?.enabled !== false} onClick={() => onChange({ config: { ...(data.config ?? {}), analytics: { ...(data.config?.analytics ?? {}), enabled: data.config?.analytics?.enabled === false } } })} className={`relative mt-0.5 h-6 w-12 shrink-0 rounded-full transition ${data.config?.analytics?.enabled === false ? 'bg-gray-300' : 'bg-emerald-500'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${data.config?.analytics?.enabled === false ? 'left-1' : 'left-7'}`}/><span className="sr-only">Activar analítica</span></button>
        </div>
        <div className={`mt-3 rounded-2xl border p-3 transition ${data.config?.analytics?.enabled === false ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-emerald-100 bg-emerald-50/50'}`}>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 font-outfit">Conservar métricas durante</label>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {([30, 90, 180, 365] as const).map(days => <button key={days} type="button" disabled={data.config?.analytics?.enabled === false} onClick={() => onChange({ config: { ...(data.config ?? {}), analytics: { ...(data.config?.analytics ?? {}), enabled: true, retentionDays: days } } })} className={`rounded-xl border px-1 py-2 text-[10px] font-semibold transition font-outfit ${(data.config?.analytics?.retentionDays ?? 180) === days ? 'border-emerald-300 bg-white text-emerald-700 shadow-sm' : 'border-transparent bg-white/50 text-gray-400 hover:border-emerald-100'}`}>{days === 365 ? '1 año' : `${days} días`}</button>)}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-gray-400 font-outfit">Los eventos anteriores al periodo elegido se eliminan automáticamente. Los reportes solo muestran totales y sesiones anónimas.</p>
        </div>
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
        const style = entry.style ?? 'template';
        const setEntry = (patch: Partial<NonNullable<BuilderConfig['entry']>>) =>
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
              <div className="mt-3 space-y-4">
                <div>
                  <label className="mb-2 block text-xs text-gray-500 font-outfit">Estilo de entrada</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'template', icon: '✉️', label: 'De la plantilla', hint: 'Sobre o escena original' },
                      { value: 'cinematic', icon: '🎞️', label: 'Sobre cinematográfico', hint: 'Video corto de apertura' },
                    ] as const).map(option => (
                      <button key={option.value} type="button" onClick={() => setEntry({ style: option.value })} className={`rounded-2xl border p-3 text-left transition-all ${style === option.value ? 'border-enkarta-gold bg-enkarta-gold/5 shadow-sm' : 'border-gray-200 bg-white hover:border-enkarta-gold/40'}`}>
                        <span className="text-xl" aria-hidden>{option.icon}</span>
                        <span className="mt-1 block text-xs font-semibold text-gray-700 font-outfit">{option.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-tight text-gray-400 font-outfit">{option.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {style === 'cinematic' && (
                  <div className="space-y-4 rounded-2xl border border-[#eadfce] bg-[#fbf8f3] p-3">
                    <div>
                      <p className="text-xs font-semibold text-[#6e5c43] font-outfit">Clip de apertura</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-[#91816d] font-outfit">Al tocar el sello se reproduce el clip y después aparece la invitación. La música comienza con el mismo gesto.</p>
                    </div>
                    <ImageUploader
                      kind="video"
                      value={entry.videoUrl ?? ''}
                      onChange={videoUrl => setEntry({ videoUrl })}
                      folder="entry"
                      ownerId={data.id}
                      aspect="portrait"
                      maxBytes={6 * 1024 * 1024}
                      maxDurationSeconds={8}
                      hint="Usa MP4/WebM vertical de 3–5 s y menos de 6 MB. GIF/WebP también son compatibles."
                    />
                    <ImageUploader
                      value={entry.poster ?? ''}
                      onChange={poster => setEntry({ poster })}
                      folder="entry-posters"
                      ownerId={data.id}
                      aspect="portrait"
                      hint="Foto vertical de respaldo: evita pantallas negras y se usa cuando el dispositivo reduce movimiento."
                    />
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[10px] font-outfit"><span className="text-gray-500">Duración máxima</span><span className="font-semibold text-enkarta-gold">{entry.duration ?? 4} s</span></div>
                      <input type="range" min={2} max={8} step={0.5} value={entry.duration ?? 4} onChange={e => setEntry({ duration: parseFloat(e.target.value) })} className="w-full accent-enkarta-gold" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[10px] font-outfit"><span className="text-gray-500">Oscurecimiento</span><span className="font-semibold text-enkarta-gold">{entry.overlay ?? 42}%</span></div>
                      <input type="range" min={0} max={80} step={1} value={entry.overlay ?? 42} onChange={e => setEntry({ overlay: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
                    </div>
                    <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                      <span><span className="block text-xs text-gray-700 font-outfit">Permitir omitir</span><span className="block text-[10px] text-gray-400 font-outfit">El invitado puede entrar inmediatamente</span></span>
                      <input type="checkbox" checked={entry.showSkip ?? true} onChange={e => setEntry({ showSkip: e.target.checked })} className="h-4 w-4 accent-enkarta-gold" />
                    </label>
                    {(entry.showSkip ?? true) && <input className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-enkarta-gold font-outfit" value={entry.skipLabel ?? ''} onChange={e => setEntry({ skipLabel: e.target.value })} placeholder="Omitir animación" />}
                    <a href={`/i/${data.slug}?preview=1`} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center justify-center rounded-xl bg-[#3f382f] px-4 text-[10px] font-semibold uppercase tracking-[.12em] text-white shadow-sm transition-colors hover:bg-[#2f2923] font-outfit">Probar entrada en pantalla completa ↗</a>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-500 font-outfit mb-1">Texto del botón</label>
                  <input
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
                    value={entry.label ?? ''}
                    onChange={e => setEntry({ label: e.target.value })}
                    placeholder="Ver invitación"
                  />
                </div>
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
