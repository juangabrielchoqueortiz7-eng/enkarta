'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import ImageUploader from './ImageUploader';
import { ELEMENTS, ELEMENT_CATEGORIES, paletteFromPrimary, type ElementCategory, type ElementPalette } from '@/components/invitations/blocks/elements-library';
import { listUserElements, addUserElement, removeUserElement, type UserElement } from '@/lib/user-elements';

interface Props {
  /** Color de previsualización (tema de la invitación). */
  color: string;
  palette?: ElementPalette;
  ownerId?: string;
  /** Inserta un elemento: de la librería (motif) o subido (url). */
  onPick: (sel: { motif?: string; url?: string }) => void;
}

const tabCls = (active: boolean) =>
  `px-3 py-1.5 rounded-lg text-xs font-outfit transition-colors ${
    active ? 'bg-enkarta-gold text-white' : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'
  }`;

const CATEGORY_ICONS: Record<ElementCategory, string> = {
  corner: '⌜', frame: '▣', divider: '〰', bouquet: '❀', wreath: '◌', ribbon: '⌁', sparkle: '✦',
};
const FAVORITES_KEY = 'enkarta-element-favorites-v1';
const RECENTS_KEY = 'enkarta-element-recents-v1';

function loadKeys(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(key) || '[]') as string[]; } catch { return []; }
}

export default function ElementPicker({ color, palette, ownerId, onPick }: Props) {
  const [tab, setTab] = useState<'lib' | 'upload' | 'mine'>('lib');
  const [cat, setCat] = useState<ElementCategory>('corner');
  const [view, setView] = useState<'category' | 'favorites' | 'recent'>('category');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState<UserElement[]>(() => listUserElements());
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(loadKeys(FAVORITES_KEY));
    setRecents(loadKeys(RECENTS_KEY));
  }, []);

  const resolvedPalette = palette ?? paletteFromPrimary(color);

  const q = query.trim().toLowerCase();
  const items = ELEMENTS.filter(e => {
    if (q) return e.label.toLowerCase().includes(q) || e.key.includes(q);
    if (view === 'favorites') return favorites.includes(e.key);
    if (view === 'recent') return recents.includes(e.key);
    return e.category === cat;
  }).sort((a, b) => view === 'recent' ? recents.indexOf(a.key) - recents.indexOf(b.key) : a.label.localeCompare(b.label));

  const pickLibrary = (motif: string) => {
    const next = [motif, ...recents.filter(k => k !== motif)].slice(0, 12);
    setRecents(next);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    onPick({ motif });
  };
  const toggleFavorite = (motif: string) => {
    const next = favorites.includes(motif) ? favorites.filter(k => k !== motif) : [...favorites, motif];
    setFavorites(next);
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex gap-1.5 p-2 border-b border-gray-100 bg-[#fbfaf8]">
        <button type="button" onClick={() => setTab('lib')} className={tabCls(tab === 'lib')}>Librería</button>
        <button type="button" onClick={() => setTab('upload')} className={tabCls(tab === 'upload')}>Subir</button>
        <button type="button" onClick={() => { setMine(listUserElements()); setTab('mine'); }} className={tabCls(tab === 'mine')}>Mis elementos</button>
      </div>

      {tab === 'lib' && (
        <div className="p-3 space-y-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar elemento… (rosa, marco, laurel)"
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
          />
          {!q && (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setView('favorites')} className={`px-2.5 py-1 rounded-full text-[10px] font-outfit ${view === 'favorites' ? 'bg-rose-100 text-rose-600' : 'bg-gray-50 text-gray-500'}`}>♥ Favoritos {favorites.length || ''}</button>
                <button type="button" onClick={() => setView('recent')} className={`px-2.5 py-1 rounded-full text-[10px] font-outfit ${view === 'recent' ? 'bg-violet-100 text-violet-600' : 'bg-gray-50 text-gray-500'}`}>◷ Recientes</button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {ELEMENT_CATEGORIES.map(c => {
                  const count = ELEMENTS.filter(e => e.category === c.id).length;
                  return (
                    <button key={c.id} type="button" onClick={() => { setCat(c.id); setView('category'); }}
                      className={`px-1.5 py-2 rounded-xl text-[10px] font-outfit transition-colors ${view === 'category' && cat === c.id ? 'bg-enkarta-gold/15 text-enkarta-gold ring-1 ring-enkarta-gold/20' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}>
                      <span className="block text-base leading-none mb-1">{CATEGORY_ICONS[c.id]}</span>
                      <span className="block truncate">{c.label}</span>
                      <span className="block text-[8px] opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 max-h-[26rem] overflow-y-auto pr-0.5">
            {items.map(e => (
              <div key={e.key} className="group relative rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-[#f8f4ee] hover:border-enkarta-gold/50 hover:shadow-md transition-all overflow-hidden">
                <button type="button" onClick={() => pickLibrary(e.key)} title={`Añadir ${e.label}`} className="w-full flex flex-col items-center gap-1.5 p-2.5 pt-3">
                  <span className="w-full h-20 flex items-center justify-center overflow-hidden rounded-xl bg-white/70">
                    <span style={{ width: e.category === 'corner' || e.category === 'frame' || e.category === 'wreath' ? '68%' : '94%', lineHeight: 0 }}>
                      {e.render(resolvedPalette.primary, resolvedPalette.secondary, resolvedPalette.accent, resolvedPalette.detail)}
                    </span>
                  </span>
                  <span className="text-[11px] font-outfit text-gray-700 font-medium text-center leading-tight truncate w-full">{e.label}</span>
                  <span className="text-[9px] font-outfit text-gray-400">{ELEMENT_CATEGORIES.find(c => c.id === e.category)?.label}</span>
                </button>
                <button type="button" aria-label={favorites.includes(e.key) ? 'Quitar de favoritos' : 'Guardar como favorito'} onClick={() => toggleFavorite(e.key)}
                  className={`absolute top-2 right-2 w-7 h-7 rounded-full border bg-white/90 shadow-sm text-xs transition-all ${favorites.includes(e.key) ? 'text-rose-500 border-rose-200' : 'text-gray-300 border-gray-100 opacity-0 group-hover:opacity-100'}`}>
                  ♥
                </button>
              </div>
            ))}
            {items.length === 0 && <p className="col-span-2 text-xs text-gray-400 font-outfit text-center py-6">No hay elementos aquí todavía.</p>}
          </div>
        </div>
      )}

      {tab === 'upload' && (
        <div className="p-3">
          <ImageUploader
            kind="image"
            folder="elements"
            ownerId={ownerId}
            aspect="square"
            allowUrl
            value=""
            onChange={(url) => { if (url) { setMine(addUserElement(url)); onPick({ url }); } }}
            hint="Sube un PNG, WEBP o SVG con fondo transparente (lo que exportas de Canva)."
          />
        </div>
      )}

      {tab === 'mine' && (
        <div className="p-3">
          {mine.length === 0 ? (
            <p className="text-xs text-gray-400 font-outfit text-center py-4">Aún no has subido elementos. Usa la pestaña «Subir».</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {mine.map(el => (
                <div key={el.url} className="relative group rounded-xl border border-gray-100 bg-gray-50 p-2">
                  <button type="button" onClick={() => onPick({ url: el.url })} className="w-full h-14 flex items-center justify-center overflow-hidden">
                    <img src={el.url} alt="" className="max-h-14 max-w-full object-contain" />
                  </button>
                  <button type="button" onClick={() => setMine(removeUserElement(el.url))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 text-[11px] shadow opacity-0 group-hover:opacity-100 transition-opacity">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
