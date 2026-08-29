'use client';
import { isCurrentContract } from '@/lib/packages';
import type { InvitationParsed } from '@/lib/types';
import type { HostSnapshot } from '@/lib/host-dashboard';
import HostRoster from './HostRoster';
import ResponseSheet from './ResponseSheet';
import ClientReviewPanel from './ClientReviewPanel';

export default function HostDashboard({ invitation, snapshot, connected, refresh, demo = false }: {
  invitation: InvitationParsed; snapshot: HostSnapshot; connected: boolean; refresh: () => void; demo?: boolean;
}) {
  const metrics = snapshot.metrics;
  if (!metrics) return null;
  const fmtDate = (d?: string | null) => d ? new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin definir';
  const cards = [
    { value: metrics.confirmed, label: 'Grupos confirmados', detail: 'De ' + metrics.total + ' grupos invitados', color: '#426247' },
    { value: metrics.pending, label: 'Por responder', detail: metrics.declined === 1 ? '1 grupo no asistirá' : metrics.declined + ' grupos no asistirán', color: '#8d6d30' },
    { value: metrics.confirmedPasses, label: 'Cupos confirmados', detail: metrics.passes + ' pases asignados en total', color: '#6a5b44' },
    ...(snapshot.services.qrAccess ? [{ value: metrics.checkedIn, label: 'Dentro ahora', detail: 'Entradas menos salidas registradas', color: '#556389' }] : []),
  ];
  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-[#dde3d7] bg-[#eef2e9] p-6 sm:p-8">
      <p className="text-[11px] uppercase tracking-[.18em] text-[#69815b]">Tu evento, al día</p>
      <h1 className="mt-2 font-playfair text-3xl text-[#303e32] sm:text-4xl">{invitation.names || 'Mi celebración'}</h1>
      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#52604e]"><p><span className="mb-1 block text-[10px] uppercase tracking-wide text-[#7a8774]">Celebración</span>{fmtDate(invitation.event_date)}</p><p><span className="mb-1 block text-[10px] uppercase tracking-wide text-[#7a8774]">Confirmar hasta</span>{fmtDate(invitation.rsvp_deadline)}</p></div>
      {snapshot.services.qrAccess && <div className="mt-5 flex flex-wrap items-center gap-3"><a href="/panel/scan" className="min-h-11 rounded-xl bg-[#516749] px-4 py-3 text-sm text-white">Abrir escáner</a><a href="/puerta" className="min-h-11 px-2 py-3 text-xs text-[#52604e] underline">Acceso separado para puerta</a></div>}
    </section>
    <section aria-label="Resumen del evento" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(card => <article key={card.label} className="rounded-2xl border border-[#e4dfd4] bg-white p-4 sm:p-5"><span className="mb-3 block h-1 w-8 rounded-full" style={{ background: card.color }} /><p className="font-playfair text-4xl" style={{ color: card.color }}>{card.value}</p><h2 className="mt-2 text-xs font-medium text-gray-700">{card.label}</h2><p className="mt-1 text-[11px] leading-relaxed text-gray-400">{card.detail}</p></article>)}</section>
    <p className="px-1 text-xs leading-relaxed text-gray-500">Estas cifras corresponden a los grupos con enlace personal.{snapshot.services.tableAssignment && (metrics.unassigned === 1 ? ' Hay 1 grupo confirmado sin mesa.' : ' Hay ' + metrics.unassigned + ' grupos confirmados sin mesa.')} Las respuestas abiertas se muestran por separado, sin asumir que sean personas diferentes.</p>
    {snapshot.services.guestManagement && <HostRoster snapshot={snapshot} invitationId={invitation.id} slug={invitation.slug} connected={connected} refresh={refresh} demo={demo} whatsappTemplate={invitation.config.whatsappTemplate || invitation.whatsapp_template || undefined} reminderTemplate={invitation.config.whatsappReminderTemplate} />}
    <section className="space-y-3"><h2 className="px-1 font-playfair text-2xl text-[#303e32]">Respuestas del formulario abierto</h2><ResponseSheet name={invitation.names || 'tu evento'} rows={snapshot.rows.filter(r => r.source === 'open')} embedded onRefresh={refresh} /></section>
    {isCurrentContract(invitation.config) ? <a href="/revision" className="block rounded-2xl border border-[#e4dfd4] bg-white p-4 text-center text-sm text-[#75603d]">Revisar el diseño con el acceso privado de revisión</a> : <ClientReviewPanel invitation={invitation} />}
  </div>;
}
