'use client';
import {isCleanDesign} from '@/lib/clean-designs';
import { MA_ICONS } from '@/lib/maria-mario';
import { NF_ICONS } from '@/lib/nicole-francisco';
import { RY_ICONS } from '@/lib/roly-y-yeliana';


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
  const isAnnie = data.config.designKey === 'annie-y-micky';
  const sections = ['jardin-de-seda','casa-limone','promesa','aurelia','velada'].includes(data.config.designKey??'') ? [...COMMON,...(['promesa','aurelia','velada'].includes(data.config.designKey??'')?[{key:'union',label:'Pareja de apertura',def:MA_ICONS.couple}]:[]),{key:'heart',label:'Tres corazones originales',def:'/lottie/boda/annie-corazones-original.json'}] : (data.config.designKey === 'maria-angelica-y-mario' || isCleanDesign(data.config.designKey)) ? [{key:'passes',label:'Pases',def:MA_ICONS.passes},{key:'table',label:'Mesa',def:MA_ICONS.table},{key:'union',label:'Unión',def:MA_ICONS.couple},{key:'ceremony',label:'Ceremonia',def:MA_ICONS.civil},{key:'dress',label:'Vestimenta',def:MA_ICONS.dress},{key:'gift',label:'Regalo',def:MA_ICONS.gift},{key:'envelopes',label:'Sobres',def:MA_ICONS.envelopes},{key:'gallery',label:'Fotografías',def:MA_ICONS.photo},{key:'playlist',label:'Playlist',def:MA_ICONS.party},{key:'hotel',label:'Hotel',def:MA_ICONS.hotel},{key:'music',label:'Música',def:MA_ICONS.music}] : data.config.designKey === 'karla-y-mauricio' ? [{key:'gallery',label:'Fotografías',def:'camera'},{key:'heart',label:'Corazones originales',def:'/lottie/boda/annie-corazones-original.json'},{key:'ceremony',label:'Ceremonia',def:'/invitations/karla-y-mauricio/Recurso-2iconos.svg'},{key:'reception',label:'Recepción',def:'/invitations/karla-y-mauricio/Recurso-1iconos.svg'},{key:'dress',label:'Vestimenta',def:'/invitations/roly-y-yeliana/Recurso-1vestimenta-dress.svg'}] : data.config.designKey === 'paula-y-juan-felipe' ? [{key:'passes',label:'Pases',def:RY_ICONS.reception},{key:'table',label:'Mesa',def:'https://invitali.com/wp-content/uploads/2025/05/mesa4.json'},{key:'ceremony',label:'Ceremonia',def:RY_ICONS.church},{key:'reception',label:'Recepción',def:RY_ICONS.reception},{key:'heart',label:'Corazones originales',def:'/lottie/boda/annie-corazones-original.json'},{key:'punctuality',label:'Puntualidad',def:'https://invitali.com/wp-content/uploads/2026/04/tiempo.json'},{key:'gift',label:'Regalo',def:RY_ICONS.gift},{key:'envelopes',label:'Lluvia de sobres',def:'https://invitali.com/wp-content/uploads/2025/05/33-lluvia-de-sobres.json'},{key:'noKids',label:'Solo adultos',def:RY_ICONS.noKids},{key:'transport',label:'Transporte',def:'https://invitali.com/wp-content/uploads/2025/05/autobus.json'},{key:'rsvp',label:'Confirmación',def:RY_ICONS.couple},{key:'verse',label:'Cita final',def:RY_ICONS.couple},{key:'music',label:'Música',def:'https://invitali.com/wp-content/uploads/2025/03/Animation-1741383787701.json'}] : data.config.designKey === 'mariana-y-jesus' ? [{key:'ceremony',label:'Ceremonia',def:RY_ICONS.church},{key:'reception',label:'Recepción',def:RY_ICONS.reception},{key:'heart',label:'Corazones originales',def:'/lottie/boda/annie-corazones-original.json'},{key:'celebrate',label:'Pareja',def:RY_ICONS.couple},{key:'gift',label:'Regalo',def:RY_ICONS.gift},{key:'noKids',label:'Solo adultos',def:RY_ICONS.noKids},{key:'music',label:'Música',def:'https://invitali.com/wp-content/uploads/2025/03/Animation-1741383787701.json'}] : (data.config.designKey === 'nicole-y-francisco' || data.config.designKey === 'manuel-y-maya') ? [{key:'music',label:'Botón de música',def:'https://invitali.com/wp-content/uploads/2025/03/Animation-1741383787701.json'},{key:'ceremony',label:'Ceremonia',def:NF_ICONS.church},{key:'reception',label:'Recepción',def:NF_ICONS.civil},{key:'jacket',label:'Traje',def:NF_ICONS.jacket},{key:'dress',label:'Vestido',def:NF_ICONS.dress},{key:'punctuality',label:'Puntualidad',def:NF_ICONS.couple},{key:'gift',label:'Regalos',def:NF_ICONS.gift},{key:'gallery',label:'Fotografía',def:NF_ICONS.photo},{key:'noKids',label:'Solo adultos',def:NF_ICONS.noKids},{key:'closing',label:'Cierre',def:NF_ICONS.couple}] : data.config.designKey === 'roly-y-yeliana' ? [{key:'ceremony',label:'Ceremonia civil',def:RY_ICONS.civil},{key:'reception',label:'Ceremonia religiosa',def:RY_ICONS.church},{key:'gift',label:'Regalo',def:RY_ICONS.gift},{key:'gallery',label:'Fotografías',def:RY_ICONS.photo},{key:'noKids',label:'Solo adultos',def:RY_ICONS.noKids},{key:'closing',label:'Cierre',def:RY_ICONS.couple}] : (data.config.designKey === 'laura-y-andres' || data.config.designKey === 'annie-y-micky') ? [...COMMON.map(section => isAnnie && section.key === 'gallery' ? {...section,def:'/lottie/boda/annie-fotografia.json'} : section),
    ...(isAnnie ? [{key:'punctuality',label:'Corazones del itinerario',def:'/lottie/boda/annie-corazones-original.json'}] : []),
    {key:'quote',label:'Cita de apertura',def:'marriage'},
    {key:'date',label:'Fecha del evento',def:'fecha-de-boda'},
    {key:'hearts',label:isAnnie?'Tres corazones de apertura':'Corazones animados',def:isAnnie?'/lottie/boda/annie-corazones-original.json':'/lottie/boda/laura-corazones.json'},
    {key:'dressMen',label:'Vestimenta de ellos',def:'smoking'},
    {key:'giftEnvelope',label:'Lluvia de sobres',def:'/lottie/boda/laura-lluvia-de-sobres.json'},
    {key:'noKids',label:'Sin niños',def:'/lottie/boda/laura-sin-ninos.json'},
  ] : SECTIONS[data.template];
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
