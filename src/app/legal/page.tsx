import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell, { LegalSection } from '@/components/legal/LegalShell';

export const metadata: Metadata = { title: 'Centro legal by Grupo JABA', description: 'Información legal, privacidad, términos y políticas comerciales de Enkarta.', alternates: { canonical: '/legal' } };

const documents = [
  { href: '/legal/privacidad', title: 'Privacidad y datos', text: 'Qué recopilamos, para qué se utiliza, quién puede acceder y cómo solicitar corrección, exportación o eliminación.' },
  { href: '/legal/terminos', title: 'Términos del servicio', text: 'Alcance de los paquetes, contratación, responsabilidades, entrega, correcciones, vigencia y soporte.' },
  { href: '/legal/pagos', title: 'Pagos y cancelaciones', text: 'Reserva de 200 Bs, saldo, comprobantes, cancelaciones, devoluciones y solución de incumplimientos.' },
];

export default function LegalIndexPage() {
  return <LegalShell eyebrow="Transparencia comercial" title="Información clara antes de contratar" summary="Enkarta es una marca comercial operada por Grupo JABA. Estos documentos explican las condiciones del servicio en lenguaje directo y forman parte del resumen de cada pedido.">
    <LegalSection title="Elige el documento que necesitas">
      <div className="grid gap-4 sm:grid-cols-2">
        {documents.map(document => <Link key={document.href} href={document.href} className="rounded-2xl border border-[#ded4c5] p-5 transition hover:-translate-y-0.5 hover:border-[#b8975a] hover:shadow-lg">
          <strong className="block font-playfair text-xl text-[#3f372c]">{document.title}</strong>
          <span className="mt-2 block text-sm leading-6 text-[#756a5c]">{document.text}</span>
          <span className="mt-4 block text-xs font-semibold text-[#9a7e4d]">Leer documento →</span>
        </Link>)}
      </div>
    </LegalSection>
    <LegalSection title="Cómo se incorporan a una contratación">
      <p>Antes de recibir una reserva, Enkarta entrega un resumen con paquete, precio, plazo, adicionales y enlaces a estos documentos. La contratación queda confirmada cuando el cliente acepta el resumen y Enkarta confirma la recepción de la reserva.</p>
      <p>Si una condición particular acordada por escrito mejora estas políticas para el cliente, esa condición se añade al resumen del pedido. Ninguna comunicación informal puede reducir derechos reconocidos por normas obligatorias.</p>
    </LegalSection>
  </LegalShell>;
}
