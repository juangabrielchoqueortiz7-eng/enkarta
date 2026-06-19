'use client';

// Panel del cliente (anfitrión) — solo operación: resumen de su evento,
// métricas, gestión de invitados (reusa GuestsPanel) y acceso al escáner.
// No edita el contenido ni el diseño de la invitación.

import { useRouter } from 'next/navigation';
import type { InvitationParsed } from '@/lib/types';
import GuestsPanel from '@/components/admin/builder/panels/GuestsPanel';

export interface HostMetrics {
  total: number;
  passes: number;      // pases creados
  sent: number;        // invitaciones enviadas
  confirmed: number;   // invitados que confirmaron
  confirmedPasses: number;
  checkedIn: number;   // ingresos reales (personas dentro)
}

interface Props {
  invitation: InvitationParsed;
  metrics: HostMetrics;
}

export default function HostDashboard({ invitation, metrics }: Props) {
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/host/auth', { method: 'DELETE' });
    router.refresh();
  };

  const fmtDate = (d?: string | null) => d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const Metric = ({ n, label, color }: { n: number; label: string; color: string }) => (
    <div className="rounded-2xl border border-gray-200 bg-white py-4 text-center">
      <p className="font-playfair font-bold text-3xl" style={{ color }}>{n}</p>
      <p className="text-[11px] font-outfit text-gray-400 uppercase tracking-wide mt-1">{label}</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#f3f1ec' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-16">
          <div>
            <p className="font-great text-2xl leading-none" style={{ color: '#B8975A' }}>Enkarta</p>
            <p className="font-outfit text-xs text-gray-500 -mt-0.5">{invitation.names || 'Mi evento'}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/panel/scan" className="px-3 py-2 rounded-lg bg-enkarta-gold text-white font-outfit text-sm font-medium flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M5 12H4m11.314-5.314l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Escáner
            </a>
            <button onClick={logout} className="px-3 py-2 text-gray-500 hover:text-gray-700 font-outfit text-sm">Salir</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Resumen del evento */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-playfair text-xl text-gray-900 mb-3">{invitation.names || 'Tu evento'}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm font-outfit">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Fecha del evento</p>
              <p className="text-gray-700">{fmtDate(invitation.event_date)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Límite de confirmación</p>
              <p className="text-gray-700">{fmtDate(invitation.rsvp_deadline)}</p>
            </div>
            {invitation.gallery_url && (
              <div className="col-span-2">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Galería de fotos</p>
                <a href={invitation.gallery_url} target="_blank" rel="noopener noreferrer" className="text-enkarta-gold hover:underline break-all">{invitation.gallery_url}</a>
              </div>
            )}
          </div>
        </section>

        {/* Métricas */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Metric n={metrics.passes} label="Pases creados" color="#5a4e34" />
          <Metric n={metrics.sent} label="Enviadas" color="#5a7a9a" />
          <Metric n={metrics.confirmed} label="Confirmados" color="#3d6b4f" />
          <Metric n={metrics.confirmedPasses} label="Cupos confirmados" color="#b8975a" />
          <Metric n={metrics.checkedIn} label="Ingresos reales" color="#7a5a9a" />
          <Metric n={metrics.total} label="Invitados" color="#5a4e34" />
        </section>

        {/* Gestión de invitados (reusa el panel del editor) */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <GuestsPanel data={invitation} />
        </section>
      </main>
    </div>
  );
}
