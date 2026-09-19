'use client';

import { useMemo, useState } from 'react';
import CollectionCard from '@/components/catalog/CollectionCard';
import Reveal from '@/components/motion/Reveal';
import type { CollectionCatalogEntry } from '@/lib/collection-catalog';

const PAGE_SIZE = 12;

type SeriesFilter = 'todas' | 'Origen' | 'Atelier';
type SortMode = 'enkarta' | 'nombre';

/** Marcas diacríticas combinantes (U+0300–U+036F) que deja `normalize('NFD')`. */
const DIACRITICS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

/** Búsqueda tolerante a tildes y mayúsculas. */
function normalize(value: string) {
  return value.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
}

const SERIES_NOTE: Record<Exclude<SeriesFilter, 'todas'>, string> = {
  Origen: 'Colecciones base listas para personalizar.',
  Atelier: 'Piezas de autor con dirección artística propia.',
};

export default function CatalogExplorer({ designs }: { designs: CollectionCatalogEntry[] }) {
  const [series, setSeries] = useState<SeriesFilter>('todas');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('enkarta');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const counts = useMemo(() => ({
    todas: designs.length,
    Origen: designs.filter(design => design.series === 'Origen').length,
    Atelier: designs.filter(design => design.series === 'Atelier').length,
  }), [designs]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const list = designs.filter(design => {
      if (series !== 'todas' && design.series !== series) return false;
      if (!q) return true;
      return normalize(`${design.name} ${design.tag} ${design.desc} ${design.series}`).includes(q);
    });
    return sort === 'nombre' ? [...list].sort((a, b) => a.name.localeCompare(b.name, 'es')) : list;
  }, [designs, query, series, sort]);

  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;
  const filtering = series !== 'todas' || query.trim().length > 0;

  /** Cada cambio de criterio reinicia la paginación para no dejar resultados ocultos. */
  const applySeries = (value: SeriesFilter) => { setSeries(value); setVisible(PAGE_SIZE); };
  const applyQuery = (value: string) => { setQuery(value); setVisible(PAGE_SIZE); };
  const applySort = (value: SortMode) => { setSort(value); setVisible(PAGE_SIZE); };
  const reset = () => { setSeries('todas'); setQuery(''); setVisible(PAGE_SIZE); };

  return (
    <div>
      {/* ── Barra de filtros ── */}
      <div className="z-30 -mx-5 mb-12 border-y px-5 py-4 backdrop-blur-md lg:sticky lg:top-0"
        style={{ borderColor: 'rgba(139,125,95,0.16)', backgroundColor: 'rgba(250,247,242,0.92)' }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por serie">
            {(['todas', 'Atelier', 'Origen'] as const).map(value => {
              const active = series === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => applySeries(value)}
                  aria-pressed={active}
                  className="rounded-full border px-4 py-2 font-outfit text-xs font-semibold transition-all duration-300"
                  style={active
                    ? { borderColor: '#B8975A', backgroundColor: '#8B7D5F', color: '#ffffff', boxShadow: '0 6px 18px rgba(139,125,95,0.25)' }
                    : { borderColor: 'rgba(139,125,95,0.28)', backgroundColor: 'rgba(255,255,255,0.7)', color: 'rgba(44,37,25,0.6)' }}
                >
                  {value === 'todas' ? 'Todas' : value}
                  <span className="ml-2 font-normal opacity-60">{counts[value]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[190px] flex-1">
              <span className="sr-only">Buscar un diseño por nombre o estilo</span>
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="rgba(139,125,95,0.7)" strokeWidth="1.7" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M20 20l-3.6-3.6" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={event => applyQuery(event.target.value)}
                placeholder="Buscar: jardín, editorial, nocturno…"
                className="w-full rounded-full border bg-white/80 py-2 pl-9 pr-3 font-outfit text-xs outline-none transition-colors focus:border-[#B8975A]"
                style={{ borderColor: 'rgba(139,125,95,0.28)', color: 'rgba(44,37,25,0.75)' }}
              />
            </label>
            <label className="flex items-center gap-2 font-outfit text-[11px]" style={{ color: 'rgba(44,37,25,0.45)' }}>
              <span className="hidden sm:inline">Orden</span>
              <select
                value={sort}
                onChange={event => applySort(event.target.value as SortMode)}
                className="rounded-full border bg-white/80 px-3 py-2 font-outfit text-xs outline-none focus:border-[#B8975A]"
                style={{ borderColor: 'rgba(139,125,95,0.28)', color: 'rgba(44,37,25,0.7)' }}
              >
                <option value="enkarta">Selección Enkarta</option>
                <option value="nombre">Nombre (A–Z)</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mx-auto mt-3 flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1">
          <p aria-live="polite" className="font-outfit text-[11px]" style={{ color: 'rgba(44,37,25,0.45)' }}>
            Mostrando {shown.length} de {filtered.length} {filtered.length === 1 ? 'diseño' : 'diseños'}
            {series !== 'todas' ? ` · ${SERIES_NOTE[series]}` : ''}
          </p>
          {filtering && (
            <button type="button" onClick={reset} className="font-outfit text-[11px] underline underline-offset-4 transition-colors" style={{ color: '#B8975A' }}>
              Quitar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Rejilla ── */}
      {shown.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 sm:gap-y-24 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((design, index) => (
            <CollectionCard key={design.key} design={design} delay={(index % 4) * 0.08} showMeta />
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-md rounded-[1.75rem] border px-8 py-14 text-center" style={{ borderColor: 'rgba(139,125,95,0.22)', backgroundColor: 'rgba(255,255,255,0.6)' }}>
          <p className="font-great text-3xl" style={{ color: '#B8975A' }}>Sin coincidencias</p>
          <p className="mt-3 font-outfit text-sm" style={{ color: 'rgba(44,37,25,0.55)' }}>
            No encontramos diseños para «{query.trim()}». Prueba con otra palabra o explora todas las colecciones.
          </p>
          <button type="button" onClick={reset} className="mt-6 rounded-full px-6 py-3 font-outfit text-xs font-semibold text-white transition-all hover:-translate-y-0.5" style={{ backgroundColor: '#8B7D5F' }}>
            Ver todo el catálogo
          </button>
        </div>
      )}

      {remaining > 0 && (
        <Reveal className="mt-20 text-center">
          <button
            type="button"
            onClick={() => setVisible(value => value + PAGE_SIZE)}
            className="rounded-full border px-9 py-3.5 font-outfit text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ borderColor: 'rgba(139,125,95,0.5)', color: '#8B7D5F' }}
          >
            Ver {Math.min(remaining, PAGE_SIZE)} diseños más
          </button>
          <p className="mt-3 font-outfit text-[11px]" style={{ color: 'rgba(44,37,25,0.4)' }}>Quedan {remaining} por descubrir</p>
        </Reveal>
      )}
    </div>
  );
}
