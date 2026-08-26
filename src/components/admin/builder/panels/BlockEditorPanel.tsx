'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

// Editor del documento por bloques. Convierte la invitación a bloques editables,
// permite reordenar (drag), añadir desde una paleta, duplicar/ocultar/eliminar y
// editar cada bloque con un editor de campos generado desde el "field schema"
// (registry). La selección se comparte con el LivePreview (clic en el preview →
// abre el bloque aquí, y al revés).

import { Reorder } from 'framer-motion';
import { InvitationParsed, BuilderConfig, Block, BlockType, BlockLayout, BlockViewportLayout, ScrollPreset, LAYOUT_VERSION } from '@/lib/types';
import { BLOCKS, PALETTE_GROUPS, SECTION_PRESETS, CHILD_PALETTE, createBlock, createOverlayGroup, cloneBlock, FONT_OPTIONS, type FieldDef, type SectionPreset } from '@/components/invitations/blocks/registry';
import { layoutForTemplate } from '@/lib/layout-presets';
import { themeForTemplate, motionForTemplate, tokensForTemplate } from '@/lib/template-themes';
import { listUserTemplates, saveUserTemplate, deleteUserTemplate, type UserTemplate } from '@/lib/user-templates';
import { deleteUserSection, hydrateUserSections, listUserSections, saveUserSection, type UserSection } from '@/lib/user-sections';
import { useEffect, useState } from 'react';
import ImageUploader from '../ImageUploader';
import MultiImageUploader from '../MultiImageUploader';
import ImageStudio from '../ImageStudio';
import IconPicker from '../IconPicker';
import { attachDefaultBindings, detachBinding } from '@/lib/block-bindings';
import { DIVIDER_VARIANTS, dividerVariant } from '@/components/invitations/dividers';
import { BlockGlyph, EyeGlyph, LockGlyph, blockVisual, editorCardCls, editorSectionTitleCls } from '../editor-ui';
import SectionPresetCard, { SectionPreview } from '../SectionPresetCard';
import { isSectionRecommended, sectionCatalogMeta, SECTION_MOMENTS, SECTION_STYLES, transferSectionContent, type SectionMoment, type SectionStyle } from '@/lib/section-catalog';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
  selectedId: string;
  selectedIds: string[];
  onSelect: (id: string, additive?: boolean) => void;
  previewMode: 'mobile' | 'desktop';
  previewWidth?: number;
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

const GUEST_DYNAMIC_FIELDS = [
  { path: 'guest.name', label: 'Nombre', token: '{{guest.name}}' },
  { path: 'guest.passesLabel', label: 'Pases', token: '{{guest.passesLabel}}' },
  { path: 'guest.tableLabel', label: 'Mesa', token: '{{guest.tableLabel}}' },
  { path: 'guest.accessCode', label: 'Código', token: '{{guest.accessCode}}' },
  { path: 'guest.statusLabel', label: 'Estado RSVP', token: '{{guest.statusLabel}}' },
  { path: 'guest.group', label: 'Grupo', token: '{{guest.group}}' },
] as const;

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
      <label className="mb-1.5 block text-[11px] font-medium leading-tight text-[#6f675e] font-outfit">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full min-h-10 px-3 py-2 text-sm rounded-[11px] border border-[#ded8d0] bg-white text-[#403a33] shadow-[0_1px_2px_rgba(30,24,16,0.025)] transition-all focus:border-enkarta-gold focus:ring-3 focus:ring-enkarta-gold/10 outline-none font-outfit';

const STYLE_RECIPES: { key: string; label: string; desc: string; patch: NonNullable<Block['style']> }[] = [
  { key: 'clean', label: 'Limpia', desc: 'Aire y papel', patch: { bgKind: 'none', fullHeight: false, padTop: 56, padBottom: 56 } },
  { key: 'soft', label: 'Suave', desc: 'Tinte ligero', patch: { bgKind: 'soft', fullHeight: false, padTop: 64, padBottom: 64 } },
  { key: 'contrast', label: 'Contraste', desc: 'Banda protagonista', patch: { bgKind: 'primary', fullHeight: false, padTop: 72, padBottom: 72 } },
  { key: 'scene', label: 'Escena', desc: 'Pantalla completa', patch: { bgKind: 'none', fullHeight: true, padTop: 80, padBottom: 80 } },
];

// Renderiza un campo según su tipo (texto, color, imagen, icono, lista…).
function FieldControl({ field, value, set, setIcon, colors, speed, ownerId, eventType, accent }: {
  field: FieldDef; value: any; set: (v: any) => void;
  setIcon?: (v: string, colors?: any, speed?: number) => void;
  colors?: any; speed?: number; ownerId?: string; eventType?: any;
  /** Color con el que se dibujan las miniaturas de separador (el de la invitación). */
  accent?: string;
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
    case 'divider': {
      // Se dibujan con el color real de la invitación: elegir un separador a
      // ciegas por su nombre ("Floritura", "Art déco") no dice nada.
      const cur = dividerVariant(value).key;
      const ink = accent || '#8a7d6a';
      return (
        <div className="space-y-1">
          {DIVIDER_VARIANTS.map(v => (
            <button
              key={v.key}
              type="button"
              onClick={() => set(v.key)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all ${cur === v.key ? 'border-enkarta-gold bg-enkarta-gold/5' : 'border-gray-100 bg-white hover:border-enkarta-gold/40'}`}
            >
              <span className={`w-14 shrink-0 text-left text-[10px] font-outfit leading-tight ${cur === v.key ? 'text-enkarta-gold' : 'text-gray-500'}`}>{v.label}</span>
              <span className="flex-1 min-w-0 flex items-center">{v.render(ink)}</span>
            </button>
          ))}
        </div>
      );
    }
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

function imageMediaLibrary(data: InvitationParsed, cfg: BuilderConfig, blocks: Block[]): string[] {
  const found = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== 'string') return;
    const url = value.trim();
    if (url && (/^(https?:|blob:|data:image\/|\/)/i.test(url))) found.add(url);
  };
  const addMany = (value: unknown) => { if (Array.isArray(value)) value.forEach(add); };
  const inspectFields = (block: Block) => {
    const fields = BLOCKS[block.type]?.fields ?? [];
    fields.forEach(field => {
      const value = block.props[field.key];
      if (field.kind === 'image') add(value);
      if (field.kind === 'images') addMany(value);
      if (field.kind === 'list' && Array.isArray(value)) {
        value.forEach(item => field.itemFields?.forEach(child => {
          if (child.kind === 'image') add(item?.[child.key]);
          if (child.kind === 'images') addMany(item?.[child.key]);
        }));
      }
    });
    if (block.type === 'element' && block.props.source === 'upload') add(block.props.url);
    block.children?.forEach(inspectFields);
  };

  add(data.cover_image_url);
  add(cfg.secondaryImage); add(cfg.footerImage); add(cfg.aboutImage);
  add(cfg.groomPhoto); add(cfg.bridePhoto); add(cfg.giftQrUrl);
  addMany(cfg.galleryImages);
  Object.values(cfg.sectionImages ?? {}).forEach(add);
  cfg.lodging?.forEach(item => add(item.image));
  blocks.forEach(inspectFields);
  return Array.from(found);
}

export default function BlockEditorPanel({ data, onChange, selectedId, selectedIds, onSelect, previewMode, previewWidth }: Props) {
  const cfg: BuilderConfig = data.config ?? {};
  const layout = cfg.layout;
  const blocks = layout?.blocks ?? [];

  // Búsqueda en la paleta de bloques.
  const [paletteQuery, setPaletteQuery] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [libraryView, setLibraryView] = useState<'layers' | 'library'>('layers');
  const [inspectorTab, setInspectorTab] = useState<'content' | 'design' | 'motion' | 'layout'>('content');

  useEffect(() => {
    if (selectedId) setInspectorTab('content');
  }, [selectedId]);

  // Galería de secciones: filtros narrativos, estilo y vista previa ampliada.
  const [sectionMoment, setSectionMoment] = useState<'Todas' | SectionMoment>('Todas');
  const [sectionStyle, setSectionStyle] = useState<'Todos' | SectionStyle>('Todos');
  const [sectionQuery, setSectionQuery] = useState('');
  const [previewPresetKey, setPreviewPresetKey] = useState<string | null>(null);

  // ── Plantillas guardadas (galería) ──
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [userSections, setUserSections] = useState<UserSection[]>(() => listUserSections());
  const [sectionsCloud, setSectionsCloud] = useState(false);
  useEffect(() => {
    listUserTemplates().then(setTemplates);
    hydrateUserSections().then(state => { setUserSections(state.sections); setSectionsCloud(state.cloud); });
  }, []);
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
  const saveBlocksAsSection = (items: Block[]) => {
    if (!items.length) return;
    const suggested = items.length === 1 ? (BLOCKS[items[0].type]?.label ?? 'Mi sección') : `Composición de ${items.length} bloques`;
    const name = window.prompt('Nombre de la sección reutilizable:', suggested);
    if (name == null) return;
    setUserSections(saveUserSection(name, items));
  };
  const insertUserSection = (section: UserSection) => {
    const inserted = section.blocks.map(cloneBlock);
    setBlocks([...blocks, ...inserted]);
    setLibraryView('layers');
    if (inserted[0]) onSelect(inserted[0].id);
  };

  const selectedBlocks = blocks.filter(b => selectedIds.includes(b.id));
  const selectedSources = selectedBlocks.length ? selectedBlocks : blocks.filter(b => b.id === selectedId);
  const insertPreset = (preset: SectionPreset, replace = false) => {
    let created = attachDefaultBindings(preset.create());
    if (replace && selectedSources.length) {
      created = transferSectionContent(created, selectedSources);
      const ids = new Set(selectedSources.map(block => block.id));
      const first = Math.min(...selectedSources.map(block => blocks.findIndex(item => item.id === block.id)).filter(index => index >= 0));
      const kept = blocks.filter(block => !ids.has(block.id));
      const at = Math.max(0, first);
      setBlocks([...kept.slice(0, at), ...created, ...kept.slice(at)]);
    } else {
      setBlocks([...blocks, ...created]);
    }
    setLibraryView('layers');
    setPreviewPresetKey(null);
    if (created[0]) onSelect(created[0].id);
  };

  const presetTheme = { ...themeForTemplate(data.template), ...(cfg.theme ?? {}) };
  const sectionPalette = {
    paper: presetTheme.bg || '#f8f4ed',
    primary: presetTheme.primary || '#b48a45',
    ink: presetTheme.text || presetTheme.primaryDeep || '#342e28',
  };
  const normalizedSectionQuery = sectionQuery.trim().toLocaleLowerCase('es');
  const visibleSectionPresets = SECTION_PRESETS
    .filter(preset => {
      const meta = sectionCatalogMeta(preset.key, preset.group);
      if (sectionMoment !== 'Todas' && meta.moment !== sectionMoment) return false;
      if (sectionStyle !== 'Todos' && !meta.styles.includes(sectionStyle)) return false;
      if (!normalizedSectionQuery) return true;
      return [preset.label, preset.desc, preset.group, meta.moment, ...meta.styles, ...meta.tags]
        .join(' ').toLocaleLowerCase('es').includes(normalizedSectionQuery);
    })
    .sort((a, b) => {
      const aMeta = sectionCatalogMeta(a.key, a.group);
      const bMeta = sectionCatalogMeta(b.key, b.group);
      const aRecommended = isSectionRecommended(aMeta, data.template) ? 1 : 0;
      const bRecommended = isSectionRecommended(bMeta, data.template) ? 1 : 0;
      return bRecommended - aRecommended || Number(!!bMeta.featured) - Number(!!aMeta.featured);
    });
  const previewPreset = previewPresetKey ? SECTION_PRESETS.find(preset => preset.key === previewPresetKey) : undefined;
  const viewportKey = previewMode === 'mobile' ? 'mobile' : 'desktop';
  const layoutValue = (b: Block, key: 'x' | 'y' | 'w' | 'z') => b.layout?.[viewportKey]?.[key] ?? b.layout?.[key] ?? (key === 'w' ? undefined : 0);
  const patchSelectedLayouts = (makePatch: (b: Block, index: number) => Partial<BlockLayout>) => {
    const indexById = new Map(selectedBlocks.map((b, i) => [b.id, i]));
    setBlocks(blocks.map(b => {
      const index = indexById.get(b.id);
      if (index == null) return b;
      const lay = b.layout ?? {};
      return { ...b, layout: { ...lay, [viewportKey]: { ...(lay[viewportKey] ?? {}), ...makePatch(b, index) } } };
    }));
  };
  const alignSelected = (axis: 'x' | 'y', mode: 'start' | 'center' | 'end') => {
    const values = selectedBlocks.map(b => Number(layoutValue(b, axis) ?? 0));
    const target = mode === 'start' ? Math.min(...values) : mode === 'end' ? Math.max(...values) : 0;
    patchSelectedLayouts(() => ({ [axis]: target }));
  };
  const distributeSelected = () => {
    if (selectedBlocks.length < 3) return;
    const sorted = [...selectedBlocks].sort((a, b) => Number(layoutValue(a, 'y')) - Number(layoutValue(b, 'y')));
    const min = Number(layoutValue(sorted[0], 'y'));
    const max = Number(layoutValue(sorted[sorted.length - 1], 'y'));
    const byId = new Map(sorted.map((b, i) => [b.id, Math.round(min + ((max - min) * i) / (sorted.length - 1))]));
    patchSelectedLayouts(b => ({ y: byId.get(b.id) ?? 0 }));
  };
  const matchSelectedWidth = () => {
    const primary = selectedBlocks.find(b => b.id === selectedId) ?? selectedBlocks[0];
    const width = primary ? layoutValue(primary, 'w') : undefined;
    if (typeof width === 'number') patchSelectedLayouts(() => ({ w: width }));
  };
  const patchSelected = (patch: Partial<Block>) => setBlocks(blocks.map(b => selectedIds.includes(b.id) ? { ...b, ...patch } : b));
  const duplicateSelected = () => {
    const copies = selectedBlocks.map(b => {
      const copy = cloneBlock(b);
      copy.layout = { ...(copy.layout ?? {}), x: (copy.layout?.x ?? 0) + 16, y: (copy.layout?.y ?? 0) + 16 };
      return copy;
    });
    const last = Math.max(...selectedBlocks.map(b => blocks.findIndex(x => x.id === b.id)));
    setBlocks([...blocks.slice(0, last + 1), ...copies, ...blocks.slice(last + 1)]);
    if (copies[0]) onSelect(copies[0].id);
  };
  const deleteSelected = () => { setBlocks(blocks.filter(b => !selectedIds.includes(b.id))); onSelect(''); };
  const groupSelected = () => {
    if (selectedBlocks.length < 2) return;
    const first = Math.min(...selectedBlocks.map(b => blocks.findIndex(x => x.id === b.id)));
    const group = createBlock('group');
    group.props = { ...group.props, mode: 'overlay', columns: 1 };
    group.style = { bgKind: 'none', padTop: 8, padBottom: 8, surface: 'flat' };
    group.children = selectedBlocks.map(cloneBlock);
    const rest = blocks.filter(b => !selectedIds.includes(b.id));
    rest.splice(first, 0, group);
    setBlocks(rest);
    onSelect(group.id);
  };
  const moveSelectionInStack = (front: boolean) => {
    const picked = blocks.filter(b => selectedIds.includes(b.id));
    const rest = blocks.filter(b => !selectedIds.includes(b.id));
    setBlocks(front ? [...rest, ...picked] : [...picked, ...rest]);
  };

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

  if (selectedBlocks.length > 1 && !batchMode) {
    return (
      <div className="p-4 space-y-5">
        <button type="button" onClick={() => setBatchMode(true)} className="text-xs text-gray-500 hover:text-gray-800 font-outfit">← Cambiar selección en capas</button>
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
          <div className="flex items-center justify-between"><div><p className="text-sm font-outfit font-semibold text-gray-800">Selección múltiple</p><p className="text-xs font-outfit text-gray-500">{selectedBlocks.length} capas · Shift + clic para añadir o quitar</p></div><span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-outfit font-semibold text-violet-600">{selectedBlocks.length}</span></div>
          <div className="mt-3 flex flex-wrap gap-1.5">{selectedBlocks.map(b => <button key={b.id} type="button" onClick={() => onSelect(b.id, true)} className="rounded-full border border-violet-100 bg-white px-2 py-1 text-[10px] font-outfit text-gray-600">{BLOCKS[b.type]?.icon} {BLOCKS[b.type]?.label} ×</button>)}</div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Alinear en {previewMode}</h4>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => alignSelected('x', 'start')} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600 hover:border-enkarta-gold/40">⇤ Izquierda</button>
            <button type="button" onClick={() => alignSelected('x', 'center')} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600 hover:border-enkarta-gold/40">↔ Centro</button>
            <button type="button" onClick={() => alignSelected('x', 'end')} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600 hover:border-enkarta-gold/40">⇥ Derecha</button>
            <button type="button" onClick={() => alignSelected('y', 'start')} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600 hover:border-enkarta-gold/40">⇡ Arriba</button>
            <button type="button" onClick={() => alignSelected('y', 'center')} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600 hover:border-enkarta-gold/40">↕ Medio</button>
            <button type="button" onClick={() => alignSelected('y', 'end')} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600 hover:border-enkarta-gold/40">⇣ Abajo</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={selectedBlocks.length < 3} onClick={distributeSelected} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600 disabled:opacity-40">Distribuir vertical</button>
            <button type="button" onClick={matchSelectedWidth} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600">Igualar ancho</button>
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Organizar</h4>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => moveSelectionInStack(true)} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600">Traer al frente</button>
            <button type="button" onClick={() => moveSelectionInStack(false)} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600">Enviar atrás</button>
            <button type="button" onClick={() => patchSelected({ locked: true })} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600">🔒 Bloquear</button>
            <button type="button" onClick={() => patchSelected({ locked: false })} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600">🔓 Desbloquear</button>
          </div>
          <button type="button" onClick={groupSelected} className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-outfit font-medium text-white shadow-sm">Agrupar como composición</button>
          <button type="button" onClick={() => saveBlocksAsSection(selectedBlocks)} className="w-full rounded-xl border border-violet-200 bg-white py-2.5 text-xs font-outfit font-medium text-violet-600">Guardar como sección reutilizable</button>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
          <button type="button" onClick={duplicateSelected} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600">Duplicar</button>
          <button type="button" onClick={() => patchSelected({ enabled: false })} className="rounded-xl border border-gray-200 py-2 text-xs font-outfit text-gray-600">Ocultar</button>
          <button type="button" onClick={deleteSelected} className="rounded-xl border border-red-200 py-2 text-xs font-outfit text-red-500">Eliminar</button>
        </div>
      </div>
    );
  }

  // ── Editor de un bloque seleccionado ──
  if (selected && !batchMode) {
    const def = BLOCKS[selected.type];
    const setProp = (key: string, v: any) => patchBlock(selected.id, { ...detachBinding(selected, key), props: { ...selected.props, [key]: v } });
    const setProps = (patch: Record<string, unknown>) => patchBlock(selected.id, { props: { ...selected.props, ...patch } });
    const setIcon = (key: string, v: string, colors?: any, speed?: number) =>
      patchBlock(selected.id, { ...detachBinding(selected, key), props: { ...selected.props, [key]: v, [`${key}Colors`]: colors, [`${key}Speed`]: speed } });
    const setStyle = (patch: Record<string, any>) => patchBlock(selected.id, { style: { ...(selected.style ?? {}), ...patch } });
    const setAnim = (patch: Record<string, any>) => patchBlock(selected.id, { animation: { ...(selected.animation ?? {}), ...patch } });
    const setVisibility = (patch: NonNullable<Block['visibility']>) => patchBlock(selected.id, { visibility: { ...(selected.visibility ?? {}), ...patch } });
    const setBinding = (key: string, path: string) => {
      const bindings = { ...(selected.bindings ?? {}) };
      if (path) bindings[key] = path;
      else delete bindings[key];
      patchBlock(selected.id, { bindings: Object.keys(bindings).length ? bindings : undefined });
    };
    const insertGuestToken = (token: string) => {
      const field = def?.fields.find(item => item.kind === 'text' || item.kind === 'textarea');
      if (!field) return;
      const current = String(selected.props[field.key] ?? '').trim();
      setProp(field.key, current ? `${current} ${token}` : token);
    };
    const setBaseLayout = (patch: Partial<BlockLayout>) => patchBlock(selected.id, { layout: { ...(selected.layout ?? {}), ...patch } });
    const st = selected.style ?? {};
    const lay = selected.layout ?? {};
    const currentViewport = previewMode === 'mobile' ? (lay.mobile ?? {}) : (lay.desktop ?? {});
    const currentViewportKey = previewMode === 'mobile' ? 'mobile' : 'desktop';
    const viewportMode = currentViewport.mode ?? (Object.keys(currentViewport).some(key => ['x', 'y', 'w', 'rotate', 'anchor', 'z'].includes(key)) ? 'custom' : 'inherit');
    const setLayout = (patch: Partial<BlockViewportLayout>) => {
      const nextViewport = { ...currentViewport, ...patch };
      patchBlock(selected.id, {
        layout: {
          ...lay,
          [currentViewportKey]: nextViewport,
        },
      });
    };
    const setViewportMode = (mode: NonNullable<BlockViewportLayout['mode']>) => {
      const next: BlockViewportLayout = { ...currentViewport, mode };
      if (mode !== 'custom') {
        delete next.x; delete next.y; delete next.w; delete next.rotate; delete next.anchor; delete next.z;
      }
      patchBlock(selected.id, { layout: { ...lay, [currentViewportKey]: next } });
    };
    const moveForViewport = (dir: -1 | 1) => {
      const ordered = blocks.map((block, index) => ({ block, index, order: block.layout?.[currentViewportKey]?.order ?? index }))
        .sort((a, b) => a.order - b.order || a.index - b.index);
      const index = ordered.findIndex(item => item.block.id === selected.id);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= ordered.length) return;
      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
      const order = new Map(ordered.map((item, position) => [item.block.id, position]));
      setBlocks(blocks.map(block => ({
        ...block,
        layout: {
          ...(block.layout ?? {}),
          [currentViewportKey]: { ...(block.layout?.[currentViewportKey] ?? {}), order: order.get(block.id) },
        },
      })));
    };
    const createDeviceVariant = () => {
      const otherKey = currentViewportKey === 'mobile' ? 'desktop' : 'mobile';
      const originalLayout: BlockLayout = {
        ...lay,
        [currentViewportKey]: { ...(lay[currentViewportKey] ?? {}), hidden: true },
      };
      const copy = cloneBlock(selected);
      copy.layout = {
        ...lay,
        [currentViewportKey]: { ...(lay[currentViewportKey] ?? {}), hidden: false },
        [otherKey]: { ...(lay[otherKey] ?? {}), hidden: true },
      };
      const index = blocks.findIndex(block => block.id === selected.id);
      const next = blocks.map(block => block.id === selected.id ? { ...block, layout: originalLayout } : block);
      next.splice(index + 1, 0, copy);
      setBlocks(next);
      onSelect(copy.id);
    };
    const clearViewportLayout = () => {
      const next = { ...lay };
      delete next[currentViewportKey];
      patchBlock(selected.id, { layout: Object.keys(next).length ? next : undefined });
    };
    const copyViewportLayout = (from: 'mobile' | 'desktop', to: 'mobile' | 'desktop') => {
      const source = lay[from] ?? {};
      patchBlock(selected.id, { layout: { ...lay, [to]: { ...source } } });
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
    const resolvedX = viewportMode === 'auto' ? 0 : currentViewport.x ?? lay.x ?? 0;
    const resolvedY = viewportMode === 'auto' ? 0 : currentViewport.y ?? lay.y ?? 0;
    const resolvedW = viewportMode === 'auto' ? 0 : currentViewport.w ?? lay.w ?? 0;
    const resolvedRotate = viewportMode === 'auto' ? 0 : currentViewport.rotate ?? lay.rotate ?? 0;
    const resolvedZ = viewportMode === 'auto' ? lay.z ?? 0 : currentViewport.z ?? lay.z ?? 0;
    const deviceVisibility = currentViewport.hidden == null ? 'inherit' : currentViewport.hidden ? 'hidden' : 'visible';
    const widthLimit = previewMode === 'mobile' ? Math.max(320, (previewWidth ?? 390) - 32) : Math.max(720, (previewWidth ?? 1024) - 64);
    const responsiveRisk = Math.abs(resolvedX) > (previewMode === 'mobile' ? 150 : 420) || (!!resolvedW && resolvedW > widthLimit);

    const selectedVisual = blockVisual(selected.type);
    const inspectorTabs = [
      { id: 'content' as const, label: 'Contenido', hint: 'Textos y datos' },
      { id: 'design' as const, label: 'Diseño', hint: 'Color y forma' },
      { id: 'motion' as const, label: 'Movimiento', hint: 'Entrada y ritmo' },
      { id: 'layout' as const, label: 'Posición', hint: `${previewMode === 'mobile' ? 'Móvil' : 'Escritorio'}${previewWidth ? ` · ${previewWidth}` : ''}` },
    ];

    return (
      <div className="space-y-4 bg-[#fcfbf9] p-4">
        <button type="button" onClick={() => onSelect('')} className="flex items-center gap-1.5 text-[11px] font-medium text-[#7b7267] transition-colors hover:text-[#332d27] font-outfit">
          <span aria-hidden>←</span> Todas las capas
        </button>

        <div className="overflow-hidden rounded-[20px] border border-[#e8e0d6] bg-white shadow-[0_14px_45px_rgba(61,48,31,0.07)]">
          <div className="flex items-center gap-3 bg-[linear-gradient(135deg,#fff_0%,#f7f0e6_100%)] p-4">
            <BlockGlyph type={selected.type} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-playfair text-[18px] text-[#332d27]">{def?.label}</h3>
                <span className="rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] font-outfit" style={{ color: selectedVisual.ink, background: selectedVisual.bg }}>{selectedVisual.label}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-[#94897d] font-outfit">Edita el bloque y comprueba el cambio directamente en el lienzo.</p>
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${selected.enabled === false ? 'bg-gray-300' : 'bg-emerald-400'}`} title={selected.enabled === false ? 'Oculto' : 'Visible'} />
          </div>
          <div className="grid grid-cols-4 border-t border-[#eee8df] bg-[#fbfaf8] p-1.5">
            {inspectorTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInspectorTab(tab.id)}
                className={`rounded-xl px-1 py-2 text-center transition-all ${inspectorTab === tab.id ? 'bg-white text-[#9a762f] shadow-sm ring-1 ring-black/5' : 'text-[#8b8278] hover:bg-white/70'}`}
              >
                <span className="block text-[10px] font-semibold leading-tight font-outfit">{tab.label}</span>
                <span className="mt-0.5 hidden text-[8px] leading-tight opacity-65 2xl:block font-outfit">{tab.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        {inspectorTab === 'content' && <div className={`${editorCardCls} space-y-3`}>
          <h4 className={editorSectionTitleCls}>Contenido del bloque</h4>
          {selected.bindings && Object.keys(selected.bindings).length > 0 && (
            <p className="text-xs text-amber-700 font-outfit bg-amber-50 border border-amber-100 rounded-xl p-2.5">
              Este bloque está enlazado a datos globales. Si editas un campo aquí, ese enlace se rompe solo para ese campo.
            </p>
          )}
          {selected.type === 'image' && (
            <ImageStudio
              value={String(selected.props.url || '')}
              settings={selected.props}
              onImageChange={url => setProp('url', url)}
              onSettingsChange={setProps}
              ownerId={data.id}
              usedMedia={imageMediaLibrary(data, cfg, blocks)}
              accent={cfg.theme?.primary || data.color_primary}
            />
          )}
          {def?.fields.filter(f => selected.type !== 'image' || !['url', 'focal'].includes(f.key)).map(f => (
            f.kind === 'list' ? (
              <Labeled key={f.key} label={f.label}>
                <ListEditor items={Array.isArray(selected.props[f.key]) ? (selected.props[f.key] as any[]) : []} itemFields={f.itemFields ?? []} onChange={v => setProp(f.key, v)} ownerId={data.id} eventType={data.type} />
              </Labeled>
            ) : (
              <div key={f.key} className="space-y-1.5">
              <Labeled label={f.label}>
                <FieldControl
                  field={f} value={selected.props[f.key]} set={v => setProp(f.key, v)}
                  setIcon={(v, c, s) => setIcon(f.key, v, c, s)}
                  colors={selected.props[`${f.key}Colors`]} speed={selected.props[`${f.key}Speed`] as number | undefined}
                  ownerId={data.id} eventType={data.type} accent={cfg.theme?.primary}
                />
              </Labeled>
              {['text', 'textarea'].includes(f.kind) && (
                <select
                  aria-label={`Dato dinámico para ${f.label}`}
                  className="w-full rounded-lg border border-cyan-100 bg-cyan-50/60 px-2.5 py-1.5 text-[10px] text-cyan-800 outline-none font-outfit"
                  value={selected.bindings?.[f.key] ?? ''}
                  onChange={e => setBinding(f.key, e.target.value)}
                >
                  <option value="">Valor manual</option>
                  {GUEST_DYNAMIC_FIELDS.map(item => <option key={item.path} value={item.path}>Invitado · {item.label}</option>)}
                </select>
              )}
              </div>
            )
          ))}
        </div>}

        {inspectorTab === 'content' && <details className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-outfit font-semibold text-cyan-800"><span>◎ Audiencia y contenido dinámico</span><span className="text-cyan-500">⌄</span></summary>
          <div className="mt-3 space-y-3 border-t border-cyan-100 pt-3">
            <div>
              <p className="mb-1.5 text-[10px] font-outfit font-medium text-cyan-800">Insertar variable dentro de un texto</p>
              <div className="flex flex-wrap gap-1.5">
                {GUEST_DYNAMIC_FIELDS.map(item => (
                  <button key={item.path} type="button" onClick={() => insertGuestToken(item.token)} className="rounded-full border border-cyan-200 bg-white px-2 py-1 text-[9px] font-outfit text-cyan-700 hover:bg-cyan-100">+ {item.label}</button>
                ))}
              </div>
            </div>
            <Labeled label="Mostrar este bloque a">
              <select className={inputCls} value={selected.visibility?.audience ?? 'all'} onChange={e => setVisibility({ audience: e.target.value as NonNullable<Block['visibility']>['audience'] })}>
                <option value="all">Todos los enlaces</option><option value="personalized">Solo enlaces con nombre</option><option value="generic">Solo enlace general</option>
              </select>
            </Labeled>
            <Labeled label="Tipo de invitado">
              <select className={inputCls} value={selected.visibility?.guestType ?? 'all'} onChange={e => setVisibility({ guestType: e.target.value as NonNullable<Block['visibility']>['guestType'] })}>
                <option value="all">Cualquier invitado</option><option value="adultsOnly">Solo invitados sin niños</option><option value="kidsAllowed">Solo invitados con niños permitidos</option>
              </select>
            </Labeled>
            <Labeled label={`Pases mínimos (${selected.visibility?.minPasses ?? 1})`}>
              <input type="range" min={1} max={10} step={1} value={selected.visibility?.minPasses ?? 1} onChange={e => setVisibility({ minPasses: parseInt(e.target.value) })} className="w-full accent-cyan-600" />
            </Labeled>
            <Labeled label={`Pases máximos (${selected.visibility?.maxPasses ?? 'sin límite'})`}>
              <input type="number" min={1} max={20} className={inputCls} value={selected.visibility?.maxPasses ?? ''} placeholder="Sin límite" onChange={e => setVisibility({ maxPasses: e.target.value ? Math.max(1, Math.min(20, parseInt(e.target.value))) : undefined })} />
            </Labeled>
            <Labeled label="Acceso al evento">
              <select className={inputCls} value={selected.visibility?.eventAccess ?? 'all'} onChange={e => setVisibility({ eventAccess: e.target.value as NonNullable<Block['visibility']>['eventAccess'] })}>
                <option value="all">Ceremonia o recepción</option><option value="ceremony">Con acceso a ceremonia</option><option value="reception">Con acceso a recepción</option>
              </select>
            </Labeled>
            <Labeled label="Estado de confirmación">
              <select className={inputCls} value={selected.visibility?.rsvpStatus ?? 'all'} onChange={e => setVisibility({ rsvpStatus: e.target.value as NonNullable<Block['visibility']>['rsvpStatus'] })}>
                <option value="all">Cualquier estado</option><option value="pending">Pendiente</option><option value="confirmed">Confirmado</option><option value="declined">No asistirá</option>
              </select>
            </Labeled>
            <Labeled label="Bloque privado por grupo">
              <input className={inputCls} value={(selected.visibility?.groups ?? []).join(', ')} placeholder="Ej. Familia, VIP" onChange={e => setVisibility({ groups: e.target.value.split(',').map(value => value.trim()).filter(Boolean) })} />
            </Labeled>
            <p className="text-[10px] font-outfit text-cyan-700/70">Usa la vista de un invitado desde la pestaña Invitados para comprobar la regla.</p>
          </div>
        </details>}

        {/* Tipografía (bloques de texto) */}
        {inspectorTab === 'design' && ['cover', 'heading', 'text', 'quote', 'hashtag'].includes(selected.type) && (
          <div className={`${editorCardCls} space-y-3`}>
            <h4 className={editorSectionTitleCls}>Tipografía</h4>
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
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="Interlineado">
                <select className={inputCls} value={typeof selected.props.lineHeight === 'number' ? String(selected.props.lineHeight) : ''} onChange={e => setProp('lineHeight', e.target.value ? parseFloat(e.target.value) : undefined)}>
                  <option value="">Auto</option>
                  <option value="1">Muy compacto</option>
                  <option value="1.2">Compacto</option>
                  <option value="1.45">Normal</option>
                  <option value="1.75">Relajado</option>
                  <option value="2">Amplio</option>
                </select>
              </Labeled>
              <Labeled label="Mayúsculas y minúsculas">
                <select className={inputCls} value={(selected.props.textCase as string) || ''} onChange={e => setProp('textCase', e.target.value)}>
                  <option value="">Como fue escrito</option>
                  <option value="uppercase">TODO MAYÚSCULAS</option>
                  <option value="lowercase">todo minúsculas</option>
                  <option value="capitalize">Iniciales Mayúsculas</option>
                </select>
              </Labeled>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="Sombra del texto">
                <select className={inputCls} value={(selected.props.textShadow as string) || ''} onChange={e => setProp('textShadow', e.target.value)}>
                  <option value="">Sin sombra</option>
                  <option value="soft">Suave</option>
                  <option value="strong">Marcada</option>
                  <option value="glow">Resplandor</option>
                </select>
              </Labeled>
              <Labeled label={`Opacidad (${typeof selected.props.textOpacity === 'number' ? selected.props.textOpacity : 100}%)`}>
                <input type="range" min={20} max={100} step={5} value={typeof selected.props.textOpacity === 'number' ? selected.props.textOpacity : 100} onChange={e => setProp('textOpacity', parseInt(e.target.value))} className="w-full accent-enkarta-gold" />
              </Labeled>
            </div>
          </div>
        )}

        {/* Columnas: contenido de los hijos */}
        {inspectorTab === 'content' && selected.type === 'group' && (
          <div className={`${editorCardCls} space-y-3`}>
            <h4 className={editorSectionTitleCls}>{isOverlay ? 'Capas (de abajo a arriba)' : 'Contenido de las columnas'}</h4>
            {isOverlay && <p className="text-xs text-gray-400 font-outfit -mt-1">El primer elemento queda al fondo; usa ↑↓ para el orden de capas y Posición X/Y para centrar el texto sobre la imagen.</p>}
            {kids.map((c, i) => {
              const cdef = BLOCKS[c.type];
              return (
                <div key={c.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                  <div className="flex items-center justify-between">
                      <span className="text-xs font-outfit text-gray-600 flex items-center gap-2"><BlockGlyph type={c.type} size="sm" />{cdef?.label}</span>
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
                  <BlockGlyph type={type} size="sm" />
                  <span className="text-[10px] font-outfit text-gray-500 text-center leading-tight">{BLOCKS[type].label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estilo */}
        {inspectorTab === 'design' && <div className={`${editorCardCls} space-y-3`}>
          <h4 className={editorSectionTitleCls}>Estilo de la sección</h4>
          <div>
            <p className="mb-1.5 text-xs font-outfit text-gray-500">Recetas rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_RECIPES.map(recipe => (
                <button key={recipe.key} type="button" onClick={() => setStyle(recipe.patch)} className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-left transition-all hover:border-enkarta-gold/40 hover:bg-enkarta-gold/5">
                  <span className="block text-xs font-outfit font-medium text-gray-700">{recipe.label}</span>
                  <span className="block text-[10px] font-outfit text-gray-400">{recipe.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <Labeled label="Fondo">
            <select className={inputCls} value={st.bgKind ?? 'none'} onChange={e => setStyle({ bgKind: e.target.value })}>
              <option value="none">Transparente</option>
              <option value="soft">Tinte de la paleta</option>
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
          <label className="flex items-center justify-between cursor-pointer rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <span>
              <span className="block text-sm font-outfit text-gray-700">Pantalla completa</span>
              <span className="block text-[10px] font-outfit text-gray-400">Ideal para portadas y escenas fotográficas</span>
            </span>
            <Toggle on={!!st.fullHeight} onToggle={() => setStyle({ fullHeight: !st.fullHeight })} />
          </label>
          {!st.fullHeight && (
            <Labeled label={`Alto mínimo ${st.minHeight ? `(${st.minHeight}px)` : '(automático)'}`}>
              <input type="range" min={0} max={900} step={30} value={st.minHeight ?? 0} onChange={e => setStyle({ minHeight: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
            </Labeled>
          )}
          <Labeled label={`Ancho del contenido ${st.maxWidth ? `(${st.maxWidth}px)` : '(usa el modelo)'}`}>
            <input type="range" min={0} max={900} step={20} value={st.maxWidth ?? 0} onChange={e => setStyle({ maxWidth: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
          </Labeled>
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
          <Labeled label="Alineación vertical">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(['start', 'center', 'end'] as const).map(a => (
                <button key={a} type="button" onClick={() => setStyle({ verticalAlign: a })} className={`flex-1 py-1.5 rounded-lg text-xs font-outfit transition-all ${(st.verticalAlign ?? (st.fullHeight ? 'center' : 'start')) === a ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                  {a === 'start' ? 'Arriba' : a === 'center' ? 'Centro' : 'Abajo'}
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
          <Labeled label={`Margen lateral ${typeof st.padX === 'number' ? `(${st.padX}px)` : '(usa el modelo)'}`}>
            <input type="range" min={-1} max={100} step={1} value={st.padX ?? -1} onChange={e => { const value = parseInt(e.target.value); setStyle({ padX: value < 0 ? undefined : value }); }} className="w-full accent-enkarta-gold" />
          </Labeled>

          <details className="group rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-outfit font-medium text-gray-700">
              Acabado avanzado
              <span className="text-gray-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
              <Labeled label="Caja interior">
                <select className={inputCls} value={st.surface ?? 'inherit'} onChange={e => setStyle({ surface: e.target.value })}>
                  <option value="inherit">Heredar de la plantilla</option>
                  <option value="flat">Sin caja</option>
                  <option value="soft">Tinte suave</option>
                  <option value="card">Tarjeta</option>
                  <option value="glass">Cristal</option>
                </select>
              </Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label={`Relleno ${typeof st.contentPadding === 'number' ? `(${st.contentPadding}px)` : '(auto)'}`}>
                  <input type="range" min={-1} max={80} step={1} value={st.contentPadding ?? -1} onChange={e => { const value = parseInt(e.target.value); setStyle({ contentPadding: value < 0 ? undefined : value }); }} className="w-full accent-enkarta-gold" />
                </Labeled>
                <Labeled label={`Esquinas ${typeof st.radius === 'number' ? `(${st.radius}px)` : '(auto)'}`}>
                  <input type="range" min={-1} max={60} step={1} value={st.radius ?? -1} onChange={e => { const value = parseInt(e.target.value); setStyle({ radius: value < 0 ? undefined : value }); }} className="w-full accent-enkarta-gold" />
                </Labeled>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label={`Borde ${typeof st.borderWidth === 'number' ? `(${st.borderWidth}px)` : '(auto)'}`}>
                  <input type="range" min={-1} max={5} step={1} value={st.borderWidth ?? -1} onChange={e => { const value = parseInt(e.target.value); setStyle({ borderWidth: value < 0 ? undefined : value }); }} className="w-full accent-enkarta-gold" />
                </Labeled>
                <Labeled label={`Opacidad (${Math.round((st.contentOpacity ?? 1) * 100)}%)`}>
                  <input type="range" min={20} max={100} step={5} value={Math.round((st.contentOpacity ?? 1) * 100)} onChange={e => setStyle({ contentOpacity: parseInt(e.target.value) / 100 })} className="w-full accent-enkarta-gold" />
                </Labeled>
              </div>
              {(st.borderWidth ?? 0) > 0 && (
                <Labeled label="Color del borde">
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" value={st.borderColor || '#d8d0c5'} onChange={e => setStyle({ borderColor: e.target.value })} />
                    {st.borderColor && <button type="button" onClick={() => setStyle({ borderColor: undefined })} className="text-xs text-gray-400 hover:underline font-outfit">Auto</button>}
                  </div>
                </Labeled>
              )}
              <Labeled label="Sombra de la caja">
                <select className={inputCls} value={st.shadow ?? ''} onChange={e => setStyle({ shadow: e.target.value || undefined })}>
                  <option value="">Automática</option>
                  <option value="none">Ninguna</option>
                  <option value="soft">Suave</option>
                  <option value="medium">Media</option>
                  <option value="strong">Profunda</option>
                  <option value="glow">Resplandor</option>
                </select>
              </Labeled>
              <button type="button" onClick={() => setStyle({ surface: 'inherit', contentPadding: undefined, radius: undefined, borderWidth: undefined, borderColor: undefined, shadow: undefined, contentOpacity: undefined })} className="w-full rounded-xl border border-gray-200 bg-white py-2 text-xs font-outfit text-gray-500 hover:text-gray-800">
                Restablecer acabado
              </button>
            </div>
          </details>
        </div>}

        {/* Animación del bloque */}
        {inspectorTab === 'motion' && <div className={`${editorCardCls} space-y-3`}>
          <h4 className={editorSectionTitleCls}>Animación de este bloque</h4>
          <Labeled label="Efecto al aparecer (vacío = usa el global)">
            <select className={inputCls} value={selected.animation?.preset ?? ''} onChange={e => setAnim({ preset: e.target.value || undefined })}>
              <option value="">— Usar el preset global —</option>
              {ANIM_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Labeled>
          <Labeled label={`Retraso (${selected.animation?.delay ?? 0} ms)`}>
            <input type="range" min={0} max={600} step={50} value={selected.animation?.delay ?? 0} onChange={e => setAnim({ delay: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
          </Labeled>
          <Labeled label={`Duración ${selected.animation?.duration ? `(${selected.animation.duration} ms)` : '(usa el ritmo global)'}`}>
            <input type="range" min={0} max={2000} step={100} value={selected.animation?.duration ?? 0} onChange={e => setAnim({ duration: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
          </Labeled>
          <label className="flex items-center justify-between cursor-pointer rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <span>
              <span className="block text-sm font-outfit text-gray-700">Repetir al volver a entrar</span>
              <span className="block text-[10px] font-outfit text-gray-400">La animación se reproduce más de una vez</span>
            </span>
            <Toggle on={!!selected.animation?.repeat} onToggle={() => setAnim({ repeat: !selected.animation?.repeat })} />
          </label>
        </div>}

        {/* Posición y tamaño (lienzo libre) */}
        {inspectorTab === 'layout' && <div className={`${editorCardCls} space-y-3`}>
          <div className="flex items-center justify-between">
            <div><h4 className={editorSectionTitleCls}>Responsive visual</h4><p className="mt-1 text-[10px] text-[#93897e] font-outfit">{previewMode === 'mobile' ? 'Móvil' : 'Escritorio'} · {previewWidth ?? (previewMode === 'mobile' ? 390 : 1024)} px</p></div>
            <button type="button" onClick={clearViewportLayout} className="text-[10px] text-gray-400 hover:text-gray-700 font-outfit">Limpiar vista</button>
          </div>

          <div className="rounded-2xl border border-[#e7e0d7] bg-[#f7f4ef] p-2">
            <p className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8b8176] font-outfit">Comportamiento en este dispositivo</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['inherit', 'Heredado', 'Usa la base'],
                ['auto', 'Automático', 'Seguro y centrado'],
                ['custom', 'Personalizado', 'Control completo'],
              ] as const).map(([value, label, hint]) => (
                <button key={value} type="button" onClick={() => setViewportMode(value)} className={`rounded-xl border px-1.5 py-2 text-center transition-all ${viewportMode === value ? 'border-enkarta-gold bg-white text-[#98712d] shadow-sm' : 'border-transparent text-[#81786f] hover:bg-white/70'}`}>
                  <span className="block text-[9px] font-semibold font-outfit">{label}</span><span className="mt-0.5 block text-[7px] opacity-65 font-outfit">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-2">
            <button type="button" onClick={() => copyViewportLayout('mobile', 'desktop')} className="rounded-lg bg-white py-2 text-[10px] font-outfit text-sky-700 shadow-sm">Móvil → Desktop</button>
            <button type="button" onClick={() => copyViewportLayout('desktop', 'mobile')} className="rounded-lg bg-white py-2 text-[10px] font-outfit text-sky-700 shadow-sm">Desktop → Móvil</button>
            <span className={`rounded-lg px-2 py-1 text-center text-[8px] font-outfit ${lay.mobile?.mode === 'custom' || (!lay.mobile?.mode && lay.mobile && Object.keys(lay.mobile).length) ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-400'}`}>Móvil · {lay.mobile?.mode === 'auto' ? 'auto' : lay.mobile?.mode === 'custom' || (!lay.mobile?.mode && lay.mobile && Object.keys(lay.mobile).length) ? 'propio' : 'hereda'}</span>
            <span className={`rounded-lg px-2 py-1 text-center text-[8px] font-outfit ${lay.desktop?.mode === 'custom' || (!lay.desktop?.mode && lay.desktop && Object.keys(lay.desktop).length) ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-400'}`}>Desktop · {lay.desktop?.mode === 'auto' ? 'auto' : lay.desktop?.mode === 'custom' || (!lay.desktop?.mode && lay.desktop && Object.keys(lay.desktop).length) ? 'propio' : 'hereda'}</span>
          </div>

          <div className={`grid grid-cols-2 gap-3 rounded-2xl border p-3 transition-opacity ${viewportMode === 'custom' ? 'border-[#e7e0d7] bg-white' : 'pointer-events-none border-[#eee9e3] bg-[#faf8f5] opacity-45'}`}>
            <Labeled label={`Horizontal (${resolvedX})`}>
              <input type="range" min={-200} max={200} step={2} value={resolvedX} onChange={e => setLayout({ mode: 'custom', x: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
            </Labeled>
            <Labeled label={`Vertical (${resolvedY})`}>
              <input type="range" min={-200} max={200} step={2} value={resolvedY} onChange={e => setLayout({ mode: 'custom', y: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
            </Labeled>
            <Labeled label={`Ancho ${resolvedW ? `(${resolvedW}px)` : '(auto)'}`}>
              <input type="range" min={0} max={900} step={10} value={resolvedW} onChange={e => setLayout({ mode: 'custom', w: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
            </Labeled>
            <Labeled label={`Rotación (${resolvedRotate}°)`}>
              <input type="range" min={-20} max={20} step={1} value={resolvedRotate} onChange={e => setLayout({ mode: 'custom', rotate: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
            </Labeled>
            <Labeled label={`Capa (${resolvedZ})`}>
              <input type="range" min={-10} max={100} step={1} value={resolvedZ} onChange={e => setLayout({ mode: 'custom', z: parseInt(e.target.value) || undefined })} className="w-full accent-enkarta-gold" />
            </Labeled>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#e7e0d7] bg-white p-3">
            <div>
              <p className="mb-1.5 text-[10px] font-medium text-[#6f675e] font-outfit">Visibilidad en {previewMode === 'mobile' ? 'móvil' : 'escritorio'}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([['inherit', 'Heredar'], ['visible', 'Mostrar'], ['hidden', 'Ocultar']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setLayout({ hidden: value === 'inherit' ? undefined : value === 'hidden' })} className={`rounded-lg border py-2 text-[9px] font-outfit ${deviceVisibility === value ? 'border-enkarta-gold bg-enkarta-gold/8 text-[#98712d]' : 'border-[#e8e1d8] text-[#746b62]'}`}>{label}</button>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => moveForViewport(-1)} className="rounded-xl border border-[#e7e0d7] py-2 text-[9px] text-[#625a52] hover:bg-[#f7f3ed] font-outfit">↑ Antes en {previewMode === 'mobile' ? 'móvil' : 'desktop'}</button>
              <button type="button" onClick={() => moveForViewport(1)} className="rounded-xl border border-[#e7e0d7] py-2 text-[9px] text-[#625a52] hover:bg-[#f7f3ed] font-outfit">↓ Después</button>
            </div>
            <button type="button" onClick={createDeviceVariant} className="w-full rounded-xl border border-violet-200 bg-violet-50 py-2.5 text-[9px] font-medium text-violet-700 hover:bg-violet-100 font-outfit">◇ Crear variante solo para {previewMode === 'mobile' ? 'móvil' : 'escritorio'}</button>
            {['cover', 'heading', 'text', 'quote', 'hashtag'].includes(selected.type) && (
              <Labeled label={`Escala de texto (${Math.round((currentViewport.fontScale ?? 1) * 100)}%)`}>
                <input type="range" min={75} max={135} step={5} value={Math.round((currentViewport.fontScale ?? 1) * 100)} onChange={e => setLayout({ fontScale: parseInt(e.target.value) / 100 })} className="w-full accent-enkarta-gold" />
              </Labeled>
            )}
          </div>

          {responsiveRisk ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5"><p className="text-[10px] font-semibold text-amber-700 font-outfit">⚠ Posible desborde a {previewWidth ?? (previewMode === 'mobile' ? 390 : 1024)} px</p><p className="mt-1 text-[9px] leading-relaxed text-amber-700/75 font-outfit">Usa Automático, reduce el ancho o acerca el bloque al centro.</p></div>
          ) : <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[9px] text-emerald-700 font-outfit">✓ Geometría dentro del área segura de esta vista.</div>}

          <p className="text-[9px] leading-relaxed text-gray-400 font-outfit">En modo Personalizado puedes arrastrar sobre el preview. Alt desactiva la cuadrícula; flechas mueven 1 px y Shift + flechas 8 px.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => patchBlock(selected.id, { layout: undefined })} className="flex-1 py-2 text-xs font-outfit text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
              Reset total
            </button>
            <button type="button" onClick={() => setBaseLayout({ x: 0, y: 0, w: undefined, rotate: undefined })} className="flex-1 py-2 text-xs font-outfit text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
              Recentrar base
            </button>
          </div>
        </div>}

        {/* Acciones */}
        <div className="sticky bottom-0 z-10 space-y-2 rounded-2xl border border-[#e7dfd4] bg-white/95 p-3 shadow-[0_-10px_35px_rgba(49,39,26,0.08)] backdrop-blur-xl">
          <button type="button" onClick={() => saveBlocksAsSection([selected])} className="w-full rounded-xl border border-enkarta-gold/30 bg-enkarta-gold/5 py-2.5 text-xs font-outfit font-medium text-enkarta-gold hover:bg-enkarta-gold/10">
            Guardar como sección reutilizable
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => {
              const copy = { ...selected, id: `${selected.type}-${Date.now().toString(36)}`, props: JSON.parse(JSON.stringify(selected.props)) };
              const idx = blocks.findIndex(b => b.id === selected.id);
              setBlocks([...blocks.slice(0, idx + 1), copy, ...blocks.slice(idx + 1)]);
            }} className="flex-1 py-2 text-xs font-outfit text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Duplicar</button>
            <button type="button" onClick={() => { setBlocks(blocks.filter(b => b.id !== selected.id)); onSelect(''); }} className="flex-1 py-2 text-xs font-outfit text-red-500 border border-red-200 rounded-xl hover:bg-red-50">Eliminar</button>
          </div>
        </div>
        <p className="text-center text-[10px] font-outfit text-gray-400">En la vista previa: Ctrl + Shift + C/V copia y pega solo el estilo.</p>
      </div>
    );
  }

  // ── Lista de bloques + paleta ──
  return (
    <div className="min-h-full space-y-4 bg-[#fcfbf9] p-4">
      <div className="grid grid-cols-2 rounded-2xl border border-[#e8e1d8] bg-[#f2eee8] p-1 shadow-inner">
        <button type="button" onClick={() => setLibraryView('layers')} className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all font-outfit ${libraryView === 'layers' ? 'bg-white text-[#3a332c] shadow-sm' : 'text-[#8a8177] hover:text-[#4e463e]'}`}>
          Capas <span className="ml-1 text-[9px] opacity-55">{blocks.length}</span>
        </button>
        <button type="button" onClick={() => { setBatchMode(false); setLibraryView('library'); }} className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all font-outfit ${libraryView === 'library' ? 'bg-white text-[#9a762f] shadow-sm' : 'text-[#8a8177] hover:text-[#4e463e]'}`}>
          + Biblioteca
        </button>
      </div>

      {libraryView === 'layers' ? <>
      <div className="flex items-center justify-between">
        <div><h4 className={editorSectionTitleCls}>Orden de la invitación</h4><p className="mt-1 text-[11px] text-[#938a80] font-outfit">Arrastra las secciones para cambiar el recorrido.</p></div>
        {batchMode ? <button type="button" disabled={!selectedBlocks.length} onClick={() => setBatchMode(false)} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-outfit font-medium text-white disabled:opacity-40">Editar selección ({selectedBlocks.length})</button> : <button type="button" onClick={() => { if (confirm('¿Descartar los bloques y volver a la plantilla original?')) onChange({ config: { ...cfg, layout: undefined } }); }} className="text-xs text-gray-400 hover:text-red-500 font-outfit">Quitar bloques</button>}
      </div>
      {batchMode && <p className="-mt-2 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-600 font-outfit">Marca todas las capas que quieres organizar juntas.</p>}

      <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-2.5">
          {blocks.map(b => (
          <Reorder.Item key={b.id} value={b} className={`group flex min-h-[54px] items-center gap-2.5 rounded-2xl border bg-white px-2.5 py-2 cursor-grab active:cursor-grabbing transition-all ${selectedId === b.id ? 'border-enkarta-gold/70 shadow-[0_8px_24px_rgba(126,95,43,0.10)] ring-1 ring-enkarta-gold/15' : 'border-[#ece7e0] hover:-translate-y-px hover:border-enkarta-gold/35 hover:shadow-sm'}`}>
            <span className="select-none text-[13px] leading-none text-[#c9c1b7] transition-colors group-hover:text-[#9d9184]">⋮⋮</span>
            <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => { setBatchMode(true); onSelect(b.id, true); }} aria-label={`Seleccionar ${BLOCKS[b.type]?.label}`} className={`h-4 w-4 flex-shrink-0 rounded border transition-colors ${selectedIds.includes(b.id) ? 'border-violet-500 bg-violet-500 text-white' : 'border-gray-300 bg-white'}`}><span className="block text-[9px] leading-none">{selectedIds.includes(b.id) ? '✓' : ''}</span></button>
            <button type="button" onClick={e => batchMode ? onSelect(b.id, true) : onSelect(b.id, e.shiftKey)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
              <BlockGlyph type={b.type} size="sm" />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[13px] font-outfit ${b.enabled === false ? 'text-gray-300 line-through' : selectedId === b.id ? 'font-semibold text-[#9a762f]' : 'font-medium text-[#4a433b]'}`}>{BLOCKS[b.type]?.label}</span>
                <span className="block truncate text-[9px] text-[#a1988d] font-outfit">{blockVisual(b.type).label}</span>
              </span>
            </button>
            <button type="button" title={b.locked ? 'Desbloquear' : 'Bloquear'} onClick={() => patchBlock(b.id, { locked: !b.locked })} className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${b.locked ? 'bg-amber-50 text-amber-600' : 'text-[#a39a90] hover:bg-gray-50 hover:text-gray-700'}`}>
              <LockGlyph locked={!!b.locked} />
            </button>
            <button type="button" title={b.enabled === false ? 'Mostrar' : 'Ocultar'} onClick={() => patchBlock(b.id, { enabled: b.enabled === false })} className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${b.enabled === false ? 'bg-gray-100 text-gray-400' : 'text-[#a39a90] hover:bg-gray-50 hover:text-gray-700'}`}>
              <EyeGlyph hidden={b.enabled === false} />
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <button type="button" onClick={() => setLibraryView('library')} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-enkarta-gold/45 bg-enkarta-gold/5 py-3 text-xs font-semibold text-enkarta-gold transition-all hover:bg-enkarta-gold/10 font-outfit">
        <span className="text-base leading-none">+</span> Añadir una sección o bloque
      </button>
      </> : <>

      <div className="rounded-[20px] border border-[#eadfce] bg-[linear-gradient(135deg,#fff9ee_0%,#f7f0e6_55%,#f2edf7_100%)] p-4 shadow-[0_12px_32px_rgba(67,50,28,0.055)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a27d38] font-outfit">Biblioteca visual</p>
        <h4 className="mt-1 font-playfair text-[19px] text-[#332d27]">Construye con piezas que combinan</h4>
        <p className="mt-1 text-[11px] leading-relaxed text-[#81776c] font-outfit">Empieza con una sección completa o añade un bloque puntual. Todo heredará los colores y la forma de tu diseño.</p>
      </div>

      {/* Galería visual de secciones: momento narrativo + estilo + preview real. */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Secciones listas</h4>
          <span className="rounded-full bg-[#f4eee5] px-2 py-0.5 text-[9px] font-medium text-[#8c7454] font-outfit">{visibleSectionPresets.length}</span>
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a69b8f]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" /></svg>
          <input value={sectionQuery} onChange={event => setSectionQuery(event.target.value)} placeholder="Buscar portada, itinerario, fotos…"
            className="h-10 w-full rounded-xl border border-[#ded8d0] bg-white pl-9 pr-3 text-[11px] text-[#4c443c] outline-none transition-all placeholder:text-[#aaa096] focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/10 font-outfit" />
        </div>

        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {SECTION_MOMENTS.map(moment => (
            <button key={moment} type="button" onClick={() => setSectionMoment(moment)}
              className={`h-8 flex-none rounded-full px-3 text-[9px] font-medium transition-colors font-outfit ${sectionMoment === moment ? 'bg-[#3f382f] text-white' : 'border border-[#e5ded5] bg-white text-[#746b62] hover:bg-[#faf7f2]'}`}>
              {moment}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SECTION_STYLES.map(style => (
            <button key={style} type="button" onClick={() => setSectionStyle(style)}
              className={`rounded-lg px-2.5 py-1.5 text-[8px] font-medium transition-colors font-outfit ${sectionStyle === style ? 'bg-enkarta-gold/10 text-[#96702d] ring-1 ring-enkarta-gold/30' : 'bg-[#f6f3ef] text-[#887e73] hover:bg-[#eee8e0]'}`}>
              {style}
            </button>
          ))}
        </div>

        {visibleSectionPresets.length ? (
          <div className="grid grid-cols-2 gap-2.5">
            {visibleSectionPresets.map(preset => {
              const meta = sectionCatalogMeta(preset.key, preset.group);
              return (
                <SectionPresetCard key={preset.key} preset={preset} meta={meta} palette={sectionPalette}
                  recommended={isSectionRecommended(meta, data.template)}
                  onPreview={() => setPreviewPresetKey(preset.key)}
                  onInsert={() => insertPreset(preset)} />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#ded7ce] bg-[#faf8f5] px-5 py-8 text-center">
            <p className="text-xs font-medium text-[#6f665c] font-outfit">No encontramos esa composición</p>
            <button type="button" onClick={() => { setSectionQuery(''); setSectionMoment('Todas'); setSectionStyle('Todos'); }} className="mt-2 text-[10px] text-enkarta-gold hover:underline font-outfit">Limpiar filtros</button>
          </div>
        )}
      </div>

      {previewPreset && (() => {
        const meta = sectionCatalogMeta(previewPreset.key, previewPreset.group);
        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#211d19]/55 p-4 backdrop-blur-sm" onMouseDown={() => setPreviewPresetKey(null)}>
            <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-[#fbf9f6] shadow-2xl" onMouseDown={event => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-[#e8e0d7] px-5 py-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-enkarta-gold font-outfit">{meta.moment} · {meta.styles.join(' / ')}</p>
                  <h3 className="mt-1 font-playfair text-2xl text-[#342e28]">{previewPreset.label}</h3>
                </div>
                <button type="button" onClick={() => setPreviewPresetKey(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e3dbd1] bg-white text-[#776d63] hover:bg-[#f3eee8]" aria-label="Cerrar vista previa">✕</button>
              </div>
              <div className="grid gap-5 p-5 md:grid-cols-[1fr_240px]">
                <div>
                  <SectionPreview kind={meta.preview} palette={sectionPalette} large />
                  <div className="mt-3 flex items-center justify-center gap-3 text-[9px] text-[#94887c] font-outfit">
                    <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">Móvil primero</span>
                    <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">Hereda tu colección</span>
                    <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">Contenido conectado</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm leading-relaxed text-[#70665c] font-outfit">{previewPreset.desc}</p>
                  <div className="mt-4 rounded-2xl border border-[#e8e0d7] bg-white p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#9a8e82] font-outfit">Incluye</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {previewPreset.create().map((block, index) => <span key={`${block.type}-${index}`} className="rounded-lg bg-[#f5f0e9] px-2 py-1 text-[9px] text-[#6f6459] font-outfit">{BLOCKS[block.type]?.label}</span>)}
                    </div>
                  </div>
                  <div className="mt-auto space-y-2 pt-5">
                    {selectedSources.length > 0 && (
                      <button type="button" onClick={() => insertPreset(previewPreset, true)} className="h-11 w-full rounded-xl border border-enkarta-gold/45 bg-white text-[11px] font-semibold text-enkarta-gold transition-colors hover:bg-enkarta-gold/5 font-outfit">Reemplazar selección conservando contenido</button>
                    )}
                    <button type="button" onClick={() => insertPreset(previewPreset)} className="h-11 w-full rounded-xl bg-enkarta-gold text-[11px] font-semibold text-white transition-all hover:brightness-95 font-outfit">Añadir a la invitación</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Secciones que el usuario guardó desde otra invitación o composición */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-between"><h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Mis secciones</h4><span className={`rounded-full px-2 py-0.5 text-[8px] font-outfit ${sectionsCloud ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{sectionsCloud ? '☁ Nube' : 'Local'}</span></div>
          <span className="text-[10px] font-outfit text-gray-400">{userSections.length}</span>
        </div>
        {userSections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-3 text-center">
            <p className="text-xs font-outfit text-gray-500">Guarda cualquier bloque o selección para reutilizarla aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {userSections.map(section => (
              <div key={section.id} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white hover:border-enkarta-gold/40 hover:shadow-sm transition-all">
                <button type="button" onClick={() => insertUserSection(section)} className="w-full p-2.5 text-left">
                  <span className="flex h-14 items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-[#f6eee1] to-[#f1edf8] text-xl">
                    {section.blocks.slice(0, 3).map(b => <BlockGlyph key={b.id} type={b.type} size="sm" />)}
                  </span>
                  <span className="mt-2 block truncate text-xs font-outfit font-medium text-gray-700">{section.name}</span>
                  <span className="block text-[9px] font-outfit text-gray-400">{section.blocks.length} bloque{section.blocks.length === 1 ? '' : 's'}</span>
                </button>
                <button type="button" aria-label={`Eliminar ${section.name}`} onClick={() => setUserSections(deleteUserSection(section.id))} className="absolute right-2 top-2 h-6 w-6 rounded-full bg-white/90 text-[10px] text-gray-400 opacity-0 shadow group-hover:opacity-100 hover:text-red-500">✕</button>
              </div>
            ))}
          </div>
        )}
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
          onClick={() => { const g = createOverlayGroup(); setBlocks([...blocks, g]); setLibraryView('layers'); onSelect(g.id); }}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-enkarta-gold/50 py-2.5 text-xs text-gray-700 transition-colors hover:bg-enkarta-gold/5 font-outfit"
        >
          <BlockGlyph type="group" size="sm" /> Imagen + texto en capas
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
                      onClick={() => { const nb = createBlock(type as BlockType); setBlocks([...blocks, nb]); setLibraryView('layers'); onSelect(nb.id); }}
                      className="flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#ebe6df] bg-white p-2.5 transition-all hover:-translate-y-1 hover:border-enkarta-gold/40 hover:bg-enkarta-gold/5 hover:shadow-md"
                    >
                      <BlockGlyph type={type} />
                      <span className="text-center text-[10px] font-medium leading-tight text-[#5f574f] font-outfit">{BLOCKS[type].label}</span>
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
      </>}
    </div>
  );
}
