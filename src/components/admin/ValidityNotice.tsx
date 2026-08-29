import { formatValidityDate, validityLabel, type ValiditySummary } from '@/lib/invitation-validity';

export default function ValidityNotice({ value, compact = false }: { value: ValiditySummary; compact?: boolean }) {
  const urgent = ['soon', 'today', 'expired', 'pending'].includes(value.state);
  return <section aria-label="Vigencia del enlace" className={`rounded-2xl border p-4 font-outfit ${urgent ? 'border-amber-200 bg-amber-50/80 text-amber-950' : 'border-[#dce5df] bg-[#f2f7f4] text-[#304b3d]'}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{validityLabel(value)}</h3>{value.paused && <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium">Enlace pausado</span>}</div>
    <p className="mt-1 text-xs leading-relaxed">{value.expiresAt ? <>Disponible hasta el <strong>{formatValidityDate(value.expiresAt)}</strong>, inclusive · hora de Bolivia.</> : value.state === 'pending' ? 'El plazo se calculará cuando se guarde la fecha del evento.' : 'Se mantienen las condiciones anteriores, sin asignar una fecha nueva.'}</p>
    {!compact && <><p className="mt-2 text-xs leading-relaxed opacity-80">{value.mode === 'automatic' ? `${value.packageDays ?? '—'} días después del evento${value.extraDays ? ` + ${value.extraDays} días de ampliación` : ''}.` : 'Vigencia acordada manualmente.'} {value.paused ? 'Ampliar el plazo no elimina una pausa manual.' : ''}</p>
      <p className="mt-3 border-t border-current/10 pt-3 text-xs leading-relaxed">El vencimiento cierra el enlace público; no borra invitados, confirmaciones ni registros de acceso. El panel privado conserva la consulta y exportación de los servicios contratados.</p></>}
  </section>;
}
