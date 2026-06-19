'use client';

import { useState, useEffect } from 'react';
import IconLibrary from '@/components/admin/IconLibrary';
import { LottieIconMeta, loadLottieByPath, extractColors } from '@/lib/lottie-utils';
import LottieIcon from '@/components/ui/LottieIcon';

export default function AdminIconsPage() {
  const [selected, setSelected] = useState<LottieIconMeta | null>(null);

  // Colores reales extraídos del JSON seleccionado
  const [iconColors, setIconColors] = useState<string[]>([]);

  // Mapa de reemplazos: { colorOriginal: colorNuevo }
  const [colorMap, setColorMap] = useState<Record<string, string>>({});

  // Cuando se selecciona un ícono, extraer sus colores reales
  useEffect(() => {
    if (!selected) { setIconColors([]); setColorMap({}); return; }

    loadLottieByPath(selected.path).then(json => {
      if (!json) return;
      const colors = extractColors(json);
      setIconColors(colors);
      // Inicializar el mapa con cada color apuntando a sí mismo
      const initial: Record<string, string> = {};
      colors.forEach(c => { initial[c] = c; });
      setColorMap(initial);
    });
  }, [selected]);

  const handleColorChange = (original: string, newColor: string) => {
    setColorMap(prev => ({ ...prev, [original]: newColor }));
  };

  // Solo pasar al ícono los colores que cambiaron
  const activeColorMap = Object.fromEntries(
    Object.entries(colorMap).filter(([orig, dest]) => orig !== dest)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <h1 className="font-playfair text-xl text-enkarta-dark">Librería de Íconos</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Izquierda: librería */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-outfit font-semibold text-gray-900 mb-4">Íconos disponibles</h2>
            <IconLibrary
              previewColors={activeColorMap}
              onSelect={setSelected}
              selectedId={selected?.id}
            />
          </div>

          {/* Derecha: preview + colores */}
          <div className="space-y-4">

            {selected ? (
              <>
                {/* Vista previa */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-outfit font-semibold text-gray-900 mb-4">
                    Vista previa: <span className="text-enkarta-gold">{selected.label}</span>
                  </h3>
                  <div className="flex gap-6 items-center justify-center py-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 font-outfit mb-2">Original</p>
                      <LottieIcon icon={selected.path} size={90} loop autoplay lazy={false} />
                    </div>
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 font-outfit mb-2">Con colores</p>
                      <LottieIcon icon={selected.path} size={90} colors={activeColorMap} loop autoplay lazy={false} />
                    </div>
                  </div>
                </div>

                {/* Colores reales del ícono */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-outfit font-semibold text-gray-900 mb-1">🎨 Colores del ícono</h3>
                  <p className="text-xs text-gray-400 font-outfit mb-4">
                    Estos son los colores exactos que tiene el archivo JSON. Cámbia cada uno al color que quieras.
                  </p>

                  {iconColors.length === 0 ? (
                    <p className="text-sm text-gray-400 font-outfit">Cargando colores...</p>
                  ) : (
                    <div className="space-y-3">
                      {iconColors.map(orig => (
                        <div key={orig} className="flex items-center gap-3">
                          {/* Color original (solo lectura, muestra el valor real) */}
                          <div
                            className="w-10 h-10 rounded-xl border-2 border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: orig }}
                            title={orig}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-outfit">Color original</p>
                            <p className="text-xs font-mono text-gray-700">{orig}</p>
                          </div>

                          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>

                          {/* Color destino (editable) */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <input
                              type="color"
                              value={colorMap[orig] ?? orig}
                              onChange={e => handleColorChange(orig, e.target.value)}
                              className="w-10 h-10 rounded-xl border-2 border-gray-200 cursor-pointer p-0.5"
                              title="Cambiar a este color"
                            />
                            <div>
                              <p className="text-xs text-gray-500 font-outfit">Nuevo</p>
                              <p className="text-xs font-mono text-gray-700">{colorMap[orig] ?? orig}</p>
                            </div>
                          </div>

                          {/* Botón reset */}
                          {colorMap[orig] !== orig && (
                            <button
                              onClick={() => handleColorChange(orig, orig)}
                              className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                              title="Resetear"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Botón resetear todo */}
                  {Object.entries(colorMap).some(([o, d]) => o !== d) && (
                    <button
                      onClick={() => {
                        const reset: Record<string, string> = {};
                        iconColors.forEach(c => { reset[c] = c; });
                        setColorMap(reset);
                      }}
                      className="mt-4 text-xs text-gray-400 hover:text-red-400 font-outfit transition-colors"
                    >
                      Resetear todos los colores
                    </button>
                  )}
                </div>

                {/* Info del archivo */}
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 font-outfit mb-1">Ruta del archivo:</p>
                  <code className="text-xs text-gray-700 break-all">{selected.path}</code>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🎭</span>
                </div>
                <p className="text-sm text-gray-500 font-outfit">
                  Selecciona un ícono para ver su vista previa y editar sus colores
                </p>
              </div>
            )}

            {/* Instrucciones */}
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
              <h4 className="font-outfit font-semibold text-amber-800 text-sm mb-2">📁 Cómo agregar íconos</h4>
              <ol className="text-xs text-amber-700 font-outfit space-y-1 list-decimal list-inside">
                <li>Descarga el ícono de LottieFiles en formato <strong>JSON</strong></li>
                <li>Cópialo a <code className="bg-amber-100 px-1 rounded">public/lottie/boda/</code> (o la carpeta del evento)</li>
                <li>Recarga esta página — aparece automáticamente</li>
              </ol>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
