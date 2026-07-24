'use client';

import { InvitationParsed, BuilderConfig, InvitationType } from '@/lib/types';
import IconPicker from './IconPicker';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
}

interface SectionDef { key: string; label: string; def: string }

// Secciones con icono editable por plantilla. Las claves deben coincidir con
// las usadas en cada plantilla (custom + sec="...").
const COMMON: SectionDef[] = [
  { key: 'ceremony', label: 'Ceremonia', def: 'church' },
  { key: 'reception', label: 'Recepción / 2ª ceremonia', def: 'cheers' },
  { key: 'dress', label: 'Dress Code', def: 'dress' },
  { key: 'gallery', label: 'Galería', def: 'camera' },
  { key: 'gift', label: 'Regalo', def: 'gift' },
];

const SECTIONS: Record<string, SectionDef[]> = {
  primicia: [
    { key: 'ceremony', label: 'Lugares (pin del mapa)', def: 'church' },
    { key: 'dress', label: 'Código de vestimenta', def: 'dress' },
    { key: 'gift', label: 'Regalo', def: 'gift' },
    { key: 'gallery', label: 'Galería', def: 'camera' },
  ],
  passport: [
    { key: 'ceremony', label: 'Escala (pin del mapa)', def: 'church' },
    { key: 'dress', label: 'Vestimenta', def: 'dress' },
    { key: 'gallery', label: 'Galería', def: 'camera' },
  ],
  azure: [
    { key: 'ceremony', label: 'Ceremonia Religiosa', def: 'church' },
    { key: 'reception', label: 'Recepción Social', def: 'cheers' },
    { key: 'dress', label: 'Dress Code', def: 'dress' },
    { key: 'gallery', label: 'Galería', def: 'camera' },
  ],
  dolcevita: COMMON,
  carmesi_v2: COMMON,
  napoly: COMMON,
  euforia: COMMON,
  rosegold: [...COMMON, { key: 'thanks', label: 'Agradecimiento', def: 'dance' }],
  allegria: [
    { key: 'ceremony', label: 'Ceremonia Civil', def: 'rings' },
    { key: 'reception', label: 'Recepción', def: 'camera' },
    { key: 'dress', label: 'Dress Code', def: 'dress' },
    { key: 'gift', label: 'Regalo', def: 'gift' },
  ],
  provenza: [
    { key: 'couple', label: 'Encabezado (el honor)', def: 'couple' },
    { key: 'ceremony', label: 'Ceremonia Religiosa', def: 'church' },
    { key: 'reception', label: 'Recepción', def: 'cheers' },
    { key: 'dress', label: 'Dress Code', def: 'dress' },
    { key: 'punctual', label: 'Puntualidad', def: 'calendar' },
    { key: 'gift', label: 'Regalo', def: 'gift' },
    { key: 'gallery', label: 'Captura y comparte', def: 'camera' },
    { key: 'thanks', label: 'Cierre', def: 'rings' },
  ],
  paradise: [
    { key: 'ceremony', label: 'Ceremonia Religiosa', def: 'church' },
    { key: 'reception', label: 'Ceremonia Civil', def: 'rings' },
    { key: 'dress', label: 'Vestimenta', def: 'dress' },
    { key: 'gift', label: 'Regalo', def: 'gift' },
    { key: 'gallery', label: 'Galería', def: 'camera' },
  ],
  obsidiana: [
    { key: 'ceremony', label: 'Ceremonia Religiosa', def: 'church' },
    { key: 'reception', label: 'Recepción', def: 'cheers' },
    { key: 'dress', label: 'Vestimenta', def: 'dress' },
    { key: 'gift', label: 'Regalo', def: 'gift' },
    { key: 'gallery', label: 'Galería', def: 'camera' },
  ],
  grazia: [
    { key: 'gallery', label: 'Galería', def: 'camera' },
  ],
};

export default function SectionIconsEditor({ data, onChange }: Props) {
  const sections = SECTIONS[data.template];
  if (!sections) return null;

  const cfg = data.config ?? {};
  const icons = cfg.sectionIcons ?? {};
  const iconColors = cfg.sectionIconColors ?? {};
  const iconSpeeds = cfg.sectionIconSpeeds ?? {};
  const setCfg = (patch: Partial<BuilderConfig>) => onChange({ config: { ...cfg, ...patch } });
  const setIcon = (key: string, value: string, colors?: Record<string, string>, speed?: number) =>
    setCfg({
      sectionIcons: { ...icons, [key]: value },
      sectionIconColors: { ...iconColors, [key]: colors ?? {} },
      sectionIconSpeeds: { ...iconSpeeds, [key]: speed ?? 1 },
    });

  return (
    <div className="space-y-3 pt-3 border-t border-gray-100">
      <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Iconos de secciones</h4>
      <p className="text-xs text-gray-400 font-outfit">
        Elige un icono de la galería o sube el tuyo. En los iconos animados, abre la pestaña
        <span className="font-medium"> Colores</span> para editar cada color por separado y combinarlo con la plantilla.
        Si lo dejas vacío, se usa el icono por defecto del diseño.
      </p>

      {sections.map((s) => (
        <div key={s.key}>
          <label className="block text-xs font-outfit text-gray-500 mb-1">{s.label}</label>
          <IconPicker
            value={icons[s.key]}
            colors={iconColors[s.key]}
            speed={iconSpeeds[s.key]}
            defaultIcon={s.def}
            ownerId={data.id}
            eventType={data.type as InvitationType}
            onChange={(v, c, sp) => setIcon(s.key, v, c, sp)}
          />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-xs font-outfit text-gray-500 mb-1">Color iconos SVG</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cfg.iconColor ?? '#1e3a5f'}
              onChange={(e) => setCfg({ iconColor: e.target.value })}
              className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0"
            />
            {cfg.iconColor && (
              <button type="button" onClick={() => setCfg({ iconColor: undefined })} className="text-xs text-gray-400 hover:text-red-500 font-outfit">
                Automático
              </button>
            )}
          </div>
        </div>
        {data.template === 'azure' && (
          <div>
            <label className="block text-xs font-outfit text-gray-500 mb-1">
              Tamaño ({Math.round((cfg.iconScale ?? 1) * 100)}%)
            </label>
            <input
              type="range" min={0.7} max={1.4} step={0.05}
              value={cfg.iconScale ?? 1}
              onChange={(e) => setCfg({ iconScale: parseFloat(e.target.value) })}
              className="w-full accent-enkarta-gold"
            />
          </div>
        )}
      </div>
      <p className="text-[11px] text-gray-400 font-outfit">
        “Color iconos SVG” afecta a los iconos de línea por defecto. Los iconos animados se editan color por color
        en su pestaña <span className="font-medium">Colores</span>. Un icono propio (PNG/SVG) se muestra tal cual lo subes.
      </p>
    </div>
  );
}
