'use client';

import { useEffect } from 'react';
import { InvitationParsed, BuilderConfig } from '@/lib/types';
import { FONT_CATALOG, DEFAULT_FAMILY, googleFontsUrl, FontRole } from '@/lib/fonts';
import { tokensForTemplate } from '@/lib/template-themes';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
}

const COLOR_PRESETS = [
  { name: 'Dorado Clásico', primary: '#B8975A', secondary: '#FAF7F2', accent: '#2C2519' },
  { name: 'Navy Elegante', primary: '#1B3A6B', secondary: '#F5F7FA', accent: '#0D1F3C' },
  { name: 'Verde Bosque', primary: '#3D6B4F', secondary: '#F4F8F5', accent: '#1C3326' },
  { name: 'Rosa Nude', primary: '#C9847A', secondary: '#FDF6F5', accent: '#5C2E28' },
  { name: 'Negro Obsidiana', primary: '#1A1A1A', secondary: '#F8F8F8', accent: '#333333' },
  { name: 'Borgoña', primary: '#7B2D42', secondary: '#FDF0F3', accent: '#3D0F1C' },
  { name: 'Oliva Tierra', primary: '#7B8C5A', secondary: '#F6F5EE', accent: '#3B4228' },
  { name: 'Azul Serenidad', primary: '#4A7FA5', secondary: '#F0F6FB', accent: '#1C3D54' },
];

// Roles de fuente editables: clave en builder_config, etiqueta y texto de muestra.
const FONT_ROLES: { role: FontRole; key: 'fontScript' | 'fontHeading' | 'fontBody'; label: string; desc: string; preview: string; previewSize: string }[] = [
  { role: 'script',  key: 'fontScript',  label: 'Caligráfica',     desc: 'Nombres de la pareja',          preview: 'Ana & Carlos',        previewSize: '26px' },
  { role: 'heading', key: 'fontHeading', label: 'Títulos',         desc: 'Títulos de sección y fechas',   preview: 'NUESTRA BODA · 2026', previewSize: '15px' },
  { role: 'body',    key: 'fontBody',    label: 'Cuerpo de texto', desc: 'Mensajes y párrafos',           preview: 'Acompáñanos en este día tan especial.', previewSize: '15px' },
];

/** Carga todas las fuentes del catálogo (solo en el admin) para previsualizarlas. */
function useCatalogFonts() {
  useEffect(() => {
    const url = googleFontsUrl([
      ...FONT_CATALOG.script.map(f => f.family),
      ...FONT_CATALOG.heading.map(f => f.family),
      ...FONT_CATALOG.body.map(f => f.family),
    ]);
    if (!url || document.querySelector('link[data-ek-font-catalog]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.setAttribute('data-ek-font-catalog', '1');
    document.head.appendChild(link);
  }, []);
}

export default function StylePanel({ data, onChange }: Props) {
  useCatalogFonts();
  const cfg: BuilderConfig = data.config ?? {};
  const setFont = (key: 'fontScript' | 'fontHeading' | 'fontBody', value: string) =>
    onChange({ config: { ...cfg, [key]: value || undefined } });
  const tokens = cfg.tokens ?? tokensForTemplate(data.template);
  const setTokens = (patch: Partial<NonNullable<BuilderConfig['tokens']>>) =>
    onChange({ config: { ...cfg, tokens: { ...tokens, ...patch } } });

  return (
    <div className="space-y-6 p-4">

      {/* Tipografía */}
      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Tipografía</h4>
        <p className="text-xs text-gray-400 font-outfit mb-3">
          Cambia las fuentes de la invitación. &ldquo;Original&rdquo; mantiene la tipografía
          curada de la plantilla.
        </p>
        <div className="space-y-3">
          {FONT_ROLES.map(({ role, key, label, desc, preview, previewSize }) => {
            const value = (cfg[key] as string | undefined) ?? '';
            const family = value || DEFAULT_FAMILY[role];
            return (
              <div key={key} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-outfit text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400 font-outfit">{desc}</p>
                  </div>
                  <select
                    value={value}
                    onChange={e => setFont(key, e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit max-w-[150px]"
                  >
                    <option value="">Original ({DEFAULT_FAMILY[role]})</option>
                    {FONT_CATALOG[role].filter(f => f.family !== DEFAULT_FAMILY[role]).map(f => (
                      <option key={f.family} value={f.family}>{f.family}</option>
                    ))}
                  </select>
                </div>
                <p className="text-gray-700 leading-snug truncate" style={{ fontFamily: `'${family}'`, fontSize: previewSize }}>
                  {preview}
                </p>
              </div>
            );
          })}
        </div>
        {(cfg.fontScript || cfg.fontHeading || cfg.fontBody) && (
          <button
            type="button"
            onClick={() => onChange({ config: { ...cfg, fontScript: undefined, fontHeading: undefined, fontBody: undefined } })}
            className="mt-2 text-xs text-gray-400 hover:underline font-outfit"
          >
            Restaurar tipografía original
          </button>
        )}
      </div>

      {/* Paletas predefinidas */}
      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Paletas de Color</h4>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_PRESETS.map(preset => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange({
                color_primary: preset.primary,
                color_secondary: preset.secondary,
                color_accent: preset.accent,
              })}
              className={`p-3 rounded-xl border-2 text-left transition-all hover:border-enkarta-gold/50 ${
                data.color_primary === preset.primary
                  ? 'border-enkarta-gold bg-enkarta-gold/5'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              {/* Muestra de colores */}
              <div className="flex gap-1 mb-1.5">
                <div className="w-5 h-5 rounded-full border border-gray-200" style={{ background: preset.primary }} />
                <div className="w-5 h-5 rounded-full border border-gray-200" style={{ background: preset.secondary }} />
                <div className="w-5 h-5 rounded-full border border-gray-200" style={{ background: preset.accent }} />
              </div>
              <p className="text-xs font-outfit text-gray-600 leading-tight">{preset.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Colores personalizados */}
      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Colores Personalizados</h4>
        <div className="space-y-3">
          {[
            { key: 'color_primary', label: 'Color Principal', desc: 'Títulos, botones, acentos' },
            { key: 'color_secondary', label: 'Color de Fondo', desc: 'Fondo general de la invitación' },
            { key: 'color_accent', label: 'Color de Texto', desc: 'Texto general y detalles' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={data[key as keyof InvitationParsed] as string}
                onChange={e => onChange({ [key]: e.target.value } as Partial<InvitationParsed>)}
                className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
              />
              <div>
                <p className="text-sm font-outfit text-gray-700">{label}</p>
                <p className="text-xs text-gray-400 font-outfit">{desc}</p>
              </div>
              <p className="ml-auto text-xs font-mono text-gray-500">
                {data[key as keyof InvitationParsed] as string}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Ritmo Visual del Modelo</h4>
        <p className="text-xs text-gray-400 font-outfit mb-3">
          Estos tokens ayudan a que la invitación conserve el carácter del modelo aunque muevas bloques o cambies colores.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-outfit text-gray-500 mb-1">Espaciado</label>
              <select className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit" value={tokens.spacing ?? 'normal'} onChange={e => setTokens({ spacing: e.target.value as typeof tokens.spacing })}>
                <option value="compact">Compacto</option>
                <option value="normal">Balanceado</option>
                <option value="airy">Amplio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-outfit text-gray-500 mb-1">Superficie</label>
              <select className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit" value={tokens.surface ?? 'flat'} onChange={e => setTokens({ surface: e.target.value as typeof tokens.surface })}>
                <option value="flat">Plana</option>
                <option value="soft">Suave</option>
                <option value="card">Tarjeta</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-outfit text-gray-500 mb-1">Ancho del contenido ({tokens.contentWidth ?? 680}px)</label>
              <input type="range" min={560} max={820} step={10} value={tokens.contentWidth ?? 680} onChange={e => setTokens({ contentWidth: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
            </div>
            <div>
              <label className="block text-xs font-outfit text-gray-500 mb-1">Radio de sección ({tokens.sectionRadius ?? 0}px)</label>
              <input type="range" min={0} max={36} step={2} value={tokens.sectionRadius ?? 0} onChange={e => setTokens({ sectionRadius: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-outfit text-gray-500 mb-1">Aire lateral ({tokens.sectionInset ?? 24}px)</label>
            <input type="range" min={12} max={40} step={2} value={tokens.sectionInset ?? 24} onChange={e => setTokens({ sectionInset: parseInt(e.target.value) })} className="w-full accent-enkarta-gold" />
          </div>
          <button
            type="button"
            onClick={() => onChange({ config: { ...cfg, tokens: tokensForTemplate(data.template) } })}
            className="text-xs text-gray-400 hover:underline font-outfit"
          >
            Restaurar tokens del modelo
          </button>
        </div>
      </div>

      {/* Nota: dónde se aplica cada cosa */}
      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-xs text-amber-700 font-outfit">
          ℹ️ Estos 3 colores aplican a las plantillas clásicas y al sobre de entrada.
          Para recolorear una plantilla premium usa la pestaña <strong>Decoración</strong>,
          que controla su paleta completa.
        </p>
      </div>

    </div>
  );
}
