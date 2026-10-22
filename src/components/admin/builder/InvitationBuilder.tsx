'use client';
import { changesUncontractedColors } from '@/lib/package-colors';

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
import QualityControlPanel from './panels/QualityControlPanel';
import { detachBinding } from '@/lib/block-bindings';
import { validateInvitationBuilder } from '@/lib/builder-validation';
import { activePublishedVersion, hydrateBuilderState, nextScheduledVersion, persistBuilderVersion, saveBuilderVersion, type BuilderVersion } from '@/lib/builder-versions';
import { publicTemplateName } from '@/lib/enkarta-collections';
import { publicationSummaryText, summarizeBuilderChanges } from '@/lib/builder-workflow';
import { useBuilderDuplicate } from './useBuilderDuplicate';

type Tab = 'content' | 'blocks' | 'elements' | 'style' | 'decor' | 'motion' | 'media' | 'guests' | 'versions' | 'quality' | 'export' | 'config';

const tabIcon = (d: string) => (
  <svg aria-hidden="true" className="w-[18px] h-[18px] mx-auto" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
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
  { id: 'quality', label: 'Calidad', icon: tabIcon('M9 12.75l2.25 2.25L15 9.75m6-3.75l-9 15-9-15 9-3 9 3z') },
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
  quality: 'Aceptación, soporte y liberación por etapas',
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
  clean: { label: 'Sin cambios', dot: 'bg-gray-500', cls: 'bg-gray-100 text-gray-700' },
  dirty: { label: 'Cambios sin guardar', dot: 'bg-violet-500', cls: 'bg-violet-50 text-violet-700' },
  saving: { label: 'Guardando…', dot: 'bg-amber-600 motion-safe:animate-pulse', cls: 'bg-amber-50 text-amber-800' },
  saved: { label: 'Guardado', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700' },
  offline: { label: 'Sin conexión · pendiente', dot: 'bg-orange-500', cls: 'bg-orange-50 text-orange-700' },
  error: { label: 'Error al guardar · reintentar', dot: 'bg-red-500', cls: 'bg-red-50 text-red-700' },
} as const;

function localDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

type PublicationChange = 'publish' | 'schedule' | 'unpublish';
/** Public state follows the acknowledged operation, while the working content remains independent. */
function withPublicationState(current: InvitationParsed, snapshot: InvitationParsed, change: PublicationChange): InvitationParsed {
  const workflow = snapshot.config?.workflow ?? {};
  const publication = change === 'schedule' ? { scheduledAt: workflow.scheduledAt, scheduledVersionId: workflow.scheduledVersionId }
    : change === 'unpublish' ? { unpublishedAt: workflow.unpublishedAt }
      : { lastPublishedAt: workflow.lastPublishedAt, lastPublishedSummary: workflow.lastPublishedSummary, lastPublishedVersionId: workflow.lastPublishedVersionId, unpublishedAt: undefined };
  return { ...current, status: snapshot.status, config: { ...(current.config ?? {}), workflow: { ...(current.config?.workflow ?? {}), ...publication } } };
}

interface Props {
  initialData: InvitationParsed;
  /** A dónde vuelve la flecha del encabezado: el equipo al admin, el socio a su panel. */
  backHref?: string;
  /** Prefijo del editor para abrir otra invitación (al duplicar). */
  builderPath?: string;
  /** Development-only visual fixture: never persists or publishes documents. */
  fixtureMode?: boolean;
}

export default function InvitationBuilder({ initialData, backHref = '/admin', builderPath = '/admin/builder', fixtureMode = false }: Props) {
  const router = useRouter();
  const [data, setData] = useState<InvitationParsed>(initialData);
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<'clean' | 'dirty' | 'saving' | 'saved' | 'offline' | 'error'>('clean');
  const [saveError, setSaveError] = useState('');
  const [advancedTools, setAdvancedTools] = useState(false);
  const [mobileWorkspace, setMobileWorkspace] = useState<'edit' | 'preview'>('edit');
  const [contractNotice, setContractNotice] = useState('');
  const [publicationNotice, setPublicationNotice] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const publishDialog = useRef<HTMLDivElement | null>(null);
  const publishReturnFocus = useRef<HTMLElement | null>(null);
  const publishDialogBusy = useRef(saving);
  publishDialogBusy.current = saving;
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
  const manualSavePending = useRef(false);
  const pendingDraftSave = useRef<{ snapshot: InvitationParsed; editedAt: number; epoch: number; promise: Promise<boolean> } | null>(null);
  const blockMediaRevision = useRef(0);
  const validation = useMemo(() => validateInvitationBuilder(data), [data]);
  const publicationChanges = useMemo(() => summarizeBuilderChanges(data, publishedVersion?.data), [data, publishedVersion]);
  const previewInvitation = useMemo<InvitationParsed>(() => previewGuest ? {
    ...data,
    guest_name: previewGuest.name,
    guest_passes: previewGuest.passes,
    no_kids: data.no_kids || !previewGuest.allowKids,
    config: { ...data.config, activeGuest: previewGuest },
  } : data, [data, previewGuest]);

  useEffect(() => {
    if (!publishOpen || !publishDialog.current) return;
    const dialog = publishDialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    publishReturnFocus.current = previousFocus;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
    (dialog.querySelector<HTMLElement>('[data-publish-autofocus]') ?? dialog).focus({ preventScroll: true });
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!publishDialogBusy.current) setPublishOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = focusable(), first = controls[0], last = controls[controls.length - 1];
      const active = document.activeElement;
      if (!first) { event.preventDefault(); dialog.focus({ preventScroll: true }); }
      else if (event.shiftKey && (active === first || !controls.includes(active as HTMLElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !dialog.contains(active))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keepFocus);
    return () => {
      document.removeEventListener('keydown', keepFocus);
      if (previousFocus?.isConnected && !publishDialogBusy.current) {
        previousFocus.focus({ preventScroll: true });
        publishReturnFocus.current = null;
      }
    };
  }, [publishOpen]);

  useEffect(() => {
    if (publishOpen || saving || !publishReturnFocus.current) return;
    if (publishReturnFocus.current.isConnected) publishReturnFocus.current.focus({ preventScroll: true });
    publishReturnFocus.current = null;
  }, [publishOpen, saving]);

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
    if (fixtureMode) return;
    let active = true;
    const generation = hydrationEpoch.current;
    hydrateBuilderState(initialData.id).then(state => {
      if (!active || hydrationEpoch.current !== generation) return;
      setPublishedVersion(activePublishedVersion(state.versions));
      setScheduledVersion(nextScheduledVersion(state.versions));
    });
    return () => { active = false; };
  }, [initialData.id, fixtureMode]);

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
  const draftRevision = useRef(initialData.draft_revision ?? 0);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const editSequence = useRef(0), publicationEpoch = useRef(0), hydrationEpoch = useRef(0), publicOperation = useRef(false), failedSaveAt = useRef<number | null>(null);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (hasChanges.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, []);
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
  const commit = useCallback((next: InvitationParsed, coalesce = false, replaceDocument = false) => {
    const prev = dataRef.current;
    if (next === prev) return;
    if (changesUncontractedColors(prev, next)) {
      setContractNotice('Este paquete conserva la paleta original. Para cambiar colores, registra Personalización de color como adicional.');
      return;
    }
    setContractNotice('');
    if (replaceDocument) blockMediaRevision.current += 1;
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
    editSequence.current += 1;
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
    blockMediaRevision.current += 1;
    editSequence.current += 1;
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
    blockMediaRevision.current += 1;
    editSequence.current += 1;
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
      if (publishDialog.current?.contains(el)) return;
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

  const payloadFrom = useCallback((d: InvitationParsed, status?: 'draft' | 'ready') => ({
    id: d.id, slug: d.slug, status: status ?? d.status, template: d.template, type: d.type,
    names: d.names, event_date: d.event_date, rsvp_deadline: d.rsvp_deadline,
    ceremony_time: d.ceremony_time, ceremony_place: d.ceremony_place, ceremony_address: d.ceremony_address,
    reception_time: d.reception_time, reception_place: d.reception_place, reception_address: d.reception_address,
    guest_name: d.guest_name, guest_passes: d.guest_passes, message: d.message, dress_code: d.dress_code, no_kids: d.no_kids,
    parents_groom: d.parents_groom, parents_bride: d.parents_bride, sponsors: d.sponsors, itinerary: d.itinerary,
    gift_message: d.gift_message, bank_account: d.bank_account, cover_image_url: d.cover_image_url, gallery_url: d.gallery_url,
    color_primary: d.color_primary, color_secondary: d.color_secondary, color_accent: d.color_accent,
    is_active: d.is_active, phone_whatsapp: d.phone_whatsapp, builder_config: d.config ?? {},
  }), []);

  // Operational terms live outside visual undo/version snapshots.
  const syncValidity = useCallback((fields: Pick<InvitationParsed, 'expires_at' | 'validity_mode' | 'validity_extra_days' | 'validity_revision'>) => {
    if ((fields.validity_revision ?? 0) < (dataRef.current.validity_revision ?? 0)) return;
    const patch = { expires_at: fields.expires_at, validity_mode: fields.validity_mode, validity_extra_days: fields.validity_extra_days, validity_revision: fields.validity_revision };
    if (Object.entries(patch).every(([key, value]) => dataRef.current[key as keyof InvitationParsed] === value)) return;
    past.current = past.current.map(item => ({ ...item, ...patch }));
    future.current = future.current.map(item => ({ ...item, ...patch }));
    dataRef.current = { ...dataRef.current, ...patch };
    setData(dataRef.current);
  }, []);

  const storeDraft = useCallback(async (snapshot: InvitationParsed, options?: { requireCurrent?: number; pauseCurrent?: boolean }) => {
    if (fixtureMode) return dataRef.current === snapshot;
    const editedAt = editSequence.current, epoch = publicationEpoch.current;
    const pending = pendingDraftSave.current;
    if (!options && pending?.snapshot === snapshot && pending.editedAt === editedAt && pending.epoch === epoch) return pending.promise;
    const save = saveQueue.current.catch(() => {}).then(async () => {
    if (publicationEpoch.current !== epoch || (options?.requireCurrent !== undefined && editSequence.current !== options.requireCurrent)) return false;
    // Pausing changes public state only; use the latest working content when its queued PUT starts.
    const attempted = options?.pauseCurrent ? withPublicationState(dataRef.current, snapshot, 'unpublish') : snapshot;
    const attemptedAt = options?.pauseCurrent ? editSequence.current : editedAt;
    const response = await fetch('/api/admin/invitations', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payloadFrom(attempted), expectedDraftRevision: draftRevision.current }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setSaveError(payload.error || 'No se pudo guardar. Conservamos los cambios en esta pestaña.');
      throw new Error(payload.error || 'No se pudo guardar el borrador');
    }
    const stored = await response.json();
    setSaveError('');
    failedSaveAt.current = null;
    draftRevision.current = stored.draft_revision ?? draftRevision.current;
    const unchanged = editSequence.current === attemptedAt && publicationEpoch.current === epoch;
    syncValidity(stored);
    return unchanged;
    });
    saveQueue.current = save;
    const result = save.catch(error => {
      failedSaveAt.current = editSequence.current;
      setSaveError(error instanceof TypeError ? 'Sin conexión. Conservamos los cambios en esta pestaña; puedes descargar un respaldo.' : error instanceof Error ? error.message : 'No se pudo guardar el borrador.');
      throw error;
    });
    const tracked = result.finally(() => {
      if (pendingDraftSave.current?.promise === tracked) pendingDraftSave.current = null;
    });
    if (!options) pendingDraftSave.current = { snapshot, editedAt, epoch, promise: tracked };
    return tracked;
  }, [payloadFrom, syncValidity, fixtureMode]);

  // Autoguardado silencioso con estado explícito y recuperación al reconectar.
  const silentSave = useCallback(async () => {
    if (publicOperation.current || manualSavePending.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setSaveState('offline'); return; }
    setSaveState('saving');
    try {
      const snapshot = dataRef.current;
      const editedAt = editSequence.current, epoch = publicationEpoch.current;
      if (!await storeDraft(snapshot) || editSequence.current !== editedAt || publicationEpoch.current !== epoch) { if (!publicOperation.current) setSaveState('dirty'); return; }
      setSavedAt(new Date()); hasChanges.current = false;
      if (!publicOperation.current) setSaveState('saved');
      if (!fixtureMode) saveBuilderVersion(snapshot, 'Autoguardado', 'save');
    } catch { if (!publicOperation.current) setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error'); }
  }, [storeDraft, fixtureMode]);

  // Dispara el autoguardado 2.5s después del último cambio.
  useEffect(() => {
    if (!hasChanges.current || publicOperation.current || failedSaveAt.current === editSequence.current) return;
    const id = setTimeout(() => { silentSave(); }, 2500);
    return () => clearTimeout(id);
  }, [data, silentSave, saving]);

  useEffect(() => {
    const retry = () => { if (hasChanges.current) void silentSave(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [silentSave]);

  const handleSave = useCallback(async () => {
    if (publicOperation.current || manualSavePending.current) return;
    manualSavePending.current = true;
    setSaving(true);
    setSaveState('saving');
    try {
      const snapshot = dataRef.current;
      const editedAt = editSequence.current, epoch = publicationEpoch.current;
      if (!await storeDraft(snapshot) || editSequence.current !== editedAt || publicationEpoch.current !== epoch) { if (!publicOperation.current) setSaveState('dirty'); return; }
      setSavedAt(new Date()); hasChanges.current = false; if (!publicOperation.current) setSaveState('saved');
      if (!fixtureMode) saveBuilderVersion(snapshot, 'Guardado manual', 'save');
    } catch (error) {
      if (!publicOperation.current) {
        setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
        alert(error instanceof Error ? error.message : 'Error de conexión');
      }
    } finally {
      manualSavePending.current = false;
      if (!publicOperation.current) setSaving(false);
    }
  }, [storeDraft, fixtureMode]);

  // Saving is useful while a field is focused; native text undo/copy/paste stay untouched.
  useEffect(() => {
    const onSaveKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      if (event.repeat || publishOpen || fixtureMode || publicOperation.current) return;
      // Inline canvas text commits on blur, unlike the controlled sidebar fields.
      // Commit it even during an earlier save so that the newer edit stays pending.
      (event.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-edit-key][contenteditable="true"]')?.blur();
      void handleSave();
    };
    window.addEventListener('keydown', onSaveKey);
    return () => window.removeEventListener('keydown', onSaveKey);
  }, [handleSave, publishOpen, fixtureMode]);

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
    snapshot = { ...snapshot, expires_at: dataRef.current.expires_at, validity_mode: dataRef.current.validity_mode,
      validity_extra_days: dataRef.current.validity_extra_days, validity_revision: dataRef.current.validity_revision };
    dataRef.current = snapshot;
    setData(snapshot);
    hasChanges.current = false;
    setSavedAt(new Date());
    setSaveState('saved');
    past.current = [];
    future.current = [];
    setHistTick(value => value + 1);
  };

  const retainLaterEdits = (snapshot: InvitationParsed, editedAt: number, change: PublicationChange, message: string, replaceDocument = false) => {
    publicationEpoch.current += 1;
    if (editSequence.current === editedAt) {
      if (replaceDocument) blockMediaRevision.current += 1;
      applySnapshot(snapshot); return false;
    }
    // Undo and redo may change content, but must not restore an obsolete public status.
    past.current = past.current.map(item => withPublicationState(item, snapshot, change));
    future.current = future.current.map(item => withPublicationState(item, snapshot, change));
    dataRef.current = withPublicationState(dataRef.current, snapshot, change); setData(dataRef.current);
    hasChanges.current = true; setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'dirty');
    setPublicationNotice(message); return true;
  };
  const markLaterEdits = (message: string) => {
    hasChanges.current = true; setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'dirty'); setPublicationNotice(message);
  };

  const confirmPublish = async () => {
    if (validation.errors.length || saving || publicOperation.current) return;
    const scheduledAt = publishMode === 'schedule' ? new Date(publishAt) : null;
    if (publishMode === 'schedule' && (!publishAt || !scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now() + 60_000)) {
      setPublishError('Elige una fecha y hora futura, con al menos un minuto de margen.');
      return;
    }
    const editedAt = editSequence.current, working = dataRef.current;
    hydrationEpoch.current += 1; publicOperation.current = true; setSaving(true); setPublishError(''); setPublicationNotice(''); setSaveState('saving');
    try {
      await saveQueue.current;
      const now = new Date().toISOString();
      const isSchedule = publishMode === 'schedule';
      const nextStatus = 'ready';
      const workflow = working.config?.workflow ?? {};
      const snapshot: InvitationParsed = {
        ...working,
        status: nextStatus,
        config: { ...(working.config ?? {}), workflow: isSchedule
          ? { ...workflow, reviewStatus: 'approved', reviewUpdatedAt: now, scheduledAt: scheduledAt!.toISOString() }
          : { ...workflow, reviewStatus: 'approved', reviewUpdatedAt: now, lastPublishedAt: now, lastPublishedSummary: publishSummary.trim(), unpublishedAt: undefined } },
      };
      // Persist the event date/package before publishing; SQL computes the current term.
      await storeDraft({ ...snapshot, status: working.status });
      const result = await persistBuilderVersion(snapshot, publishLabel, 'publish', publishSummary, 'admin', isSchedule ? 'schedule' : 'publish', { publicationState: isSchedule ? 'scheduled' : 'published', publishAt: isSchedule ? scheduledAt!.toISOString() : now });
      const finalSnapshot = { ...snapshot, config: { ...snapshot.config, workflow: { ...(snapshot.config.workflow ?? {}), ...(isSchedule ? { scheduledVersionId: result.version.id } : { lastPublishedVersionId: result.version.id }) } } };
      const notice = isSchedule ? 'La publicación quedó programada. Tus cambios posteriores siguen en el borrador y no forman parte de esa versión.' : 'La invitación quedó publicada. Tus cambios posteriores siguen en el borrador, sin publicar.';
      const retained = retainLaterEdits(finalSnapshot, editedAt, isSchedule ? 'schedule' : 'publish', notice);
      if (isSchedule) setScheduledVersion({ ...result.version, data: finalSnapshot });
      else setPublishedVersion({ ...result.version, data: finalSnapshot });
      setPublishOpen(false);
      try {
        if (!retained) {
          setSaveState('saving');
          if (!await storeDraft(dataRef.current, { requireCurrent: editedAt })) markLaterEdits(notice);
          else { setSavedAt(new Date()); hasChanges.current = false; setSaveState('saved'); }
        }
      } catch {
        // La copia pública ya existe; solo queda pendiente sincronizar el borrador de trabajo.
        hasChanges.current = true;
        setSaveState('error');
        alert(`${isSchedule ? 'La programación quedó guardada' : 'La invitación quedó publicada'}, pero el borrador no terminó de sincronizar. Pulsa “Guardar” para reintentarlo.`);
      }
    } catch (error) {
      failedSaveAt.current = editSequence.current;
      setPublishError(error instanceof Error ? error.message : 'No se pudo publicar');
      setSaveState('error');
    }
    publicOperation.current = false; setSaving(false);
  };

  const unpublishInvitation = async () => {
    if (publicOperation.current) return;
    if (!window.confirm('¿Despublicar esta invitación? El enlace mostrará una pausa temporal y todas las versiones quedarán conservadas.')) return;
    const editedAt = editSequence.current, working = dataRef.current;
    hydrationEpoch.current += 1; publicOperation.current = true; setSaving(true); setPublicationNotice(''); setSaveState('saving');
    try {
      await saveQueue.current;
      await persistBuilderVersion(working, 'Antes de despublicar', 'manual', 'Respaldo previo a pausar el enlace', 'admin');
      const now = new Date().toISOString();
      const snapshot: InvitationParsed = { ...working, status: 'disabled', config: { ...(working.config ?? {}), workflow: { ...(working.config?.workflow ?? {}), unpublishedAt: now } } };
      await storeDraft(snapshot, { pauseCurrent: true });
      retainLaterEdits(snapshot, editedAt, 'unpublish', 'El enlace quedó pausado. Tus cambios posteriores siguen en el borrador.');
    } catch (error) {
      failedSaveAt.current = editSequence.current;
      setSaveState('error');
      alert(error instanceof Error ? error.message : 'No se pudo despublicar la invitación');
    }
    publicOperation.current = false; setSaving(false);
  };

  const rollbackPublication = async (version: BuilderVersion) => {
    if (publicOperation.current) return;
    const editedAt = editSequence.current, working = dataRef.current;
    hydrationEpoch.current += 1; publicOperation.current = true; setSaving(true); setPublicationNotice(''); setSaveState('saving');
    try {
      await saveQueue.current;
      await persistBuilderVersion(working, 'Antes del rollback', 'restore', `Respaldo previo a volver a ${version.label}`, 'admin');
      const summary = `Rollback inmediato a “${version.label}”`;
      const now = new Date().toISOString();
      const snapshot: InvitationParsed = { ...version.data, id: data.id, slug: data.slug, status: 'ready', config: { ...(version.data.config ?? {}), workflow: { ...(version.data.config?.workflow ?? {}), reviewStatus: 'approved', reviewUpdatedAt: now, lastPublishedAt: now, lastPublishedSummary: summary } } };
      const result = await persistBuilderVersion(snapshot, `Rollback · ${version.label}`, 'publish', summary, 'admin', 'publish');
      const finalSnapshot = { ...snapshot, config: { ...snapshot.config, workflow: { ...(snapshot.config.workflow ?? {}), lastPublishedVersionId: result.version.id } } };
      const notice = 'La versión elegida quedó publicada. Tus cambios posteriores siguen en el borrador, sin publicar.';
      const retained = retainLaterEdits(finalSnapshot, editedAt, 'publish', notice, true);
      setPublishedVersion({ ...result.version, data: finalSnapshot });
      try {
        if (!retained) {
          setSaveState('saving');
          if (!await storeDraft(dataRef.current, { requireCurrent: editedAt })) markLaterEdits(notice);
          else { setSavedAt(new Date()); hasChanges.current = false; setSaveState('saved'); }
        }
      } catch {
        hasChanges.current = true;
        setSaveState('error');
        alert('El rollback quedó publicado, pero el borrador no terminó de sincronizar. Pulsa “Guardar” para reintentarlo.');
      }
    } catch (error) {
      failedSaveAt.current = editSequence.current;
      setSaveState('error');
      alert(error instanceof Error ? error.message : 'No se pudo completar el rollback');
    }
    publicOperation.current = false; setSaving(false);
  };

  const { handleDuplicate, duplicate, duplicateError } = useBuilderDuplicate({
    sourceId: initialData.id, builderPath,
    snapshot: () => dataRef.current, sequence: () => editSequence.current, dirty: () => hasChanges.current,
    canStart: () => !fixtureMode && !publishOpen && !publicOperation.current && !manualSavePending.current,
    navigate: href => router.push(href),
  });

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta invitación permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/admin/invitations?id=${data.id}`, { method: 'DELETE' });
      if (res.ok) router.push(backHref);
      else alert('Error al eliminar');
    } catch {
      alert('Error de conexión');
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">

      <a href="#builder-workspace" className="sr-only rounded-lg bg-[#2C2519] font-outfit text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:min-h-11 focus:px-4 focus:py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]">Ir al área de edición</a>

      {/* ── Header ── */}
      <header className="z-40 flex-shrink-0 border-b border-[#e7e1d9] bg-white font-outfit">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 px-3 py-3 sm:px-4">

          {/* Izquierda */}
          <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
            <a href={backHref} title="Volver al panel"
              aria-label="Volver al panel"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-[#514735] transition-colors hover:bg-[#f7f3ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2">
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
            <div className="min-w-0">
              <h1 title={data.names || 'Nueva invitación'} className="truncate font-outfit text-base font-semibold leading-tight text-enkarta-dark">
                {data.names || 'Nueva invitación'}
              </h1>
              <p className="mt-1 truncate text-sm leading-5 text-[#6f665a]">{publicTemplateName(data.template, data.config?.designKey ?? data.config?.layout?.presetKey)} · {data.type}</p>
            </div>
          </div>

          {/* Centro: vista + historial */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => chooseViewport(390, 'mobile')}
                title="Vista móvil"
                type="button"
                aria-pressed={previewMode === 'mobile' && !compareMode}
                className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 ${previewMode === 'mobile' && !compareMode ? 'bg-white font-semibold text-gray-800 shadow-sm' : 'text-gray-600 hover:bg-white/70 hover:text-gray-800'}`}
              >
                <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                Móvil
              </button>
              <button
                onClick={() => chooseViewport(1024, 'desktop')}
                title="Vista escritorio"
                type="button"
                aria-pressed={previewMode === 'desktop' && !compareMode}
                className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 ${previewMode === 'desktop' && !compareMode ? 'bg-white font-semibold text-gray-800 shadow-sm' : 'text-gray-600 hover:bg-white/70 hover:text-gray-800'}`}
              >
                <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
                Desktop
              </button>
              <button
                onClick={() => setCompareMode(true)}
                title="Comparar móvil y escritorio"
                type="button"
                aria-pressed={compareMode}
                className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 ${compareMode ? 'bg-white font-semibold text-gray-800 shadow-sm' : 'text-gray-600 hover:bg-white/70 hover:text-gray-800'}`}
              >
                ◫ Comparar
              </button>
            </div>

            <div className="flex items-center rounded-xl border border-gray-200 p-0.5">
              <button
                onClick={undo}
                disabled={!canUndo}
                title="Deshacer (Ctrl+Z)"
                type="button"
                aria-label="Deshacer (Ctrl+Z)"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11a4 4 0 010 8h-1M3 10l4-4M3 10l4 4" /></svg>
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                title="Rehacer (Ctrl+Shift+Z)"
                type="button"
                aria-label="Rehacer (Ctrl+Shift+Z)"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H10a4 4 0 000 8h1M21 10l-4-4M21 10l-4 4" /></svg>
              </button>
            </div>
          </div>

          {/* Derecha: acciones */}
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            {previewGuest && (
              <button type="button" onClick={() => setPreviewGuest(null)} title="Salir de la simulación" className="hidden min-h-11 max-w-56 items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 lg:inline-flex">
                <span className="truncate">◎ Vista: {previewGuest.name} ×</span>
              </button>
            )}
            <button
              onClick={handleDuplicate}
              disabled={fixtureMode || saving || publishOpen || !!duplicate}
              title="Duplicar invitación"
              type="button"
              aria-label="Duplicar invitación"
              aria-busy={duplicate?.phase === 'pending'}
              className="hidden min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7V5a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></svg>
              {duplicate?.phase === 'pending' ? 'Duplicando…' : 'Duplicar'}
            </button>
            <a
              href={`/i/${data.slug}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir vista privada del borrador"
              aria-label="Abrir vista privada del borrador"
              className="hidden h-11 w-11 items-center justify-center rounded-xl border border-gray-300 text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 sm:flex"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </a>
            <button
              onClick={() => handleSave()}
              disabled={saving}
              type="button"
              aria-busy={saving}
              aria-keyshortcuts="Control+s Meta+s"
              title="Guardar borrador (Ctrl+S o ⌘S)"
              className="min-h-11 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={openPublish}
              disabled={saving || fixtureMode}
              type="button"
              className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#514735] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3f382b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Publicar
            </button>
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 border-t border-[#eee8df] pt-2">
            <span className="hidden text-xs text-gray-600 font-outfit lg:inline">Guardar: Ctrl+S / ⌘S</span>
            <span className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium leading-5 ${
              validation.errors.length ? 'bg-red-50 text-red-800' : validation.warnings.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
            }`}>
              <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${validation.errors.length ? 'bg-red-600' : validation.warnings.length ? 'bg-amber-600' : 'bg-emerald-600'}`} />
              {validation.errors.length ? `${validation.errors.length} error(es)` : validation.warnings.length ? `${validation.warnings.length} advertencia(s)` : 'Lista para publicar'}
            </span>
            <div role="status" aria-live="polite" aria-atomic="true" className="min-w-0">
              {(saveState === 'error' || saveState === 'offline') ? (
                <button type="button" onClick={() => void silentSave()} title={savedAt ? `Último guardado ${savedAt.toLocaleTimeString('es-ES')}` : SAVE_STATE_META[saveState].label} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium leading-5 underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 ${SAVE_STATE_META[saveState].cls}`}>
                  <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${SAVE_STATE_META[saveState].dot}`} />
                  {SAVE_STATE_META[saveState].label}
                </button>
              ) : (
                <span title={savedAt ? `Último guardado ${savedAt.toLocaleTimeString('es-ES')}` : SAVE_STATE_META[saveState].label} className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium leading-5 ${SAVE_STATE_META[saveState].cls}`}>
                  <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${SAVE_STATE_META[saveState].dot}`} />
                  {SAVE_STATE_META[saveState].label}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>
      {duplicate && <div role="status" aria-live="polite" aria-atomic="true" className={`flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-3 font-outfit text-sm leading-6 ${duplicate.phase === 'uncertain' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-[#e7e1d9] bg-[#f7f3ed] text-[#514735]'}`}>
        <p className="min-w-0 break-words">{duplicate.message}</p>
        {duplicate.href && <a href={duplicate.href} target="_blank" rel="noopener noreferrer" aria-label="Abrir copia en una pestaña nueva" className="inline-flex min-h-11 items-center rounded-lg px-2 font-semibold underline underline-offset-4 hover:bg-[#ece4d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2">Abrir copia <span className="sr-only">en una pestaña nueva</span></a>}
        {duplicate.phase === 'uncertain' && <a href={backHref} target="_blank" rel="noopener noreferrer" aria-label="Revisar mis invitaciones en una pestaña nueva" className="inline-flex min-h-11 items-center rounded-lg px-2 font-semibold underline underline-offset-4 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2">Revisar mis invitaciones <span className="sr-only">en una pestaña nueva</span></a>}
      </div>}
      {duplicateError && <p role="alert" className="shrink-0 break-words border-b border-red-200 bg-red-50 px-4 py-3 font-outfit text-sm leading-6 text-red-900">{duplicateError}</p>}
      {contractNotice && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 font-outfit"><span>{contractNotice}</span><button type="button" onClick={() => setActiveTab('config')} className="font-semibold underline">Ver paquete y adicionales</button></div>}
      {publicationNotice && <p role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 font-outfit">{publicationNotice}</p>}
      {saveError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"><span>{saveError}</span><button type="button" className="min-h-11 underline" onClick={() => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(dataRef.current, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = `${data.slug}-respaldo.json`; link.click(); URL.revokeObjectURL(url);
      }}>Descargar respaldo de mis cambios</button></div>}
      <nav className="flex shrink-0 items-center gap-2 overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#8f8272_transparent] border-b border-[#e7e1d9] bg-white px-3 py-2 font-outfit" aria-label="Pasos de personalización">
        {([['content', '1. Datos'], ['media', '2. Fotos y música'], ['style', '3. Estilo'], ['versions', '4. Revisar']] as [Tab, string][]).map(([tab, label]) => <button key={tab} type="button" onClick={() => { setActiveTab(tab); setMobileWorkspace('edit'); }} aria-pressed={activeTab === tab} title={TAB_DESCRIPTIONS[tab]} className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 ${activeTab === tab ? 'bg-[#514735] text-white' : 'bg-[#f7f3ed] text-[#514735] hover:bg-[#ece4d8]'}`}>{label}</button>)}
        <button type="button" onClick={() => setAdvancedTools(value => !value)} aria-pressed={advancedTools} aria-expanded={advancedTools} aria-controls="builder-tools" className="min-h-11 shrink-0 rounded-xl border border-[#c6b9a8] px-3 text-sm font-medium text-[#514735] transition-colors hover:bg-[#f7f3ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2">{advancedTools ? 'Ocultar herramientas avanzadas' : 'Más herramientas'}</button>
        <button type="button" onClick={() => setMobileWorkspace(value => value === 'edit' ? 'preview' : 'edit')} aria-pressed={mobileWorkspace === 'preview'} aria-controls={mobileWorkspace === 'edit' ? 'builder-preview' : 'builder-editor'} className="order-first min-h-11 shrink-0 rounded-xl border border-[#c6b9a8] px-3 text-sm font-semibold text-[#514735] transition-colors hover:bg-[#f7f3ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 lg:hidden">{mobileWorkspace === 'edit' ? 'Ver invitación' : 'Volver a editar'}</button>
      </nav>

      {/* ── Body ── */}
      <main id="builder-workspace" tabIndex={-1} aria-label="Área de edición y vista previa" className="flex min-h-0 flex-1 overflow-hidden">

        {/* Panel izquierdo: navegación clara + inspector */}
        <div id="builder-editor" className={`${mobileWorkspace === 'edit' ? 'flex' : 'hidden'} w-full flex-shrink-0 border-r border-[#e7e1d9] bg-white lg:flex lg:w-[430px] xl:w-[500px] 2xl:w-[540px]`}>
          <nav id="builder-tools" className="flex w-[88px] flex-shrink-0 flex-col gap-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#8f8272_transparent] border-r border-[#e8e1d6] bg-[#faf7f2] px-1.5 py-2" aria-label="Herramientas del constructor">
            {TABS.filter(tab => advancedTools || ['content', 'media', 'style', 'versions', 'guests', 'config'].includes(tab.id) || tab.id === activeTab).map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  title={`${tab.label}: ${TAB_DESCRIPTIONS[tab.id]}`}
                  aria-pressed={active}
                  className={`relative flex min-h-[64px] flex-shrink-0 flex-col items-center justify-center rounded-xl px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${active ? 'bg-[#514735] text-white focus-visible:ring-[#D4C5B9]' : 'text-[#62594d] hover:bg-[#ece4d8] hover:text-[#302a23] focus-visible:ring-[#514735]'}`}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  <span className={`mt-1.5 block font-outfit text-xs leading-4 ${active ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-shrink-0 border-b border-[#eee8df] bg-[#fbf8f3] px-4 py-4 sm:px-5">
              <h2 className="font-outfit text-base font-semibold text-[#302a23]">{TABS.find(tab => tab.id === activeTab)?.label}</h2>
              <p className="mt-1 font-outfit text-sm leading-5 text-[#6f665a]">{TAB_DESCRIPTIONS[activeTab]}</p>
            </div>

            {/* Contenido del panel (scrollable) */}
            <div data-builder-panel-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {activeTab === 'content' && <ContentPanel data={data} onChange={handleChange} editingRevision={blockMediaRevision} draftSource={dataRef} />}
              {activeTab === 'blocks'  && <BlockEditorPanel data={data} onChange={handleChange} selectedId={selectedBlockId} selectedIds={selectedBlockIds} onSelect={selectBlock} previewMode={previewMode} previewWidth={previewWidth} editingRevision={blockMediaRevision} draftSource={dataRef} />}
              {activeTab === 'elements' && <ElementsPanel data={data} onChange={handleChange} selectedId={selectedBlockId} onSelect={id => selectBlock(id)} editingRevision={blockMediaRevision} draftSource={dataRef} />}
              {activeTab === 'style'   && <StylePanel   data={data} onChange={handleChange} editingRevision={blockMediaRevision} draftSource={dataRef} />}
              {activeTab === 'decor'   && <DecorPanel   data={data} onChange={handleChange} editingRevision={blockMediaRevision} draftSource={dataRef} />}
              {activeTab === 'motion'  && <MotionPanel  data={data} onChange={handleChange} editingRevision={blockMediaRevision} draftSource={dataRef} />}
              {activeTab === 'media'   && <MediaPanel   data={data} onChange={handleChange} editingRevision={blockMediaRevision} draftSource={dataRef} />}
              {activeTab === 'guests'  && <GuestsPanel data={data} onChange={handleChange} onPreview={setPreviewGuest} previewGuestId={previewGuest?.id} />}
              {activeTab === 'versions' && <VersionsPanel
                data={data}
                selectedBlockId={selectedBlockId}
                publishedVersionId={publishedVersion?.id}
                onUnpublish={unpublishInvitation}
                onCancelSchedule={versionId => { if (scheduledVersion?.id === versionId) setScheduledVersion(null); }}
                onRestore={snapshot => { commit({ ...snapshot, id: data.id, slug: data.slug, status: data.status }, false, true); selectBlock(''); }}
                onRollback={rollbackPublication}
                onWorkflowChange={(status: ReviewStatus) => handleChange({ config: { ...(data.config ?? {}), workflow: { ...(data.config?.workflow ?? {}), reviewStatus: status, reviewUpdatedAt: new Date().toISOString() } } })}
                onOpenBlock={blockId => { selectBlock(blockId); setActiveTab('blocks'); }}
              />}
              {activeTab === 'quality' && <QualityControlPanel data={data} onChange={config => handleChange({ config })} />}
              {activeTab === 'export'  && <ExportPanel  data={data} />}
              {activeTab === 'config'  && <ConfigPanel data={data} onChange={handleChange} onValiditySync={syncValidity} onDelete={handleDelete} validation={validation} onOpenBlock={blockId => { selectBlock(blockId); setActiveTab('blocks'); }} editingRevision={blockMediaRevision} draftSource={dataRef} />}
            </div>
          </div>
        </div>

        {/* Panel derecho: preview en tiempo real */}
        <div id="builder-preview" className={`${mobileWorkspace === 'preview' ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col overflow-hidden lg:flex`}>
          <div className="flex min-h-14 flex-shrink-0 items-center justify-between gap-2 border-b border-[#ded8d0] bg-white px-3 py-2">
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#8f8272_transparent] py-1">
              {VIEWPORT_PRESETS.map(preset => (
                <button key={preset.width} type="button" onClick={() => chooseViewport(preset.width, preset.device)} title={`${preset.label} · ${preset.width}px`} aria-label={`${preset.label} · ${preset.width}px`} aria-pressed={!compareMode && previewWidth === preset.width} className={`flex min-h-11 flex-none items-center gap-1.5 rounded-lg px-3 text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset font-outfit ${!compareMode && previewWidth === preset.width ? 'bg-[#3f382f] text-white focus-visible:ring-[#D4C5B9]' : 'text-[#62594d] hover:bg-[#f4f0ea] focus-visible:ring-[#514735]'}`}>
                  <span aria-hidden="true" className={`rounded-[2px] border border-current ${preset.width <= 390 ? 'h-3.5 w-2' : preset.width === 768 ? 'h-3 w-3.5' : 'h-2.5 w-4'}`} />
                  <span className="hidden 2xl:inline">{preset.label}</span><span>{preset.width}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setCompareMode(value => !value)} aria-pressed={compareMode} className={`min-h-11 flex-none rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#514735] focus-visible:ring-offset-2 font-outfit ${compareMode ? 'bg-[#514735] text-white' : 'border border-[#c6b9a8] bg-white text-[#514735] hover:bg-[#f6f2ec]'}`}>◫ {compareMode ? 'Comparando' : 'Comparar'}</button>
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

      </main>

      {publishOpen && (
        <div ref={publishDialog} tabIndex={-1} className="fixed inset-0 z-[300] flex items-center justify-center bg-[#1f1a24]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="publish-title" aria-describedby="publish-description" aria-busy={saving}>
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-[600px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#8f8272_transparent] rounded-[28px] border border-white/70 bg-[#fcfbf8] shadow-[0_30px_100px_rgba(20,15,25,.35)]">
            <div className="bg-[linear-gradient(135deg,#2c273d_0%,#69547e_100%)] px-6 py-5 text-white">
              <div className="flex items-start gap-4"><span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-xl">{publishMode === 'schedule' ? '◷' : '✓'}</span><div className="min-w-0"><p className="text-xs font-semibold text-white/90 font-outfit">Centro de publicación</p><h2 id="publish-title" tabIndex={-1} data-publish-autofocus className="mt-1 font-playfair text-2xl focus:outline-none">{publishMode === 'schedule' ? 'Programar con seguridad' : 'Publicar con control'}</h2><p id="publish-description" className="mt-2 text-sm leading-6 text-white/90 font-outfit">El borrador seguirá editable y esta copia será inmutable. Puedes volver a una publicación anterior cuando quieras.</p></div></div>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f0ece6] p-1.5">
                <button type="button" onClick={() => { setPublishMode('now'); setPublishError(''); }} aria-pressed={publishMode === 'now'} className={`min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6a527f] focus-visible:ring-offset-2 font-outfit ${publishMode === 'now' ? 'bg-white text-[#382f42] shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Publicar ahora</button>
                <button type="button" onClick={() => { setPublishMode('schedule'); setPublishError(''); }} aria-pressed={publishMode === 'schedule'} className={`min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6a527f] focus-visible:ring-offset-2 font-outfit ${publishMode === 'schedule' ? 'bg-white text-[#382f42] shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Programar fecha</button>
              </div>
              {publishMode === 'schedule' && <label className="block rounded-2xl border border-violet-100 bg-violet-50/60 p-3"><span className="mb-1.5 block text-sm font-semibold text-violet-900 font-outfit">Fecha y hora de publicación</span><input name="publication-at" autoComplete="off" type="datetime-local" value={publishAt} min={localDateTimeInput(new Date(Date.now() + 60_000))} onChange={event => setPublishAt(event.target.value)} aria-describedby="publish-schedule-help" className="min-h-11 w-full min-w-0 rounded-xl border border-violet-300 bg-white px-3 py-2.5 text-base text-gray-800 outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-200 font-outfit" /><span id="publish-schedule-help" className="mt-2 block text-sm leading-5 text-violet-800 font-outfit">Usaremos la zona horaria de este dispositivo. Si ya existe una versión pública, seguirá visible hasta ese momento.</span></label>}
              {scheduledVersion && <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-3"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm">◷</span><div className="min-w-0"><p className="text-sm font-semibold text-sky-900 font-outfit">Ya existe una publicación programada</p><p className="mt-1 text-sm leading-5 text-sky-800 font-outfit">{scheduledVersion.publishAt ? new Date(scheduledVersion.publishAt).toLocaleString('es-BO') : 'Fecha pendiente'} · Puedes gestionarla en Historial. Una nueva programación no elimina la anterior.</p></div></div>}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-center"><p className="text-xs font-medium text-violet-800 font-outfit">Borrador</p><p className="mt-1 text-sm font-semibold text-violet-900 font-outfit">Se conserva</p></div>
                <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-2.5 text-center"><p className="text-xs font-medium text-cyan-800 font-outfit">Preview</p><p className="mt-1 text-sm font-semibold text-cyan-900 font-outfit">Privado</p></div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-center"><p className="text-xs font-medium text-emerald-800 font-outfit">Público</p><p className="mt-1 text-sm font-semibold text-emerald-900 font-outfit">{publishMode === 'schedule' ? 'En la fecha elegida' : 'Nueva versión'}</p></div>
              </div>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700 font-outfit">Nombre de la versión</span><input name="publication-label" autoComplete="off" value={publishLabel} onChange={event => setPublishLabel(event.target.value)} maxLength={120} className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-200 font-outfit" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700 font-outfit">Resumen que quedará en el historial</span><textarea name="publication-summary" autoComplete="off" value={publishSummary} onChange={event => setPublishSummary(event.target.value)} rows={3} maxLength={600} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base leading-6 text-gray-800 outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-200 font-outfit" /></label>
              <div className="rounded-2xl border border-gray-100 bg-white p-3"><p className="text-sm font-semibold text-gray-700 font-outfit">Cambios detectados</p><ul className="mt-2 space-y-1.5">{publicationChanges.map(change => <li key={change} className="flex gap-2 text-sm leading-5 text-gray-700 font-outfit"><span aria-hidden="true" className="text-emerald-700">●</span>{change}</li>)}</ul></div>
              {!!validation.errors.length && <div className="rounded-xl border border-red-100 bg-red-50 p-3"><p className="text-sm font-semibold text-red-800 font-outfit">No se puede publicar todavía</p>{validation.errors.map(issue => <p key={issue.title} className="mt-1 text-sm leading-5 text-red-800 font-outfit">• {issue.title}</p>)}</div>}
              {!!validation.warnings.length && !validation.errors.length && <div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-sm font-semibold text-amber-800 font-outfit">Revisa estas advertencias</p>{validation.warnings.map(issue => <p key={issue.title} className="mt-1 text-sm leading-5 text-amber-800 font-outfit">• {issue.title}</p>)}</div>}
              {publishError && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800 font-outfit"><p>{publishError}</p>{backHref === '/socios/panel' && <a href="/socios/panel?tab=suscripcion" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4">Revisar suscripción y pagos en otra pestaña</a>}</div>}
              <div className="flex flex-col gap-2 pt-1 sm:flex-row"><button type="button" onClick={() => setPublishOpen(false)} disabled={saving} className="min-h-11 flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6a527f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-outfit">Seguir editando</button><button type="button" onClick={confirmPublish} disabled={saving || !!validation.errors.length || !publishLabel.trim()} aria-busy={saving} className="min-h-11 flex-[1.35] rounded-xl bg-[linear-gradient(90deg,#75548f,#6a527f)] px-3 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6a527f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 font-outfit">{saving ? (publishMode === 'schedule' ? 'Programando…' : 'Publicando…') : (publishMode === 'schedule' ? 'Programar publicación' : 'Publicar esta versión')}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
