'use client';

import { InvitationParsed, TemplateTheme, TemplateDecor } from '@/lib/types';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
}

const PREMIUM = ['azure', 'primicia', 'passport', 'paradise', 'obsidiana', 'dolcevita', 'grazia', 'carmesi_v2', 'napoly', 'euforia', 'rosegold', 'allegria', 'provenza'];

// Colores por defecto de cada plantilla, para que los selectores arranquen en el valor real.
const THEME_DEFAULTS: Record<string, Required<Pick<TemplateTheme, 'primary' | 'primaryDeep' | 'text' | 'muted' | 'line' | 'bg'>>> = {
  azure:    { primary: '#1e3a5f', primaryDeep: '#16304f', text: '#274a73', muted: '#6982a3', line: '#1e3a5f', bg: '#fbfdff' },
  primicia: { primary: '#161616', primaryDeep: '#000000', text: '#1a1a1a', muted: '#555555', line: '#161616', bg: '#f4f1ea' },
  passport: { primary: '#6e795b', primaryDeep: '#3b4a2e', text: '#3a3a2e', muted: '#7a7a68', line: '#6e795b', bg: '#f3efe2' },
  paradise: { primary: '#5f6b47', primaryDeep: '#3c4a2a', text: '#3c4a2a', muted: '#5f6b47', line: '#c7b181', bg: '#eceedd' },
  obsidiana: { primary: '#c6a86a', primaryDeep: '#3a3d28', text: '#ece6d6', muted: '#decb96', line: '#c6a86a', bg: '#100f0c' },
  dolcevita: { primary: '#4f7a52', primaryDeep: '#33563a', text: '#3b3b35', muted: '#4f7a52', line: '#c2a368', bg: '#fbfaf3' },
  grazia:    { primary: '#bca478', primaryDeep: '#1b1b18', text: '#2c2c27', muted: '#b6985f', line: '#b6985f', bg: '#fdfcf8' },
  carmesi_v2:{ primary: '#871a2f', primaryDeep: '#6d1424', text: '#4a3733', muted: '#b3924f', line: '#b3924f', bg: '#f6efe3' },
  napoly:    { primary: '#b98a86', primaryDeep: '#6f6052', text: '#5a4d44', muted: '#b59a6a', line: '#b59a6a', bg: '#fbf8f3' },
  euforia:   { primary: '#8a7257', primaryDeep: '#6b563f', text: '#5d5040', muted: '#b89a6a', line: '#b89a6a', bg: '#f7f1e5' },
  rosegold:  { primary: '#b97f86', primaryDeep: '#f8ddcf', text: '#7a6157', muted: '#c2a06a', line: '#b97f86', bg: '#fdf6f1' },
  allegria:  { primary: '#8c9a86', primaryDeep: '#6f7d69', text: '#3a3a34', muted: '#7a7a72', line: '#d3d3cb', bg: '#fbfbf8' },
  provenza:  { primary: '#68693f', primaryDeep: '#7a7c57', text: '#544e39', muted: '#8a8267', line: '#c3b391', bg: '#fbf6ee' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-5 first:border-0 first:pt-0">
      <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h4>
      {children}
    </div>
  );
}

function ColorRow({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || fallback}
        onChange={e => onChange(e.target.value)}
        className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
      />
      <span className="text-sm font-outfit text-gray-700 flex-1">{label}</span>
      <span className="text-xs font-mono text-gray-400">{value || fallback}</span>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-all cursor-pointer relative flex-shrink-0 ${on ? 'bg-enkarta-gold' : 'bg-gray-300'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {options.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-outfit transition-all ${value === o.v ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function DecorPanel({ data, onChange }: Props) {
  const cfg = data.config ?? {};
  const theme = cfg.theme ?? {};
  const decor = cfg.decor ?? {};
  const def = THEME_DEFAULTS[data.template] ?? THEME_DEFAULTS.azure;

  const setTheme = (patch: Partial<TemplateTheme>) => onChange({ config: { ...cfg, theme: { ...theme, ...patch } } });
  const setDecor = (patch: Partial<TemplateDecor>) => onChange({ config: { ...cfg, decor: { ...decor, ...patch } } });
  const setFloating = (patch: Partial<NonNullable<TemplateDecor['floating']>>) => setDecor({ floating: { ...(decor.floating ?? {}), ...patch } });
  const setCorners = (patch: Partial<NonNullable<TemplateDecor['corners']>>) => setDecor({ corners: { ...(decor.corners ?? {}), ...patch } });
  const setTrail = (patch: Partial<NonNullable<TemplateDecor['cursorTrail']>>) => setDecor({ cursorTrail: { ...(decor.cursorTrail ?? {}), ...patch } });
  const nightTheme = cfg.nightTheme;
  const setNight = (patch: Partial<TemplateTheme>) => onChange({ config: { ...cfg, nightTheme: { ...(nightTheme ?? {}), ...patch } } });

  if (!PREMIUM.includes(data.template)) {
    return (
      <div className="p-4">
        <div className="p-4 bg-gray-50 rounded-xl text-center">
          <p className="text-sm font-outfit text-gray-500">
            La decoración avanzada está disponible para las plantillas premium.
          </p>
        </div>
      </div>
    );
  }

  // En invitaciones por bloques, las decoraciones de página las renderiza
  // BlockRenderer (orquídeas/hojas/plumas) y van apagadas por defecto. En la
  // plantilla Azure legacy van encendidas por defecto.
  const hasLayout = !!cfg.layout?.blocks?.length;
  const floatingOn = decor.floating?.on ?? !hasLayout;
  const cornersOn = decor.corners?.on ?? !hasLayout;
  // Controles de decoración disponibles para Azure legacy y para cualquier
  // invitación por bloques (las pinta BlockRenderer vía PageDecor).
  const hasDecor = data.template === 'azure' || hasLayout;

  return (
    <div className="space-y-6 p-4">

      {!hasDecor && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-600 font-outfit">
            💡 En esta plantilla, la paleta recolorea todos sus elementos de diseño. Las plumas/adornos
            de esquina son exclusivos de Azure.
          </p>
        </div>
      )}

      {/* Paleta */}
      <Section title="🎨 Paleta de la plantilla">
        <div className="space-y-2.5">
          <ColorRow label="Color principal"      value={theme.primary}     fallback={def.primary}     onChange={v => setTheme({ primary: v })} />
          <ColorRow label="Principal oscuro"      value={theme.primaryDeep} fallback={def.primaryDeep} onChange={v => setTheme({ primaryDeep: v })} />
          <ColorRow label="Texto"                 value={theme.text}        fallback={def.text}        onChange={v => setTheme({ text: v })} />
          <ColorRow label="Texto suave"           value={theme.muted}       fallback={def.muted}       onChange={v => setTheme({ muted: v })} />
          <ColorRow label="Fondo"                 value={theme.bg}          fallback={def.bg}          onChange={v => setTheme({ bg: v })} />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setTheme({ primary: data.color_primary, primaryDeep: data.color_accent, text: data.color_accent, bg: data.color_secondary })}
            className="text-xs text-enkarta-gold hover:underline font-outfit"
          >
            Usar mis 3 colores de marca
          </button>
          <span className="text-gray-300">·</span>
          <button
            type="button"
            onClick={() => onChange({ config: { ...cfg, theme: {} } })}
            className="text-xs text-gray-400 hover:underline font-outfit"
          >
            Restaurar diseño original
          </button>
        </div>
      </Section>

      {hasDecor && (<>
      {/* Fondo */}
      <Section title={hasLayout ? 'Fondo de hojas de acuarela' : 'Fondo'}>
        <Segmented
          value={decor.background ?? (hasLayout ? 'solid' : 'art')}
          onChange={v => setDecor({ background: v })}
          options={[{ v: 'art', label: 'Hojas' }, { v: 'gradient', label: 'Degradado' }, { v: 'solid', label: 'Liso' }]}
        />
      </Section>

      {/* Partículas flotantes */}
      <Section title="Partículas flotantes (plumas)">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-outfit text-gray-700">Mostrar partículas</span>
          <Toggle on={floatingOn} onToggle={() => setFloating({ on: !floatingOn })} />
        </label>
        {floatingOn && (
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs font-outfit text-gray-500 mb-1">Forma</div>
              <select
                value={decor.floating?.shape ?? 'feather'}
                onChange={e => setFloating({ shape: e.target.value as NonNullable<TemplateDecor['floating']>['shape'] })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
              >
                {[['feather', '🪶 Pluma'], ['petal', '🌷 Pétalo'], ['blossom', '🌸 Flor'], ['heart', '🤍 Corazón'], ['star', '⭐ Estrella'], ['leaf', '🍃 Hoja'], ['sparkle', '✨ Destello'], ['circle', '⚪ Círculo'], ['ring', '💍 Anillo'], ['butterfly', '🦋 Mariposa'], ['snow', '❄️ Nieve'], ['confetti', '🎉 Confeti'], ['maple', '🍁 Hoja otoño'], ['diamond', '🔷 Diamante'], ['note', '🎵 Nota'], ['bird', '🕊️ Pájaro']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <ColorRow label="Color"        value={decor.floating?.color} fallback="#3a5a82" onChange={v => setFloating({ color: v })} />
            <ColorRow label="Color punta"  value={decor.floating?.tip}   fallback="#9aa9d6" onChange={v => setFloating({ tip: v })} />
            <div>
              <div className="flex justify-between text-xs font-outfit text-gray-500 mb-1">
                <span>Cantidad</span><span>{decor.floating?.count ?? 6}</span>
              </div>
              <input
                type="range" min={0} max={14} step={1}
                value={decor.floating?.count ?? 6}
                onChange={e => setFloating({ count: parseInt(e.target.value) })}
                className="w-full accent-enkarta-gold"
              />
            </div>
          </div>
        )}
      </Section>

      {/* Adornos de esquina */}
      <Section title="Adornos de esquina (plantas)">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-outfit text-gray-700">Mostrar adornos</span>
          <Toggle on={cornersOn} onToggle={() => setCorners({ on: !cornersOn })} />
        </label>
        {cornersOn && (
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs font-outfit text-gray-500 mb-1">Diseño</div>
              <select
                value={decor.corners?.style ?? 'orchid'}
                onChange={e => setCorners({ style: e.target.value as NonNullable<TemplateDecor['corners']>['style'] })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
              >
                {[['orchid', '🌸 Orquídeas'], ['rose', '🌹 Rosas'], ['leaves', '🍃 Hojas'], ['pampas', '🌾 Pampa'], ['palm', '🌴 Palmera'], ['geometric', '◆ Geométrico'], ['laurel', '🌿 Laurel'], ['vine', '🌱 Enredadera'], ['berries', '🫐 Bayas'], ['fan', '✦ Abanico déco']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <ColorRow label="Color" value={decor.corners?.color} fallback={theme.primary || def.primary} onChange={v => setCorners({ color: v })} />
            <div>
              <div className="flex justify-between text-xs font-outfit text-gray-500 mb-1">
                <span>Opacidad</span><span>{Math.round((decor.corners?.opacity ?? 1) * 100)}%</span>
              </div>
              <input
                type="range" min={10} max={100} step={5}
                value={Math.round((decor.corners?.opacity ?? 1) * 100)}
                onChange={e => setCorners({ opacity: parseInt(e.target.value) / 100 })}
                className="w-full accent-enkarta-gold"
              />
            </div>
          </div>
        )}
      </Section>

      {/* Textura de papel */}
      <Section title="Textura de papel">
        <Segmented
          value={decor.texture ?? 'none'}
          onChange={v => setDecor({ texture: v })}
          options={[{ v: 'none', label: 'Ninguna' }, { v: 'linen', label: 'Lino' }, { v: 'paper', label: 'Papel' }, { v: 'marble', label: 'Mármol' }, { v: 'parchment', label: 'Pergamino' }]}
        />
        <p className="mt-2 text-[11px] text-gray-400 font-outfit">Una textura muy sutil sobre el fondo para dar sensación de papel real.</p>
      </Section>

      {/* Modo noche (paleta alternativa oscura) */}
      <Section title="🌙 Variante día / noche">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-outfit text-gray-700">Activar modo noche</span>
          <Toggle on={!!nightTheme} onToggle={() => onChange({ config: { ...cfg, nightTheme: nightTheme ? undefined : { bg: '#14110d', text: '#ece6d6', primary: theme.primary || def.primary, primaryDeep: '#0d0b08', muted: '#b8a988', line: 'rgba(236,230,214,0.18)', onPrimary: '#14110d' } } })} />
        </label>
        {nightTheme && (
          <div className="mt-3 space-y-2.5">
            <p className="text-[11px] text-gray-400 font-outfit">Aparece un botón sol/luna en la invitación para que el invitado cambie entre claro y oscuro.</p>
            <ColorRow label="Fondo (noche)"      value={nightTheme.bg}          fallback="#14110d" onChange={v => setNight({ bg: v })} />
            <ColorRow label="Texto (noche)"       value={nightTheme.text}        fallback="#ece6d6" onChange={v => setNight({ text: v })} />
            <ColorRow label="Principal (noche)"   value={nightTheme.primary}     fallback={theme.primary || def.primary} onChange={v => setNight({ primary: v })} />
            <ColorRow label="Texto suave (noche)" value={nightTheme.muted}       fallback="#b8a988" onChange={v => setNight({ muted: v })} />
            <label className="flex items-center justify-between cursor-pointer pt-1">
              <span className="text-sm font-outfit text-gray-700">Arrancar en modo noche</span>
              <Toggle on={cfg.nightDefault === true} onToggle={() => onChange({ config: { ...cfg, nightDefault: !(cfg.nightDefault === true) } })} />
            </label>
          </div>
        )}
      </Section>

      {/* Estela de cursor (escritorio) */}
      <Section title="Estela de cursor (escritorio)">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-outfit text-gray-700">Seguir el cursor con destellos</span>
          <Toggle on={decor.cursorTrail?.on === true} onToggle={() => setTrail({ on: !(decor.cursorTrail?.on === true) })} />
        </label>
        {decor.cursorTrail?.on === true && (
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs font-outfit text-gray-500 mb-1">Forma</div>
              <select
                value={decor.cursorTrail?.shape ?? 'sparkle'}
                onChange={e => setTrail({ shape: e.target.value as NonNullable<TemplateDecor['cursorTrail']>['shape'] })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
              >
                {[['sparkle', '✨ Destello'], ['petal', '🌸 Pétalo'], ['heart', '🤍 Corazón']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <ColorRow label="Color" value={decor.cursorTrail?.color} fallback={theme.primary || def.primary} onChange={v => setTrail({ color: v })} />
            <p className="text-[11px] text-gray-400 font-outfit">Solo se ve en computadora (con mouse). En móvil no aparece, y se desactiva si el invitado pidió menos animación.</p>
          </div>
        )}
      </Section>

      {/* Separadores y loader: solo para la plantilla Azure legacy (en bloques los
          separadores son por bloque y no hay loader). */}
      {!hasLayout && (<>
      <Section title="Separadores de sección">
        <Segmented
          value={decor.dividers ?? 'art'}
          onChange={v => setDecor({ dividers: v })}
          options={[{ v: 'art', label: 'Ilustrado' }, { v: 'line', label: 'Línea' }, { v: 'none', label: 'Ninguno' }]}
        />
      </Section>

      <Section title="Animación de entrada">
        <Segmented
          value={decor.loader ?? 'heart'}
          onChange={v => setDecor({ loader: v })}
          options={[{ v: 'heart', label: 'Corazón' }, { v: 'none', label: 'Ninguna' }]}
        />
      </Section>
      </>)}
      </>)}

    </div>
  );
}
