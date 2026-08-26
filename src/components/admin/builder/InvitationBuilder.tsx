'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { InvitationParsed, BlockLayout, Block, Guest, ReviewStatus } from '@/lib/types';
import { cloneBlock } from '@/components/invitations/blocks/registry';
import LivePreview from './LivePreview';
import ContentPanel from './panels/ContentPanel';
import StylePanel from './panels/StylePanel';
import MediaPanel from './panels/MediaPanel';
import ConfigPanel from './panels/ConfigPanel';
import DecorPanel from './panels/DecorPanel';
import MotionPanel from './panels/MotionPanel';
import BlockEditorPanel from './panels/BlockEditorPanel';
import ElementsPanel from './panels/ElementsPanel';
import GuestsPanel from './panels/GuestsPanel';
import ExportPanel from './panels/ExportPanel';
import VersionsPanel from './panels/VersionsPanel';
import { detachBinding } from '@/lib/block-bindings';
import { validateInvitationBuilder } from '@/lib/builder-validation';
import { activePublishedVersion, hydrateBuilderState, nextScheduledVersion, persistBuilderVersion, saveBuilderVersion, type BuilderVersion } from '@/lib/builder-versions';
import { publicTemplateName } from '@/lib/enkarta-collections';
import { publicationSummaryText, summarizeBuilderChanges } from '@/lib/builder-workflow';

type Tab = 'content' | 'blocks' | 'elements' | 'style' | 'decor' | 'motion' | 'media' | 'guests' | 'versions' | 'export' | 'config';

const tabIcon = (d: string) => (
  <svg className="w-[18px] h-[18px] mx-auto" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'content', label: 'Contenido',  icon: tabIcon('M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487zm0 0L19.5 7.125') },
  { id: 'blocks',  label: 'Bloques',    icon: tabIcon('M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z') },
  { id: 'elements', label: 'Elementos', icon: tabIcon('M11.48 3.5a.56.56 0 011.04 0l2.12 4.92 5.36.46c.5.04.7.66.32 1l-4.06 3.5 1.2 5.24a.56.56 0 01-.84.6L12 17l-4.62 2.72a.56.56 0 01-.84-.6l1.2-5.24-4.06-3.5a.56.56 0 01.32-1l5.36-.46 2.12-4.92z') },
  { id: 'style',   label: 'Estilo',     icon: tabIcon('M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42') },
  { id: 'decor',   label: 'Decoración', icon: tabIcon('M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z') },
  { id: 'motion',  label: 'Animación',  icon: tabIcon('M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z') },
  { id: 'media',   label: 'Medios',     icon: tabIcon('M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 12V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V12z') },
  { id: 'guests',  label: 'Invitados',  icon: tabIcon('M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z') },
  { id: 'versions', label: 'Historial', icon: tabIcon('M12 6v6l4 2m5-2a9 9 0 11-3-6.708M21 3v6h-6') },
  { id: 'export',  label: 'Exportar',   icon: tabIcon('M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-4.5-6L12 15m0 0l-4.5-4.5M12 15V3') },
  { id: 'config',  label: 'Config',     icon: tabIcon('M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894zM15 12a3 3 0 11-6 0 3 3 0 016 0z') },
];

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  content: 'Datos principales del evento',
  blocks: 'Secciones, capas y edición visual',
  elements: 'Adornos y composición libre',
  style: 'Tipografía, color y ritmo visual',
  decor: 'Fondos, texturas y detalles',
  motion: 'Scroll, entradas y profundidad',
  media: 'Fotos, música, video e iconos',
  guests: 'Pases, mesas y confirmaciones',
  versions: 'Publicación, versiones y revisión colaborativa',
  export: 'Archivos para compartir y respaldar',
  config: 'Publicación y ajustes generales',
};

const TYPOGRAPHY_STYLE_KEYS = ['family', 'size', 'weight', 'textColor', 'tracking', 'lineHeight', 'textCase', 'textOpacity', 'textShadow', 'italic'] as const;

const VIEWPORT_PRESETS = [
  { width: 360, label: 'Móvil S', device: 'mobile' as const },
  { width: 390, label: 'Móvil', device: 'mobile' as const },
  { width: 768, label: 'Tablet', device: 'desktop' as const },
  { width: 1024, label: 'Laptop', device: 'desktop' as const },
  { width: 1440, label: 'Desktop', device: 'desktop' as const },
];

const SAVE_STATE_META = {
  clean: { label: 'Sin cambios', dot: 'bg-gray-300', cls: 'bg-gray-50 text-gray-500' },
  dirty: { label: 'Cambios sin guardar', dot: 'bg-violet-500', cls: 'bg-violet-50 text-violet-700' },
  saving: { label: 'Guardando…', dot: 'bg-amber-400 animate-pulse', cls: 'bg-amber-50 text-amber-700' },
  saved: { label: 'Guardado', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700' },
  offline: { label: 'Sin conexión · pendiente', dot: 'bg-orange-500', cls: 'bg-orange-50 text-orange-700' },
  error: { label: 'Error al guardar · reintentar', dot: 'bg-red-500', cls: 'bg-red-50 text-red-700' },
} as const;

function localDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

interface Props {
  initialData: InvitationParsed;
}

export default function InvitationBuilder({ initialData }: Props) {
  const router = useRouter();
  const [data, setData] = useState<InvitationParsed>(initialData);
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<'clean' | 'dirty' | 'saving' | 'saved' | 'offline' | 'error'>('clean');
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishLabel, setPublishLabel] = useState('');
  const [publishSummary, setPublishSummary] = useState('');
  const [publishError, setPublishError] = useState('');
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [publishAt, setPublishAt] = useState(() => localDateTimeInput(new Date(Date.now() + 86_400_000)));
  const [publishedVersion, setPublishedVersion] = useState<BuilderVersion | null>(null);
  const [scheduledVersion, setScheduledVersion] = useState<BuilderVersion | null>(null);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [previewWidth, setPreviewWidth] = useState(390);
  const [compareMode, setCompareMode] = useState(false);
  const [previewGuest, setPreviewGuest] = useState<Guest | null>(null);
  const hasChanges = useRef(false);
  const validation = useMemo(() => validateInvitationBuilder(data), [data]);
  const publicationChanges = useMemo(() => summarizeBuilderChanges(data, publishedVersion?.data), [data, publishedVersion]);
  const previewInvitation = useMemo<InvitationParsed>(() => previewGuest ? {
    ...data,
    guest_name: previewGuest.name,
    guest_passes: previewGuest.passes,
    no_kids: data.no_kids || !previewGuest.allowKids,
    config: { ...data.config, activeGuest: previewGuest },
  } : data, [data, previewGuest]);

  const chooseViewport = useCallback((width: number, device: 'mobile' | 'desktop') => {
    setPreviewWidth(width);
    setPreviewMode(device);
    setCompareMode(false);
  }, []);

  // En monitores amplios se aprovecha el espacio mostrando las dos referencias
  // principales. Un clic en cualquier breakpoint vuelve al modo de edición.
  useEffect(() => {
    if (window.innerWidth >= 1800) setCompareMode(true);
  }, []);

  useEffect(() => {
    let active = true;
    hydrateBuilderState(initialData.id).then(state => {
      if (!active) return;
      setPublishedVersion(activePublishedVersion(state.versions));
      setScheduledVersion(nextScheduledVersion(state.versions));
    });
    return () => { active = false; };
  }, [initialData.id]);

  useEffect(() => {
    const online = () => setSaveState(hasChanges.current ? 'dirty' : 'saved');
    const offline = () => setSaveState('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    if (!navigator.onLine) offline();
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  // ── Historial (deshacer / rehacer) ──
  const dataRef = useRef<InvitationParsed>(initialData);
  const past = useRef<InvitationParsed[]>([]);
  const future = useRef<InvitationParsed[]>([]);
  const lastCommit = useRef(0);
  const [, setHistTick] = useState(0);

  const selectedIdsRef = useRef(selectedBlockIds);
  selectedIdsRef.current = selectedBlockIds;

  const selectBlock = useCallback((id: string, additive = false) => {
    if (!id) {
      setSelectedBlockId('');
      setSelectedBlockIds([]);
      return;
    }
    if (!additive) {
      setSelectedBlockId(id);
      setSelectedBlockIds([id]);
      return;
    }
    setSelectedBlockIds(current => {
      const exists = current.includes(id);
      const next = exists ? current.filter(item => item !== id) : [...current, id];
      setSelectedBlockId(exists ? (next[next.length - 1] ?? '') : id);
      return next;
    });
  }, []);

  // Aplica un cambio registrando el historial. `coalesce` agrupa cambios rápidos
  // (escritura, arrastre) en un único paso de deshacer.
  const commit = useCallback((next: InvitationParsed, coalesce = false) => {
    const prev = dataRef.current;
    if (next === prev) return;
    const workflowChanged = next.config?.workflow?.reviewStatus !== prev.config?.workflow?.reviewStatus;
    const committed = workflowChanged ? next : {
      ...next,
      config: {
        ...(next.config ?? {}),
        workflow: {
          ...(next.config?.workflow ?? {}),
          reviewStatus: 'pending' as const,
          draftUpdatedAt: new Date().toISOString(),
        },
      },
    };
    const now = Date.now();
    if (!(coalesce && now - lastCommit.current < 500)) {
      past.current = [...past.current.slice(-49), prev];
      future.current = [];
    }
    lastCommit.current = now;
    dataRef.current = committed;
    setData(committed);
    hasChanges.current = true;
    setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'dirty');
    setHistTick(t => t + 1);
  }, []);

  const handleChange = useCallback((patch: Partial<InvitationParsed>) => {
    commit({ ...dataRef.current, ...patch }, true);
  }, [commit]);

  // Transformación libre de un bloque (arrastre/redimensión en el preview).
  const transformBlock = useCallback((id: string, patch: Partial<BlockLayout>) => {
    const prev = dataRef.current;
    const cfg = prev.config ?? {};
    const layout = cfg.layout;
    if (!layout) return;
    const selectedIds = selectedIdsRef.current.includes(id) ? selectedIdsRef.current : [id];
    const target = previewMode === 'mobile' ? 'mobile' : 'desktop';
    const source = layout.blocks.find(b => b.id === id);
    const sourceViewport = source?.layout?.[target] ?? {};
    const deltaX = typeof patch.x === 'number' ? patch.x - (sourceViewport.x ?? source?.layout?.x ?? 0) : 0;
    const deltaY = typeof patch.y === 'number' ? patch.y - (sourceViewport.y ?? source?.layout?.y ?? 0) : 0;
    const groupMove = selectedIds.length > 1 && (typeof patch.x === 'number' || typeof patch.y === 'number');
    const blocks = layout.blocks.map(b => {
      if (!selectedIds.includes(b.id)) return b;
      const current = b.layout ?? {};
      const viewport = current[target] ?? {};
      const nextPatch = b.id === id
        ? patch
        : groupMove
          ? {
              ...(typeof patch.x === 'number' ? { x: (viewport.x ?? current.x ?? 0) + deltaX } : {}),
              ...(typeof patch.y === 'number' ? { y: (viewport.y ?? current.y ?? 0) + deltaY } : {}),
            }
          : {};
      if (b.id !== id && Object.keys(nextPatch).length === 0) return b;
      return {
        ...b,
        layout: {
          ...current,
          [target]: { ...viewport, mode: 'custom', ...nextPatch },
        },
      };
    });
    commit({ ...prev, config: { ...cfg, layout: { ...layout, blocks } } }, true);
  }, [commit, previewMode]);

  // Edición de texto en línea desde el preview (commit con historial).
  const editBlockProp = useCallback((id: string, key: string, value: string) => {
    const prev = dataRef.current;
    const cfg = prev.config ?? {};
    const layout = cfg.layout;
    if (!layout) return;
    const blocks = layout.blocks.map(b => {
      if (b.id !== id) return b;
      const detached = detachBinding(b, key);
      return { ...b, ...detached, props: { ...b.props, [key]: value } };
    });
    commit({ ...prev, config: { ...cfg, layout: { ...layout, blocks } } });
  }, [commit]);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    const prev = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    future.current = [dataRef.current, ...future.current];
    dataRef.current = prev;
    setData(prev);
    hasChanges.current = true;
    setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'dirty');
    setHistTick(t => t + 1);
  }, []);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    const next = future.current[0];
    future.current = future.current.slice(1);
    past.current = [...past.current, dataRef.current];
    dataRef.current = next;
    setData(next);
    hasChanges.current = true;
    setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'dirty');
    setHistTick(t => t + 1);
  }, []);

  // Portapapeles de bloques (copiar/pegar).
  const clipboard = useRef<Block | null>(null);
  const styleClipboard = useRef<{
    style?: Block['style'];
    animation?: Block['animation'];
    typography: Record<string, unknown>;
  } | null>(null);
  const [hasStyleClipboard, setHasStyleClipboard] = useState(false);
  const selectedRef = useRef(selectedBlockId);
  selectedRef.current = selectedBlockId;

  const patchCanvasBlock = useCallback((id: string, patch: Partial<Block>) => {
    const prev = dataRef.current;
    const cfg = prev.config ?? {};
    const layout = cfg.layout;
    if (!layout) return;
    const blocks = layout.blocks.map(b => {
      if (b.id !== id) return b;
      return {
        ...b,
        ...patch,
        ...(patch.props ? { props: { ...b.props, ...patch.props } } : {}),
        ...(patch.style ? { style: { ...(b.style ?? {}), ...patch.style } } : {}),
        ...(patch.animation ? { animation: { ...(b.animation ?? {}), ...patch.animation } } : {}),
      };
    });
    commit({ ...prev, config: { ...cfg, layout: { ...layout, blocks } } }, true);
  }, [commit]);

  const duplicateCanvasBlock = useCallback((id: string) => {
    const prev = dataRef.current;
    const cfg = prev.config ?? {};
    const layout = cfg.layout;
    if (!layout) return;
    const idx = layout.blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const copy = cloneBlock(layout.blocks[idx]);
    const blocks = [...layout.blocks.slice(0, idx + 1), copy, ...layout.blocks.slice(idx + 1)];
    commit({ ...prev, config: { ...cfg, layout: { ...layout, blocks } } });
    selectBlock(copy.id);
  }, [commit, selectBlock]);

  const deleteCanvasBlock = useCallback((id: string) => {
    const prev = dataRef.current;
    const cfg = prev.config ?? {};
    const layout = cfg.layout;
    if (!layout) return;
    const blocks = layout.blocks.filter(b => b.id !== id);
    commit({ ...prev, config: { ...cfg, layout: { ...layout, blocks } } });
    selectBlock('');
  }, [commit, selectBlock]);

  const copyBlockStyle = useCallback((id = selectedRef.current) => {
    const b = dataRef.current.config?.layout?.blocks.find(x => x.id === id);
    if (!b) return;
    styleClipboard.current = {
      style: b.style ? { ...b.style } : undefined,
      animation: b.animation ? { ...b.animation } : undefined,
      typography: Object.fromEntries(TYPOGRAPHY_STYLE_KEYS.map(key => [key, b.props[key]])),
    };
    setHasStyleClipboard(true);
  }, []);

  const pasteBlockStyle = useCallback((id = selectedRef.current) => {
    const copied = styleClipboard.current;
    if (!copied) return;
    const prev = dataRef.current;
    const cfg = prev.config ?? {};
    const layout = cfg.layout;
    if (!layout) return;
    const blocks = layout.blocks.map(b => b.id === id ? {
      ...b,
      props: { ...b.props, ...copied.typography },
      style: copied.style ? { ...copied.style } : undefined,
      animation: copied.animation ? { ...copied.animation } : undefined,
    } : b);
    commit({ ...prev, config: { ...cfg, layout: { ...layout, blocks } } });
  }, [commit]);

  const copyBlock = useCallback(() => {
    const id = selectedRef.current;
    const layout = dataRef.current.config?.layout;
    const b = layout?.blocks.find(x => x.id === id);
    if (b) clipboard.current = b;
  }, []);

  const pasteBlock = useCallback(() => {
    if (!clipboard.current) return;
    const prev = dataRef.current;
    const cfg = prev.config ?? {};
    const layout = cfg.layout;
    if (!layout) return;
    const copy = cloneBlock(clipboard.current);
    const idx = layout.blocks.findIndex(b => b.id === selectedRef.current);
    const blocks = idx >= 0
      ? [...layout.blocks.slice(0, idx + 1), copy, ...layout.blocks.slice(idx + 1)]
      : [...layout.blocks, copy];
    commit({ ...prev, config: { ...cfg, layout: { ...layout, blocks } } });
    selectBlock(copy.id);
  }, [commit, selectBlock]);

  // Atajos de teclado (fuera de campos de texto / edición inline).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (k === 'y') { e.preventDefault(); redo(); }
      else if (k === 'c' && e.shiftKey) { e.preventDefault(); copyBlockStyle(); }
      else if (k === 'v' && e.shiftKey) { e.preventDefault(); pasteBlockStyle(); }
      else if (k === 'c') { copyBlock(); }
      else if (k === 'v') { e.preventDefault(); pasteBlock(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, copyBlock, pasteBlock, copyBlockStyle, pasteBlockStyle]);

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  const payloadFrom = (d: InvitationParsed, status?: 'draft' | 'ready') => ({
    id: d.id, slug: d.slug, status: status ?? d.status, template: d.template, type: d.type,
    names: d.names, event_date: d.event_date,
    ceremony_time: d.ceremony_time, ceremony_place: d.ceremony_place, ceremony_address: d.ceremony_address,
    reception_time: d.reception_time, reception_place: d.reception_place, reception_address: d.reception_address,
    guest_name: d.guest_name, guest_passes: d.guest_passes, message: d.message, dress_code: d.dress_code, no_kids: d.no_kids,
    parents_groom: d.parents_groom, parents_bride: d.parents_bride, sponsors: d.sponsors, itinerary: d.itinerary,
    gift_message: d.gift_message, bank_account: d.bank_account, cover_image_url: d.cover_image_url, gallery_url: d.gallery_url,
    color_primary: d.color_primary, color_secondary: d.color_secondary, color_accent: d.color_accent,
    expires_at: d.expires_at, is_active: d.is_active, phone_whatsapp: d.phone_whatsapp, builder_config: d.config ?? {},
  });

  const storeDraft = async (snapshot: InvitationParsed) => {
    const response = await fetch('/api/admin/invitations', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadFrom(snapshot)),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'No se pudo guardar el borrador');
    }
  };

  // Autoguardado silencioso con estado explícito y recuperación al reconectar.
  const silentSave = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setSaveState('offline'); return; }
    setSaveState('saving');
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadFrom(dataRef.current)),
      });
      if (!res.ok) throw new Error('save-failed');
      setSavedAt(new Date()); hasChanges.current = false; setSaveState('saved');
      saveBuilderVersion(dataRef.current, 'Autoguardado', 'save');
    } catch { setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error'); }
  }, []);

  // Dispara el autoguardado 2.5s después del último cambio.
  useEffect(() => {
    if (!hasChanges.current) return;
    const id = setTimeout(() => { silentSave(); }, 2500);
    return () => clearTimeout(id);
  }, [data, silentSave]);

  useEffect(() => {
    const retry = () => { if (hasChanges.current) void silentSave(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [silentSave]);

  const handleSave = async () => {
    setSaving(true);
    setSaveState('saving');
    try {
      await storeDraft(dataRef.current);
      setSavedAt(new Date()); hasChanges.current = false; setSaveState('saved');
      saveBuilderVersion(dataRef.current, 'Guardado manual', 'save');
    } catch (error) {
      setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
      alert(error instanceof Error ? error.message : 'Error de conexión');
    }
    setSaving(false);
  };

  const openPublish = () => {
    const now = new Date();
    setPublishLabel(`Publicación ${now.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })} · ${now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`);
    setPublishSummary(publicationSummaryText(publicationChanges));
    setPublishMode('now');
    setPublishAt(localDateTimeInput(new Date(Date.now() + 86_400_000)));
    setPublishError('');
    setPublishOpen(true);
  };

  const applySnapshot = (snapshot: InvitationParsed) => {
    dataRef.current = snapshot;
    setData(snapshot);
    hasChanges.current = false;
    setSavedAt(new Date());
    setSaveState('saved');
    past.current = [];
    future.current = [];
    setHistTick(value => value + 1);
  };

  const confirmPublish = async () => {
    if (validation.errors.length || saving) return;
    const scheduledAt = publishMode === 'schedule' ? new Date(publishAt) : null;
    if (publishMode === 'schedule' && (!publishAt || !scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now() + 60_000)) {
      setPublishError('Elige una fecha y hora futura, con al menos un minuto de margen.');
      return;
    }
    setSaving(true); setPublishError(''); setSaveState('saving');
    try {
      const now = new Date().toISOString();
      const isSchedule = publishMode === 'schedule';
      const nextStatus = isSchedule ? (dataRef.current.status === 'disabled' ? 'draft' : publishedVersion ? 'ready' : 'draft') : 'ready';
      const workflow = dataRef.current.config?.workflow ?? {};
      const snapshot: InvitationParsed = {
        ...dataRef.current,
        status: nextStatus,
        config: { ...(dataRef.current.config ?? {}), workflow: isSchedule
          ? { ...workflow, reviewStatus: 'approved', reviewUpdatedAt: now, scheduledAt: scheduledAt!.toISOString() }
          : { ...workflow, reviewStatus: 'approved', reviewUpdatedAt: now, lastPublishedAt: now, lastPublishedSummary: publishSummary.trim(), unpublishedAt: undefined } },
      };
      const result = await persistBuilderVersion(snapshot, publishLabel, 'publish', publishSummary, 'admin', isSchedule ? 'schedule' : 'publish', { publicationState: isSchedule ? 'scheduled' : 'published', publishAt: isSchedule ? scheduledAt!.toISOString() : now });
      const finalSnapshot = { ...snapshot, config: { ...snapshot.config, workflow: { ...(snapshot.config.workflow ?? {}), ...(isSchedule ? { scheduledVersionId: result.version.id } : { lastPublishedVersionId: result.version.id }) } } };
      applySnapshot(finalSnapshot);
      if (isSchedule) setScheduledVersion({ ...result.version, data: finalSnapshot });
      else setPublishedVersion({ ...result.version, data: finalSnapshot });
      setPublishOpen(false);
      try {
        await storeDraft(finalSnapshot);
      } catch {
        // La copia pública ya existe; solo queda pendiente sincronizar el borrador de trabajo.
        hasChanges.current = true;
        setSaveState('error');
        alert(`${isSchedule ? 'La programación quedó guardada' : 'La invitación quedó publicada'}, pero el borrador no terminó de sincronizar. Pulsa “Guardar” para reintentarlo.`);
      }
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'No se pudo publicar');
      setSaveState('error');
    }
    setSaving(false);
  };

  const unpublishInvitation = async () => {
    if (!window.confirm('¿Despublicar esta invitación? El enlace mostrará una pausa temporal y todas las versiones quedarán conservadas.')) return;
    setSaving(true); setSaveState('saving');
    try {
      await persistBuilderVersion(dataRef.current, 'Antes de despublicar', 'manual', 'Respaldo previo a pausar el enlace', 'admin');
      const now = new Date().toISOString();
      const snapshot: InvitationParsed = { ...dataRef.current, status: 'disabled', config: { ...(dataRef.current.config ?? {}), workflow: { ...(dataRef.current.config?.workflow ?? {}), unpublishedAt: now } } };
      await storeDraft(snapshot);
      applySnapshot(snapshot);
    } catch (error) {
      setSaveState('error');
      alert(error instanceof Error ? error.message : 'No se pudo despublicar la invitación');
    }
    setSaving(false);
  };

  const rollbackPublication = async (version: BuilderVersion) => {
    setSaving(true); setSaveState('saving');
    try {
      await persistBuilderVersion(dataRef.current, 'Antes del rollback', 'restore', `Respaldo previo a volver a ${version.label}`, 'admin');
      const summary = `Rollback inmediato a “${version.label}”`;
      const now = new Date().toISOString();
      const snapshot: InvitationParsed = { ...version.data, id: data.id, slug: data.slug, status: 'ready', config: { ...(version.data.config ?? {}), workflow: { ...(version.data.config?.workflow ?? {}), reviewStatus: 'approved', reviewUpdatedAt: now, lastPublishedAt: now, lastPublishedSummary: summary } } };
      const result = await persistBuilderVersion(snapshot, `Rollback · ${version.label}`, 'publish', summary, 'admin', 'publish');
      const finalSnapshot = { ...snapshot, config: { ...snapshot.config, workflow: { ...(snapshot.config.workflow ?? {}), lastPublishedVersionId: result.version.id } } };
      applySnapshot(finalSnapshot);
      setPublishedVersion({ ...result.version, data: finalSnapshot });
      try {
        await storeDraft(finalSnapshot);
      } catch {
        hasChanges.current = true;
        setSaveState('error');
        alert('El rollback quedó publicado, pero el borrador no terminó de sincronizar. Pulsa “Guardar” para reintentarlo.');
      }
    } catch (error) {
      setSaveState('error');
      alert(error instanceof Error ? error.message : 'No se pudo completar el rollback');
    }
    setSaving(false);
  };

  const handleDuplicate = async () => {
    if (!confirm('¿Duplicar esta invitación? Se creará una copia como borrador con el mismo diseño.')) return;
    const payload = {
      slug: `${data.slug}-copia-${Date.now().toString(36).slice(-4)}`,
      status: 'draft',
      template: data.template,
      type: data.type,
      names: data.names,
      event_date: data.event_date,
      ceremony_time: data.ceremony_time,
      ceremony_place: data.ceremony_place,
      ceremony_address: data.ceremony_address,
      reception_time: data.reception_time,
      reception_place: data.reception_place,
      reception_address: data.reception_address,
      guest_name: data.guest_name,
      guest_passes: data.guest_passes,
      message: data.message,
      dress_code: data.dress_code,
      no_kids: data.no_kids,
      parents_groom: data.parents_groom,
      parents_bride: data.parents_bride,
      sponsors: data.sponsors,
      itinerary: data.itinerary,
      gift_message: data.gift_message,
      bank_account: data.bank_account,
      cover_image_url: data.cover_image_url,
      gallery_url: data.gallery_url,
      color_primary: data.color_primary,
      color_secondary: data.color_secondary,
      color_accent: data.color_accent,
      phone_whatsapp: data.phone_whatsapp,
      builder_config: data.config ?? {},
    };
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        const nv = await res.json();
        router.push(`/admin/builder/${nv.id}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Error al duplicar');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta invitación permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/admin/invitations?id=${data.id}`, { method: 'DELETE' });
      if (res.ok) router.push('/admin');
      else alert('Error al eliminar');
    } catch {
      alert('Error de conexión');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 z-40 flex-shrink-0">
        <div className="flex items-center justify-between h-14 px-4 gap-3">

          {/* Izquierda */}
          <div className="flex items-center gap-3 min-w-0">
            <a href="/admin" title="Volver al panel"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="font-playfair text-base text-enkarta-dark leading-tight truncate">
                {data.names || 'Nueva invitación'}
              </h1>
              <p className="text-[11px] text-gray-400 font-outfit truncate">{publicTemplateName(data.template)} · {data.type}</p>
            </div>
          </div>

          {/* Centro: vista + historial */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => chooseViewport(390, 'mobile')}
                title="Vista móvil"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-outfit transition-all ${previewMode === 'mobile' && !compareMode ? 'bg-white shadow-sm text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                Móvil
              </button>
              <button
                onClick={() => chooseViewport(1024, 'desktop')}
                title="Vista escritorio"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-outfit transition-all ${previewMode === 'desktop' && !compareMode ? 'bg-white shadow-sm text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
                Desktop
              </button>
              <button
                onClick={() => setCompareMode(true)}
                title="Comparar móvil y escritorio"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-outfit transition-all ${compareMode ? 'bg-white shadow-sm text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ◫ Comparar
              </button>
            </div>

            <div className="flex items-center rounded-xl border border-gray-200 p-0.5">
              <button
                onClick={undo}
                disabled={!canUndo}
                title="Deshacer (Ctrl+Z)"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11a4 4 0 010 8h-1M3 10l4-4M3 10l4 4" /></svg>
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                title="Rehacer (Ctrl+Shift+Z)"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H10a4 4 0 000 8h1M21 10l-4-4M21 10l-4 4" /></svg>
              </button>
            </div>
          </div>

          {/* Derecha: acciones */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {previewGuest && (
              <button type="button" onClick={() => setPreviewGuest(null)} title="Salir de la simulación" className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-outfit text-cyan-700">
                ◎ Vista: {previewGuest.name} ×
              </button>
            )}
            <span className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-outfit ${
              validation.errors.length
                ? 'bg-red-50 text-red-600'
                : validation.warnings.length
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                validation.errors.length
                  ? 'bg-red-500'
                  : validation.warnings.length
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`} />
              {validation.errors.length
                ? `${validation.errors.length} error(es)`
                : validation.warnings.length
                  ? `${validation.warnings.length} advertencia(s)`
                  : 'Lista para publicar'}
            </span>
            <button type="button" onClick={() => (saveState === 'error' || saveState === 'offline') && void silentSave()} title={savedAt ? `Último guardado ${savedAt.toLocaleTimeString('es-ES')}` : SAVE_STATE_META[saveState].label} className={`hidden lg:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-colors font-outfit ${SAVE_STATE_META[saveState].cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${SAVE_STATE_META[saveState].dot}`} />
              {SAVE_STATE_META[saveState].label}
            </button>
            <button
              onClick={handleDuplicate}
              title="Duplicar invitación"
              className="hidden sm:flex w-9 h-9 items-center justify-center text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7V5a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></svg>
            </button>
            <a
              href={`/i/${data.slug}?preview=1`}
              target="_blank"
              title="Abrir vista privada del borrador"
              className="hidden sm:flex w-9 h-9 items-center justify-center text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </a>
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="px-4 py-2 text-xs font-outfit font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              {saving ? '…' : 'Guardar'}
            </button>
            <button
              onClick={openPublish}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-outfit font-semibold text-white rounded-xl transition-all duration-300 hover:-translate-y-px disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #B8975A, #cda964)', boxShadow: '0 4px 14px rgba(184,151,90,0.35)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Publicar
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panel izquierdo: navegación clara + inspector */}
        <div className="flex w-[430px] flex-shrink-0 border-r border-[#e7e1d9] bg-white xl:w-[500px] 2xl:w-[540px]">
          <nav className="flex w-[76px] flex-shrink-0 flex-col gap-1 overflow-y-auto border-r border-[#e8e1d6] bg-[linear-gradient(180deg,#faf7f2_0%,#f5efe7_100%)] px-1.5 py-2" aria-label="Herramientas del constructor">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={`${tab.label}: ${TAB_DESCRIPTIONS[tab.id]}`}
                  className={`relative flex min-h-[54px] flex-shrink-0 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-center transition-all duration-200 ${active ? 'bg-white text-enkarta-gold shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:bg-white/60 hover:text-gray-600'}`}
                >
                  {tab.icon}
                  <span className={`mt-1 block text-[9px] font-outfit leading-none ${active ? 'font-semibold' : ''}`}>{tab.label}</span>
                  {active && <span className="absolute -right-1.5 h-7 w-[3px] rounded-l-full bg-enkarta-gold" />}
                </button>
              );
            })}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-shrink-0 border-b border-[#eee8df] bg-[linear-gradient(135deg,#fff_0%,#fbf8f3_100%)] px-5 py-3.5">
              <p className="font-playfair text-[17px] text-[#302a23]">{TABS.find(tab => tab.id === activeTab)?.label}</p>
              <p className="mt-0.5 text-[11px] font-outfit leading-relaxed text-[#93897d]">{TAB_DESCRIPTIONS[activeTab]}</p>
            </div>

            {/* Contenido del panel (scrollable) */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {activeTab === 'content' && <ContentPanel data={data} onChange={handleChange} />}
              {activeTab === 'blocks'  && <BlockEditorPanel data={data} onChange={handleChange} selectedId={selectedBlockId} selectedIds={selectedBlockIds} onSelect={selectBlock} previewMode={previewMode} previewWidth={previewWidth} />}
              {activeTab === 'elements' && <ElementsPanel data={data} onChange={handleChange} selectedId={selectedBlockId} onSelect={id => selectBlock(id)} />}
              {activeTab === 'style'   && <StylePanel   data={data} onChange={handleChange} />}
              {activeTab === 'decor'   && <DecorPanel   data={data} onChange={handleChange} />}
              {activeTab === 'motion'  && <MotionPanel  data={data} onChange={handleChange} />}
              {activeTab === 'media'   && <MediaPanel   data={data} onChange={handleChange} />}
              {activeTab === 'guests'  && <GuestsPanel data={data} onChange={handleChange} onPreview={setPreviewGuest} previewGuestId={previewGuest?.id} />}
              {activeTab === 'versions' && <VersionsPanel
                data={data}
                selectedBlockId={selectedBlockId}
                publishedVersionId={publishedVersion?.id}
                onUnpublish={unpublishInvitation}
                onCancelSchedule={versionId => { if (scheduledVersion?.id === versionId) setScheduledVersion(null); }}
                onRestore={snapshot => { commit({ ...snapshot, id: data.id, slug: data.slug, status: data.status }); selectBlock(''); }}
                onRollback={rollbackPublication}
                onWorkflowChange={(status: ReviewStatus) => handleChange({ config: { ...(data.config ?? {}), workflow: { ...(data.config?.workflow ?? {}), reviewStatus: status, reviewUpdatedAt: new Date().toISOString() } } })}
                onOpenBlock={blockId => { selectBlock(blockId); setActiveTab('blocks'); }}
              />}
              {activeTab === 'export'  && <ExportPanel  data={data} />}
              {activeTab === 'config'  && <ConfigPanel data={data} onChange={handleChange} onDelete={handleDelete} validation={validation} onOpenBlock={blockId => { selectBlock(blockId); setActiveTab('blocks'); }} />}
            </div>
          </div>
        </div>

        {/* Panel derecho: preview en tiempo real */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-11 flex-shrink-0 items-center justify-between gap-3 border-b border-[#ded8d0] bg-white/95 px-3 shadow-sm">
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
              {VIEWPORT_PRESETS.map(preset => (
                <button key={preset.width} type="button" onClick={() => chooseViewport(preset.width, preset.device)} title={`${preset.label} · ${preset.width}px`} className={`flex h-8 flex-none items-center gap-1.5 rounded-lg px-2.5 text-[9px] font-medium transition-all font-outfit ${!compareMode && previewWidth === preset.width ? 'bg-[#3f382f] text-white shadow-sm' : 'text-[#756d64] hover:bg-[#f4f0ea]'}`}>
                  <span className={`rounded-[2px] border border-current ${preset.width <= 390 ? 'h-3.5 w-2' : preset.width === 768 ? 'h-3 w-3.5' : 'h-2.5 w-4'}`} />
                  <span className="hidden 2xl:inline">{preset.label}</span><span>{preset.width}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setCompareMode(value => !value)} className={`h-8 flex-none rounded-lg px-3 text-[9px] font-semibold transition-all font-outfit ${compareMode ? 'bg-enkarta-gold text-white shadow-sm' : 'border border-[#ded8d0] bg-white text-[#6f675e] hover:bg-[#f6f2ec]'}`}>◫ {compareMode ? 'Comparando' : 'Comparar'}</button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {compareMode ? (
              <div className="relative grid h-full grid-cols-2 overflow-hidden">
                <div className="relative min-w-0 overflow-hidden border-r border-white/60"><span className="absolute left-4 top-4 z-30 rounded-full bg-gray-900 px-2.5 py-1 text-[9px] font-outfit font-semibold uppercase tracking-wider text-white">Móvil · 390 px</span><LivePreview invitation={previewInvitation} device="mobile" viewportWidth={390} /></div>
                <div className="relative min-w-0 overflow-hidden"><span className="absolute left-4 top-4 z-30 rounded-full bg-gray-900 px-2.5 py-1 text-[9px] font-outfit font-semibold uppercase tracking-wider text-white">Desktop · 1024 px</span><LivePreview invitation={previewInvitation} device="desktop" viewportWidth={1024} /></div>
              </div>
            ) : <LivePreview
              invitation={previewInvitation}
              device={previewMode}
              viewportWidth={previewWidth}
              blockEditor={activeTab === 'blocks' || activeTab === 'elements'}
              selectedBlockId={selectedBlockId}
              selectedBlockIds={selectedBlockIds}
              onSelectBlock={selectBlock}
              onTransformBlock={transformBlock}
              onEditBlockProp={editBlockProp}
              onPatchBlock={patchCanvasBlock}
              onDuplicateBlock={duplicateCanvasBlock}
              onDeleteBlock={deleteCanvasBlock}
              onCopyBlockStyle={copyBlockStyle}
              onPasteBlockStyle={pasteBlockStyle}
              hasStyleClipboard={hasStyleClipboard}
            />}
          </div>
        </div>

      </div>

      {publishOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#1f1a24]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="publish-title">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-[600px] overflow-y-auto rounded-[28px] border border-white/70 bg-[#fcfbf8] shadow-[0_30px_100px_rgba(20,15,25,.35)]">
            <div className="bg-[linear-gradient(135deg,#2c273d_0%,#69547e_100%)] px-6 py-5 text-white">
              <div className="flex items-start gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-xl">{publishMode === 'schedule' ? '◷' : '✓'}</span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55 font-outfit">Centro de publicación</p><h2 id="publish-title" className="mt-1 font-playfair text-2xl">{publishMode === 'schedule' ? 'Programar con seguridad' : 'Publicar con control'}</h2><p className="mt-1 text-xs leading-relaxed text-white/65 font-outfit">El borrador seguirá editable y esta copia será inmutable. Puedes volver a una publicación anterior cuando quieras.</p></div></div>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f0ece6] p-1.5">
                <button type="button" onClick={() => { setPublishMode('now'); setPublishError(''); }} className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition font-outfit ${publishMode === 'now' ? 'bg-white text-[#382f42] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Publicar ahora</button>
                <button type="button" onClick={() => { setPublishMode('schedule'); setPublishError(''); }} className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition font-outfit ${publishMode === 'schedule' ? 'bg-white text-[#382f42] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Programar fecha</button>
              </div>
              {publishMode === 'schedule' && <label className="block rounded-2xl border border-violet-100 bg-violet-50/60 p-3"><span className="mb-1.5 block text-[11px] font-semibold text-violet-800 font-outfit">Fecha y hora de publicación</span><input type="datetime-local" value={publishAt} min={localDateTimeInput(new Date(Date.now() + 60_000))} onChange={event => setPublishAt(event.target.value)} className="w-full rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-violet-400 font-outfit" /><span className="mt-1.5 block text-[10px] leading-relaxed text-violet-600 font-outfit">Usaremos la zona horaria de este dispositivo. Si ya existe una versión pública, seguirá visible hasta ese momento.</span></label>}
              {scheduledVersion && <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">◷</span><div><p className="text-xs font-semibold text-sky-900 font-outfit">Ya existe una publicación programada</p><p className="mt-0.5 text-[10px] leading-relaxed text-sky-700 font-outfit">{scheduledVersion.publishAt ? new Date(scheduledVersion.publishAt).toLocaleString('es-BO') : 'Fecha pendiente'} · Puedes gestionarla en Historial. Una nueva programación no elimina la anterior.</p></div></div>}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-center"><p className="text-[9px] uppercase tracking-wider text-violet-500 font-outfit">Borrador</p><p className="mt-1 text-xs font-semibold text-violet-800 font-outfit">Se conserva</p></div>
                <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-2.5 text-center"><p className="text-[9px] uppercase tracking-wider text-cyan-600 font-outfit">Preview</p><p className="mt-1 text-xs font-semibold text-cyan-800 font-outfit">Privado</p></div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-center"><p className="text-[9px] uppercase tracking-wider text-emerald-600 font-outfit">Público</p><p className="mt-1 text-xs font-semibold text-emerald-800 font-outfit">{publishMode === 'schedule' ? 'En la fecha elegida' : 'Nueva versión'}</p></div>
              </div>
              <label className="block"><span className="mb-1.5 block text-[11px] font-medium text-gray-600 font-outfit">Nombre de la versión</span><input value={publishLabel} onChange={event => setPublishLabel(event.target.value)} maxLength={120} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 font-outfit" /></label>
              <label className="block"><span className="mb-1.5 block text-[11px] font-medium text-gray-600 font-outfit">Resumen que quedará en el historial</span><textarea value={publishSummary} onChange={event => setPublishSummary(event.target.value)} rows={3} maxLength={600} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-violet-400 font-outfit" /></label>
              <div className="rounded-2xl border border-gray-100 bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-outfit">Cambios detectados</p><ul className="mt-2 space-y-1">{publicationChanges.map(change => <li key={change} className="flex gap-2 text-xs text-gray-600 font-outfit"><span className="text-emerald-500">●</span>{change}</li>)}</ul></div>
              {!!validation.errors.length && <div className="rounded-xl border border-red-100 bg-red-50 p-3"><p className="text-xs font-semibold text-red-700 font-outfit">No se puede publicar todavía</p>{validation.errors.map(issue => <p key={issue.title} className="mt-1 text-[11px] text-red-600 font-outfit">• {issue.title}</p>)}</div>}
              {!!validation.warnings.length && !validation.errors.length && <div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-700 font-outfit">Revisa estas advertencias</p>{validation.warnings.map(issue => <p key={issue.title} className="mt-1 text-[11px] text-amber-700 font-outfit">• {issue.title}</p>)}</div>}
              {publishError && <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600 font-outfit">{publishError}</p>}
              <div className="flex gap-2 pt-1"><button type="button" onClick={() => setPublishOpen(false)} disabled={saving} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 disabled:opacity-50 font-outfit">Seguir editando</button><button type="button" onClick={confirmPublish} disabled={saving || !!validation.errors.length || !publishLabel.trim()} className="flex-[1.35] rounded-xl bg-[linear-gradient(90deg,#8b6cad,#6a527f)] py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-40 font-outfit">{saving ? (publishMode === 'schedule' ? 'Programando…' : 'Publicando…') : (publishMode === 'schedule' ? 'Programar publicación' : 'Publicar esta versión')}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
