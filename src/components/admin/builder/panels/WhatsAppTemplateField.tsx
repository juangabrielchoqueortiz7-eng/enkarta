'use client';
import { useId } from 'react';
import { prepareWhatsAppMessage, WHATSAPP_VARIABLES, MAX_WHATSAPP_TEMPLATE, type MessagePurpose } from '@/lib/whatsapp-message';
import WhatsAppMessagePreview from '@/components/admin/host/WhatsAppMessagePreview';

const example = { publicId: 'DEMO-FAMILIA', name: 'Familia Pérez (ejemplo)', passes: 4, tableNo: '7', accessCode: 'ENK-EJEMPLO' };
export default function WhatsAppTemplateField({ value, purpose, change }: { value?: string; purpose: MessagePurpose; change: (value: string) => void }) {
  const id = useId();
  const message = prepareWhatsAppMessage(value, example, 'https://ejemplo.invalid/i/tu-evento?g=DEMO-FAMILIA', purpose);
  return <section className="min-w-0 space-y-3">
    <label htmlFor={id} className="block text-sm font-medium">{purpose === 'reminder' ? 'Recordatorio' : 'Invitación'}</label>
    <textarea id={id} name={purpose === 'reminder' ? 'whatsappReminderTemplate' : 'whatsappTemplate'} aria-invalid={!message.ready} aria-describedby={`${id}-help${message.ready ? '' : ` ${id}-issues`}`} rows={3} maxLength={MAX_WHATSAPP_TEMPLATE} value={value ?? ''} onChange={event => change(event.target.value)} placeholder="Hola {nombre}, tu invitación personal: {link}…" className="min-h-11 w-full rounded-xl border border-gray-300 bg-white p-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#516749]" />
    <p id={`${id}-help`} className="text-xs leading-relaxed text-gray-600">Deja el campo vacío para usar el predeterminado. Incluye {'{link}'} o {'{link_unico}'}. Variables: {WHATSAPP_VARIABLES.map(value => `{${value}}`).join(', ')}.</p>
    <p className="text-xs text-gray-600">Ejemplo ficticio; el enlace y los datos se reemplazan por los de cada invitado. Estos cambios siguen el guardado del diseño.</p>
    <WhatsAppMessagePreview message={message} issuesId={`${id}-issues`} />
    {!message.ready && <button type="button" onClick={() => change('')} className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#516749]">Restablecer mensaje predeterminado</button>}
  </section>;
}
