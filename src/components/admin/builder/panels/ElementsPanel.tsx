'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

// Pestaña "Elementos": añade y gestiona los stickers decorativos flotantes
// (esquineros de flores, marcos, cenefas, ramos…) de la librería curada o
// subidos por el cliente. Edita los bloques de tipo 'element' dentro de
// cfg.layout.blocks; el render flotante lo hace BlockRenderer.

import { useState } from 'react';
import { InvitationParsed, BuilderConfig, Block, BlockLayout, LAYOUT_VERSION } from '@/lib/types';
import { createElementBlock, createCornerSet, cloneBlock, DECOR_PACKS } from '@/components/invitations/blocks/registry';
import { ELEMENTS, getElement, renderElement } from '@/components/invitations/blocks/elements-library';
import { listUserPacks, saveUserPack, deleteUserPack, type UserDecorPack } from '@/lib/user-decor-packs';
import ElementPicker from '../ElementPicker';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
  selectedId: string;
  onSelect: (id: string) => void;
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit';

const ANCHORS: NonNullable<BlockLayout['anchor']>[] = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} className={`rounded-full transition-all cursor-pointer relative flex-shrink-0 ${on ? 'bg-enkarta-gold' : 'bg-gray-300'}`} style={{ width: 38, height: 22 }}>
      <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: on ? 18 : 4 }} />
    </div>
  );
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-gray-500 font-outfit mb-1">{label}</label>{children}</div>;
}

export default function ElementsPanel({ data, onChange, selectedId, onSelect }: Props) {
  const cfg: BuilderConfig = data.config ?? {};
  const layout = cfg.layout;
  const blocks = layout?.blocks ?? [];
  const decor = cfg.decor ?? {};
  const pageCornersOn = decor.corners?.on === true;
  const defaultColor = cfg.theme?.primary || data.color_primary || '#b8975a';
  const [cornerMotif, setCornerMotif] = useState('corner-orchid');
  const [myPacks, setMyPacks] = useState<UserDecorPack[]>(() => listUserPacks());

  const disablePageCorners = () =>
    onChange({ config: { ...cfg, decor: { ...decor, corners: { ...(decor.corners ?? {}), on: false } } } });

  const setBlocks = (next: Block[]) =>
    onChange({ config: { ...cfg, layout: { version: LAYOUT_VERSION, basePreset: layout?.basePreset ?? data.template, presetKey: layout?.presetKey ?? data.template, blocks: next } } });
  const patchBlock = (id: string, patch: Partial<Block>) =>
    setBlocks(blocks.map(b => (b.id === id ? { ...b, ...patch } : b)));

  // Sin documento por bloques no hay dónde poner elementos flotantes.
  if (!layout || blocks.length === 0) {
    return (
      <div className="p-4">
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-sm font-outfit text-amber-700 leading-relaxed">
            ✿ Los <span className="font-semibold">elementos decorativos</span> necesitan el constructor por
            bloques. Ve a la pestaña <span className="font-semibold">Bloques</span> y pulsa
            «Convertir a bloques editables»; luego vuelve aquí.
          </p>
        </div>
      </div>
    );
  }

  const elements = blocks.filter(b => b.type === 'element');
  const cornerOptions = ELEMENTS.filter(e => e.category === 'corner');
  const selected = blocks.find(b => b.id === selectedId && b.type === 'element');

  const addElement = (sel: { motif?: string; url?: string }) => {
    const nb = createElementBlock({ motif: sel.motif, url: sel.url, color: sel.motif ? defaultColor : undefined });
    setBlocks([...blocks, nb]);
    onSelect(nb.id);
  };
  const decorateCorners = () => {
    const set = createCornerSet(cornerMotif, defaultColor);
    setBlocks([...blocks, ...set]);
    onSelect(set[0].id);
  };
  const applyPack = (build: (c: string) => Block[]) => {
    const set = build(defaultColor);
    setBlocks([...blocks, ...set]);
    if (set[0]) onSelect(set[0].id);
  };
  const applyMyPack = (pack: UserDecorPack) => {
    const set = pack.blocks.map(b => cloneBlock(b));
    setBlocks([...blocks, ...set]);
    if (set[0]) onSelect(set[0].id);
  };
  const saveCurrentAsPack = () => {
    if (elements.length === 0) return;
    const name = window.prompt('Nombre de la decoración:', data.names || 'Mi decoración');
    if (name == null) return;
    setMyPacks(saveUserPack(name, elements));
  };

  // ── Editor de un elemento seleccionado ──
  if (selected) {
    const p = selected.props as any;
    const L = selected.layout ?? {};
    const isUpload = (p.source ?? 'library') === 'upload';
    const def = !isUpload ? getElement(String(p.motif || '')) : undefined;
    const setProp = (key: string, v: any) => patchBlock(selected.id, { props: { ...selected.props, [key]: v } });
    const setLayout = (patch: Partial<BlockLayout>) => patchBlock(selected.id, { layout: { ...L, ...patch } });

    return (
      <div className="p-4 space-y-5">
        <button type="button" onClick={() => onSelect('')} className="text-xs text-gray-500 hover:text-gray-800 font-outfit flex items-center gap-1">← Volver a elementos</button>
        <div className="flex items-center gap-2">
          <span className="text-xl">✿</span>
          <h3 className="font-outfit text-sm font-semibold text-gray-700">{isUpload ? 'Elemento subido' : (def?.label ?? 'Elemento')}</h3>
        </div>

        {/* Posición (ancla) */}
        <Labeled label="Posición (ancla a la página)">
          <div className="grid grid-cols-3 gap-1.5 w-28">
            {ANCHORS.map(a => (
              <button key={a} type="button" onClick={() => setLayout({ anchor: a })}
                className={`h-8 rounded-lg border text-[10px] font-outfit transition-all ${(L.anchor ?? 'tc') === a ? 'border-enkarta-gold bg-enkarta-gold/10 text-enkarta-gold' : 'border-gray-200 text-gray-300 hover:border-enkarta-gold/40'}`}>
                ●
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 font-outfit mt-1.5">También puedes arrastrarlo en la vista previa.</p>
        </Labeled>

        {/* Tamaño / giro / desplazamiento */}
        <div className="grid grid-cols-2 gap-3">
          <Labeled label={`Tamaño (${L.w ?? def?.w ?? 160}px)`}>
            <input type="range" min={40} max={500} step={2} value={L.w ?? def?.w ?? 160} onChange={e => setLayout({ w: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
          </Labeled>
          <Labeled label={`Giro (${L.rotate ?? 0}°)`}>
            <input type="range" min={-180} max={180} step={1} value={L.rotate ?? 0} onChange={e => setLayout({ rotate: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
          </Labeled>
          <Labeled label={`Offset X (${L.x ?? 0})`}>
            <input type="range" min={-200} max={200} step={2} value={L.x ?? 0} onChange={e => setLayout({ x: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
          </Labeled>
          <Labeled label={`Offset Y (${L.y ?? 0})`}>
            <input type="range" min={-200} max={200} step={2} value={L.y ?? 0} onChange={e => setLayout({ y: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
          </Labeled>
        </div>

        {/* Color (solo librería) */}
        {!isUpload && (
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Color">
              <input type="color" className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" value={p.color || defaultColor} onChange={e => setProp('color', e.target.value)} />
            </Labeled>
            <Labeled label="Color secundario">
              <input type="color" className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" value={p.color2 || p.color || defaultColor} onChange={e => setProp('color2', e.target.value)} />
            </Labeled>
          </div>
        )}

        {/* Opacidad */}
        <Labeled label={`Opacidad (${Math.round((typeof p.opacity === 'number' ? p.opacity : 1) * 100)}%)`}>
          <input type="range" min={10} max={100} step={5} value={Math.round((typeof p.opacity === 'number' ? p.opacity : 1) * 100)} onChange={e => setProp('opacity', parseInt(e.target.value) / 100)} className="w-full accent-enkarta-gold" />
        </Labeled>

        {/* Recolorear SVG subido */}
        {isUpload && /\.svg(\?|$)/i.test(String(p.url || '')) && (
          <div className="space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-outfit text-gray-700">Recolorear SVG</span>
              <Toggle on={!!p.recolor} onToggle={() => setProp('recolor', !p.recolor)} />
            </label>
            {p.recolor && (
              <Labeled label="Color">
                <input type="color" className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" value={p.color || defaultColor} onChange={e => setProp('color', e.target.value)} />
              </Labeled>
            )}
          </div>
        )}

        {/* Movimiento */}
        <Labeled label="Movimiento">
          <select className={inputCls} value={String(p.anim || 'none')} onChange={e => setProp('anim', e.target.value)}>
            <option value="none">Ninguno</option>
            <option value="sway">Mecer</option>
            <option value="float">Flotar</option>
            <option value="breathe">Latir</option>
          </select>
          <p className="text-[11px] text-gray-400 font-outfit mt-1">Sutil; se desactiva si el invitado pidió menos animación.</p>
        </Labeled>

        {/* Espejo / sombra / capa */}
        <div className="space-y-2.5">
          <label className="flex items-center justify-between cursor-pointer"><span className="text-sm font-outfit text-gray-700">Espejo horizontal</span><Toggle on={!!p.flipH} onToggle={() => setProp('flipH', !p.flipH)} /></label>
          <label className="flex items-center justify-between cursor-pointer"><span className="text-sm font-outfit text-gray-700">Espejo vertical</span><Toggle on={!!p.flipV} onToggle={() => setProp('flipV', !p.flipV)} /></label>
          <label className="flex items-center justify-between cursor-pointer"><span className="text-sm font-outfit text-gray-700">Sombra</span><Toggle on={!!p.shadow} onToggle={() => setProp('shadow', !p.shadow)} /></label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Labeled label={`Capa (z: ${L.z ?? 60})`}>
            <input type="number" className={inputCls} value={L.z ?? 60} onChange={e => setLayout({ z: parseInt(e.target.value) || 0 })} />
          </Labeled>
          <Labeled label="Visible en">
            <select className={inputCls} value={L.hideOn ?? ''} onChange={e => setLayout({ hideOn: (e.target.value || undefined) as BlockLayout['hideOn'] })}>
              <option value="">Móvil y escritorio</option>
              <option value="desktop">Solo móvil</option>
              <option value="mobile">Solo escritorio</option>
            </select>
          </Labeled>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 border-t border-gray-100 pt-4">
          <button type="button" onClick={() => {
            const copy: Block = { ...selected, id: `element-${Date.now().toString(36)}`, props: JSON.parse(JSON.stringify(selected.props)), layout: { ...L, x: (L.x ?? 0) + 16, y: (L.y ?? 0) + 16 } };
            setBlocks([...blocks, copy]); onSelect(copy.id);
          }} className="flex-1 py-2 text-xs font-outfit text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Duplicar</button>
          <button type="button" onClick={() => { setBlocks(blocks.filter(b => b.id !== selected.id)); onSelect(''); }} className="flex-1 py-2 text-xs font-outfit text-red-500 border border-red-200 rounded-xl hover:bg-red-50">Eliminar</button>
        </div>
      </div>
    );
  }

  // ── Vista por defecto: decorar esquinas + picker + lista ──
  return (
    <div className="p-4 space-y-6">
      <div className="p-3 bg-enkarta-gold/5 rounded-xl border border-enkarta-gold/20">
        <p className="text-xs font-outfit text-gray-600 leading-relaxed">
          ✿ Añade <span className="font-semibold">esquineros de flores</span>, marcos y adornos. Arrástralos,
          escálalos y recolorea en la vista previa, o sube tus propios elementos de Canva.
        </p>
      </div>

      {/* Aviso: hay adornos de esquina automáticos (pestaña Decoración) que se
          solaparían con los esquineros que añadas aquí. */}
      {pageCornersOn && (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
          <p className="text-xs font-outfit text-amber-700 leading-relaxed">
            ⚠️ Ya tienes <span className="font-semibold">adornos de esquina automáticos</span> activos
            (pestaña <span className="font-semibold">Decoración</span>). Si añades esquineros aquí, se
            verán <span className="font-semibold">dos por esquina</span>.
          </p>
          <button type="button" onClick={disablePageCorners}
            className="w-full py-2 text-xs font-outfit font-medium text-amber-700 bg-white border border-amber-200 rounded-lg hover:bg-amber-100/50">
            Apagar los adornos automáticos
          </button>
        </div>
      )}

      {/* Decorar esquinas */}
      <div className="space-y-3">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Decorar las 4 esquinas</h4>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cornerOptions.map(e => (
            <button key={e.key} type="button" onClick={() => setCornerMotif(e.key)} title={e.label}
              className={`flex-shrink-0 w-14 h-14 rounded-xl border flex items-center justify-center overflow-hidden transition-all ${cornerMotif === e.key ? 'border-enkarta-gold bg-enkarta-gold/10' : 'border-gray-200 hover:border-enkarta-gold/40'}`}>
              <span style={{ width: '70%', lineHeight: 0 }}>{e.render(defaultColor)}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={decorateCorners}
          className="w-full py-2.5 text-sm font-outfit font-medium text-white bg-enkarta-gold rounded-xl hover:bg-enkarta-gold/90 shadow shadow-enkarta-gold/30">
          ✿ Decorar esquinas con «{getElement(cornerMotif)?.label}»
        </button>
      </div>

      {/* Looks decorados de un clic */}
      <div className="space-y-2">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Aplicar un look decorado</h4>
        <div className="grid grid-cols-2 gap-2">
          {DECOR_PACKS.map(pk => (
            <button key={pk.key} type="button" onClick={() => applyPack(pk.build)} title={pk.desc}
              className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 bg-white hover:border-enkarta-gold/50 hover:bg-enkarta-gold/5 transition-all text-left">
              <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center overflow-hidden">
                <span style={{ width: '85%', lineHeight: 0 }}>{renderElement(pk.preview, defaultColor)}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-outfit font-medium text-gray-700 truncate">{pk.label}</span>
                <span className="block text-[9px] font-outfit text-gray-400 truncate">{pk.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Añadir un elemento suelto */}
      <div className="space-y-2">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Añadir un elemento</h4>
        <ElementPicker color={defaultColor} ownerId={data.id} onPick={addElement} />
      </div>

      {/* Mis packs guardados */}
      {myPacks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Mis decoraciones guardadas</h4>
          {myPacks.map(pk => (
            <div key={pk.id} className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 bg-gray-50">
              <span className="text-sm font-outfit text-gray-700 flex-1 truncate" title={pk.name}>{pk.name}</span>
              <button type="button" onClick={() => applyMyPack(pk)} className="text-xs text-enkarta-gold hover:underline font-outfit">Aplicar</button>
              <button type="button" onClick={() => setMyPacks(deleteUserPack(pk.id))} className="text-xs text-red-400 hover:text-red-600 font-outfit">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Lista de elementos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">En esta invitación ({elements.length})</h4>
          {elements.length > 0 && (
            <button type="button" onClick={saveCurrentAsPack} className="text-xs text-enkarta-gold hover:underline font-outfit">Guardar como pack</button>
          )}
        </div>
        {elements.length === 0 ? (
          <p className="text-xs text-gray-400 font-outfit">Aún no hay elementos. Usa «Decorar esquinas» o añade uno arriba.</p>
        ) : (
          elements.map(b => {
            const p = b.props as any;
            const label = (p.source ?? 'library') === 'upload' ? 'Elemento subido' : (getElement(String(p.motif || ''))?.label ?? 'Elemento');
            return (
              <div key={b.id} className={`flex items-center gap-2 p-2.5 rounded-xl border bg-white transition-colors ${selectedId === b.id ? 'border-enkarta-gold ring-1 ring-enkarta-gold/40' : 'border-gray-100 hover:border-enkarta-gold/40'}`}>
                <button type="button" onClick={() => onSelect(b.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  <span className="text-base flex-shrink-0">✿</span>
                  <span className={`text-sm font-outfit truncate ${b.enabled === false ? 'text-gray-300 line-through' : selectedId === b.id ? 'text-enkarta-gold font-medium' : 'text-gray-700'}`}>{label}</span>
                  <span className="text-[10px] text-gray-300 font-outfit flex-shrink-0">{b.layout?.anchor ?? 'tc'}</span>
                </button>
                <button type="button" title={b.enabled === false ? 'Mostrar' : 'Ocultar'} onClick={() => patchBlock(b.id, { enabled: b.enabled === false })} className="text-gray-400 hover:text-gray-700 text-sm flex-shrink-0">
                  {b.enabled === false ? '🚫' : '👁️'}
                </button>
                <button type="button" title="Eliminar" onClick={() => { setBlocks(blocks.filter(x => x.id !== b.id)); if (selectedId === b.id) onSelect(''); }} className="text-gray-400 hover:text-red-500 text-sm flex-shrink-0">✕</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
