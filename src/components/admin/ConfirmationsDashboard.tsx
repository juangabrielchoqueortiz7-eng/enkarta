'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Invitation, Guest } from '@/lib/types';

interface Props {
  invitations: Invitation[];
}

interface Row {
  inv: Invitation;
  guests: Guest[];
}

const STATUS_META: Record<Guest['status'], { label: string; cls: string }> = {
  confirmed: { label: 'Confirmado', cls: 'bg-green-50 text-green-600' },
  declined: { label: 'No asiste', cls: 'bg-red-50 text-red-500' },
  pending: { label: 'Pendiente', cls: 'bg-gray-100 text-gray-500' },
};

export default function ConfirmationsDashboard({ invitations }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all(
      invitations.map(inv =>
        fetch(`/api/guests?id=${inv.id}`)
          .then(r => r.json())
          .then((g: Guest[]) => ({ inv, guests: Array.isArray(g) ? g : [] }))
          .catch(() => ({ inv, guests: [] as Guest[] }))
      )
    )
      .then(setRows)
      .finally(() => setLoading(false));
  }, [invitations]);

  useEffect(() => {
    load();
  }, [load]);

  const withGuests = useMemo(() => rows.filter(r => r.guests.length > 0), [rows]);

  const totals = useMemo(() => {
    const all = withGuests.flatMap(r => r.guests);
    const confirmed = all.filter(g => g.status === 'confirmed');
    return {
      events: withGuests.length,
      guests: all.length,
      confirmed: confirmed.length,
      pending: all.filter(g => g.status === 'pending').length,
      cupos: confirmed.reduce((s, g) => s + (g.confirmedPasses ?? g.passes ?? 1), 0),
    };
  }, [withGuests]);

  const rowStats = (guests: Guest[]) => {
    const confirmed = guests.filter(g => g.status === 'confirmed');
    return {
      confirmed: confirmed.length,
      pending: guests.filter(g => g.status === 'pending').length,
      declined: guests.filter(g => g.status === 'declined').length,
      cupos: confirmed.reduce((s, g) => s + (g.confirmedPasses ?? g.passes ?? 1), 0),
      cuposTotal: guests.reduce((s, g) => s + (g.passes || 1), 0),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-enkarta-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (withGuests.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-enkarta-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">👥</div>
        <h3 className="font-playfair text-lg text-gray-900 mb-1">Aún no hay invitados</h3>
        <p className="text-gray-500 text-sm font-outfit">
          Agrega la lista de invitados desde el editor de cada invitación (pestaña «Invitados»)
          para verlos aquí con su estado de confirmación.
        </p>
      </div>
    );
  }

  const Stat = ({ n, label, color }: { n: number; label: string; color: string }) => (
    <div className="flex-1 rounded-2xl border border-gray-200 bg-white py-4 text-center">
      <p className="font-playfair font-bold text-3xl" style={{ color }}>{n}</p>
      <p className="text-[11px] font-outfit text-gray-400 uppercase tracking-wide mt-1">{label}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Totales globales */}
      <div className="flex gap-3 flex-wrap">
        <Stat n={totals.events} label="Eventos" color="#5a4e34" />
        <Stat n={totals.guests} label="Invitados" color="#5a4e34" />
        <Stat n={totals.confirmed} label="Confirman" color="#3d6b4f" />
        <Stat n={totals.pending} label="Pendientes" color="#9a8a5a" />
        <Stat n={totals.cupos} label="Cupos confirmados" color="#b8975a" />
      </div>

      {/* Por evento */}
      <div className="space-y-3">
        {withGuests.map(({ inv, guests }) => {
          const s = rowStats(guests);
          const open = expanded === inv.id;
          return (
            <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(open ? null : inv.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-outfit font-medium text-gray-900 truncate">{inv.names || inv.slug}</p>
                  <p className="text-xs text-gray-400 font-outfit">
                    {inv.event_date ? new Date(inv.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'} · {inv.template}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-outfit px-2.5 py-1 rounded-full bg-green-50 text-green-600">{s.confirmed} confirman</span>
                  <span className="text-xs font-outfit px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{s.pending} pend.</span>
                  <span className="text-xs font-outfit px-2.5 py-1 rounded-full bg-enkarta-gold/10 text-enkarta-gold">{s.cupos}/{s.cuposTotal} cupos</span>
                </div>
                <svg className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {open && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {[...guests].sort((a, b) => a.name.localeCompare(b.name)).map(g => (
                    <div key={g.id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="text-sm font-outfit text-gray-700 flex-1 truncate">{g.name}</span>
                      {g.message && <span className="hidden sm:block text-xs text-gray-400 font-cormorant italic truncate max-w-[200px]">“{g.message}”</span>}
                      <span className="text-xs text-gray-400 font-outfit">{g.passes} {g.passes === 1 ? 'pase' : 'pases'}</span>
                      <span className={`text-[10px] font-outfit px-2 py-0.5 rounded-full ${STATUS_META[g.status].cls}`}>
                        {STATUS_META[g.status].label}{g.status === 'confirmed' && g.confirmedPasses ? ` · ${g.confirmedPasses}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
