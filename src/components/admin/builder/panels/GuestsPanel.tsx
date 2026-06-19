'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { InvitationParsed, Guest } from '@/lib/types';

interface Props {
  data: InvitationParsed;
}

const STATUS_META: Record<Guest['status'], { label: string; cls: string }> = {
  confirmed: { label: 'Confirmado', cls: 'bg-green-50 text-green-600' },
  declined: { label: 'No asiste', cls: 'bg-red-50 text-red-500' },
  pending: { label: 'Pendiente', cls: 'bg-gray-100 text-gray-500' },
};

type StatusFilter = 'all' | Guest['status'] | 'sent' | 'unsent';

export default function GuestsPanel({ data }: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulk, setBulk] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://enkarta.com';
  const linkFor = (publicId: string) => `${base}/i/${data.slug}?g=${publicId}`;

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/guests?id=${data.id}`)
      .then(r => r.json())
      .then(g => setGuests(Array.isArray(g) ? g : []))
      .catch(() => setGuests([]))
      .finally(() => setLoading(false));
  }, [data.id]);

  useEffect(() => { load(); }, [load]);

  // ── Operaciones CRUD (optimistas) ──
  const patchGuest = (id: string, patch: Partial<Guest>) => {
    setGuests(gs => gs.map(g => g.id === id ? { ...g, ...patch } : g));
    fetch('/api/guests', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    }).catch(() => {});
  };

  const removeGuest = (id: string) => {
    setGuests(gs => gs.filter(g => g.id !== id));
    fetch(`/api/guests?guestId=${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const addGuests = async (rows: { name: string; passes?: number; tableNo?: string }[]) => {
    const res = await fetch('/api/guests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId: data.id, guests: rows }),
    }).then(r => r.json()).catch(() => null);
    if (res?.guests) setGuests(gs => [...gs, ...res.guests]);
  };

  const importBulk = () => {
    const rows = bulk.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const m = line.match(/^(.*?)[\s,]+(\d{1,2})\s*$/);
      return { name: (m ? m[1] : line).trim().slice(0, 80), passes: m ? Math.max(1, Math.min(20, parseInt(m[2]))) : 1 };
    }).filter(g => g.name);
    if (rows.length) addGuests(rows);
    setBulk('');
    setShowBulk(false);
  };

  const copy = (publicId: string) => {
    navigator.clipboard?.writeText(linkFor(publicId)).then(() => {
      setCopied(publicId);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  };

  const waLink = (g: Guest) => {
    const tpl = (data.config?.whatsappTemplate as string | undefined)?.trim();
    const txt = tpl
      ? tpl.replace('{nombre}', g.name).replace('{link}', linkFor(g.publicId))
      : `¡Hola ${g.name}! 💌 Estás invitado(a). Aquí tu invitación personal: ${linkFor(g.publicId)}`;
    return `https://wa.me/?text=${encodeURIComponent(txt)}`;
  };

  const stats = useMemo(() => {
    const confirmed = guests.filter(g => g.status === 'confirmed');
    return {
      total: guests.length,
      sent: guests.filter(g => g.sent).length,
      confirmed: confirmed.length,
      pending: guests.filter(g => g.status === 'pending').length,
      declined: guests.filter(g => g.status === 'declined').length,
      cuposConfirmed: confirmed.reduce((s, g) => s + (g.confirmedPasses ?? g.passes ?? 1), 0),
      cuposTotal: guests.reduce((s, g) => s + (g.passes || 1), 0),
    };
  }, [guests]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter(g => {
      if (q && !g.name.toLowerCase().includes(q) && !(g.tableNo || '').toLowerCase().includes(q)) return false;
      if (filter === 'sent') return g.sent;
      if (filter === 'unsent') return !g.sent;
      if (filter !== 'all') return g.status === filter;
      return true;
    });
  }, [guests, search, filter]);

  const Stat = ({ n, label, color }: { n: number | string; label: string; color: string }) => (
    <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 py-2.5 text-center min-w-[60px]">
      <p className="font-playfair font-bold text-lg" style={{ color }}>{n}</p>
      <p className="text-[9px] font-outfit text-gray-400 uppercase tracking-wide">{label}</p>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Lista de Invitados</h4>
        <button type="button" onClick={load} className="text-xs text-enkarta-gold hover:underline font-outfit">
          {loading ? 'Actualizando…' : '↻ Actualizar'}
        </button>
      </div>

      {/* Conteos */}
      <div className="flex gap-1.5 flex-wrap">
        <Stat n={stats.total} label="Invitados" color="#5a4e34" />
        <Stat n={stats.sent} label="Enviadas" color="#5a7a9a" />
        <Stat n={stats.confirmed} label="Confirman" color="#3d6b4f" />
        <Stat n={stats.pending} label="Pend." color="#9a8a5a" />
        <Stat n={stats.declined} label="No asisten" color="#9a5a5a" />
      </div>
      <div className="rounded-xl border border-enkarta-gold/20 bg-enkarta-gold/5 py-2.5 text-center">
        <p className="font-playfair font-bold text-2xl text-enkarta-gold">{stats.cuposConfirmed}<span className="text-gray-300 text-base"> / {stats.cuposTotal}</span></p>
        <p className="text-[10px] font-outfit text-gray-400 uppercase tracking-wide">Cupos confirmados</p>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button type="button" onClick={() => addGuests([{ name: 'Nuevo invitado', passes: 1 }])} className="flex-1 py-2 rounded-xl bg-enkarta-gold text-white text-sm font-outfit font-medium hover:opacity-90 transition-opacity">
          + Agregar invitado
        </button>
        <button type="button" onClick={() => setShowBulk(s => !s)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-outfit text-gray-600 hover:bg-gray-50 transition-colors">
          Importar
        </button>
      </div>

      {showBulk && (
        <div className="space-y-2 p-3 rounded-xl border border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 font-outfit">Un invitado por línea. Opcional el nº de pases: <code className="text-gray-400">Ana López, 2</code></p>
          <textarea value={bulk} onChange={e => setBulk(e.target.value)} rows={5} placeholder={'Ana López, 2\nCarlos Pérez, 1\nFamilia Gómez, 4'} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-enkarta-gold outline-none font-outfit" />
          <button type="button" onClick={importBulk} className="w-full py-2 rounded-lg bg-enkarta-dark text-white text-sm font-outfit hover:opacity-90 transition-opacity">
            Añadir {bulk.split('\n').filter(l => l.trim()).length || ''} invitados
          </button>
        </div>
      )}

      {/* Buscador + filtros */}
      {guests.length > 0 && (
        <div className="space-y-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o mesa…" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none font-outfit" />
          <div className="flex gap-1 flex-wrap">
            {([['all', 'Todos'], ['confirmed', 'Confirman'], ['pending', 'Pendientes'], ['declined', 'No asisten'], ['sent', 'Enviadas'], ['unsent', 'Sin enviar']] as [StatusFilter, string][]).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setFilter(v)} className={`px-2.5 py-1 rounded-full text-xs font-outfit transition-all ${filter === v ? 'bg-enkarta-gold text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      {guests.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-400 font-outfit bg-gray-50 rounded-xl">
          Aún no hay invitados. Agrégalos para generar sus links personales.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(g => (
            <div key={g.id} className="p-3 rounded-xl border border-gray-100 bg-white space-y-2">
              <div className="flex items-center gap-2">
                <input value={g.name} onChange={e => patchGuest(g.id, { name: e.target.value })} placeholder="Nombre" className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-enkarta-gold outline-none font-outfit min-w-0" />
                <button type="button" onClick={() => removeGuest(g.id)} title="Eliminar" className="p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-gray-400 font-outfit">
                  Mesa
                  <input value={g.tableNo ?? ''} onChange={e => patchGuest(g.id, { tableNo: e.target.value })} placeholder="—" className="w-12 px-1.5 py-1 text-sm rounded-lg border border-gray-200 focus:border-enkarta-gold outline-none font-outfit text-center" />
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-400 font-outfit">
                  Pases
                  <input type="number" min={1} max={20} value={g.passes} onChange={e => patchGuest(g.id, { passes: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })} className="w-12 px-1.5 py-1 text-sm rounded-lg border border-gray-200 focus:border-enkarta-gold outline-none font-outfit text-center" />
                </label>
                <button type="button" onClick={() => patchGuest(g.id, { allowKids: !g.allowKids })} title="Permite niños" className={`px-2 py-1 rounded-lg text-xs font-outfit transition-all ${g.allowKids ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                  {g.allowKids ? '👶 Niños sí' : '🚫 Sin niños'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-outfit px-2 py-0.5 rounded-full ${STATUS_META[g.status].cls}`}>
                  {STATUS_META[g.status].label}{g.status === 'confirmed' && g.confirmedPasses ? ` · ${g.confirmedPasses}` : ''}
                </span>
                {g.accessCode && <span className="text-[10px] font-mono text-gray-400">{g.accessCode}</span>}
                <div className="ml-auto flex gap-1 flex-shrink-0">
                  <button type="button" onClick={() => patchGuest(g.id, { sent: !g.sent })} className={`px-2 py-1 text-[11px] font-outfit rounded-lg border transition-colors ${g.sent ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {g.sent ? '✓ Enviada' : 'Marcar enviada'}
                  </button>
                  <button type="button" onClick={() => copy(g.publicId)} className="px-2 py-1 text-[11px] font-outfit rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    {copied === g.publicId ? '✓' : '🔗'}
                  </button>
                  <a href={waLink(g)} target="_blank" rel="noopener noreferrer" onClick={() => !g.sent && patchGuest(g.id, { sent: true })} className="px-2 py-1 text-[11px] font-outfit rounded-lg text-white transition-opacity hover:opacity-90" style={{ background: '#25D366' }}>
                    WhatsApp
                  </a>
                </div>
              </div>
              {g.message && <p className="text-[11px] text-gray-400 font-cormorant italic">“{g.message}”</p>}
            </div>
          ))}
          {visible.length === 0 && <p className="text-center text-sm text-gray-400 font-outfit py-4">Ningún invitado coincide con el filtro.</p>}
        </div>
      )}
    </div>
  );
}
