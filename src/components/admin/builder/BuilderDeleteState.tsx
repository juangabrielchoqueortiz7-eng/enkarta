'use client';

import { useEffect, useRef } from 'react';
import type { BuilderDeletion } from './useBuilderDelete';

export default function BuilderDeleteState({ deletion, backHref, onDownload }: {
  deletion: BuilderDeletion; backHref: string; onDownload: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [deletion.phase]);
  const title = { pending: 'Eliminando invitación…', uncertain: 'Eliminación sin confirmar', deleted: 'Invitación eliminada' }[deletion.phase];
  return <main className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7F2] px-5 py-10 font-outfit text-[#2C2519] selection:bg-[#D4C5B9]/50 selection:text-[#2C2519]" aria-busy={deletion.phase === 'pending'}>
    <section className="w-full max-w-xl" aria-labelledby="builder-delete-title">
      <h1 id="builder-delete-title" ref={heading} tabIndex={-1} className="break-words text-2xl font-semibold leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#514735]">{title}</h1>
      <p className="mt-3 break-words text-base leading-7 text-[#514735]">{deletion.names}</p>
      <p role="status" aria-live="polite" aria-atomic="true" className="mt-5 text-sm leading-6 text-[#514735]">{deletion.message}</p>
      {deletion.phase === 'uncertain' && <p className="mt-3 text-sm leading-6 text-[#514735]">La edición y el guardado están detenidos. Puedes conservar una copia local de los datos que tenía este editor antes de enviar la eliminación.</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href={backHref} target={deletion.phase === 'deleted' ? undefined : '_blank'} rel={deletion.phase === 'deleted' ? undefined : 'noopener noreferrer'} className="inline-flex min-h-11 items-center rounded-xl bg-[#514735] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f382b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2">
          {deletion.phase === 'deleted' ? 'Volver al panel' : <>Revisar mis invitaciones<span className="sr-only"> en una pestaña nueva</span></>}
        </a>
        {deletion.phase === 'uncertain' && <button type="button" onClick={onDownload} className="min-h-11 rounded-xl border border-[#b7ab9c] px-4 py-2.5 text-sm font-semibold text-[#514735] transition-colors hover:bg-[#f0e9df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2">Descargar respaldo local</button>}
      </div>
    </section>
  </main>;
}
