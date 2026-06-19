'use client';

import { useEffect, useState } from 'react';
import LottieIcon from '@/components/ui/LottieIcon';
import { LottieRegistry, LottieIconMeta, LottieCategory, loadLottieRegistry } from '@/lib/lottie-utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface IconLibraryProps {
  /** Filter by event type (shows relevant category first) */
  eventType?: 'boda' | 'xv' | 'cumpleanos' | 'baby_shower' | 'bautizo';

  /** Color overrides applied to all icons in the preview */
  previewColors?: Record<string, string>;

  /** Called when the user clicks an icon */
  onSelect?: (icon: LottieIconMeta) => void;

  /** Currently selected icon id (for highlight) */
  selectedId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IconLibrary({
  eventType,
  previewColors,
  onSelect,
  selectedId,
}: IconLibraryProps) {
  const [registry, setRegistry] = useState<LottieRegistry | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(eventType ?? 'boda');

  useEffect(() => {
    loadLottieRegistry().then(setRegistry);
  }, []);

  if (!registry) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-enkarta-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter categories & icons by search query
  const filteredCategories: LottieCategory[] = registry.categories.map(cat => ({
    ...cat,
    icons: search
      ? cat.icons.filter(icon =>
          icon.label.toLowerCase().includes(search.toLowerCase()) ||
          icon.tags.some(tag => tag.includes(search.toLowerCase()))
        )
      : cat.icons,
  })).filter(cat => !search || cat.icons.length > 0);

  const activeIcons = search
    ? filteredCategories.flatMap(c => c.icons)
    : filteredCategories.find(c => c.id === activeCategory)?.icons ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar ícono..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Category tabs (hidden when searching) */}
      {!search && (
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {registry.categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-outfit font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-enkarta-gold text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Icons Grid */}
      {activeIcons.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm font-outfit">
          {search ? `Sin resultados para "${search}"` : 'Aún no hay íconos en esta categoría.\nSube el archivo .json a la carpeta correspondiente.'}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {activeIcons.map(icon => (
            <button
              key={icon.id}
              onClick={() => onSelect?.(icon)}
              title={icon.label}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all hover:border-enkarta-gold/50 hover:bg-enkarta-gold/5 ${
                selectedId === icon.id
                  ? 'border-enkarta-gold bg-enkarta-gold/10'
                  : 'border-transparent bg-gray-50'
              }`}
            >
              <LottieIcon
                icon={icon.id}
                size={48}
                colors={previewColors}
                loop={true}
                autoplay={true}
              />
              <span className="text-xs text-gray-600 font-outfit text-center leading-tight truncate w-full">
                {icon.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Upload hint */}
      <div className="mt-1 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-xs text-blue-600 font-outfit">
          💡 <strong>Para agregar íconos:</strong> Sube el archivo <code>.json</code> de LottieFiles a{' '}
          <code className="bg-blue-100 px-1 rounded">public/lottie/{activeCategory}/</code>
        </p>
      </div>
    </div>
  );
}
