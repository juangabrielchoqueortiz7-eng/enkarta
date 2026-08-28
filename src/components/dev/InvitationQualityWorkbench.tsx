'use client';

import { useState } from 'react';
import { invitationDemo } from '@/lib/template-starters';
import { collectionCatalog } from '@/lib/collection-catalog';
import { parseConfig, type Block, type InvitationParsed } from '@/lib/types';
import { resolveLayoutBindings, detachBinding } from '@/lib/block-bindings';
import LivePreview from '@/components/admin/builder/LivePreview';
import BlockEditorPanel from '@/components/admin/builder/panels/BlockEditorPanel';
import StylePanel from '@/components/admin/builder/panels/StylePanel';
import BlockRenderer from '@/components/invitations/BlockRenderer';
import FontScope from '@/components/invitations/FontScope';

const KEY = 'enkarta_qa_invitation_v1';
const designs = collectionCatalog();

/** Exercises the production components without creating invitations or saving to any API. */
export default function InvitationQualityWorkbench() {
  const [data, setData] = useState<InvitationParsed>(() => invitationDemo('marfil-vivo'));
  const [history, setHistory] = useState<InvitationParsed[]>([]);
  const [selected, setSelected] = useState('');
  const [panel, setPanel] = useState<'blocks' | 'style' | 'public'>('blocks');
  const [width, setWidth] = useState(390);
  const [status, setStatus] = useState('Solo pruebas locales. No se guarda en la base de datos.');
  const change = (patch: Partial<InvitationParsed>) => {
    setHistory(items => [...items.slice(-19), data]);
    setData(current => ({ ...current, ...patch }));
  };
  const patchBlock = (id: string, patch: Partial<Block>) => change({ config: { ...data.config, layout: { ...data.config.layout!, blocks: data.config.layout!.blocks.map(block => block.id === id ? { ...block, ...patch } : block) } } });
  const stress = () => change({
    names: 'María Alejandra Fernanda & Maximiliano Sebastián',
    itinerary: Array.from({ length: 10 }, (_, index) => ({ time: `${String(12 + index).padStart(2, '0')}:30`, label: 'Ceremonia y celebración con nuestras familias y amigos', place: 'Salón de eventos y jardín de los recuerdos compartidos', icon: 'church' })),
  });
  return <main className="min-h-screen bg-[#f1eee7] font-outfit">
    <header className="sticky top-0 z-[100] flex flex-wrap items-center gap-3 border-b bg-white p-3 text-xs">
      <h1 className="font-semibold">Pruebas del constructor</h1>
      <select aria-label="Colección de prueba" value={data.config.layout?.presetKey} onChange={e => { change(invitationDemo(e.target.value as Parameters<typeof invitationDemo>[0])); setSelected(''); }}>{designs.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</select>
      <select aria-label="Ancho de prueba" value={width} onChange={e => setWidth(Number(e.target.value))}>{[320,390,768,1280].map(value => <option key={value}>{value}</option>)}</select>
      <button onClick={() => setPanel('blocks')}>Bloques</button><button onClick={() => setPanel('style')}>Estilo</button><button onClick={() => setPanel('public')}>Vista pública</button>
      <button onClick={stress}>Textos largos</button>
      <button onClick={() => change({ config: { ...data.config, galleryImages: [] }, itinerary: [] })}>Vaciar opcionales</button>
      <button disabled={!history.length} onClick={() => { setData(history[history.length - 1]); setHistory(items => items.slice(0, -1)); }}>Deshacer</button>
      <button onClick={() => { localStorage.setItem(KEY, JSON.stringify({ ...data, config: undefined, builder_config: data.config })); setStatus('Copia de prueba guardada localmente.'); }}>Guardar prueba local</button>
      <button onClick={() => { const stored = localStorage.getItem(KEY); if (stored) { const parsed = JSON.parse(stored); change({ ...parsed, config: parseConfig(parsed.builder_config) }); setStatus('Prueba reabierta: contenido y diseño recuperados.'); } }}>Reabrir prueba local</button>
      <p role="status">{status}</p>
    </header>
    {panel === 'public' ? <div className="mx-auto" style={{ width, maxWidth: '100%' }}><FontScope config={data.config}><BlockRenderer layout={resolveLayoutBindings(data.config.layout!, data)} theme={data.config.theme} tokens={data.config.tokens} decor={data.config.decor} motion={{ preset: 'none', progress: 'none' }} demo /></FontScope></div> :
      <div className="grid grid-cols-[360px_1fr] items-start">
        <aside className="h-[calc(100vh-110px)] overflow-auto bg-white">
          {panel === 'style' ? <StylePanel data={data} onChange={change} /> : <BlockEditorPanel data={data} onChange={change} selectedId={selected} selectedIds={selected ? [selected] : []} onSelect={setSelected} previewMode={width < 640 ? 'mobile' : 'desktop'} previewWidth={width} />}
        </aside>
        <div className="overflow-auto p-5"><LivePreview invitation={data} device={width < 640 ? 'mobile' : 'desktop'} viewportWidth={width} blockEditor selectedBlockId={selected} selectedBlockIds={selected ? [selected] : []} onSelectBlock={setSelected} onPatchBlock={patchBlock} onTransformBlock={(id, layout) => patchBlock(id, { layout })} onEditBlockProp={(id, key, value) => { const block = data.config.layout!.blocks.find(item => item.id === id)!; patchBlock(id, { props: { ...block.props, [key]: value }, bindings: detachBinding(block, key).bindings }); }} /></div>
      </div>}
  </main>;
}
