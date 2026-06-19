'use client';

import { InvitationParsed, ItineraryItem, InvitationType } from '@/lib/types';
import IconPicker from '../IconPicker';
import TemplateContentFields from './TemplateContentFields';
import SectionIconsEditor from '../SectionIconsEditor';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-outfit text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit";
const textareaCls = `${inputCls} resize-none`;

export default function ContentPanel({ data, onChange }: Props) {
  const updateItinerary = (i: number, patch: Partial<ItineraryItem>) => {
    const updated = [...data.itinerary];
    updated[i] = { ...updated[i], ...patch };
    onChange({ itinerary: updated });
  };

  return (
    <div className="space-y-5 p-4">

      {/* Nombres */}
      <div className="space-y-3">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Protagonistas</h4>
        <Field label="Nombres (ej: Ana & Carlos)">
          <input className={inputCls} value={data.names ?? ''} onChange={e => onChange({ names: e.target.value })} placeholder="Ana & Carlos" />
        </Field>
        <Field label="Mensaje personalizado">
          <textarea className={textareaCls} rows={3} value={data.message ?? ''} onChange={e => onChange({ message: e.target.value })} placeholder="Casarse es de locos, pero nos queremos con locura..." />
        </Field>
      </div>

      {/* Fecha y hora */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Fecha y Lugares</h4>
        <Field label="Fecha del evento">
          <input type="date" className={inputCls} value={data.event_date ?? ''} onChange={e => onChange({ event_date: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-3 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-outfit font-medium text-gray-600">⛪ Ceremonia</p>
            <Field label="Hora">
              <input type="time" className={inputCls} value={data.ceremony_time ?? ''} onChange={e => onChange({ ceremony_time: e.target.value })} />
            </Field>
            <Field label="Lugar">
              <input className={inputCls} value={data.ceremony_place ?? ''} onChange={e => onChange({ ceremony_place: e.target.value })} placeholder="Iglesia San José" />
            </Field>
            <Field label="Dirección / Link Maps">
              <input className={inputCls} value={data.ceremony_address ?? ''} onChange={e => onChange({ ceremony_address: e.target.value })} placeholder="Av. Principal #123" />
            </Field>
          </div>
          <div className="space-y-3 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-outfit font-medium text-gray-600">🎉 Recepción</p>
            <Field label="Hora">
              <input type="time" className={inputCls} value={data.reception_time ?? ''} onChange={e => onChange({ reception_time: e.target.value })} />
            </Field>
            <Field label="Lugar">
              <input className={inputCls} value={data.reception_place ?? ''} onChange={e => onChange({ reception_place: e.target.value })} placeholder="Salón Los Jardines" />
            </Field>
            <Field label="Dirección / Link Maps">
              <input className={inputCls} value={data.reception_address ?? ''} onChange={e => onChange({ reception_address: e.target.value })} placeholder="Calle Flores #456" />
            </Field>
          </div>
        </div>
      </div>

      {/* Itinerario */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Itinerario</h4>
        <div className="space-y-2">
          {data.itinerary.map((item, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-2 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={item.time}
                  onChange={e => updateItinerary(i, { time: e.target.value })}
                  className="w-20 px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-enkarta-gold outline-none font-outfit"
                  placeholder="16:00"
                />
                <input
                  value={item.label}
                  onChange={e => updateItinerary(i, { label: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-enkarta-gold outline-none font-outfit"
                  placeholder="Ceremonia"
                />
                {data.itinerary.length > 1 && (
                  <button type="button" onClick={() => onChange({ itinerary: data.itinerary.filter((_, j) => j !== i) })} className="text-red-300 hover:text-red-500 text-sm px-1">✕</button>
                )}
              </div>
              <IconPicker
                value={item.icon}
                colors={item.iconColors}
                speed={item.iconSpeed}
                defaultIcon="rings"
                ownerId={data.id}
                eventType={data.type as InvitationType}
                onChange={(v, c, sp) => updateItinerary(i, { icon: v, iconColors: c, iconSpeed: sp })}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ itinerary: [...data.itinerary, { time: '', label: '', icon: '' }] })}
          className="text-xs text-enkarta-gold hover:underline font-outfit"
        >+ Agregar paso</button>
      </div>

      {/* Invitado */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Invitado</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre del invitado">
            <input className={inputCls} value={data.guest_name ?? ''} onChange={e => onChange({ guest_name: e.target.value })} placeholder="Juan García" />
          </Field>
          <Field label="Pases">
            <input type="number" min={1} max={20} className={inputCls} value={data.guest_passes} onChange={e => onChange({ guest_passes: parseInt(e.target.value) || 1 })} />
          </Field>
        </div>
      </div>

      {/* Familia */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Familia / Padres</h4>
        <Field label="Padres del novio (uno por línea)">
          <textarea
            className={textareaCls}
            rows={2}
            value={data.parents_groom.join('\n')}
            onChange={e => onChange({ parents_groom: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
            placeholder={'Juan Pablo Castaño\nAna Sofía Morales'}
          />
        </Field>
        <Field label="Padres de la novia (uno por línea)">
          <textarea
            className={textareaCls}
            rows={2}
            value={data.parents_bride.join('\n')}
            onChange={e => onChange({ parents_bride: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
            placeholder={'Carlos Andrés Pinzón\nLaura Fernanda Cubillos'}
          />
        </Field>
      </div>

      {/* Detalles */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">Detalles</h4>
        <Field label="Dress code (Hombres | Mujeres)">
          <input className={inputCls} value={data.dress_code ?? ''} onChange={e => onChange({ dress_code: e.target.value })} placeholder="Traje | Vestido largo" />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={data.no_kids} onChange={e => onChange({ no_kids: e.target.checked })} className="w-4 h-4 rounded text-enkarta-gold" />
          <span className="text-sm font-outfit text-gray-600">Sin niños</span>
        </label>
        <Field label="Mensaje de regalos">
          <textarea className={textareaCls} rows={2} value={data.gift_message ?? ''} onChange={e => onChange({ gift_message: e.target.value })} placeholder="Tu presencia es el mejor regalo..." />
        </Field>
        <Field label="Cuenta bancaria (Banco — Nro | CCI)">
          <input className={inputCls} value={data.bank_account ?? ''} onChange={e => onChange({ bank_account: e.target.value })} placeholder="BCP — 191-123456 | CCI: 00219..." />
        </Field>
        <Field label="WhatsApp de confirmación">
          <input className={inputCls} value={data.phone_whatsapp ?? ''} onChange={e => onChange({ phone_whatsapp: e.target.value })} placeholder="+51 999 999 999" />
        </Field>
        <Field label="Link de galería de fotos">
          <input className={inputCls} value={data.gallery_url ?? ''} onChange={e => onChange({ gallery_url: e.target.value })} placeholder="https://photos.google.com/..." />
        </Field>
      </div>

      {/* Iconos de secciones (editables desde el panel) */}
      <SectionIconsEditor data={data} onChange={onChange} />

      {/* Campos específicos de la plantilla premium */}
      <TemplateContentFields data={data} onChange={onChange} />

    </div>
  );
}
