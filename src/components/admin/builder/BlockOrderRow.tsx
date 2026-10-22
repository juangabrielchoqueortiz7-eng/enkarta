'use client';

import type { MouseEvent, ReactNode } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import type { Block } from '@/lib/types';

interface Props {
  block: Block;
  label: string;
  detail: string;
  icon: ReactNode;
  lockIcon: ReactNode;
  visibilityIcon: ReactNode;
  selected: boolean;
  multiSelected: boolean;
  selecting: boolean;
  index: number;
  total: number;
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void;
  onSelect: () => void;
  onMove: (direction: -1 | 1) => void;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
}

const actionClass = 'flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-[#514735] transition-colors hover:bg-[#f7f3ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35';

/** Only the handle captures a drag. Every other part remains a native scroll surface. */
export default function BlockOrderRow({ block, label, detail, icon, lockIcon, visibilityIcon, selected, multiSelected, selecting, index, total, onEdit, onSelect, onMove, onToggleLock, onToggleVisibility }: Props) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={block} dragListener={false} dragControls={controls} style={{ position: 'relative', touchAction: 'pan-y' }} className={`rounded-2xl border bg-white p-2.5 ${selected ? 'border-enkarta-gold/70 ring-1 ring-enkarta-gold/15' : 'border-[#ece7e0]'}`}>
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" aria-label={`Arrastrar ${label}`} aria-describedby="block-order-help" title="Arrastrar para ordenar" onPointerDown={event => { event.stopPropagation(); controls.start(event); }} style={{ touchAction: 'none' }} className={`${actionClass} shrink-0 cursor-grab select-none active:cursor-grabbing`}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">{[6, 10, 14].map(y => <g key={y}><circle cx="7" cy={y} r="1.2" /><circle cx="13" cy={y} r="1.2" /></g>)}</svg>
        </button>
        <button type="button" aria-label={`${selecting ? 'Seleccionar' : 'Editar'} ${label}`} onClick={onEdit} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2">
          <span aria-hidden="true" className="shrink-0">{icon}</span>
          <span className="min-w-0 flex-1 font-outfit">
            <span className={`block truncate text-sm ${block.enabled === false ? 'text-[#6b6258] line-through' : 'font-medium text-[#4a433b]'}`}>{label}</span>
            <span className="block text-xs text-[#65594b]">{selecting ? 'Seleccionar bloque' : 'Editar bloque'}</span>
            <span className="sr-only">{detail}</span>
          </span>
        </button>
      </div>
      <div className="mt-2 grid gap-1 border-t border-[#eee8df] pt-1 [grid-template-columns:repeat(auto-fit,minmax(44px,1fr))]">
        <button type="button" aria-label={`Seleccionar ${label}`} aria-pressed={multiSelected} onClick={onSelect} className={`${actionClass} ${multiSelected ? 'bg-violet-50 text-violet-700' : ''}`}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="14" height="14" rx="3" />{multiSelected && <path d="m6 10 3 3 5-6" />}</svg>
        </button>
        <button type="button" aria-label={`Subir ${label}`} title="Subir bloque" disabled={index === 0} onClick={() => onMove(-1)} className={actionClass}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 16V4m-5 5 5-5 5 5" /></svg>
        </button>
        <button type="button" aria-label={`Bajar ${label}`} title="Bajar bloque" disabled={index === total - 1} onClick={() => onMove(1)} className={actionClass}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4v12m-5-5 5 5 5-5" /></svg>
        </button>
        <button type="button" aria-label={`${block.locked ? 'Desbloquear' : 'Bloquear'} ${label}`} title={block.locked ? 'Desbloquear' : 'Bloquear'} aria-pressed={!!block.locked} onClick={onToggleLock} className={`${actionClass} ${block.locked ? 'bg-amber-50 text-amber-800' : ''}`}><span aria-hidden="true">{lockIcon}</span></button>
        <button type="button" aria-label={`${block.enabled === false ? 'Mostrar' : 'Ocultar'} ${label}`} title={block.enabled === false ? 'Mostrar' : 'Ocultar'} aria-pressed={block.enabled !== false} onClick={onToggleVisibility} className={actionClass}><span aria-hidden="true">{visibilityIcon}</span></button>
      </div>
    </Reorder.Item>
  );
}
