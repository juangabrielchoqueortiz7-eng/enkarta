'use client';

import type { SectionPreset } from '@/components/invitations/blocks/registry';
import type { SectionCatalogMeta, SectionPreviewKind } from '@/lib/section-catalog';

interface Palette {
  paper: string;
  primary: string;
  ink: string;
}

function MiniLine({ className = '', color }: { className?: string; color: string }) {
  return <span className={`block h-1 rounded-full ${className}`} style={{ background: color }} />;
}

export function SectionPreview({ kind, palette, large = false }: { kind: SectionPreviewKind; palette: Palette; large?: boolean }) {
  const muted = `${palette.ink}42`;
  const line = `${palette.primary}55`;
  const card = `${palette.paper}e8`;
  const common = `relative overflow-hidden ${large ? 'h-52 rounded-2xl' : 'h-28 rounded-xl'} border`;

  const content = (() => {
    switch (kind) {
      case 'hero': return <>
        <div className="absolute inset-0 opacity-75" style={{ background: `linear-gradient(135deg, ${palette.primary}e8, ${palette.ink}c7)` }} />
        <div className="absolute inset-x-5 bottom-4 text-center"><MiniLine color={palette.paper} className="mx-auto w-12 opacity-60" /><p className={`${large ? 'mt-3 text-3xl' : 'mt-2 text-lg'} font-playfair text-white`}>Ana & Carlos</p><MiniLine color={palette.paper} className="mx-auto mt-2 w-20 opacity-50" /></div>
      </>;
      case 'message': return <div className="flex h-full flex-col items-center justify-center px-6"><p className={`${large ? 'text-3xl' : 'text-lg'} font-great`} style={{ color: palette.primary }}>Bienvenidos</p><MiniLine color={muted} className="mt-3 w-3/4" /><MiniLine color={muted} className="mt-2 w-1/2" /><span className="mt-4 text-base" style={{ color: palette.primary }}>⌁</span></div>;
      case 'quote': return <div className="flex h-full flex-col items-center justify-center px-7 text-center"><span className={`${large ? 'text-4xl' : 'text-2xl'} font-playfair`} style={{ color: palette.primary }}>“</span><MiniLine color={muted} className="w-full" /><MiniLine color={muted} className="mt-2 w-4/5" /><MiniLine color={line} className="mt-4 w-14" /></div>;
      case 'countdown': return <div className="flex h-full flex-col items-center justify-center px-4"><MiniLine color={palette.primary} className="mb-3 w-16" /><div className="grid w-full grid-cols-4 gap-1.5">{['12','08','42','19'].map(n => <span key={n} className={`${large ? 'py-5 text-xl' : 'py-3 text-xs'} rounded-md text-center font-playfair`} style={{ background: `${palette.primary}12`, border: `1px solid ${line}`, color: palette.primary }}>{n}</span>)}</div></div>;
      case 'events': return <div className="grid h-full grid-cols-2 gap-2 p-3">{['Ceremonia','Recepción'].map((label, i) => <div key={label} className="flex flex-col items-center justify-center rounded-lg border text-center" style={{ background: card, borderColor: line }}><span className={large ? 'text-3xl' : 'text-xl'} style={{ color: palette.primary }}>{i ? '♢' : '⌂'}</span><span className="mt-1 text-[8px] font-semibold uppercase tracking-wider" style={{ color: palette.ink }}>{label}</span><MiniLine color={muted} className="mt-2 w-10" /></div>)}</div>;
      case 'schedule': return <div className="relative flex h-full items-center justify-center px-6"><span className="absolute bottom-4 left-1/2 top-4 w-px" style={{ background: line }} />{[0,1,2].map(i => <span key={i} className="relative mx-3 flex h-7 w-7 items-center justify-center rounded-full border text-[8px]" style={{ background: palette.paper, borderColor: palette.primary, color: palette.primary }}>{i + 1}</span>)}</div>;
      case 'map': return <div className="relative h-full" style={{ backgroundImage: `linear-gradient(${line} 1px,transparent 1px),linear-gradient(90deg,${line} 1px,transparent 1px)`, backgroundSize: '18px 18px' }}><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl" style={{ color: palette.primary }}>⌖</span><span className="absolute bottom-3 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full" style={{ background: palette.primary }} /></div>;
      case 'details': return <div className="grid h-full grid-cols-2 gap-2 p-3">{[0,1].map(i => <div key={i} className="rounded-lg p-3" style={{ background: `${palette.primary}${i ? '0c' : '16'}` }}><span className="block text-center text-xl" style={{ color: palette.primary }}>{i ? '!' : '♢'}</span><MiniLine color={muted} className="mx-auto mt-2 w-3/4" /><MiniLine color={muted} className="mx-auto mt-2 w-1/2" /></div>)}</div>;
      case 'story': return <div className="relative h-full px-6 py-3"><span className="absolute bottom-3 left-1/2 top-3 w-px" style={{ background: line }} />{[0,1,2].map((i) => <span key={i} className="relative my-2 block h-5 w-2/5 rounded-md" style={{ marginLeft: i % 2 ? '58%' : 0, background: `${palette.primary}18`, border: `1px solid ${line}` }} />)}</div>;
      case 'gallery': return <div className="grid h-full grid-cols-3 grid-rows-2 gap-1.5 p-3">{[0,1,2,3].map((i) => <span key={i} className={`rounded-md ${i === 0 ? 'col-span-2 row-span-2' : ''}`} style={{ background: `linear-gradient(${120 + i * 30}deg,${palette.primary}${30 + i * 8},${palette.ink}${20 + i * 5})` }} />)}</div>;
      case 'cinema': return <div className="relative h-full" style={{ background: `linear-gradient(135deg,${palette.ink},${palette.primary})` }}><span className="absolute inset-x-5 top-1/2 h-px bg-white/50" /><p className="absolute inset-x-4 top-[58%] text-center font-playfair text-sm text-white">Nuestra historia</p></div>;
      case 'video': return <div className="flex h-full items-center justify-center" style={{ background: `linear-gradient(135deg,${palette.ink}de,${palette.primary}c9)` }}><span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 pl-0.5 text-white">▶</span></div>;
      case 'family': return <div className="grid h-full grid-cols-2 gap-5 p-5 text-center">{[0,1].map(i => <div key={i}><span className="mx-auto block h-8 w-8 rounded-full" style={{ background: `${palette.primary}20` }} /><MiniLine color={palette.primary} className="mx-auto mt-3 w-16" /><MiniLine color={muted} className="mx-auto mt-2 w-12" /></div>)}</div>;
      case 'gift': return <div className="grid h-full grid-cols-[1fr_54px] gap-3 p-4"><div className="flex flex-col justify-center"><span className="text-xl" style={{ color: palette.primary }}>◇</span><MiniLine color={palette.primary} className="mt-2 w-20" /><MiniLine color={muted} className="mt-2 w-full" /></div><div className="grid grid-cols-4 gap-px self-center rounded bg-white p-1">{Array.from({length:16}).map((_,i)=><span key={i} className="aspect-square" style={{ background: i % 3 ? palette.ink : 'transparent' }} />)}</div></div>;
      case 'interactive': return <div className="flex h-full flex-col items-center justify-center px-6"><span className="text-2xl" style={{ color: palette.primary }}>✓</span><MiniLine color={muted} className="mt-3 w-3/4" /><span className="mt-4 h-5 w-28 rounded-full" style={{ background: palette.primary }} /></div>;
      case 'closing': return <div className="flex h-full flex-col items-center justify-center px-6" style={{ background: `linear-gradient(145deg,${palette.primary}18,transparent)` }}><p className={`${large ? 'text-3xl' : 'text-xl'} font-great`} style={{ color: palette.primary }}>Te esperamos</p><MiniLine color={muted} className="mt-3 w-2/3" /><span className="mt-4 h-5 w-28 rounded-full" style={{ background: palette.primary }} /></div>;
    }
  })();

  return <div className={common} style={{ background: palette.paper, borderColor: `${palette.primary}24` }}>{content}</div>;
}

interface Props {
  preset: SectionPreset;
  meta: SectionCatalogMeta;
  palette: Palette;
  recommended: boolean;
  onPreview: () => void;
  onInsert: () => void;
}

export default function SectionPresetCard({ preset, meta, palette, recommended, onPreview, onInsert }: Props) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-[#e7dfd5] bg-white shadow-[0_8px_24px_rgba(64,47,26,0.045)] transition-all hover:-translate-y-0.5 hover:border-enkarta-gold/45 hover:shadow-[0_14px_32px_rgba(64,47,26,0.09)]">
      <button type="button" onClick={onPreview} className="block w-full p-2 text-left">
        <SectionPreview kind={meta.preview} palette={palette} />
      </button>
      <div className="px-3 pb-3 pt-1">
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold text-[#443b32] font-outfit">{preset.label}</span>
            <span className="mt-0.5 block truncate text-[9px] text-[#94887a] font-outfit">{meta.moment} · {meta.styles[0]}</span>
          </span>
          {recommended && <span className="rounded-full bg-enkarta-gold/10 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide text-enkarta-gold font-outfit">Ideal</span>}
        </div>
        <div className="mt-2 flex gap-1.5">
          <button type="button" onClick={onPreview} className="h-8 flex-1 rounded-lg border border-[#e7dfd5] text-[9px] font-medium text-[#74695d] transition-colors hover:bg-[#faf7f2] font-outfit">Ver</button>
          <button type="button" onClick={onInsert} className="h-8 flex-1 rounded-lg bg-enkarta-gold text-[9px] font-semibold text-white transition-all hover:brightness-95 font-outfit">Añadir</button>
        </div>
      </div>
    </article>
  );
}

