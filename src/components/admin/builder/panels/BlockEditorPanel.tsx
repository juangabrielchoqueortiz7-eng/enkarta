'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

// Editor del documento por bloques. Convierte la invitación a bloques editables,
// permite reordenar (drag), añadir desde una paleta, duplicar/ocultar/eliminar y
// editar cada bloque con un editor de campos generado desde el "field schema"
// (registry). La selección se comparte con el LivePreview (clic en el preview →
// abre el bloque aquí, y al revés).

import { Reorder } from 'framer-motion';
import { InvitationParsed, BuilderConfig, Block, BlockType, BlockLayout, ScrollPreset, LAYOUT_VERSION } from '@/lib/types';
import { BLOCKS, PALETTE_GROUPS, SECTION_PRESETS, CHILD_PALETTE, createBlock, createOverlayGroup, FONT_OPTIONS, type FieldDef } from '@/components/invitations/blocks/registry';
import { layoutForTemplate } from '@/lib/layout-presets';
import { themeForTemplate, motionForTemplate, tokensForTemplate } from '@/lib/template-themes';
import { listUserTemplates, saveUserTemplate, deleteUserTemplate, type UserTemplate } from '@/lib/user-templates';
import { useEffect, useState } from 'react';
import ImageUploader from '../ImageUploader';
import MultiImageUploader from '../MultiImageUploader';
import IconPicker from '../IconPicker';
import { detachBinding } from '@/lib/block-bindings';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  previewMode: 'mobile' | 'desktop';
}

const ANIM_PRESETS: { value: ScrollPreset; label: string }[] = [
  { value: 'fadeUp', label: 'Subir' }, { value: 'fadeDown', label: 'Bajar' },
  { value: 'fade', label: 'Fundido' }, { value: 'slideRight', label: 'Desde la izquierda' },
  { value: 'slideLeft', label: 'Desde la derecha' }, { value: 'zoom', label: 'Zoom' },
  { value: 'pop', label: 'Rebote' }, { value: 'rotateIn', label: 'Girar' },
  { value: 'riseSoft', label: 'Ascenso suave (lujo)' },
  { value: 'tilt3d', label: 'Inclinar 3D' }, { value: 'flip3d', label: 'Voltear 3D' },
  { value: 'swing3d', label: 'Puerta 3D' }, { value: 'unfold3d', label: 'Desplegar 3D' },
  { value: 'depth3d', label: 'Profundidad 3D' },
  { value: 'curtain', label: 'Cortina' }, { value: 'blur', label: 'Desenfoque' },
  { value: 'parallax', label: 'Parallax' }, { value: 'zoomScroll', label: 'Zoom con scroll (fotos)' },
  { value: 'none', label: 'Ninguna' },
];

// ── Controles base ────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} className={`w-10 h-5.5 rounded-full transition-all cursor-pointer relative flex-shrink-0 ${on ? 'bg-enkarta-gold' : 'bg-gray-300'}`} style={{ width: 38, height: 22 }}>
      <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: on ? 18 : 4 }} />
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 font-outfit mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit';

// Renderiza un campo según su tipo (texto, color, imagen, icono, lista…).
function FieldControl({ field, value, set, setIcon, colors, speed, ownerId, eventType }: {
  field: FieldDef; value: any; set: (v: any) => void;
  setIcon?: (v: string, colors?: any, speed?: number) => void;
  colors?: any; speed?: number; ownerId?: string; eventType?: any;
}) {
  switch (field.kind) {
    case 'textarea':
      return <textarea className={inputCls} rows={3} value={value ?? ''} onChange={e => set(e.target.value)} placeholder={field.placeholder} />;
    case 'number':
      return <input type="number" className={inputCls} value={Number(value) || 0} min={field.min} max={field.max} onChange={e => set(parseInt(e.target.value) || 0)} />;
    case 'switch':
      return <Toggle on={!!value} onToggle={() => set(!value)} />;
    case 'select':
      return (
        <select className={inputCls} value={value ?? field.options?.[0]?.value} onChange={e => set(e.target.value)}>
          {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'color':
      return <input type="color" className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" value={value || '#000000'} onChange={e => set(e.target.value)} />;
    case 'image':
      return <ImageUploader value={value} onChange={set} folder="blocks" ownerId={ownerId} aspect="landscape" />;
    case 'images':
      return <MultiImageUploader values={Array.isArray(value) ? value : []} onChange={set} ownerId={ownerId} />;
    case 'icon':
      return <IconPicker value={value} colors={colors} speed={speed} defaultIcon="rings" onChange={(v, c, s) => setIcon?.(v, c, s)} ownerId={ownerId} eventType={eventType} />;
    case 'focal': {
      const m = /(-?\d+)%\s+(-?\d+)%/.exec(String(value || '50% 50%'));
      const fx = m ? parseInt(m[1]) : 50;
      const fy = m ? parseInt(m[2]) : 50;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-3 text-gray-400 font-outfit">X</span>
            <input type="range" min={0} max={100} value={fx} onChange={e => set(`${e.target.value}% ${fy}%`)} className="w-full accent-enkarta-gold" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-3 text-gray-400 font-outfit">Y</span>
            <input type="range" min={0} max={100} value={fy} onChange={e => set(`${fx}% ${e.target.value}%`)} className="w-full accent-enkarta-gold" />
          </div>
        </div>
      );
    }
    case 'text':
    default:
      return <input className={inputCls} value={value ?? ''} onChange={e => set(e.target.value)} placeholder={field.placeholder} />;
  }
}

// Editor de una lista de objetos (ej: pasos del itinerario).
function ListEditor({ items, itemFields, onChange, ownerId, eventType }: {
  items: any[]; itemFields: FieldDef[]; onChange: (v: any[]) => void; ownerId?: string; eventType?: any;
}) {
  const setItem = (i: number, patch: Record<string, any>) => {
    const next = items.map((it, j) => (j === i ? { ...it, ...patch } : it));
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-outfit text-gray-400">#{i + 1}</span>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600 font-outfit">Eliminar</button>
          </div>
          {itemFields.map(f => (
            <Labeled key={f.key} label={f.label}>
              <FieldControl
                field={f} value={it[f.key]} set={v => setItem(i, { [f.key]: v })}
                setIcon={(v, c, s) => setItem(i, { [f.key]: v, [`${f.key}Colors`]: c, [`${f.key}Speed`]: s })}
                colors={it[`${f.key}Colors`]} speed={it[`${f.key}Speed`]}
                ownerId={ownerId} eventType={eventType}
              />
            </Labeled>
          ))}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, {}])} className="w-full py-2 text-xs font-outfit text-enkarta-gold border border-dashed border-enkarta-gold/40 rounded-xl hover:bg-enkarta-gold/5">
        + Añadir elemento
      </button>
    </div>
  );
}

export default function BlockEditorPanel({ data, onChange, selectedId, onSelect, previewMode }: Props) {
  const cfg: BuilderConfig = data.config ?? {};
  const layout = cfg.layout;
  const blocks = layout?.blocks ?? [];

  // Búsqueda en la paleta de bloques.
  const [paletteQuery, setPaletteQuery] = useState('');

  // ── Plantillas guardadas (galería) ──
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  useEffect(() => { listUserTemplates().then(setTemplates); }, []);
  const applyTemplate = (t: UserTemplate) =>
    onChange({ config: { ...cfg, layout: t.layout, theme: t.theme ?? cfg.theme, motion: t.motion ?? cfg.motion, tokens: t.tokens ?? cfg.tokens } });
  const saveAsTemplate = () => {
    if (!layout) return;
    const name = window.prompt('Nombre de la plantilla:', data.names || 'Mi plantilla');
    if (name == null) return;
    saveUserTemplate(name, { layout, theme: cfg.theme, motion: cfg.motion, tokens: cfg.tokens }).then(setTemplates);
  };
  const removeTemplate = (id: string) => { deleteUserTemplate(id).then(setTemplates); };

  const renderTemplates = (canSave: boolean) => (
    <div className="space-y-2 border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Mis plantillas</h4>
        {canSave && <button type="button" onClick={saveAsTemplate} className="text-xs text-enkarta-gold hover:underline font-outfit">+ Guardar actual</button>}
      </div>
      {templates.length === 0
        ? <p className="text-xs text-gray-400 font-outfit">Aún no has guardado plantillas. Diseña una y pulsa &quot;Guardar actual&quot;.</p>
        : templates.map(t => (
          <div key={t.id} className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 bg-gray-50">
            <span className="text-sm font-outfit text-gray-700 flex-1 truncate" title={t.name}>{t.name}</span>
            <button type="button" onClick={() => applyTemplate(t)} className="text-xs text-enkarta-gold hover:underline font-outfit">Aplicar</button>
            <button type="button" onClick={() => removeTemplate(t.id)} className="text-xs text-red-400 hover:text-red-600 font-outfit">✕</button>
          </div>
        ))}
    </div>
  );

  const setBlocks = (next: Block[]) =>
    onChange({ config: { ...cfg, layout: { version: LAYOUT_VERSION, basePreset: layout?.basePreset ?? data.template, presetKey: layout?.presetKey ?? data.template, blocks: next } } });

  const patchBlock = (id: string, patch: Partial<Block>) =>
    setBlocks(blocks.map(b => (b.id === id ? { ...b, ...patch } : b)));

  // ── Sin layout → CTA de conversión ──
  if (!layout || blocks.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-sm font-outfit text-indigo-700 leading-relaxed">
            🧱 <span className="font-semibold">Constructor por bloques.</span> Convierte esta
            invitación en bloques editables: podrás reordenar, añadir, ocultar y editar cada
            sección (con su propia animación), como en un constructor de páginas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({
            config: {
              ...cfg,
              layout: layoutForTemplate(data),
              theme: cfg.theme ?? themeForTemplate(data.template),
              motion: cfg.motion ?? { preset: motionForTemplate(data.template) },
              tokens: cfg.tokens ?? tokensForTemplate(data.template),
            },
          })}
          className="w-full py-3 text-sm font-outfit font-medium text-white bg-enkarta-gold rounded-xl hover:bg-enkarta-gold/90 shadow shadow-enkarta-gold/30"
        >
          Convertir a bloques editables
        </button>
        <p className="text-xs text-gray-400 font-outfit">
          Tus datos actuales se usarán como punto de partida (con la paleta y la
          animación de la plantilla). La original se conserva si no conviertes.
        </p>
        {renderTemplates(false)}
      </div>
    );
  }

  const selected = blocks.find(b => b.id === selectedId);

  // ── Editor de un bloque seleccionado ──
  if (selected) {
    const def = BLOCKS[selected.type];
    const setProp = (key: string, v: any) => patchBlock(selected.id, { ...detachBinding(selected, key), props: { ...selected.props, [key]: v } });
    const setIcon = (key: string, v: string, colors?: any, speed?: number) =>
      patchBlock(selected.id, { ...detachBinding(selected, key), props: { ...selected.props, [key]: v, [`${key}Colors`]: colors, [`${key}Speed`]: speed } });
    const setStyle = (patch: Record<string, any>) => patchBlock(selected.id, { style: { ...(selected.style ?? {}), ...patch } });
    const setAnim = (patch: Record<string, any>) => patchBlock(selected.id, { animation: { ...(selected.animation ?? {}), ...patch } });
    const setBaseLayout = (patch: Partial<BlockLayout>) => patchBlock(selected.id, { layout: { ...(selected.layout ?? {}), ...patch } });
    const st = selected.style ?? {};
    const lay = selected.layout ?? {};
    const currentViewport = previewMode === 'mobile' ? (lay.mobile ?? {}) : (lay.desktop ?? {});
    const currentViewportKey = previewMode === 'mobile' ? 'mobile' : 'desktop';
    const setLayout = (patch: Partial<BlockLayout>) => {
      const nextViewport = { ...currentViewport, ...patch };
      patchBlock(selected.id, {
        layout: {
          ...lay,
          [currentViewportKey]: nextViewport,
        },
      });
    };
    const clearViewportLayout = () => {
      const next = { ...lay };
      delete next[currentViewportKey];
      patchBlock(selected.id, { layout: Object.keys(next).length ? next : undefined });
    };
    // Hijos (columnas)
    const kids = selected.children ?? [];
    const setKids = (next: Block[]) => patchBlock(selected.id, { children: next });
    const setKidProp = (i: number, key: string, val: any) => setKids(kids.map((c, j) => {
      if (j !== i) return c;
      const detached = detachBinding(c, key);
      return { ...c, ...detached, props: { ...c.props, [key]: val } };
    }));
    const setKidIcon = (i: number, key: string, val: string, colors?: any, speed?: number) => setKids(kids.map((c, j) => {
      if (j !== i) return c;
      const detached = detachBinding(c, key);
      return { ...c, ...detached, props: { ...c.props, [key]: val, [`${key}Colors`]: colors, [`${key}Speed`]: speed } };
    }));
    const setKidLayout = (i: number, patch: Partial<BlockLayout>) => setKids(kids.map((c, j) => (j === i ? { ...c, layout: { ...(c.layout ?? {}), ...patch } } : c)));
    const moveKid = (i: number, dir: number) => { const n = [...kids]; const j = i + dir; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setKids(n); };
    const isOverlay = (selected.props.mode ?? 'columns') === 'overlay';

    return (
      <div className="p-4 space-y-5">
        <button type="button" onClick={() => onSelect('')} className="text-xs text-gray-500 hover:text-gray-800 font-outfit flex items-center gap-1">
          ← Volver a la lista
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xl">{def?.icon}</span>
          <h3 className="font-outfit text-sm font-semibold text-gray-700">{def?.label}</h3>
        </div>

        {/* Contenido */}
        <div className="space-y-3">
          <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Contenido</h4>
          {selected.bindings && Object.keys(selected.bindings).length > 0 && (
            <p className="text-xs text-amber-700 font-outfit bg-amber-50 border border-amber-100 rounded-xl p-2.5">
              Este bloque está enlazado a datos globales. Si editas un campo aquí, ese enlace se rompe solo para ese campo.
            </p>
          )}
          {def?.fields.map(f => (
            f.kind === 'list' ? (
              <Labeled key={f.key} label={f.label}>
                <ListEditor items={Array.isArray(selected.props[f.key]) ? (selected.props[f.key] as any[]) : []} itemFields={f.itemFields ?? []} onChange={v => setProp(f.key, v)} ownerId={data.id} eventType={data.type} />
              </Labeled>
            ) : (
              <Labeled key={f.key} label={f.label}>
                <FieldControl
                  field={f} value={selected.props[f.key]} set={v => setProp(f.key, v)}
                  setIcon={(v, c, s) => setIcon(f.key, v, c, s)}
                  colors={selected.props[`${f.key}Colors`]} speed={selected.props[`${f.key}Speed`] as number | undefined}
                  ownerId={data.id} eventType={data.type}
                />
              </Labeled>
            )
          ))}
        </div>

        {/* Tipografía (bloques de texto) */}
        {['cover', 'heading', 'text', 'quote', 'hashtag'].includes(selected.type) && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Tipografía</h4>
            <Labeled label="Fuente">
              <select className={inputCls} value={(selected.props.family as string) || ''} onChange={e => setProp('family', e.target.value)}>
                {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Labeled>
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="Tamaño (px, 0=auto)">
                <input type="number" className={inputCls} value={Number(selected.props.size) || 0} min={0} max={120} onChange={e => setProp('size', parseInt(e.target.value) || 0)} />
              </Labeled>
              <Labeled label="Grosor">
                <select className={inputCls} value={(selected.props.weight as string) || ''} onChange={e => setProp('weight', e.target.value)}>
                  <option value="">Auto</option>
                  <option value="300">Fino</option>
                  <option value="400">Normal</option>
                  <option value="500">Medio</option>
                  <option value="600">Semibold</option>
                  <option value="700">Negrita</option>
                </select>
              </Labeled>
            </div>
            <Labeled label="Color del texto">
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" value={(selected.props.textColor as string) || '#3a342b'} onChange={e => setProp('textColor', e.target.value)} />
                {selected.props.textColor ? <button type="button" onClick={() => setProp('textColor', '')} className="text-xs text-gray-400 hover:underline font-outfit">Auto</button> : null}
              </div>
            </Labeled>
            <Labeled label={`Interletraje (${typeof selected.props.tracking === 'number' ? selected.props.tracking : 0}px)`}>
              <input type="range" min={-2} max={20} step={0.5} value={typeof selected.props.tracking === 'number' ? selected.props.tracking : 0} onChange={e => setProp('tracking', parseFloat(e.target.value))} className="w-full accent-enkarta-gold" />
            </Labeled>
          </div>
        )}

        {/* Columnas: contenido de los hijos */}
        {selected.type === 'group' && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">{isOverlay ? 'Capas (de abajo a arriba)' : 'Contenido de las columnas'}</h4>
            {isOverlay && <p className="text-xs text-gray-400 font-outfit -mt-1">El primer elemento queda al fondo; usa ↑↓ para el orden de capas y Posición X/Y para centrar el texto sobre la imagen.</p>}
            {kids.map((c, i) => {
              const cdef = BLOCKS[c.type];
              return (
                <div key={c.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-outfit text-gray-600 flex items-center gap-1"><span>{cdef?.icon}</span>{cdef?.label}</span>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <button type="button" disabled={i === 0} onClick={() => moveKid(i, -1)} className="hover:text-gray-700 disabled:opacity-30">↑</button>
                      <button type="button" disabled={i === kids.length - 1} onClick={() => moveKid(i, 1)} className="hover:text-gray-700 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => setKids(kids.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                  </div>
                  {cdef?.fields.map(f => (
                    f.kind === 'list' ? (
                      <Labeled key={f.key} label={f.label}>
                        <ListEditor items={Array.isArray(c.props[f.key]) ? (c.props[f.key] as any[]) : []} itemFields={f.itemFields ?? []} onChange={v => setKidProp(i, f.key, v)} ownerId={data.id} eventType={data.type} />
                      </Labeled>
                    ) : (
                      <Labeled key={f.key} label={f.label}>
                        <FieldControl
                          field={f} value={c.props[f.key]} set={v => setKidProp(i, f.key, v)}
                          setIcon={(v, col, sp) => setKidIcon(i, f.key, v, col, sp)}
                          colors={c.props[`${f.key}Colors`]} speed={c.props[`${f.key}Speed`] as number | undefined}
                          ownerId={data.id} eventType={data.type}
                        />
                      </Labeled>
                    )
                  ))}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Labeled label={`Posición X (${c.layout?.x ?? 0})`}>
                      <input type="range" min={-160} max={160} step={2} value={c.layout?.x ?? 0} onChange={e => setKidLayout(i, { x: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
                    </Labeled>
                    <Labeled label={`Posición Y (${c.layout?.y ?? 0})`}>
                      <input type="range" min={-160} max={160} step={2} value={c.layout?.y ?? 0} onChange={e => setKidLayout(i, { y: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
                    </Labeled>
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-3 gap-2">
              {CHILD_PALETTE.map(type => (
                <button key={type} type="button" onClick={() => setKids([...kids, createBlock(type)])} className="flex flex-col items-center gap-1 p-2 rounded-xl border border-gray-100 bg-white hover:border-enkarta-gold/40 hover:bg-enkarta-gold/5">
                  <span className="text-base">{BLOCKS[type].icon}</span>
                  <span className="text-[10px] font-outfit text-gray-500 text-center leading-tight">{BLOCKS[type].label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estilo */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Estilo de la sección</h4>
          <Labeled label="Fondo">
            <select className={inputCls} value={st.bgKind ?? 'none'} onChange={e => setStyle({ bgKind: e.target.value })}>
              <option value="none">Transparente</option>
              <option value="solid">Color sólido</option>
              <option value="gradient">Degradado</option>
              <option value="primary">Color principal (oscuro)</option>
              <option value="image">Imagen a sangre (hero)</option>
            </select>
          </Labeled>
          {(st.bgKind === 'solid' || st.bgKind === 'gradient') && (
            <Labeled label="Color de fondo">
              <input type="color" className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" value={st.bg || '#faf7f2'} onChange={e => setStyle({ bg: e.target.value })} />
            </Labeled>
          )}
          {st.bgKind === 'image' && (
            <>
              <Labeled label="Imagen de fondo">
                <ImageUploader value={st.bgImage} onChange={url => setStyle({ bgImage: url })} folder="blocks" ownerId={data.id} aspect="portrait" />
              </Labeled>
              <Labeled label={`Oscurecer (${Math.round((st.overlay ?? 0) * 100)}%)`}>
                <input type="range" min={0} max={85} step={5} value={Math.round((st.overlay ?? 0) * 100)} onChange={e => setStyle({ overlay: parseInt(e.target.value) / 100 })} className="w-full accent-enkarta-gold" />
              </Labeled>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-outfit text-gray-700">Pantalla completa</span>
                <Toggle on={!!st.fullHeight} onToggle={() => setStyle({ fullHeight: !st.fullHeight })} />
              </label>
              <Labeled label="Encuadre del fondo">
                {(() => {
                  const m = /(-?\d+)%\s+(-?\d+)%/.exec(st.bgFocal || '50% 50%');
                  const x = m ? parseInt(m[1]) : 50; const y = m ? parseInt(m[2]) : 50;
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2"><span className="text-[10px] w-3 text-gray-400 font-outfit">X</span><input type="range" min={0} max={100} value={x} onChange={e => setStyle({ bgFocal: `${e.target.value}% ${y}%` })} className="w-full accent-enkarta-gold" /></div>
                      <div className="flex items-center gap-2"><span className="text-[10px] w-3 text-gray-400 font-outfit">Y</span><input type="range" min={0} max={100} value={y} onChange={e => setStyle({ bgFocal: `${x}% ${e.target.value}%` })} className="w-full accent-enkarta-gold" /></div>
                    </div>
                  );
                })()}
              </Labeled>
            </>
          )}
          <Labeled label="Color de texto de la sección">
            <div className="flex items-center gap-2">
              <input type="color" className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" value={st.text || '#3a342b'} onChange={e => setStyle({ text: e.target.value })} />
              {st.text && <button type="button" onClick={() => setStyle({ text: undefined })} className="text-xs text-gray-400 hover:underline font-outfit">Auto</button>}
            </div>
          </Labeled>
          <Labeled label="Alineación">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a} type="button" onClick={() => setStyle({ align: a })} className={`flex-1 py-1.5 rounded-lg text-xs font-outfit transition-all ${(st.align ?? 'center') === a ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                  {a === 'left' ? 'Izq.' : a === 'center' ? 'Centro' : 'Der.'}
                </button>
              ))}
            </div>
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label={`Espacio arriba (${st.padTop ?? 44})`}>
              <input type="range" min={0} max={140} step={4} value={st.padTop ?? 44} onChange={e => setStyle({ padTop: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
            </Labeled>
            <Labeled label={`Espacio abajo (${st.padBottom ?? 44})`}>
              <input type="range" min={0} max={140} step={4} value={st.padBottom ?? 44} onChange={e => setStyle({ padBottom: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
            </Labeled>
          </div>
        </div>

        {/* Animación del bloque */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Animación de este bloque</h4>
          <Labeled label="Efecto al aparecer (vacío = usa el global)">
            <select className={inputCls} value={selected.animation?.preset ?? ''} onChange={e => setAnim({ preset: e.target.value || undefined })}>
              <option value="">— Usar el preset global —</option>
              {ANIM_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Labeled>
          <Labeled label={`Retraso (${selected.animation?.delay ?? 0} ms)`}>
            <input type="range" min={0} max={600} step={50} value={selected.animation?.delay ?? 0} onChange={e => setAnim({ delay: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
          </Labeled>
        </div>

        {/* Posición y tamaño (lienzo libre) */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Posición y tamaño</h4>
            <button type="button" onClick={clearViewportLayout} className="text-xs text-gray-400 hover:text-gray-700 font-outfit">Reset {previewMode}</button>
          </div>
          <p className="text-xs text-gray-400 font-outfit">Estás ajustando la vista <strong className="text-gray-500">{previewMode === 'mobile' ? 'móvil' : 'escritorio'}</strong>. También puedes arrastrar el bloque en la vista previa.</p>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label={`Horizontal (${currentViewport.x ?? lay.x ?? 0})`}>
              <input type="range" min={-200} max={200} step={2} value={currentViewport.x ?? lay.x ?? 0} onChange={e => setLayout({ x: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
            </Labeled>
            <Labeled label={`Vertical (${currentViewport.y ?? lay.y ?? 0})`}>
              <input type="range" min={-200} max={200} step={2} value={currentViewport.y ?? lay.y ?? 0} onChange={e => setLayout({ y: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
            </Labeled>
            <Labeled label={`Ancho ${(currentViewport.w ?? lay.w) ? `(${currentViewport.w ?? lay.w}px)` : '(auto)'}`}>
              <input type="range" min={0} max={900} step={10} value={currentViewport.w ?? lay.w ?? 0} onChange={e => setLayout({ w: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
            </Labeled>
            <Labeled label={`Rotación (${currentViewport.rotate ?? lay.rotate ?? 0}°)`}>
              <input type="range" min={-20} max={20} step={1} value={currentViewport.rotate ?? lay.rotate ?? 0} onChange={e => setLayout({ rotate: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
            </Labeled>
          </div>
          <Labeled label="Visible en">
            <select className={inputCls} value={lay.hideOn ?? ''} onChange={e => setBaseLayout({ hideOn: (e.target.value || undefined) as BlockLayout['hideOn'] })}>
              <option value="">Siempre (móvil y escritorio)</option>
              <option value="desktop">Solo en móvil</option>
              <option value="mobile">Solo en escritorio</option>
            </select>
          </Labeled>
          <div className="flex gap-2">
            <button type="button" onClick={() => patchBlock(selected.id, { layout: undefined })} className="flex-1 py-2 text-xs font-outfit text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
              Reset total
            </button>
            <button type="button" onClick={() => setBaseLayout({ x: 0, y: 0, w: undefined, rotate: undefined })} className="flex-1 py-2 text-xs font-outfit text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
              Recentrar base
            </button>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 border-t border-gray-100 pt-4">
          <button type="button" onClick={() => {
            const copy = { ...selected, id: `${selected.type}-${Date.now().toString(36)}`, props: JSON.parse(JSON.stringify(selected.props)) };
            const idx = blocks.findIndex(b => b.id === selected.id);
            setBlocks([...blocks.slice(0, idx + 1), copy, ...blocks.slice(idx + 1)]);
          }} className="flex-1 py-2 text-xs font-outfit text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Duplicar</button>
          <button type="button" onClick={() => { setBlocks(blocks.filter(b => b.id !== selected.id)); onSelect(''); }} className="flex-1 py-2 text-xs font-outfit text-red-500 border border-red-200 rounded-xl hover:bg-red-50">Eliminar</button>
        </div>
      </div>
    );
  }

  // ── Lista de bloques + paleta ──
  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Capas ({blocks.length})</h4>
        <button type="button" onClick={() => { if (confirm('¿Descartar los bloques y volver a la plantilla original?')) onChange({ config: { ...cfg, layout: undefined } }); }} className="text-xs text-gray-400 hover:text-red-500 font-outfit">Quitar bloques</button>
      </div>
      <p className="text-xs text-gray-400 font-outfit -mt-2">Arrastra para reordenar (el orden = profundidad de apilado). 🔒 bloquea una capa.</p>

      <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-2">
        {blocks.map(b => (
          <Reorder.Item key={b.id} value={b} className={`flex items-center gap-2 p-2.5 rounded-xl border bg-white cursor-grab active:cursor-grabbing transition-colors ${selectedId === b.id ? 'border-enkarta-gold ring-1 ring-enkarta-gold/40' : 'border-gray-100 hover:border-enkarta-gold/40'}`}>
            <span className="text-gray-300 select-none text-xs leading-none">⋮⋮</span>
            <button type="button" onClick={() => onSelect(b.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
              <span className="text-base flex-shrink-0">{BLOCKS[b.type]?.icon}</span>
              <span className={`text-sm font-outfit truncate ${b.enabled === false ? 'text-gray-300 line-through' : selectedId === b.id ? 'text-enkarta-gold font-medium' : 'text-gray-700'}`}>{BLOCKS[b.type]?.label}</span>
            </button>
            <button type="button" title={b.locked ? 'Desbloquear' : 'Bloquear'} onClick={() => patchBlock(b.id, { locked: !b.locked })} className="text-gray-400 hover:text-gray-700 text-sm flex-shrink-0">
              {b.locked ? '🔒' : '🔓'}
            </button>
            <button type="button" title={b.enabled === false ? 'Mostrar' : 'Ocultar'} onClick={() => patchBlock(b.id, { enabled: b.enabled === false })} className="text-gray-400 hover:text-gray-700 text-sm flex-shrink-0">
              {b.enabled === false ? '🚫' : '👁️'}
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Secciones prediseñadas: un clic inserta el conjunto completo */}
      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-2">Secciones listas</h4>
        <div className="space-y-1.5">
          {SECTION_PRESETS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                const nuevos = p.create();
                setBlocks([...blocks, ...nuevos]);
                if (nuevos[0]) onSelect(nuevos[0].id);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-white hover:border-enkarta-gold/40 hover:bg-enkarta-gold/5 transition-all text-left group"
            >
              <span className="text-lg flex-shrink-0">{p.icon}</span>
              <span className="min-w-0">
                <span className="block text-xs font-outfit font-medium text-gray-700 group-hover:text-enkarta-gold transition-colors">{p.label}</span>
                <span className="block text-[10px] font-outfit text-gray-400 truncate">{p.desc}</span>
              </span>
              <span className="ml-auto text-enkarta-gold opacity-0 group-hover:opacity-100 transition-opacity text-sm flex-shrink-0">+</span>
            </button>
          ))}
        </div>
      </div>

      {/* Paleta de bloques por categoría, con buscador */}
      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-2">Añadir bloque</h4>
        <div className="relative mb-3">
          <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <input
            type="text"
            value={paletteQuery}
            onChange={e => setPaletteQuery(e.target.value)}
            placeholder="Buscar bloque… (ej: mapa, video)"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
          />
        </div>
        <button
          type="button"
          onClick={() => { const g = createOverlayGroup(); setBlocks([...blocks, g]); onSelect(g.id); }}
          className="w-full mb-3 py-2 text-xs font-outfit text-gray-700 border border-dashed border-enkarta-gold/50 rounded-xl hover:bg-enkarta-gold/5"
        >
          🖼️✨ Imagen + texto en capas
        </button>
        <div className="space-y-3">
          {PALETTE_GROUPS.map(group => {
            const q = paletteQuery.trim().toLowerCase();
            const types = q
              ? group.types.filter(t => BLOCKS[t].label.toLowerCase().includes(q) || t.toLowerCase().includes(q))
              : group.types;
            if (types.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="text-[10px] font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{group.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {types.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { const nb = createBlock(type as BlockType); setBlocks([...blocks, nb]); onSelect(nb.id); }}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-enkarta-gold/40 hover:bg-enkarta-gold/5 hover:-translate-y-px transition-all"
                    >
                      <span className="text-lg">{BLOCKS[type].icon}</span>
                      <span className="text-[10px] font-outfit text-gray-500 text-center leading-tight">{BLOCKS[type].label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {paletteQuery.trim() && PALETTE_GROUPS.every(g => {
            const q = paletteQuery.trim().toLowerCase();
            return g.types.every(t => !BLOCKS[t].label.toLowerCase().includes(q) && !t.toLowerCase().includes(q));
          }) && (
            <p className="text-xs text-gray-400 font-outfit text-center py-2">Sin resultados para &ldquo;{paletteQuery}&rdquo;</p>
          )}
        </div>
      </div>

      {renderTemplates(true)}
    </div>
  );
}
