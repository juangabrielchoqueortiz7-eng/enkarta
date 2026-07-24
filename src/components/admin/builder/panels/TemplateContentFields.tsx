'use client';

import { InvitationParsed, BuilderConfig } from '@/lib/types';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
}

const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit";
const textareaCls = `${inputCls} resize-none`;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-outfit text-gray-500 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 font-outfit mt-1">{hint}</p>}
    </div>
  );
}

/** Editor de campos "ricos" específico de cada plantilla premium (guardados en config). */
export default function TemplateContentFields({ data, onChange }: Props) {
  const cfg = data.config ?? {};
  const setCfg = (patch: Partial<BuilderConfig>) => onChange({ config: { ...cfg, ...patch } });

  // textarea ↔ array (una línea = un elemento)
  const linesValue = (arr?: string[]) => (arr ?? []).join('\n');
  const setLines = (key: keyof BuilderConfig) => (v: string) =>
    setCfg({ [key]: v.split('\n').map(s => s.trim()).filter(Boolean) } as Partial<BuilderConfig>);

  const t = data.template;

  if (t === 'azure') {
    return (
      <Wrapper title="Textos de la plantilla Azure">
        <Field label="Ciudad">
          <input className={inputCls} value={cfg.city ?? ''} onChange={e => setCfg({ city: e.target.value })} placeholder="Bogotá" />
        </Field>
        <Field label="Título de bienvenida">
          <input className={inputCls} value={cfg.welcomeTitle ?? ''} onChange={e => setCfg({ welcomeTitle: e.target.value })} placeholder="Bienvenidos a la invitación de nuestra boda" />
        </Field>
        <Field label="Bendición / encabezado de padres">
          <input className={inputCls} value={cfg.blessing ?? ''} onChange={e => setCfg({ blessing: e.target.value })} placeholder="Con la bendición de Dios y de nuestros padres" />
        </Field>
        <Field label="Mensaje de la galería">
          <textarea className={textareaCls} rows={3} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Comparte los recuerdos de este día especial." />
        </Field>
        <Field label="Mensaje de confirmación (RSVP)">
          <textarea className={textareaCls} rows={2} value={cfg.rsvpMessage ?? ''} onChange={e => setCfg({ rsvpMessage: e.target.value })} placeholder="Es muy importante que nos confirmes tu asistencia." />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'primicia') {
    return (
      <Wrapper title="Textos de la plantilla Primicia">
        <Field label="Descripción de la ceremonia">
          <textarea className={textareaCls} rows={3} value={cfg.ceremonyDesc ?? ''} onChange={e => setCfg({ ceremonyDesc: e.target.value })} placeholder="Un espacio sagrado donde uniremos nuestras vidas..." />
        </Field>
        <Field label="Descripción de la recepción">
          <textarea className={textareaCls} rows={3} value={cfg.receptionDesc ?? ''} onChange={e => setCfg({ receptionDesc: e.target.value })} placeholder="Una celebración llena de alegría y amor." />
        </Field>
        <Field label="Mensaje de confirmación (RSVP)">
          <textarea className={textareaCls} rows={3} value={cfg.rsvpMessage ?? ''} onChange={e => setCfg({ rsvpMessage: e.target.value })} placeholder="Los esperamos con toda la alegría y energía." />
        </Field>
        <Field label="Mensaje de la pareja" hint="Cada salto de línea es un párrafo. (Se edita arriba en 'Mensaje personalizado'.)">
          <textarea className={textareaCls} rows={4} value={data.message ?? ''} onChange={e => onChange({ message: e.target.value })} />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'paradise') {
    return (
      <Wrapper title="Textos de la plantilla Paradise">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Apellido de la novia (script)">
            <input className={inputCls} value={cfg.brideLast ?? ''} onChange={e => setCfg({ brideLast: e.target.value })} placeholder="Ruggeri" />
          </Field>
          <Field label="Apellido del novio (script)">
            <input className={inputCls} value={cfg.groomLast ?? ''} onChange={e => setCfg({ groomLast: e.target.value })} placeholder="Garrido" />
          </Field>
        </div>
        <Field label="Ciudad (vertical en portada)">
          <input className={inputCls} value={cfg.city ?? ''} onChange={e => setCfg({ city: e.target.value })} placeholder="Santa Cruz" />
        </Field>
        <Field label="Bendición / encabezado de padres">
          <input className={inputCls} value={cfg.blessing ?? ''} onChange={e => setCfg({ blessing: e.target.value })} placeholder="Con la bendición de Dios y guiados por el amor de nuestros padres:" />
        </Field>
        <Field label="Versículo / frase">
          <textarea className={textareaCls} rows={3} value={cfg.verse ?? ''} onChange={e => setCfg({ verse: e.target.value })} placeholder="Dos son mejor que uno..." />
        </Field>
        <Field label="Referencia del versículo">
          <input className={inputCls} value={cfg.verseRef ?? ''} onChange={e => setCfg({ verseRef: e.target.value })} placeholder="Eclesiastés 4:9-10" />
        </Field>
        <Field label="Mensaje de regalos">
          <textarea className={textareaCls} rows={3} value={data.gift_message ?? ''} onChange={e => onChange({ gift_message: e.target.value })} placeholder="Su presencia y sus buenos deseos..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre mesa de regalos">
            <input className={inputCls} value={cfg.giftRegistryLabel ?? ''} onChange={e => setCfg({ giftRegistryLabel: e.target.value })} placeholder="falabella." />
          </Field>
          <Field label="Link mesa de regalos">
            <input className={inputCls} value={cfg.giftRegistryUrl ?? ''} onChange={e => setCfg({ giftRegistryUrl: e.target.value })} placeholder="https://..." />
          </Field>
        </div>
        <Field label="URL de imagen QR de regalo">
          <input className={inputCls} value={cfg.giftQrUrl ?? ''} onChange={e => setCfg({ giftQrUrl: e.target.value })} placeholder="https://...qr.png" />
        </Field>
        <Field label="Mensaje 'Solo Adultos'">
          <textarea className={textareaCls} rows={2} value={cfg.noKidsMessage ?? ''} onChange={e => setCfg({ noKidsMessage: e.target.value })} placeholder="Amamos a sus niños, pero la invitación es solo para adultos." />
        </Field>
        <Field label="Mensaje de la galería">
          <textarea className={textareaCls} rows={2} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Te invitamos a capturar y compartir..." />
        </Field>
        <Field label="Mensaje de confirmación (RSVP)">
          <textarea className={textareaCls} rows={3} value={cfg.rsvpMessage ?? ''} onChange={e => setCfg({ rsvpMessage: e.target.value })} placeholder="Es muy importante para nosotros confirmar tu asistencia..." />
        </Field>
        <Field label="Frase de cierre (mayúsculas)">
          <textarea className={textareaCls} rows={2} value={cfg.rsvpClosing ?? ''} onChange={e => setCfg({ rsvpClosing: e.target.value })} placeholder="Creemos que mereces una noche alegre y divertida..." />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'obsidiana') {
    const sponsors = data.sponsors ?? [];
    const setSponsor = (i: number, patch: { role?: string; names?: string }) => {
      const next = sponsors.map((s, j) => (j === i ? { ...s, ...patch } : s));
      onChange({ sponsors: next });
    };
    return (
      <Wrapper title="Textos de la plantilla Obsidiana">
        <Field label="Lugar / fecha en portada">
          <input className={inputCls} value={cfg.datePlace ?? ''} onChange={e => setCfg({ datePlace: e.target.value })} placeholder="Santa Cruz · 2026" />
        </Field>
        <Field label="Frase / versículo de intro">
          <textarea className={textareaCls} rows={3} value={data.message ?? ''} onChange={e => onChange({ message: e.target.value })} placeholder="Lo que Dios juntó, no lo separe el hombre. / Mateo 19:6" />
        </Field>
        <Field label="Bendición / encabezado de padres">
          <input className={inputCls} value={cfg.blessing ?? ''} onChange={e => setCfg({ blessing: e.target.value })} placeholder="Con la bendición de Dios y nuestros padres" />
        </Field>
        <Field label="Mensaje de regalos">
          <textarea className={textareaCls} rows={2} value={data.gift_message ?? ''} onChange={e => onChange({ gift_message: e.target.value })} placeholder="Su presencia es nuestro mejor regalo..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opción 'Lluvia de sobres'">
            <input className={inputCls} value={cfg.giftEnvelopes ?? ''} onChange={e => setCfg({ giftEnvelopes: e.target.value })} placeholder="Lluvia de sobres" />
          </Field>
          <Field label="URL imagen QR regalo">
            <input className={inputCls} value={cfg.giftQrUrl ?? ''} onChange={e => setCfg({ giftQrUrl: e.target.value })} placeholder="https://...qr.png" />
          </Field>
        </div>
        <Field label="Título de agradecimiento">
          <input className={inputCls} value={cfg.thanksTitle ?? ''} onChange={e => setCfg({ thanksTitle: e.target.value })} placeholder="Agradecimiento" />
        </Field>
        <Field label="Mensaje de agradecimiento">
          <textarea className={textareaCls} rows={3} value={cfg.thanksMessage ?? ''} onChange={e => setCfg({ thanksMessage: e.target.value })} placeholder="A Dios, a nuestros padres y padrinos..." />
        </Field>

        {/* Padrinos */}
        <div>
          <label className="block text-xs font-outfit text-gray-500 mb-1">Padrinos (rol + nombres)</label>
          <div className="space-y-2">
            {sponsors.map((s, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-2 space-y-2">
                <div className="flex gap-2">
                  <input className={`${inputCls} flex-1`} value={s.role} onChange={e => setSponsor(i, { role: e.target.value })} placeholder="Padrinos de Civil" />
                  <button type="button" onClick={() => onChange({ sponsors: sponsors.filter((_, j) => j !== i) })} className="text-red-300 hover:text-red-500 px-1">✕</button>
                </div>
                <textarea className={textareaCls} rows={2} value={s.names} onChange={e => setSponsor(i, { names: e.target.value })} placeholder={'Nombre 1\nNombre 2'} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onChange({ sponsors: [...sponsors, { role: '', names: '' }] })} className="mt-2 text-xs text-enkarta-gold hover:underline font-outfit">+ Agregar padrinos</button>
        </div>

        <Field label="Mensaje de la galería">
          <textarea className={textareaCls} rows={2} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Te invitamos a compartir los momentos..." />
        </Field>
        <Field label="Frase de cierre (mayúsculas)">
          <textarea className={textareaCls} rows={2} value={cfg.rsvpClosing ?? ''} onChange={e => setCfg({ rsvpClosing: e.target.value })} placeholder="Creemos que mereces una noche alegre..." />
        </Field>
        <Field label="Mensaje de confirmación">
          <input className={inputCls} value={cfg.rsvpMessage ?? ''} onChange={e => setCfg({ rsvpMessage: e.target.value })} placeholder="Es muy importante que nos confirmes tu asistencia." />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'dolcevita' || t === 'carmesi_v2' || t === 'napoly' || t === 'euforia' || t === 'rosegold' || t === 'allegria' || t === 'provenza') {
    const sponsors = data.sponsors ?? [];
    const setSponsor = (i: number, patch: { role?: string; names?: string }) =>
      onChange({ sponsors: sponsors.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
    return (
      <Wrapper title="Textos de la plantilla Dolce Vita">
        <Field label="Ciudad (marco de fecha)">
          <input className={inputCls} value={cfg.dateCity ?? ''} onChange={e => setCfg({ dateCity: e.target.value })} placeholder="La Paz" />
        </Field>
        <Field label="Mensaje de intro">
          <textarea className={textareaCls} rows={3} value={data.message ?? ''} onChange={e => onChange({ message: e.target.value })} placeholder="Casarse es de locos, pero es que nos queremos con locura..." />
        </Field>
        <Field label="Bendición / encabezado de padres">
          <input className={inputCls} value={cfg.blessing ?? ''} onChange={e => setCfg({ blessing: e.target.value })} placeholder="Con la bendición de Dios y de nuestros padres" />
        </Field>

        {/* Padrinos */}
        <div>
          <label className="block text-xs font-outfit text-gray-500 mb-1">Padrinos (rol + nombres)</label>
          <div className="space-y-2">
            {sponsors.map((s, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-2 space-y-2">
                <div className="flex gap-2">
                  <input className={`${inputCls} flex-1`} value={s.role} onChange={e => setSponsor(i, { role: e.target.value })} placeholder="Padrinos" />
                  <button type="button" onClick={() => onChange({ sponsors: sponsors.filter((_, j) => j !== i) })} className="text-red-300 hover:text-red-500 px-1">✕</button>
                </div>
                <textarea className={textareaCls} rows={2} value={s.names} onChange={e => setSponsor(i, { names: e.target.value })} placeholder={'Nombre 1\nNombre 2'} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onChange({ sponsors: [...sponsors, { role: 'Padrinos', names: '' }] })} className="mt-2 text-xs text-enkarta-gold hover:underline font-outfit">+ Agregar padrinos</button>
        </div>

        <Field label="Mensaje de regalos">
          <textarea className={textareaCls} rows={2} value={data.gift_message ?? ''} onChange={e => onChange({ gift_message: e.target.value })} placeholder="Su presencia y sus buenos deseos..." />
        </Field>
        <Field label="Frase de gracias (regalo)">
          <input className={inputCls} value={cfg.giftThanks ?? ''} onChange={e => setCfg({ giftThanks: e.target.value })} placeholder="Gracias por tu muestra de cariño" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opción 'efectivo en sobres'">
            <input className={inputCls} value={cfg.giftCash ?? ''} onChange={e => setCfg({ giftCash: e.target.value })} placeholder="Efectivo en sobres (Habrá un buzón)" />
          </Field>
          <Field label="Opción 'obsequios'">
            <input className={inputCls} value={cfg.giftOther ?? ''} onChange={e => setCfg({ giftOther: e.target.value })} placeholder="Obsequios tradicionales (Escríbenos)" />
          </Field>
        </div>
        <Field label="URL imagen QR (cuenta bancaria)">
          <input className={inputCls} value={cfg.giftQrUrl ?? ''} onChange={e => setCfg({ giftQrUrl: e.target.value })} placeholder="https://...qr.png" />
        </Field>
        <Field label="Hospedaje — descripción" hint="La imagen y el nombre del hotel van en Medios / Config.">
          <textarea className={textareaCls} rows={2} value={cfg.lodging?.[0]?.desc ?? ''} onChange={e => { const l = cfg.lodging?.[0] ?? { name: '', image: '' }; setCfg({ lodging: [{ ...l, desc: e.target.value }] }); }} placeholder="El Paraíso Hotel está en..." />
        </Field>
        <Field label="Hospedaje — contacto">
          <input className={inputCls} value={cfg.lodgingContact ?? ''} onChange={e => setCfg({ lodgingContact: e.target.value })} placeholder="Jazmin Smith" />
        </Field>
        <Field label="Mensaje de la galería">
          <textarea className={textareaCls} rows={2} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Te invitamos a compartir los momentos..." />
        </Field>
        <Field label="Mensaje 'solo adultos'">
          <textarea className={textareaCls} rows={2} value={cfg.noKidsMessage ?? ''} onChange={e => setCfg({ noKidsMessage: e.target.value })} placeholder="Amamos a sus niños, pero la invitación es solo para adultos." />
        </Field>
        <Field label="Frase de cierre (confirmación)">
          <input className={inputCls} value={cfg.rsvpClosing ?? ''} onChange={e => setCfg({ rsvpClosing: e.target.value })} placeholder="No olvides confirmar tu asistencia" />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'grazia') {
    const accts = cfg.giftAccounts ?? [];
    const setAcct = (i: number, patch: { name?: string; account?: string }) =>
      setCfg({ giftAccounts: accts.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
    return (
      <Wrapper title="Textos de la plantilla Grazia">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre completo del novio">
            <input className={inputCls} value={cfg.groomName ?? ''} onChange={e => setCfg({ groomName: e.target.value })} placeholder="Lorenzo Bianchi" />
          </Field>
          <Field label="Nombre completo de la novia">
            <input className={inputCls} value={cfg.brideName ?? ''} onChange={e => setCfg({ brideName: e.target.value })} placeholder="Isabella Moretti" />
          </Field>
        </div>
        <Field label="Texto sobre los nombres (portada)">
          <input className={inputCls} value={cfg.coverLabel ?? ''} onChange={e => setCfg({ coverLabel: e.target.value })} placeholder="La boda de" />
        </Field>
        <Field label="Mensaje 'Save the Date'">
          <textarea className={textareaCls} rows={3} value={cfg.saveDateMsg ?? ''} onChange={e => setCfg({ saveDateMsg: e.target.value })} placeholder="Después de mucho tiempo caminando juntos..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="URL foto circular novio">
            <input className={inputCls} value={cfg.groomPhoto ?? ''} onChange={e => setCfg({ groomPhoto: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="URL foto circular novia">
            <input className={inputCls} value={cfg.bridePhoto ?? ''} onChange={e => setCfg({ bridePhoto: e.target.value })} placeholder="https://..." />
          </Field>
        </div>
        <Field label="Título de la historia">
          <input className={inputCls} value={cfg.storyTitle ?? ''} onChange={e => setCfg({ storyTitle: e.target.value })} placeholder="Nuestra Historia" />
        </Field>
        <Field label="Mensaje de la historia">
          <textarea className={textareaCls} rows={4} value={cfg.storyMessage ?? ''} onChange={e => setCfg({ storyMessage: e.target.value })} placeholder="Nuestros caminos se unieron..." />
        </Field>
        <Field label="Mensaje de regalos">
          <textarea className={textareaCls} rows={2} value={data.gift_message ?? ''} onChange={e => onChange({ gift_message: e.target.value })} placeholder="El mejor regalo que nos das es tu presencia..." />
        </Field>

        {/* Cuentas bancarias */}
        <div>
          <label className="block text-xs font-outfit text-gray-500 mb-1">Cuentas bancarias (nombre + cuenta)</label>
          <div className="space-y-2">
            {accts.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input className={`${inputCls} flex-1`} value={a.name} onChange={e => setAcct(i, { name: e.target.value })} placeholder="Lorenzo Bianchi" />
                <input className={`${inputCls} flex-1`} value={a.account} onChange={e => setAcct(i, { account: e.target.value })} placeholder="CTA. 1234567" />
                <button type="button" onClick={() => setCfg({ giftAccounts: accts.filter((_, j) => j !== i) })} className="text-red-300 hover:text-red-500 px-1">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setCfg({ giftAccounts: [...accts, { name: '', account: '' }] })} className="mt-2 text-xs text-enkarta-gold hover:underline font-outfit">+ Agregar cuenta</button>
        </div>

        <Field label="URL imagen QR de regalo">
          <input className={inputCls} value={cfg.giftQrUrl ?? ''} onChange={e => setCfg({ giftQrUrl: e.target.value })} placeholder="https://...qr.png" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Título código vestimenta">
            <input className={inputCls} value={cfg.dressCodeTitle ?? ''} onChange={e => setCfg({ dressCodeTitle: e.target.value })} placeholder="Código de vestimenta" />
          </Field>
          <Field label="Hospedaje — contacto">
            <input className={inputCls} value={cfg.lodgingContact ?? ''} onChange={e => setCfg({ lodgingContact: e.target.value })} placeholder="Jazmin Smith" />
          </Field>
        </div>
        <Field label="Hospedaje — descripción">
          <textarea className={textareaCls} rows={2} value={cfg.lodging?.[0]?.desc ?? ''} onChange={e => { const l = cfg.lodging?.[0] ?? { name: '', image: '' }; setCfg({ lodging: [{ ...l, desc: e.target.value }] }); }} placeholder="El Paraíso Hotel está en..." />
        </Field>
        <Field label="Mensaje de la galería">
          <textarea className={textareaCls} rows={2} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Te invitamos a compartir los momentos..." />
        </Field>
        <Field label="Mensaje 'solo adultos'">
          <textarea className={textareaCls} rows={2} value={cfg.noKidsMessage ?? ''} onChange={e => setCfg({ noKidsMessage: e.target.value })} placeholder="La invitación es solo para adultos." />
        </Field>
        <Field label="Mensaje de confirmación">
          <textarea className={textareaCls} rows={2} value={cfg.rsvpMessage ?? ''} onChange={e => setCfg({ rsvpMessage: e.target.value })} placeholder="Es muy importante para nosotros confirmar tu asistencia..." />
        </Field>
      </Wrapper>
    );
  }

  if (t === 'passport') {
    return (
      <Wrapper title="Textos de la plantilla Passport">
        <Field label="Anuncio">
          <input className={inputCls} value={cfg.announce ?? ''} onChange={e => setCfg({ announce: e.target.value })} placeholder="Nos casamos" />
        </Field>
        <Field label="Versículo / frase">
          <textarea className={textareaCls} rows={3} value={cfg.verse ?? ''} onChange={e => setCfg({ verse: e.target.value })} placeholder="La cuerda de tres hilos no se rompe fácilmente..." />
        </Field>
        <Field label="Referencia del versículo">
          <input className={inputCls} value={cfg.verseRef ?? ''} onChange={e => setCfg({ verseRef: e.target.value })} placeholder="(Eclesiastés 4:12)" />
        </Field>
        <Field label="Llamado a la aventura">
          <input className={inputCls} value={cfg.callout ?? ''} onChange={e => setCfg({ callout: e.target.value })} placeholder="Prepara tus maletas y acompáñanos en esta aventura." />
        </Field>
        <Field label="Pregunta final">
          <input className={inputCls} value={cfg.callout2 ?? ''} onChange={e => setCfg({ callout2: e.target.value })} placeholder="¿Te unes?" />
        </Field>
        <Field label="Vestimenta — mujeres" hint="Una indicación por línea.">
          <textarea className={textareaCls} rows={2} value={linesValue(cfg.dressWomen)} onChange={e => setLines('dressWomen')(e.target.value)} placeholder={'Vestido largo\nEvitar tonos blancos'} />
        </Field>
        <Field label="Vestimenta — hombres" hint="Una indicación por línea.">
          <textarea className={textareaCls} rows={2} value={linesValue(cfg.dressMen)} onChange={e => setLines('dressMen')(e.target.value)} placeholder="Con traje" />
        </Field>
        <Field label="Mensaje 'sin niños'" hint="Solo se muestra si activas 'Sin niños' en Detalles.">
          <textarea className={textareaCls} rows={3} value={cfg.noKidsMessage ?? ''} onChange={e => setCfg({ noKidsMessage: e.target.value })} placeholder="La invitación es solo para adultos..." />
        </Field>
        <Field label="Mensaje de la galería">
          <textarea className={textareaCls} rows={3} value={cfg.galleryMessage ?? ''} onChange={e => setCfg({ galleryMessage: e.target.value })} placeholder="Comparte los momentos especiales del evento." />
        </Field>
      </Wrapper>
    );
  }

  return null;
}

function Wrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pt-3 border-t border-gray-100">
      <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}
