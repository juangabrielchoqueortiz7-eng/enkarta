'use client';
import { MAX_WHATSAPP_MESSAGE, type PreparedWhatsAppMessage } from '@/lib/whatsapp-message';

export default function WhatsAppMessagePreview({ message, usingDefault, useDefault, issuesId }: {
  message: PreparedWhatsAppMessage; usingDefault?: boolean; useDefault?: () => void; issuesId?: string;
}) {
  return <div className="min-w-0 space-y-3 text-sm">
    <div role="region" aria-label="Vista previa del mensaje" className="rounded-xl bg-[#faf9f6] p-3">
      <p className="mb-2 font-medium text-gray-700">Vista previa del mensaje</p>
      <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-gray-800">{message.text.slice(0, MAX_WHATSAPP_MESSAGE + 1)}</p>
    </div>
    {!!message.issues.length && <div id={issuesId} role="alert" className="space-y-2 rounded-xl bg-amber-50 p-3 text-amber-950"><p className="font-medium">Revisa el mensaje antes de abrir WhatsApp</p><ul className="list-disc space-y-1 pl-4">{message.issues.map(issue => <li key={issue.code} className="break-words">{issue.message}</li>)}</ul>
      {useDefault && message.issues.some(issue => issue.code !== 'INVALID_LINK') && <button type="button" onClick={useDefault} className="min-h-11 rounded-lg border border-amber-700 px-3 py-2 text-left hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800">Usar mensaje predeterminado para este contacto</button>}
    </div>}
    {usingDefault && <p role="status" className="text-sm text-gray-600">Usas el mensaje predeterminado solo para esta revisión. La plantilla guardada se conserva.</p>}
  </div>;
}
