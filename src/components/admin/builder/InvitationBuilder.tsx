'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { InvitationParsed, BlockLayout, Block } from '@/lib/types';
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
import { detachBinding } from '@/lib/block-bindings';
import { validateInvitationBuilder } from '@/lib/builder-validation';

type Tab = 'content' | 'blocks' | 'elements' | 'style' | 'decor' | 'motion' | 'media' | 'guests' | 'config';

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
  { id: 'config',  label: 'Config',     icon: tabIcon('M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894zM15 12a3 3 0 11-6 0 3 3 0 016 0z') },
];

interface Props {
  initialData: InvitationParsed;
}

export default function InvitationBuilder({ initialData }: Props) {
  const router = useRouter();
  const [data, setData] = useState<InvitationParsed>(initialData);
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const hasChanges = useRef(false);
  const validation = useMemo(() => validateInvitationBuilder(data), [data]);

  // ── Historial (deshacer / rehacer) ──
  const dataRef = useRef<InvitationParsed>(initialData);
  const past = useRef<InvitationParsed[]>([]);
  const future = useRef<InvitationParsed[]>([]);
  const lastCommit = useRef(0);
  const [, setHistTick] = useState(0);

  // Aplica un cambio registrando el historial. `coalesce` agrupa cambios rápidos
  // (escritura, arrastre) en un único paso de deshacer.
  const commit = useCallback((next: InvitationParsed, coalesce = false) => {
    const prev = dataRef.current;
    if (next === prev) return;
    const now = Date.now();
    if (!(coalesce && now - lastCommit.current < 500)) {
      past.current = [...past.current.slice(-49), prev];
      future.current = [];
    }
    lastCommit.current = now;
    dataRef.current = next;
    setData(next);
    hasChanges.current = true;
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
    const blocks = layout.blocks.map(b => {
      if (b.id !== id) return b;
      const current = b.layout ?? {};
      const target = previewMode === 'mobile' ? 'mobile' : 'desktop';
      return {
        ...b,
        layout: {
          ...current,
          [target]: { ...(current[target] ?? {}), ...patch },
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
    setHistTick(t => t + 1);
  }, []);

  // Portapapeles de bloques (copiar/pegar).
  const clipboard = useRef<Block | null>(null);
  const selectedRef = useRef(selectedBlockId);
  selectedRef.current = selectedBlockId;

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
    setSelectedBlockId(copy.id);
  }, [commit]);

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
      else if (k === 'c') { copyBlock(); }
      else if (k === 'v') { e.preventDefault(); pasteBlock(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, copyBlock, pasteBlock]);

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

  // Autoguardado silencioso (sin navegar ni alertas).
  const [autoSaving, setAutoSaving] = useState(false);
  const silentSave = useCallback(async () => {
    setAutoSaving(true);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadFrom(dataRef.current)),
      });
      if (res.ok) { setSavedAt(new Date()); hasChanges.current = false; }
    } catch { /* se reintenta en el próximo cambio */ }
    setAutoSaving(false);
  }, []);

  // Dispara el autoguardado 2.5s después del último cambio.
  useEffect(() => {
    if (!hasChanges.current) return;
    const id = setTimeout(() => { silentSave(); }, 2500);
    return () => clearTimeout(id);
  }, [data, silentSave]);

  const handleSave = async (status?: 'draft' | 'ready') => {
    if (status === 'ready' && validation.errors.length) {
      alert(`No se puede publicar todavía.\n\n${validation.errors.map((e, i) => `${i + 1}. ${e.title}`).join('\n')}`);
      return;
    }
    if (status === 'ready' && validation.warnings.length) {
      const proceed = confirm(`Hay ${validation.warnings.length} advertencia(s) antes de publicar.\n\n${validation.warnings.map((w, i) => `${i + 1}. ${w.title}`).join('\n')}\n\n¿Publicar de todas formas?`);
      if (!proceed) return;
    }
    setSaving(true);
    try {
      const payload = payloadFrom(data, status);

      const res = await fetch('/api/admin/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSavedAt(new Date());
        hasChanges.current = false;
        if (status) router.push('/admin');
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar');
      }
    } catch {
      alert('Error de conexión');
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
              <p className="text-[11px] text-gray-400 font-outfit capitalize truncate">{data.template} · {data.type}</p>
            </div>
          </div>

          {/* Centro: vista + historial */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setPreviewMode('mobile')}
                title="Vista móvil"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-outfit transition-all ${previewMode === 'mobile' ? 'bg-white shadow-sm text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                Móvil
              </button>
              <button
                onClick={() => setPreviewMode('desktop')}
                title="Vista escritorio"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-outfit transition-all ${previewMode === 'desktop' ? 'bg-white shadow-sm text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
                Desktop
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
            <span className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-outfit transition-colors ${autoSaving ? 'bg-amber-50 text-amber-600' : savedAt ? 'bg-green-50 text-green-600' : 'text-transparent'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${autoSaving ? 'bg-amber-400 animate-pulse' : savedAt ? 'bg-green-500' : 'bg-transparent'}`} />
              {autoSaving
                ? 'Guardando…'
                : savedAt
                  ? `Guardado ${savedAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
            </span>
            <button
              onClick={handleDuplicate}
              title="Duplicar invitación"
              className="hidden sm:flex w-9 h-9 items-center justify-center text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7V5a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></svg>
            </button>
            <a
              href={`/i/${data.slug}`}
              target="_blank"
              title="Ver invitación publicada"
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
              onClick={() => handleSave('ready')}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-outfit font-semibold text-white rounded-xl transition-all duration-300 hover:-translate-y-px disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #B8975A, #cda964)', boxShadow: '0 4px 14px rgba(184,151,90,0.35)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {saving ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panel izquierdo: editor */}
        <div className="w-80 xl:w-96 flex flex-col bg-white border-r border-gray-200 flex-shrink-0">

          {/* Tabs */}
          <div className="flex border-b border-gray-200 flex-shrink-0 overflow-x-auto bg-[#fbfaf8]">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                className={`relative flex-shrink-0 min-w-[58px] flex-1 pt-3 pb-2.5 text-center transition-all duration-200 ${
                  active
                    ? 'text-enkarta-gold bg-white'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
                }`}
              >
                {tab.icon}
                <span className={`block text-[10px] font-outfit mt-1 ${active ? 'font-semibold' : ''}`}>{tab.label}</span>
                <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-full transition-all duration-300 ${active ? 'w-8 bg-enkarta-gold' : 'w-0 bg-transparent'}`} />
              </button>
              );
            })}
          </div>

          {/* Contenido del panel (scrollable) */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'content' && <ContentPanel data={data} onChange={handleChange} />}
            {activeTab === 'blocks'  && <BlockEditorPanel data={data} onChange={handleChange} selectedId={selectedBlockId} onSelect={setSelectedBlockId} previewMode={previewMode} />}
            {activeTab === 'elements' && <ElementsPanel data={data} onChange={handleChange} selectedId={selectedBlockId} onSelect={setSelectedBlockId} />}
            {activeTab === 'style'   && <StylePanel   data={data} onChange={handleChange} />}
            {activeTab === 'decor'   && <DecorPanel   data={data} onChange={handleChange} />}
            {activeTab === 'motion'  && <MotionPanel  data={data} onChange={handleChange} />}
            {activeTab === 'media'   && <MediaPanel   data={data} onChange={handleChange} />}
            {activeTab === 'guests'  && <GuestsPanel  data={data} />}
            {activeTab === 'config'  && <ConfigPanel  data={data} onChange={handleChange} onDelete={handleDelete} validation={validation} />}
          </div>
        </div>

        {/* Panel derecho: preview en tiempo real */}
        <div className="flex-1 overflow-hidden">
          <LivePreview
            invitation={data}
            device={previewMode}
            blockEditor={activeTab === 'blocks' || activeTab === 'elements'}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onTransformBlock={transformBlock}
            onEditBlockProp={editBlockProp}
          />
        </div>

      </div>
    </div>
  );
}
