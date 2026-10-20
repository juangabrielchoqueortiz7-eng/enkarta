'use client';

import { InvitationParsed, ItineraryItem, InvitationType } from '@/lib/types';
import IconPicker from '../IconPicker';
import TemplateContentFields from './TemplateContentFields';
import SectionIconsEditor from '../SectionIconsEditor';
import { useLegacyDraft } from '../useLegacyDraft';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
  editingRevision?: { readonly current: number };
  draftSource?: { readonly current: InvitationParsed };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block font-outfit text-sm font-medium leading-5 text-[#514735]">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "min-h-11 min-w-0 w-full max-w-full rounded-xl border border-[#8f8272] bg-white px-3 py-2 font-outfit text-base leading-6 text-[#302a23] caret-[#514735] placeholder:text-[#746a5b] outline-none focus:border-[#514735] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]";
const textareaCls = `${inputCls} resize-none`;

export default function ContentPanel({ data, onChange, editingRevision, draftSource }: Props) {
  const draft = useLegacyDraft(data, onChange, undefined, editingRevision, draftSource);
  const itinerary = () => draft.list<ItineraryItem>('itinerary', current => current.itinerary, (_current, next) => ({ itinerary: next }));
  const steps = itinerary();

  return (
    <div className="min-w-0 space-y-6 p-4">

      {/* Nombres */}
      <div className="space-y-3">
        <h3 className="font-outfit text-sm font-semibold leading-5 text-[#302a23]">Protagonistas</h3>
        <Field label="Nombres (ej: Ana & Carlos)">
          <input type="text" name="invitation-names" autoComplete="off" className={inputCls} value={data.names ?? ''} onChange={e => draft.patch({ names: e.target.value })} placeholder="Ana & Carlos" />
        </Field>
        <Field label="Mensaje personalizado">
          <textarea name="invitation-message" autoComplete="off" className={textareaCls} rows={3} value={data.message ?? ''} onChange={e => draft.patch({ message: e.target.value })} placeholder="Casarse es de locos, pero nos queremos con locura..." />
        </Field>
      </div>

      {/* Fecha y hora */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <h3 className="font-outfit text-sm font-semibold leading-5 text-[#302a23]">Fecha y Lugares</h3>
        <Field label="Fecha del evento">
          <input type="date" name="event-date" autoComplete="off" className={inputCls} value={data.event_date ?? ''} onChange={e => draft.patch({ event_date: e.target.value })} />
        </Field>

        <div className="grid grid-cols-1 gap-3 min-[1200px]:grid-cols-2">
          <fieldset className="min-w-0 space-y-3 rounded-xl bg-gray-50 p-3">
            <legend className="px-1 font-outfit text-sm font-semibold leading-5 text-[#514735]"><span aria-hidden="true">⛪</span> Ceremonia</legend>
            <Field label="Hora">
              <input type="time" name="ceremony-time" autoComplete="off" className={inputCls} value={data.ceremony_time ?? ''} onChange={e => draft.patch({ ceremony_time: e.target.value })} />
            </Field>
            <Field label="Lugar">
              <input type="text" name="ceremony-place" autoComplete="off" className={inputCls} value={data.ceremony_place ?? ''} onChange={e => draft.patch({ ceremony_place: e.target.value })} placeholder="Iglesia San José" />
            </Field>
            <Field label="Dirección / Link Maps">
              <input type="text" name="ceremony-address" autoComplete="off" className={inputCls} value={data.ceremony_address ?? ''} onChange={e => draft.patch({ ceremony_address: e.target.value })} placeholder="Av. Principal #123" />
            </Field>
          </fieldset>
          <fieldset className="min-w-0 space-y-3 rounded-xl bg-gray-50 p-3">
            <legend className="px-1 font-outfit text-sm font-semibold leading-5 text-[#514735]"><span aria-hidden="true">🎉</span> Recepción</legend>
            <Field label="Hora">
              <input type="time" name="reception-time" autoComplete="off" className={inputCls} value={data.reception_time ?? ''} onChange={e => draft.patch({ reception_time: e.target.value })} />
            </Field>
            <Field label="Lugar">
              <input type="text" name="reception-place" autoComplete="off" className={inputCls} value={data.reception_place ?? ''} onChange={e => draft.patch({ reception_place: e.target.value })} placeholder="Salón Los Jardines" />
            </Field>
            <Field label="Dirección / Link Maps">
              <input type="text" name="reception-address" autoComplete="off" className={inputCls} value={data.reception_address ?? ''} onChange={e => draft.patch({ reception_address: e.target.value })} placeholder="Calle Flores #456" />
            </Field>
          </fieldset>
        </div>
      </div>

      {/* Itinerario */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <h3 className="font-outfit text-sm font-semibold leading-5 text-[#302a23]">Itinerario</h3>
        <div className="space-y-2">
          {steps.rows.map(({ item, key }, index) => (
            <div key={key} className="min-w-0 space-y-3 rounded-xl border border-gray-200 p-3">
              <div className="grid min-w-0 grid-cols-1 gap-3">
                <Field label={`Hora del paso ${index + 1}`}>
                  <input
                    type="text"
                    name={`itinerary-time-${index + 1}`}
                    autoComplete="off"
                    value={item.time}
                    onChange={e => steps.patch(key, { time: e.target.value })}
                    className={inputCls}
                    placeholder="16:00"
                  />
                </Field>
                <Field label={`Nombre del paso ${index + 1}`}>
                  <input
                    type="text"
                    name={`itinerary-label-${index + 1}`}
                    autoComplete="off"
                    value={item.label}
                    onChange={e => steps.patch(key, { label: e.target.value })}
                    className={inputCls}
                    placeholder="Ceremonia"
                  />
                </Field>
                {data.itinerary.length > 1 && (
                  <button type="button" onClick={() => steps.remove(key)} aria-label={`Eliminar paso ${index + 1}`} className="flex h-11 w-11 items-center justify-center justify-self-end rounded-xl text-sm text-red-700 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"><span aria-hidden="true">✕</span></button>
                )}
              </div>
              <IconPicker
                value={item.icon}
                colors={item.iconColors}
                speed={item.iconSpeed}
                defaultIcon="rings"
                ownerId={data.id}
                eventType={data.type as InvitationType}
                destinationKey={draft.destination('itinerary:' + key)}
                isDestinationCurrent={() => draft.isCurrent() && itinerary().rows.some(row => row.key === key)}
                onChange={(v, c, sp) => steps.patch(key, { icon: v, iconColors: c, iconSpeed: sp })}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => steps.add({ time: '', label: '', icon: '' })}
          className="min-h-11 rounded-lg px-2 font-outfit text-sm font-semibold text-[#514735] underline-offset-4 transition-colors hover:bg-[#f7f3ed] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]"
        >+ Agregar paso</button>
      </div>

      {/* Invitado */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <h3 className="font-outfit text-sm font-semibold leading-5 text-[#302a23]">Invitado</h3>
        <div className="grid grid-cols-1 gap-3 min-[1200px]:grid-cols-2">
          <Field label="Nombre del invitado">
            <input type="text" name="guest-name" autoComplete="off" className={inputCls} value={data.guest_name ?? ''} onChange={e => draft.patch({ guest_name: e.target.value })} placeholder="Juan García" />
          </Field>
          <Field label="Pases">
            <input type="number" name="guest-passes" inputMode="numeric" autoComplete="off" min={1} max={20} className={inputCls} value={data.guest_passes} onChange={e => draft.patch({ guest_passes: parseInt(e.target.value) || 1 })} />
          </Field>
        </div>
      </div>

      {/* Familia */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <h3 className="font-outfit text-sm font-semibold leading-5 text-[#302a23]">Familia / Padres</h3>
        <Field label="Padres del novio (uno por línea)">
          <textarea
            name="parents-groom"
            autoComplete="off"
            className={textareaCls}
            rows={2}
            value={data.parents_groom.join('\n')}
            onChange={e => draft.patch({ parents_groom: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
            placeholder={'Juan Pablo Castaño\nAna Sofía Morales'}
          />
        </Field>
        <Field label="Padres de la novia (uno por línea)">
          <textarea
            name="parents-bride"
            autoComplete="off"
            className={textareaCls}
            rows={2}
            value={data.parents_bride.join('\n')}
            onChange={e => draft.patch({ parents_bride: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
            placeholder={'Carlos Andrés Pinzón\nLaura Fernanda Cubillos'}
          />
        </Field>
      </div>

      {/* Detalles */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <h3 className="font-outfit text-sm font-semibold leading-5 text-[#302a23]">Detalles</h3>
        <Field label="Dress code (Hombres | Mujeres)">
          <input type="text" name="dress-code" autoComplete="off" className={inputCls} value={data.dress_code ?? ''} onChange={e => draft.patch({ dress_code: e.target.value })} placeholder="Traje | Vestido largo" />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg py-2">
          <input type="checkbox" name="no-kids" checked={data.no_kids} onChange={e => draft.patch({ no_kids: e.target.checked })} className="h-5 w-5 shrink-0 rounded accent-[#514735] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]" />
          <span className="font-outfit text-sm leading-5 text-[#514735]">Sin niños</span>
        </label>
        <Field label="Mensaje de regalos">
          <textarea name="gift-message" autoComplete="off" className={textareaCls} rows={2} value={data.gift_message ?? ''} onChange={e => draft.patch({ gift_message: e.target.value })} placeholder="Tu presencia es el mejor regalo..." />
        </Field>
        <Field label="Cuenta bancaria (Banco — Nro | CCI)">
          <input type="text" name="gift-bank-account" autoComplete="off" className={inputCls} value={data.bank_account ?? ''} onChange={e => draft.patch({ bank_account: e.target.value })} placeholder="BCP — 191-123456 | CCI: 00219..." />
        </Field>
        <Field label="WhatsApp de confirmación">
          <input type="tel" name="rsvp-whatsapp" autoComplete="tel" className={inputCls} value={data.phone_whatsapp ?? ''} onChange={e => draft.patch({ phone_whatsapp: e.target.value })} placeholder="+51 999 999 999" />
        </Field>
        <Field label="Link de galería de fotos">
          <input type="url" name="gallery-url" autoComplete="off" className={inputCls} value={data.gallery_url ?? ''} onChange={e => draft.patch({ gallery_url: e.target.value })} placeholder="https://photos.google.com/..." />
        </Field>
      </div>

      {/* Iconos de secciones (editables desde el panel) */}
      <SectionIconsEditor data={data} onChange={draft.patch} draft={draft} />

      {/* Campos específicos de la plantilla premium */}
      <TemplateContentFields data={data} onChange={draft.patch} draft={draft} />

    </div>
  );
}
