'use client';
import CleanDesignFields from './CleanDesignFields';
import {isCleanDesign} from '@/lib/clean-designs';
import MariaMarioFields from './MariaMarioFields';
import KarlaMauricioFields from './KarlaMauricioFields';
import PaulaJuanFelipeFields from './PaulaJuanFelipeFields';
import MarianaJesusFields from './MarianaJesusFields';
import ManuelMayaFields from './ManuelMayaFields';
import NicoleFranciscoFields from './NicoleFranciscoFields';
import RolyYelianaFields from './RolyYelianaFields';


import { InvitationParsed, BuilderConfig } from '@/lib/types';
import AnnieMickyFields from './AnnieMickyFields';
import LauraAndresFields from './LauraAndresFields';
import { useLegacyDraft, type LegacyDraft } from '../useLegacyDraft';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
  draft?: LegacyDraft;
}

const inputCls = "min-h-11 min-w-0 w-full max-w-full rounded-xl border border-[#8f8272] bg-white px-3 py-2 font-outfit text-base leading-6 text-[#302a23] caret-[#514735] placeholder:text-[#746a5b] outline-none focus:border-[#514735] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]";
const textareaCls = `${inputCls} resize-none`;
const removeCls = "flex h-11 w-11 shrink-0 items-center justify-center justify-self-end rounded-xl text-sm text-red-700 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700";
const addCls = "mt-2 min-h-11 rounded-lg px-2 font-outfit text-sm font-semibold text-[#514735] underline-offset-4 transition-colors hover:bg-[#f7f3ed] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]";

function Field({ label, hint, hintId, children }: { label: string; hint?: string; hintId?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="block min-w-0">
        <span className="mb-1.5 block font-outfit text-sm font-medium leading-5 text-[#514735]">{label}</span>
        {children}
      </label>
      {hint && <p id={hintId} className="mt-2 font-outfit text-sm leading-5 text-[#62594d]">{hint}</p>}
    </div>
  );
}

/** Editor de campos "ricos" específico de cada plantilla premium (guardados en config). */
export default function TemplateContentFields({ data, onChange, draft: inherited }: Props) {
  const draft = useLegacyDraft(data, onChange, inherited);
  if (data.config.layout?.presetKey === 'marfil-vivo') return <p className="rounded-xl bg-[#f6f2eb] p-3 text-sm leading-6 text-[#625946]">Los capítulos y textos de Marfil Vivo se editan seleccionándolos en la vista previa o desde Más herramientas → Bloques.</p>;
  if(isCleanDesign(data.config.designKey))return <CleanDesignFields data={data} onChange={draft.patch} draft={draft}/>;
  if ((data.config.designKey === 'maria-angelica-y-mario' || isCleanDesign(data.config.designKey))) return <MariaMarioFields data={data} onChange={draft.patch} draft={draft} />;
  if (data.config.designKey === 'karla-y-mauricio') return <KarlaMauricioFields data={data} onChange={draft.patch} draft={draft} />;
  if (data.config.designKey === 'paula-y-juan-felipe') return <PaulaJuanFelipeFields data={data} onChange={draft.patch} draft={draft} />;
  if (data.config.designKey === 'mariana-y-jesus') return <MarianaJesusFields data={data} onChange={draft.patch} draft={draft} />;
  if (data.config.designKey === 'manuel-y-maya') return <ManuelMayaFields data={data} onChange={draft.patch} draft={draft} />;
  if (data.config.designKey === 'nicole-y-francisco') return <NicoleFranciscoFields data={data} onChange={draft.patch} draft={draft} />;
  if (data.config.designKey === 'roly-y-yeliana') return <RolyYelianaFields data={data} onChange={draft.patch} draft={draft} />;
  if (data.config.designKey === 'annie-y-micky') return <AnnieMickyFields data={data} onChange={draft.patch} draft={draft} />;
  if (data.config.designKey === 'laura-y-andres') return <LauraAndresFields data={data} onChange={draft.patch} draft={draft} />;
  const cfg = data.config ?? {};
  const setCfg = (patch: Partial<BuilderConfig>) => draft.config(patch);

  // textarea ↔ array (una línea = un elemento)
  const linesValue = (arr?: string[]) => (arr ?? []).join('\n');
  const setLines = (key: keyof BuilderConfig) => (v: string) =>
    setCfg({ [key]: v.split('\n').map(s => s.trim()).filter(Boolean) } as Partial<BuilderConfig>);

  const t = data.template;

  if (t === 'azure') {
    return (
      <Wrapper title="Textos de la colección Lunaria">
        <Field label="Ciudad">
          <input type="text" name="template-city" autoComplete="off" className={inputCls} value={cfg.city ?? ''} onChange={e => setCfg({ city: e.target.value })} placeholder="Bogotá" />
        </Field>
        <Field label="Título de bienvenida">
          <input type="text" name="template-welcome-title" autoComplete="off" className={inputCls} value={cfg.welcomeTitle ?? ''} onChange={e => setCfg({ welcomeTitle: e.target.value })} placeholder="Bienvenidos a la invitación de nuestra boda" />
        </Field>
        <Field label="Bendición / encabezado de padres">
          <input type="text" name="template-blessing" autoComplete="off" className={inputCls} value={cfg.blessing ?? ''} onChange={e => setCfg({ blessing: e.target.value })} placeholder="Con la bendición de Dios y de nuestros padres" />
        </Field>
        <Field label="Mensaje de la galería">
          <textarea name="template-gallery-message" autoComplete="off" className={textareaCls} rows={3} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Comparte los recuerdos de este día especial." />
        </Field>
        <Field label="Mensaje de confirmación (RSVP)">
          <textarea name="template-rsvp-message" autoComplete="off" className={textareaCls} rows={2} value={cfg.rsvpMessage ?? ''} onChange={e => setCfg({ rsvpMessage: e.target.value })} placeholder="Es muy importante que nos confirmes tu asistencia." />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'primicia') {
    return (
      <Wrapper title="Textos de la colección Áurea">
        <Field label="Descripción de la ceremonia">
          <textarea name="template-ceremony-desc" autoComplete="off" className={textareaCls} rows={3} value={cfg.ceremonyDesc ?? ''} onChange={e => setCfg({ ceremonyDesc: e.target.value })} placeholder="Un espacio sagrado donde uniremos nuestras vidas..." />
        </Field>
        <Field label="Descripción de la recepción">
          <textarea name="template-reception-desc" autoComplete="off" className={textareaCls} rows={3} value={cfg.receptionDesc ?? ''} onChange={e => setCfg({ receptionDesc: e.target.value })} placeholder="Una celebración llena de alegría y amor." />
        </Field>
        <Field label="Mensaje de confirmación (RSVP)">
          <textarea name="template-rsvp-message" autoComplete="off" className={textareaCls} rows={3} value={cfg.rsvpMessage ?? ''} onChange={e => setCfg({ rsvpMessage: e.target.value })} placeholder="Los esperamos con toda la alegría y energía." />
        </Field>
        <Field label="Mensaje de la pareja" hint="Cada salto de línea es un párrafo. (Se edita arriba en 'Mensaje personalizado'.)" hintId="primicia-couple-message-hint">
          <textarea name="template-message" autoComplete="off" aria-describedby="primicia-couple-message-hint" className={textareaCls} rows={4} value={data.message ?? ''} onChange={e => draft.patch({ message: e.target.value })} />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'paradise') {
    return (
      <Wrapper title="Textos de la colección Verdealma">
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[1200px]:grid-cols-2">
          <Field label="Apellido de la novia (script)">
            <input type="text" name="template-bride-last" autoComplete="off" className={inputCls} value={cfg.brideLast ?? ''} onChange={e => setCfg({ brideLast: e.target.value })} placeholder="Ruggeri" />
          </Field>
          <Field label="Apellido del novio (script)">
            <input type="text" name="template-groom-last" autoComplete="off" className={inputCls} value={cfg.groomLast ?? ''} onChange={e => setCfg({ groomLast: e.target.value })} placeholder="Garrido" />
          </Field>
        </div>
        <Field label="Ciudad (vertical en portada)">
          <input type="text" name="template-city" autoComplete="off" className={inputCls} value={cfg.city ?? ''} onChange={e => setCfg({ city: e.target.value })} placeholder="Santa Cruz" />
        </Field>
        <Field label="Bendición / encabezado de padres">
          <input type="text" name="template-blessing" autoComplete="off" className={inputCls} value={cfg.blessing ?? ''} onChange={e => setCfg({ blessing: e.target.value })} placeholder="Con la bendición de Dios y guiados por el amor de nuestros padres:" />
        </Field>
        <Field label="Versículo / frase">
          <textarea name="template-verse" autoComplete="off" className={textareaCls} rows={3} value={cfg.verse ?? ''} onChange={e => setCfg({ verse: e.target.value })} placeholder="Dos son mejor que uno..." />
        </Field>
        <Field label="Referencia del versículo">
          <input type="text" name="template-verse-ref" autoComplete="off" className={inputCls} value={cfg.verseRef ?? ''} onChange={e => setCfg({ verseRef: e.target.value })} placeholder="Eclesiastés 4:9-10" />
        </Field>
        <Field label="Mensaje de regalos">
          <textarea name="template-gift-message" autoComplete="off" className={textareaCls} rows={3} value={data.gift_message ?? ''} onChange={e => draft.patch({ gift_message: e.target.value })} placeholder="Su presencia y sus buenos deseos..." />
        </Field>
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[1200px]:grid-cols-2">
          <Field label="Nombre mesa de regalos">
            <input type="text" name="template-gift-registry-label" autoComplete="off" className={inputCls} value={cfg.giftRegistryLabel ?? ''} onChange={e => setCfg({ giftRegistryLabel: e.target.value })} placeholder="falabella." />
          </Field>
          <Field label="Link mesa de regalos">
            <input type="url" name="template-gift-registry-url" autoComplete="off" className={inputCls} value={cfg.giftRegistryUrl ?? ''} onChange={e => setCfg({ giftRegistryUrl: e.target.value })} placeholder="https://..." />
          </Field>
        </div>
        <Field label="URL de imagen QR de regalo">
          <input type="url" name="template-gift-qr-url" autoComplete="off" className={inputCls} value={cfg.giftQrUrl ?? ''} onChange={e => setCfg({ giftQrUrl: e.target.value })} placeholder="https://...qr.png" />
        </Field>
        <Field label="Mensaje 'Solo Adultos'">
          <textarea name="template-no-kids-message" autoComplete="off" className={textareaCls} rows={2} value={cfg.noKidsMessage ?? ''} onChange={e => setCfg({ noKidsMessage: e.target.value })} placeholder="Amamos a sus niños, pero la invitación es solo para adultos." />
        </Field>
        <Field label="Mensaje de la galería">
          <textarea name="template-gallery-message" autoComplete="off" className={textareaCls} rows={2} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Te invitamos a capturar y compartir..." />
        </Field>
        <Field label="Mensaje de confirmación (RSVP)">
          <textarea name="template-rsvp-message" autoComplete="off" className={textareaCls} rows={3} value={cfg.rsvpMessage ?? ''} onChange={e => setCfg({ rsvpMessage: e.target.value })} placeholder="Es muy importante para nosotros confirmar tu asistencia..." />
        </Field>
        <Field label="Frase de cierre (mayúsculas)">
          <textarea name="template-rsvp-closing" autoComplete="off" className={textareaCls} rows={2} value={cfg.rsvpClosing ?? ''} onChange={e => setCfg({ rsvpClosing: e.target.value })} placeholder="Creemos que mereces una noche alegre y divertida..." />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'obsidiana') {
    const sponsors = draft.list<InvitationParsed['sponsors'][number]>('template:sponsors', current => current.sponsors ?? [], (_current, next) => ({ sponsors: next }));
    return (
      <Wrapper title="Textos de la colección Nocturna">
        <Field label="Lugar / fecha en portada">
          <input type="text" name="template-date-place" autoComplete="off" className={inputCls} value={cfg.datePlace ?? ''} onChange={e => setCfg({ datePlace: e.target.value })} placeholder="Santa Cruz · 2026" />
        </Field>
        <Field label="Frase / versículo de intro">
          <textarea name="template-message" autoComplete="off" className={textareaCls} rows={3} value={data.message ?? ''} onChange={e => draft.patch({ message: e.target.value })} placeholder="Lo que Dios juntó, no lo separe el hombre. / Mateo 19:6" />
        </Field>
        <Field label="Bendición / encabezado de padres">
          <input type="text" name="template-blessing" autoComplete="off" className={inputCls} value={cfg.blessing ?? ''} onChange={e => setCfg({ blessing: e.target.value })} placeholder="Con la bendición de Dios y nuestros padres" />
        </Field>
        <Field label="Mensaje de regalos">
          <textarea name="template-gift-message" autoComplete="off" className={textareaCls} rows={2} value={data.gift_message ?? ''} onChange={e => draft.patch({ gift_message: e.target.value })} placeholder="Su presencia es nuestro mejor regalo..." />
        </Field>
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[1200px]:grid-cols-2">
          <Field label="Opción 'Lluvia de sobres'">
            <input type="text" name="template-gift-envelopes" autoComplete="off" className={inputCls} value={cfg.giftEnvelopes ?? ''} onChange={e => setCfg({ giftEnvelopes: e.target.value })} placeholder="Lluvia de sobres" />
          </Field>
          <Field label="URL imagen QR regalo">
            <input type="url" name="template-gift-qr-url" autoComplete="off" className={inputCls} value={cfg.giftQrUrl ?? ''} onChange={e => setCfg({ giftQrUrl: e.target.value })} placeholder="https://...qr.png" />
          </Field>
        </div>
        <Field label="Título de agradecimiento">
          <input type="text" name="template-thanks-title" autoComplete="off" className={inputCls} value={cfg.thanksTitle ?? ''} onChange={e => setCfg({ thanksTitle: e.target.value })} placeholder="Agradecimiento" />
        </Field>
        <Field label="Mensaje de agradecimiento">
          <textarea name="template-thanks-message" autoComplete="off" className={textareaCls} rows={3} value={cfg.thanksMessage ?? ''} onChange={e => setCfg({ thanksMessage: e.target.value })} placeholder="A Dios, a nuestros padres y padrinos..." />
        </Field>

        {/* Padrinos */}
        <fieldset className="min-w-0 space-y-3">
          <legend className="mb-2 font-outfit text-sm font-medium leading-5 text-[#514735]">Padrinos (rol + nombres)</legend>
          <div className="space-y-2">
            {sponsors.rows.map(({ item: s, key }, i) => (
              <div key={key} className="min-w-0 space-y-3 rounded-xl border border-gray-200 p-3">
                <Field label={`Rol de padrinos ${i + 1}`}>
                  <input type="text" name={`template-sponsor-role-${i + 1}`} autoComplete="off" className={inputCls} value={s.role} onChange={e => sponsors.patch(key, { role: e.target.value })} placeholder="Padrinos de Civil" />
                </Field>
                <Field label={`Nombres de padrinos ${i + 1}`}>
                  <textarea name={`template-sponsor-names-${i + 1}`} autoComplete="off" className={textareaCls} rows={2} value={s.names} onChange={e => sponsors.patch(key, { names: e.target.value })} placeholder={'Nombre 1\nNombre 2'} />
                </Field>
                <div className="flex justify-end"><button type="button" onClick={() => sponsors.remove(key)} aria-label={`Eliminar padrinos ${i + 1}`} className={removeCls}><span aria-hidden="true">✕</span></button></div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => sponsors.add({ role: '', names: '' })} className={addCls}>+ Agregar padrinos</button>
        </fieldset>

        <Field label="Mensaje de la galería">
          <textarea name="template-gallery-message" autoComplete="off" className={textareaCls} rows={2} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Te invitamos a compartir los momentos..." />
        </Field>
        <Field label="Frase de cierre (mayúsculas)">
          <textarea name="template-rsvp-closing" autoComplete="off" className={textareaCls} rows={2} value={cfg.rsvpClosing ?? ''} onChange={e => setCfg({ rsvpClosing: e.target.value })} placeholder="Creemos que mereces una noche alegre..." />
        </Field>
        <Field label="Mensaje de confirmación">
          <input type="text" name="template-rsvp-message" autoComplete="off" className={inputCls} value={cfg.rsvpMessage ?? ''} onChange={e => setCfg({ rsvpMessage: e.target.value })} placeholder="Es muy importante que nos confirmes tu asistencia." />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'dolcevita' || t === 'carmesi_v2' || t === 'napoly' || t === 'euforia' || t === 'rosegold' || t === 'allegria') {
    const sponsors = draft.list<InvitationParsed['sponsors'][number]>('template:sponsors', current => current.sponsors ?? [], (_current, next) => ({ sponsors: next }));
    return (
      <Wrapper title="Textos de la colección">
        <Field label="Ciudad (marco de fecha)">
          <input type="text" name="template-date-city" autoComplete="off" className={inputCls} value={cfg.dateCity ?? ''} onChange={e => setCfg({ dateCity: e.target.value })} placeholder="La Paz" />
        </Field>
        <Field label="Mensaje de intro">
          <textarea name="template-message" autoComplete="off" className={textareaCls} rows={3} value={data.message ?? ''} onChange={e => draft.patch({ message: e.target.value })} placeholder="Casarse es de locos, pero es que nos queremos con locura..." />
        </Field>
        <Field label="Bendición / encabezado de padres">
          <input type="text" name="template-blessing" autoComplete="off" className={inputCls} value={cfg.blessing ?? ''} onChange={e => setCfg({ blessing: e.target.value })} placeholder="Con la bendición de Dios y de nuestros padres" />
        </Field>

        {/* Padrinos */}
        <fieldset className="min-w-0 space-y-3">
          <legend className="mb-2 font-outfit text-sm font-medium leading-5 text-[#514735]">Padrinos (rol + nombres)</legend>
          <div className="space-y-2">
            {sponsors.rows.map(({ item: s, key }, i) => (
              <div key={key} className="min-w-0 space-y-3 rounded-xl border border-gray-200 p-3">
                <Field label={`Rol de padrinos ${i + 1}`}>
                  <input type="text" name={`template-sponsor-role-${i + 1}`} autoComplete="off" className={inputCls} value={s.role} onChange={e => sponsors.patch(key, { role: e.target.value })} placeholder="Padrinos" />
                </Field>
                <Field label={`Nombres de padrinos ${i + 1}`}>
                  <textarea name={`template-sponsor-names-${i + 1}`} autoComplete="off" className={textareaCls} rows={2} value={s.names} onChange={e => sponsors.patch(key, { names: e.target.value })} placeholder={'Nombre 1\nNombre 2'} />
                </Field>
                <div className="flex justify-end"><button type="button" onClick={() => sponsors.remove(key)} aria-label={`Eliminar padrinos ${i + 1}`} className={removeCls}><span aria-hidden="true">✕</span></button></div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => sponsors.add({ role: 'Padrinos', names: '' })} className={addCls}>+ Agregar padrinos</button>
        </fieldset>

        <Field label="Mensaje de regalos">
          <textarea name="template-gift-message" autoComplete="off" className={textareaCls} rows={2} value={data.gift_message ?? ''} onChange={e => draft.patch({ gift_message: e.target.value })} placeholder="Su presencia y sus buenos deseos..." />
        </Field>
        <Field label="Frase de gracias (regalo)">
          <input type="text" name="template-gift-thanks" autoComplete="off" className={inputCls} value={cfg.giftThanks ?? ''} onChange={e => setCfg({ giftThanks: e.target.value })} placeholder="Gracias por tu muestra de cariño" />
        </Field>
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[1200px]:grid-cols-2">
          <Field label="Opción 'efectivo en sobres'">
            <input type="text" name="template-gift-cash" autoComplete="off" className={inputCls} value={cfg.giftCash ?? ''} onChange={e => setCfg({ giftCash: e.target.value })} placeholder="Efectivo en sobres (Habrá un buzón)" />
          </Field>
          <Field label="Opción 'obsequios'">
            <input type="text" name="template-gift-other" autoComplete="off" className={inputCls} value={cfg.giftOther ?? ''} onChange={e => setCfg({ giftOther: e.target.value })} placeholder="Obsequios tradicionales (Escríbenos)" />
          </Field>
        </div>
        <Field label="URL imagen QR (cuenta bancaria)">
          <input type="url" name="template-gift-qr-url" autoComplete="off" className={inputCls} value={cfg.giftQrUrl ?? ''} onChange={e => setCfg({ giftQrUrl: e.target.value })} placeholder="https://...qr.png" />
        </Field>
        <Field label="Hospedaje — descripción" hint="La imagen y el nombre del hotel van en Medios / Config." hintId="oliva-lodging-description-hint">
          <textarea name="template-lodging-description" autoComplete="off" aria-describedby="oliva-lodging-description-hint" className={textareaCls} rows={2} value={cfg.lodging?.[0]?.desc ?? ''} onChange={e => { const l = cfg.lodging?.[0] ?? { name: '', image: '' }; setCfg({ lodging: [{ ...l, desc: e.target.value }] }); }} placeholder="El Paraíso Hotel está en..." />
        </Field>
        <Field label="Hospedaje — contacto">
          <input type="text" name="template-lodging-contact" autoComplete="off" className={inputCls} value={cfg.lodgingContact ?? ''} onChange={e => setCfg({ lodgingContact: e.target.value })} placeholder="Jazmin Smith" />
        </Field>
        <Field label="Mensaje de la galería">
          <textarea name="template-gallery-message" autoComplete="off" className={textareaCls} rows={2} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Te invitamos a compartir los momentos..." />
        </Field>
        <Field label="Mensaje 'solo adultos'">
          <textarea name="template-no-kids-message" autoComplete="off" className={textareaCls} rows={2} value={cfg.noKidsMessage ?? ''} onChange={e => setCfg({ noKidsMessage: e.target.value })} placeholder="Amamos a sus niños, pero la invitación es solo para adultos." />
        </Field>
        <Field label="Frase de cierre (confirmación)">
          <input type="text" name="template-rsvp-closing" autoComplete="off" className={inputCls} value={cfg.rsvpClosing ?? ''} onChange={e => setCfg({ rsvpClosing: e.target.value })} placeholder="No olvides confirmar tu asistencia" />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'grazia') {
    const accts = draft.list<NonNullable<BuilderConfig['giftAccounts']>[number]>('template:giftAccounts', current => current.config?.giftAccounts ?? [], (current, next) => ({ config: { ...(current.config ?? {}), giftAccounts: next } }));
    return (
      <Wrapper title="Textos de la colección Seda">
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[1200px]:grid-cols-2">
          <Field label="Nombre completo del novio">
            <input type="text" name="template-groom-name" autoComplete="off" className={inputCls} value={cfg.groomName ?? ''} onChange={e => setCfg({ groomName: e.target.value })} placeholder="Lorenzo Bianchi" />
          </Field>
          <Field label="Nombre completo de la novia">
            <input type="text" name="template-bride-name" autoComplete="off" className={inputCls} value={cfg.brideName ?? ''} onChange={e => setCfg({ brideName: e.target.value })} placeholder="Isabella Moretti" />
          </Field>
        </div>
        <Field label="Texto sobre los nombres (portada)">
          <input type="text" name="template-cover-label" autoComplete="off" className={inputCls} value={cfg.coverLabel ?? ''} onChange={e => setCfg({ coverLabel: e.target.value })} placeholder="La boda de" />
        </Field>
        <Field label="Mensaje 'Save the Date'">
          <textarea name="template-save-date-msg" autoComplete="off" className={textareaCls} rows={3} value={cfg.saveDateMsg ?? ''} onChange={e => setCfg({ saveDateMsg: e.target.value })} placeholder="Después de mucho tiempo caminando juntos..." />
        </Field>
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[1200px]:grid-cols-2">
          <Field label="URL foto circular novio">
            <input type="url" name="template-groom-photo" autoComplete="off" className={inputCls} value={cfg.groomPhoto ?? ''} onChange={e => setCfg({ groomPhoto: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="URL foto circular novia">
            <input type="url" name="template-bride-photo" autoComplete="off" className={inputCls} value={cfg.bridePhoto ?? ''} onChange={e => setCfg({ bridePhoto: e.target.value })} placeholder="https://..." />
          </Field>
        </div>
        <Field label="Título de la historia">
          <input type="text" name="template-story-title" autoComplete="off" className={inputCls} value={cfg.storyTitle ?? ''} onChange={e => setCfg({ storyTitle: e.target.value })} placeholder="Nuestra Historia" />
        </Field>
        <Field label="Mensaje de la historia">
          <textarea name="template-story-message" autoComplete="off" className={textareaCls} rows={4} value={cfg.storyMessage ?? ''} onChange={e => setCfg({ storyMessage: e.target.value })} placeholder="Nuestros caminos se unieron..." />
        </Field>
        <Field label="Mensaje de regalos">
          <textarea name="template-gift-message" autoComplete="off" className={textareaCls} rows={2} value={data.gift_message ?? ''} onChange={e => draft.patch({ gift_message: e.target.value })} placeholder="El mejor regalo que nos das es tu presencia..." />
        </Field>

        {/* Cuentas bancarias */}
        <fieldset className="min-w-0 space-y-3">
          <legend className="mb-2 font-outfit text-sm font-medium leading-5 text-[#514735]">Cuentas bancarias (nombre + cuenta)</legend>
          <div className="space-y-2">
            {accts.rows.map(({ item: a, key }, i) => (
              <div key={key} className="min-w-0 space-y-3 rounded-xl border border-gray-200 p-3">
                <Field label={`Titular de la cuenta ${i + 1}`}>
                  <input type="text" name={`template-account-owner-${i + 1}`} autoComplete="off" className={inputCls} value={a.name} onChange={e => accts.patch(key, { name: e.target.value })} placeholder="Lorenzo Bianchi" />
                </Field>
                <Field label={`Datos de la cuenta ${i + 1}`}>
                  <input type="text" name={`template-account-data-${i + 1}`} autoComplete="off" className={inputCls} value={a.account} onChange={e => accts.patch(key, { account: e.target.value })} placeholder="CTA. 1234567" />
                </Field>
                <div className="flex justify-end"><button type="button" onClick={() => accts.remove(key)} aria-label={`Eliminar cuenta ${i + 1}`} className={removeCls}><span aria-hidden="true">✕</span></button></div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => accts.add({ name: '', account: '' })} className={addCls}>+ Agregar cuenta</button>
        </fieldset>

        <Field label="URL imagen QR de regalo">
          <input type="url" name="template-gift-qr-url" autoComplete="off" className={inputCls} value={cfg.giftQrUrl ?? ''} onChange={e => setCfg({ giftQrUrl: e.target.value })} placeholder="https://...qr.png" />
        </Field>
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[1200px]:grid-cols-2">
          <Field label="Título código vestimenta">
            <input type="text" name="template-dress-code-title" autoComplete="off" className={inputCls} value={cfg.dressCodeTitle ?? ''} onChange={e => setCfg({ dressCodeTitle: e.target.value })} placeholder="Código de vestimenta" />
          </Field>
          <Field label="Hospedaje — contacto">
            <input type="text" name="template-lodging-contact" autoComplete="off" className={inputCls} value={cfg.lodgingContact ?? ''} onChange={e => setCfg({ lodgingContact: e.target.value })} placeholder="Jazmin Smith" />
          </Field>
        </div>
        <Field label="Hospedaje — descripción">
          <textarea name="template-lodging-description" autoComplete="off" className={textareaCls} rows={2} value={cfg.lodging?.[0]?.desc ?? ''} onChange={e => { const l = cfg.lodging?.[0] ?? { name: '', image: '' }; setCfg({ lodging: [{ ...l, desc: e.target.value }] }); }} placeholder="El Paraíso Hotel está en..." />
        </Field>
        <Field label="Mensaje de la galería">
          <textarea name="template-gallery-message" autoComplete="off" className={textareaCls} rows={2} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Te invitamos a compartir los momentos..." />
        </Field>
        <Field label="Mensaje 'solo adultos'">
          <textarea name="template-no-kids-message" autoComplete="off" className={textareaCls} rows={2} value={cfg.noKidsMessage ?? ''} onChange={e => setCfg({ noKidsMessage: e.target.value })} placeholder="La invitación es solo para adultos." />
        </Field>
        <Field label="Mensaje de confirmación">
          <textarea name="template-rsvp-message" autoComplete="off" className={textareaCls} rows={2} value={cfg.rsvpMessage ?? ''} onChange={e => setCfg({ rsvpMessage: e.target.value })} placeholder="Es muy importante para nosotros confirmar tu asistencia..." />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'passport') {
    return (
      <Wrapper title="Textos de la colección Atlas">
        <Field label="Anuncio">
          <input type="text" name="template-announce" autoComplete="off" className={inputCls} value={cfg.announce ?? ''} onChange={e => setCfg({ announce: e.target.value })} placeholder="Nos casamos" />
        </Field>
        <Field label="Versículo / frase">
          <textarea name="template-verse" autoComplete="off" className={textareaCls} rows={3} value={cfg.verse ?? ''} onChange={e => setCfg({ verse: e.target.value })} placeholder="La cuerda de tres hilos no se rompe fácilmente..." />
        </Field>
        <Field label="Referencia del versículo">
          <input type="text" name="template-verse-ref" autoComplete="off" className={inputCls} value={cfg.verseRef ?? ''} onChange={e => setCfg({ verseRef: e.target.value })} placeholder="(Eclesiastés 4:12)" />
        </Field>
        <Field label="Llamado a la aventura">
          <input type="text" name="template-callout" autoComplete="off" className={inputCls} value={cfg.callout ?? ''} onChange={e => setCfg({ callout: e.target.value })} placeholder="Prepara tus maletas y acompáñanos en esta aventura." />
        </Field>
        <Field label="Pregunta final">
          <input type="text" name="template-callout2" autoComplete="off" className={inputCls} value={cfg.callout2 ?? ''} onChange={e => setCfg({ callout2: e.target.value })} placeholder="¿Te unes?" />
        </Field>
        <Field label="Vestimenta — mujeres" hint="Una indicación por línea." hintId="passport-dress-women-hint">
          <textarea name="template-dress-women" autoComplete="off" aria-describedby="passport-dress-women-hint" className={textareaCls} rows={2} value={linesValue(cfg.dressWomen)} onChange={e => setLines('dressWomen')(e.target.value)} placeholder={'Vestido largo\nEvitar tonos blancos'} />
        </Field>
        <Field label="Vestimenta — hombres" hint="Una indicación por línea." hintId="passport-dress-men-hint">
          <textarea name="template-dress-men" autoComplete="off" aria-describedby="passport-dress-men-hint" className={textareaCls} rows={2} value={linesValue(cfg.dressMen)} onChange={e => setLines('dressMen')(e.target.value)} placeholder="Con traje" />
        </Field>
        <Field label="Mensaje 'sin niños'" hint="Solo se muestra si activas 'Sin niños' en Detalles." hintId="passport-no-kids-hint">
          <textarea name="template-no-kids-message" autoComplete="off" aria-describedby="passport-no-kids-hint" className={textareaCls} rows={3} value={cfg.noKidsMessage ?? ''} onChange={e => setCfg({ noKidsMessage: e.target.value })} placeholder="La invitación es solo para adultos..." />
        </Field>
        <Field label="Mensaje de la galería">
          <textarea name="template-gallery-message" autoComplete="off" className={textareaCls} rows={3} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Comparte los momentos especiales del evento." />
        </Field>
      </Wrapper>
    );
  }

  return null;
}

function Wrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 space-y-4 border-t border-gray-100 pt-4">
      <h3 className="font-outfit text-sm font-semibold leading-5 text-[#302a23]">{title}</h3>
      {children}
    </section>
  );
}
