import type { Metadata } from 'next';
import LegalShell, { LegalList, LegalSection } from '@/components/legal/LegalShell';

export const metadata: Metadata = { title: 'Términos del servicio', description: 'Condiciones de contratación, entrega, cambios, vigencia y soporte de las invitaciones Enkarta.', alternates: { canonical: '/legal/terminos' } };

export default function TermsPage() {
  return <LegalShell eyebrow="Condiciones de servicio" title="Términos claros para cada invitación" summary="Estos términos regulan los servicios prestados por Grupo JABA bajo la marca Enkarta. El resumen del pedido identifica el paquete y cualquier condición particular acordada.">
    <LegalSection title="Contratación y alcance">
      <p>La contratación queda confirmada cuando el cliente recibe y acepta un resumen escrito con paquete, precio, plazo, adicionales y estos documentos, y Enkarta confirma la reserva. Las conversaciones previas no añaden funciones que no aparezcan en ese resumen.</p>
      <p>Plus, Premium y Exclusive mantienen los servicios y límites publicados al momento de la contratación. Los adicionales requieren alcance, precio y aprobación escritos.</p>
    </LegalSection>
    <LegalSection title="Responsabilidades del cliente">
      <LegalList>
        <li>Entregar datos, textos y materiales completos y correctos.</li>
        <li>Contar con derechos o autorización para usar fotografías, música, marcas y otros contenidos.</li>
        <li>Revisar nombres, fechas, lugares, enlaces, pases y textos antes de aprobar.</li>
        <li>Proteger sus credenciales y limitar el acceso a anfitriones o personal autorizado.</li>
        <li>Informar a sus invitados sobre la invitación y el tratamiento de sus datos.</li>
      </LegalList>
    </LegalSection>
    <LegalSection id="entrega" title="Entrega y rondas de cambios">
      <p>El plazo comienza el siguiente día hábil después de recibir la reserva y todos los materiales necesarios. La meta de primera entrega es: Plus en 3 días hábiles, Premium en 4 y Exclusive en 5.</p>
      <p>Si Enkarta incumple el plazo escrito de primera propuesta por una causa exclusivamente atribuible a Grupo JABA, el cliente puede aceptar un nuevo plazo razonable o cancelar y solicitar la devolución de los importes pagados por la invitación. Esta garantía no aplica durante pausas por materiales incompletos, respuestas pendientes, cambios de alcance, fuerza mayor o indisponibilidad ajena razonablemente comunicada.</p>
      <p>Plus incluye 1 ronda, Premium 2 y Exclusive 4. Una ronda es una lista consolidada de observaciones enviada en una sola ocasión. Corregir un defecto atribuible a Enkarta no consume rondas.</p>
      <p>Cambiar de plantilla, reconstruir una estructura aprobada, sustituir masivamente contenido o reprogramar el evento puede modificar el plazo y requerir una cotización adicional. Si faltan materiales o respuestas del cliente, el plazo queda suspendido hasta recibirlos.</p>
    </LegalSection>
    <LegalSection title="Aprobación, publicación y vigencia">
      <p>La aprobación identifica la versión exacta aceptada. Después de la aprobación se paga el saldo y Enkarta realiza la publicación, entrega accesos y comprobación final. Ajustes solicitados después de aprobar pueden cotizarse como servicio post-entrega.</p>
      <p>La vigencia pública posterior al evento es de 30 días para Plus, 60 para Premium y 90 para Exclusive. Una ampliación debe registrarse por escrito antes de aplicarse.</p>
    </LegalSection>
    <LegalSection title="Disponibilidad y servicios externos">
      <p>Enkarta aplica controles razonables de seguridad, respaldo y recuperación. No puede garantizar funcionamiento ininterrumpido de internet, WhatsApp, mapas, música, alojamiento u otros proveedores externos. Ante una interrupción propia, se priorizará recuperación, información al cliente y, cuando corresponda, restauración de la última versión estable.</p>
    </LegalSection>
    <LegalSection title="Contenido, suspensión y reclamos">
      <p>El cliente conserva derechos sobre los materiales que entrega y autoriza su tratamiento para prestar el servicio. Enkarta conserva sus plantillas, código, componentes y metodología; la contratación no transfiere esos activos.</p>
      <p>Podemos suspender contenido ilegal, fraudulento, dañino, que vulnere derechos de terceros o que comprometa la plataforma. Antes de una suspensión ordinaria se intentará informar al cliente; un riesgo urgente puede requerir bloqueo inmediato.</p>
      <p>Los reclamos deben identificar pedido, hecho y solución solicitada. Enkarta acusará recepción y dará seguimiento por el canal informado en el pedido, sin limitar los derechos obligatorios del consumidor.</p>
    </LegalSection>
  </LegalShell>;
}
