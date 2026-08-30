import type { Metadata } from 'next';
import LegalShell, { LegalList, LegalSection } from '@/components/legal/LegalShell';

export const metadata: Metadata = { title: 'Pagos, cancelaciones y devoluciones', description: 'Política de reserva, saldo, comprobantes, cancelaciones y devoluciones de Enkarta.', alternates: { canonical: '/legal/pagos' } };

export default function PaymentsPage() {
  return <LegalShell eyebrow="Política comercial" title="Pagos, cancelaciones y devoluciones" summary="La reserva asegura un espacio de producción y se descuenta del precio total. Cada pedido debe indicar importe, moneda, paquete, adicionales y saldo pendiente.">
    <LegalSection title="Reserva y saldo">
      <LegalList>
        <li>La reserva estándar es de 200 Bs y forma parte del precio total, no es un cargo adicional.</li>
        <li>Enkarta confirma por escrito la recepción y entrega un número o referencia de pedido.</li>
        <li>El saldo se paga después de aprobar el diseño y antes de publicación, activación de accesos o entrega operativa.</li>
        <li>Todo adicional se informa y aprueba antes de ejecutarlo.</li>
        <li>Grupo JABA emite el documento comercial o fiscal que corresponda conforme a sus obligaciones vigentes.</li>
      </LegalList>
    </LegalSection>
    <LegalSection title="Cancelación por el cliente">
      <p>Si la cancelación ocurre antes de que Enkarta inicie el trabajo, se devuelve la reserva completa. Si el trabajo ya comenzó pero aún no se entregó la primera propuesta, se devuelve la parte no consumida después de informar el trabajo efectivamente realizado.</p>
      <p>Después de entregar la primera propuesta, la reserva se aplica al trabajo de producción ya prestado y normalmente no se devuelve por cambio de decisión. Esto no elimina el derecho a devolución, corrección o resarcimiento cuando exista incumplimiento atribuible a Enkarta o una norma obligatoria disponga otra solución.</p>
    </LegalSection>
    <LegalSection title="Incumplimiento o imposibilidad de entrega">
      <p>Si Grupo JABA cancela el servicio o no puede entregar el alcance contratado, devuelve los importes correspondientes a la parte no prestada. Si el problema es corregible, el cliente puede solicitar primero la corrección sin costo y un nuevo plazo razonable.</p>
      <p>Si la primera propuesta no se entrega dentro del plazo escrito por una causa exclusivamente atribuible a Enkarta, el cliente puede aceptar una nueva fecha o cancelar y solicitar la devolución de los importes pagados por la invitación. Materiales incompletos, respuestas pendientes, cambios de alcance, fuerza mayor o interrupciones externas razonablemente comunicadas suspenden esta garantía mientras exista el impedimento.</p>
      <p>Una caída temporal de un proveedor externo no se considera por sí sola cancelación definitiva. Enkarta deberá comunicar el incidente y ejecutar las medidas de recuperación disponibles.</p>
    </LegalSection>
    <LegalSection title="Devoluciones y comprobación">
      <p>Las devoluciones se realizan, cuando sea posible, por el mismo medio utilizado para el pago. Enkarta informará importe, motivo y fecha de procesamiento. Los tiempos propios del banco o plataforma de pago no dependen de Grupo JABA.</p>
      <p>El cliente debe conservar la confirmación del pedido y comprobante. Las condiciones particulares que mejoren esta política deben quedar escritas en el resumen comercial.</p>
    </LegalSection>
    <LegalSection title="Disputas y derechos del consumidor">
      <p>Primero intentaremos resolver cualquier diferencia mediante el canal de soporte, conservando pedido, versiones y comprobantes. Esta política no restringe derechos irrenunciables ni impide acudir a las autoridades competentes.</p>
    </LegalSection>
  </LegalShell>;
}
