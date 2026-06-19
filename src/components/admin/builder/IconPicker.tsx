'use client';

import { useEffect, useState } from 'react';
import IconLibrary from '@/components/admin/IconLibrary';
import ImageUploader from './ImageUploader';
import { EventIcon } from '@/components/invitations/shared';
import { loadLottieByPath, extractColors, type LottieIconMeta } from '@/lib/lottie-utils';
import type { InvitationType } from '@/lib/types';

interface Props {
  /** Valor actual (nombre SVG, ruta Lottie o URL de imagen). Vacío = usa el default. */
  value?: string;
  /** Colores editados para el icono Lottie actual: { '#origen': '#nuevo' } */
  colors?: Record<string, string>;
  /** Velocidad del icono Lottie actual (1 = normal). */
  speed?: number;
  /** Icono por defecto del diseño (se muestra cuando value está vacío). */
  defaultIcon: string;
  onChange: (value: string, colors?: Record<string, string>, speed?: number) => void;
  ownerId?: string;
  eventType?: InvitationType;
}

const tabCls = (active: boolean) =>
  `px-3 py-1.5 rounded-lg text-xs font-outfit transition-colors ${
    active ? 'bg-enkarta-gold text-white' : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'
  }`;

const isLottie = (s?: string) => !!s && (s.startsWith('/lottie/') || s.endsWith('.json'));

/**
 * Selector de icono: elegir de la galería, subir uno propio, y —para iconos
 * animados (Lottie)— editar individualmente cada color que contiene.
 */
export default function IconPicker({ value, colors, speed, defaultIcon, onChange, ownerId, eventType }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'lib' | 'upload' | 'colors'>('lib');
  const [palette, setPalette] = useState<string[]>([]);
  const current = value || defaultIcon;

  // Detecta los colores del icono Lottie actual para poder editarlos uno a uno.
  useEffect(() => {
    let cancelled = false;
    if (!isLottie(current)) { setPalette([]); return; }
    loadLottieByPath(current).then((json) => {
      if (cancelled) return;
      try { setPalette(extractColors(json)); } catch { setPalette([]); }
    });
    return () => { cancelled = true; };
  }, [current]);

  const setColor = (orig: string, next: string) => {
    onChange(current, { ...(colors ?? {}), [orig]: next }, speed);
  };
  const toggleTransparent = (orig: string) => {
    const c = { ...(colors ?? {}) };
    if (c[orig] === 'transparent') delete c[orig];
    else c[orig] = 'transparent';
    onChange(current, c, speed);
  };
  const resetColor = (orig: string) => {
    const c = { ...(colors ?? {}) };
    delete c[orig];
    onChange(current, c, speed);
  };
  const setSpeed = (next: number) => onChange(current, colors, next);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            open ? 'border-enkarta-gold bg-enkarta-gold/10' : 'border-gray-200 bg-gray-50 hover:border-enkarta-gold/40'
          }`}
          title="Cambiar icono"
        >
          <EventIcon name={current} className="w-7 h-7" stroke="#1e3a5f" lottieColors={colors} speed={speed} />
        </button>
        <span className="flex-1 text-xs text-gray-500 font-outfit truncate">
          {value ? (value.startsWith('http') ? 'Icono propio' : isLottie(value) ? 'Animado' : 'Personalizado') : 'Por defecto'}
        </span>
        {(value || (colors && Object.keys(colors).length > 0)) && (
          <button type="button" onClick={() => onChange('', undefined, undefined)} className="text-xs text-gray-400 hover:text-red-500 font-outfit">
            Restaurar
          </button>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-enkarta-gold hover:underline font-outfit">
          {open ? 'Cerrar' : 'Cambiar'}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="flex gap-1.5 p-2">
            <button type="button" onClick={() => setTab('lib')} className={tabCls(tab === 'lib')}>Galería</button>
            <button type="button" onClick={() => setTab('upload')} className={tabCls(tab === 'upload')}>Subir el mío</button>
            {palette.length > 0 && (
              <button type="button" onClick={() => setTab('colors')} className={tabCls(tab === 'colors')}>
                Colores ({palette.length})
              </button>
            )}
          </div>

          {isLottie(current) && (
            <div className="flex items-center gap-2 px-3 pb-2">
              <span className="text-xs text-gray-500 font-outfit w-28 flex-shrink-0">Velocidad {(speed ?? 1).toFixed(2)}x</span>
              <input
                type="range" min={0.25} max={2.5} step={0.25}
                value={speed ?? 1}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="flex-1 accent-enkarta-gold"
              />
              {speed !== undefined && (
                <button type="button" onClick={() => onChange(current, colors, undefined)} className="text-[11px] text-gray-400 hover:text-gray-600 font-outfit">
                  1x
                </button>
              )}
            </div>
          )}

          <div className="p-3 pt-0 max-h-72 overflow-y-auto">
            {tab === 'lib' && (
              <IconLibrary
                eventType={eventType}
                onSelect={(icon: LottieIconMeta) => { onChange(icon.path, undefined, undefined); setTab('colors'); }}
                selectedId={value?.split('/').pop()?.replace('.json', '')}
              />
            )}

            {tab === 'upload' && (
              <ImageUploader
                kind="image"
                folder="icons"
                ownerId={ownerId}
                aspect="square"
                allowUrl
                value={value?.startsWith('http') ? value : ''}
                onChange={(url) => { if (url) { onChange(url, undefined, undefined); setOpen(false); } }}
                hint="Sube un PNG o SVG (idealmente con fondo transparente y en el color de la invitación)."
              />
            )}

            {tab === 'colors' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-outfit">
                  Edita cada color del icono para combinarlo con la plantilla. Usa
                  <span className="font-medium"> Transparente</span> para que esa parte deje ver el fondo.
                </p>
                {palette.map((orig) => {
                  const cur = colors?.[orig];
                  const transparent = cur === 'transparent';
                  const shown = transparent ? orig : (cur || orig);
                  return (
                    <div key={orig} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2 py-1.5">
                      {transparent ? (
                        <span
                          className="w-9 h-9 rounded border border-gray-200 flex-shrink-0"
                          title="Transparente"
                          style={{ background: 'repeating-conic-gradient(#cbd5e1 0% 25%, #fff 0% 50%) 50% / 10px 10px' }}
                        />
                      ) : (
                        <input
                          type="color"
                          value={shown}
                          onChange={(e) => setColor(orig, e.target.value)}
                          className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0 flex-shrink-0"
                        />
                      )}
                      <span className="flex-1 text-xs font-mono text-gray-500 truncate">
                        {orig} → {transparent ? 'transparente' : shown}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleTransparent(orig)}
                        className={`text-[11px] font-outfit px-1.5 py-0.5 rounded transition-colors ${transparent ? 'bg-enkarta-gold/15 text-enkarta-gold' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Transparente
                      </button>
                      {cur && (
                        <button type="button" onClick={() => resetColor(orig)} className="text-[11px] text-gray-400 hover:text-red-500 font-outfit">
                          Original
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
