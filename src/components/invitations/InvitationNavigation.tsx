'use client';

import { useState } from 'react';
import type { NavigationItem, TemplateTheme } from '@/lib/types';
import { resolveBlockTheme } from './blocks/theme';

export default function InvitationNavigation({ items, position = 'bottom', style = 'glass', theme }: { items: NavigationItem[]; position?: 'top' | 'bottom'; style?: 'glass' | 'solid' | 'minimal'; theme?: TemplateTheme }) {
  const [active, setActive] = useState(items[0]?.blockId ?? '');
  const t = resolveBlockTheme(theme);
  if (items.length < 2) return null;
  const jump = (item: NavigationItem) => {
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-ek-section]')).find(element => element.dataset.ekSection === item.blockId);
    if (!target) return;
    setActive(item.blockId);
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  const solid = style === 'solid';
  const minimal = style === 'minimal';
  return <nav aria-label="Secciones de la invitación" className={`fixed left-1/2 z-[85] max-w-[calc(100vw-24px)] -translate-x-1/2 ${position === 'top' ? 'top-3' : 'bottom-3'}`}>
    <div className={`flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1.5 shadow-[0_12px_36px_rgba(25,20,15,.18)] [scrollbar-width:none] ${minimal ? 'border border-transparent bg-transparent shadow-none' : solid ? '' : 'border border-white/60 bg-white/80 backdrop-blur-xl'}`} style={solid ? { background: t.primaryDeep, color: t.onPrimary } : undefined}>
      {items.map(item => <button key={item.id} type="button" onClick={() => jump(item)} aria-current={active === item.blockId ? 'location' : undefined} className="min-h-9 flex-none rounded-full px-3 text-[10px] font-semibold tracking-wide transition-colors font-outfit" style={active === item.blockId ? { background: t.primary, color: t.onPrimary } : { color: solid ? t.onPrimary : t.text, background: minimal ? `${t.surface}e6` : 'transparent' }}>{item.label}</button>)}
    </div>
  </nav>;
}
