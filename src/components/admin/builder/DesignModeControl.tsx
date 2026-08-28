'use client';

export default function DesignModeControl({ guided, onChange }: { guided: boolean; onChange: (guided: boolean) => void }) {
  return <div className="rounded-2xl border border-[#e6e0d5] bg-[#faf8f3] p-3 font-outfit">
    <div className="flex gap-1 rounded-xl bg-[#eeeae1] p-1" aria-label="Modo de diseño">
      {[true, false].map(value => <button type="button" key={String(value)} aria-pressed={guided === value} onClick={() => onChange(value)} className={`min-h-10 flex-1 rounded-lg px-2 text-xs font-medium ${guided === value ? 'bg-white text-[#3c4736] shadow-sm' : 'text-[#6c655b]'}`}>{value ? 'Diseño guiado' : 'Edición libre'}</button>)}
    </div>
    <p className="mt-2 text-[11px] leading-relaxed text-[#6c655b]">{guided ? 'Prioriza piezas compatibles y conserva la tipografía de la colección.' : 'Acceso a todas las variantes y ajustes individuales.'} Cambiar de modo no altera tu invitación.</p>
  </div>;
}
