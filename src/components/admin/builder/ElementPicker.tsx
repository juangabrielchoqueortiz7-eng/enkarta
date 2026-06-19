'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import ImageUploader from './ImageUploader';
import { ELEMENTS, ELEMENT_CATEGORIES, type ElementCategory } from '@/components/invitations/blocks/elements-library';
import { listUserElements, addUserElement, removeUserElement, type UserElement } from '@/lib/user-elements';

interface Props {
  /** Color de previsualización (tema de la invitación). */
  color: string;
  ownerId?: string;
  /** Inserta un elemento: de la librería (motif) o subido (url). */
  onPick: (sel: { motif?: string; url?: string }) => void;
}

const tabCls = (active: boolean) =>
  `px-3 py-1.5 rounded-lg text-xs font-outfit transition-colors ${
    active ? 'bg-enkarta-gold text-white' : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'
  }`;

export default function ElementPicker({ color, ownerId, onPick }: Props) {
  const [tab, setTab] = useState<'lib' | 'upload' | 'mine'>('lib');
  const [cat, setCat] = useState<ElementCategory>('corner');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState<UserElement[]>(() => listUserElements());

  const q = query.trim().toLowerCase();
  const items = ELEMENTS.filter(e =>
    q ? e.label.toLowerCase().includes(q) || e.key.includes(q) : e.category === cat,
  );

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
            <div className="flex flex-wrap gap-1.5">
              {ELEMENT_CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => setCat(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-outfit transition-colors ${cat === c.id ? 'bg-enkarta-gold/15 text-enkarta-gold' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {items.map(e => (
              <button key={e.key} type="button" onClick={() => onPick({ motif: e.key })}
                title={e.label}
                className="group flex flex-col items-center gap-1 p-2 rounded-xl border border-gray-100 bg-gray-50 hover:border-enkarta-gold/50 hover:bg-enkarta-gold/5 transition-all">
                <span className="w-full h-14 flex items-center justify-center overflow-hidden">
                  <span style={{ width: e.category === 'corner' || e.category === 'frame' || e.category === 'wreath' ? '64%' : '92%', lineHeight: 0 }}>
                    {e.render(color)}
                  </span>
                </span>
                <span className="text-[10px] font-outfit text-gray-500 text-center leading-tight truncate w-full">{e.label}</span>
              </button>
            ))}
            {items.length === 0 && <p className="col-span-3 text-xs text-gray-400 font-outfit text-center py-3">Sin resultados.</p>}
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
