import type { Metadata } from 'next';
import LegalShell, { LegalList, LegalSection } from '@/components/legal/LegalShell';

export const metadata: Metadata = { title: 'Privacidad y tratamiento de datos', description: 'Política de privacidad, tratamiento, conservación y eliminación de datos de Enkarta.', alternates: { canonical: '/legal/privacidad' } };

export default function PrivacyPage() {
  return <LegalShell eyebrow="Privacidad" title="Tratamiento responsable de datos" summary="Grupo JABA, operando bajo la marca Enkarta, trata únicamente la información necesaria para diseñar, publicar y operar la invitación contratada.">
    <LegalSection title="Datos que podemos tratar">
      <LegalList>
        <li><strong>Cliente:</strong> nombre, contacto, datos del evento, instrucciones, comunicaciones, pedido y comprobantes.</li>
        <li><strong>Invitados:</strong> nombre, contacto opcional, grupo, pases, asistencia, mensaje, mesa, QR y registro de ingreso cuando el paquete lo incluye.</li>
        <li><strong>Contenido:</strong> fotografías, textos, música, lugares y otros materiales entregados para la invitación.</li>
        <li><strong>Datos técnicos:</strong> eventos agregados de uso y registros de seguridad. La analítica propia de la invitación no almacena nombres, teléfonos, mensajes ni IP cruda.</li>
        <li><strong>Interés comercial:</strong> fuente o campaña, página visitada, diseño, paquete, referencia de consulta y avance manual entre contacto, reserva y venta. El embudo no almacena la IP, el teléfono ni el contenido de WhatsApp.</li>
      </LegalList>
    </LegalSection>
    <LegalSection title="Finalidades">
      <p>Utilizamos la información para preparar el diseño, personalizar enlaces, recibir confirmaciones, administrar cupos y mesas, controlar ingresos, prestar soporte, prevenir abuso y cumplir obligaciones comerciales o legales.</p>
      <p>Los datos de invitados no se utilizan para publicidad de Enkarta ni se venden. Una campaña comercial de Grupo JABA no recibe nombres, teléfonos, respuestas, QR o mensajes de invitados.</p>
    </LegalSection>
    <LegalSection title="Responsabilidades y accesos">
      <p>El cliente debe contar con autorización suficiente para proporcionarnos fotografías y datos de sus invitados, informarles sobre el uso de la invitación y mantener actualizada la lista.</p>
      <p>El acceso se separa por función: el cliente revisor ve el diseño, el anfitrión accede a la operación contratada y el personal de puerta solo controla ingresos. Proveedores de alojamiento y base de datos pueden procesar información técnica exclusivamente para operar el servicio y bajo medidas de seguridad.</p>
    </LegalSection>
    <LegalSection id="conservacion" title="Conservación y eliminación">
      <LegalList>
        <li>La invitación pública permanece disponible después del evento durante 30 días en Plus, 60 días en Premium y 90 días en Exclusive, salvo ampliación acordada.</li>
        <li>Al terminar esa vigencia, el contenido público se cierra. Los datos operativos pasan a archivo privado por hasta 30 días para exportación, soporte o recuperación.</li>
        <li>Terminado el archivo privado, se eliminan o anonimizan dentro de los siguientes 15 días hábiles, salvo ampliación solicitada, reclamo activo u obligación legal.</li>
        <li>Las copias de respaldo rotativas pueden conservar fragmentos cifrados hasta 30 días adicionales antes de su sustitución.</li>
        <li>Facturas, comprobantes y registros contractuales se conservan durante el plazo exigido por la normativa aplicable.</li>
        <li>Los eventos anónimos y referencias del embudo comercial se consultan por 180 días. Los pedidos que se convierten en clientes pasan a los plazos contractuales y fiscales correspondientes.</li>
      </LegalList>
      <p>El cliente puede pedir una exportación o eliminación anticipada. Primero verificaremos su identidad y autoridad sobre la invitación. La eliminación no incluye información que deba conservarse por obligación fiscal, reclamo o seguridad.</p>
    </LegalSection>
    <LegalSection title="Derechos y solicitudes">
      <p>El titular puede solicitar información, corrección, actualización, exportación o eliminación. La solicitud debe identificar al titular, la invitación relacionada y el derecho que desea ejercer. Confirmaremos recepción y comunicaremos el resultado o cualquier impedimento legal.</p>
      <p>Si se produce un incidente que pueda afectar significativamente la privacidad o disponibilidad, Grupo JABA preservará evidencia, limitará el acceso comprometido y comunicará las medidas pertinentes a las personas responsables del evento.</p>
    </LegalSection>
  </LegalShell>;
}
