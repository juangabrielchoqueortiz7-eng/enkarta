# Proceso comercial y lanzamiento de Enkarta

## Objetivo

Atender cada consulta con el mismo alcance, registrar su origen y no pedir una reserva sin entregar primero un resumen escrito. El panel **Admin → Ventas** concentra la propuesta, las respuestas rápidas y el embudo. **Admin → Lanzamiento** contiene las piezas y el calendario orgánico de 14 días.

## Flujo de una venta

1. **Nueva consulta:** responder durante el horario comercial en menos de 30 minutos cuando sea posible. Buscar la referencia `EK-XXXXXXXX` incluida en WhatsApp.
2. **Diagnóstico:** confirmar tipo y fecha del evento, diseño, paquete, adicionales y disponibilidad.
3. **Propuesta:** completar el generador del panel y copiar el resumen. Verificar cliente, total, reserva, saldo, plazo y rondas antes de enviarlo.
4. **Reserva:** solicitar 200 Bs únicamente después de la aceptación del resumen. Confirmar por escrito el importe y la referencia del pedido.
5. **Materiales:** pedir nombres, agenda, ubicaciones, fotografías, música, dress code y regalos. El plazo comienza con reserva y materiales completos.
6. **Producción:** marcar el contacto como `reserved`, crear la invitación y ejecutar el control de calidad del paquete.
7. **Cierre:** después de aprobar, cobrar el saldo, publicar, entregar accesos y marcar `won` con el ingreso real. Si no continúa, marcar `lost` con un motivo breve y no copiar conversaciones.

## Configuración que no debe vivir en el código

- `ENKARTA_PAYMENT_INSTRUCTIONS`: instrucciones breves del medio de pago o QR empresarial. Solo se muestran dentro del panel autenticado.
- `ENKARTA_SALES_HOURS`: horario informado al equipo comercial.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: identificador `G-...` de Google Analytics.
- `NEXT_PUBLIC_META_PIXEL_ID`: identificador numérico de Meta Pixel.
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`: token de verificación de Search Console.

Google Analytics y Meta Pixel permanecen totalmente desactivados mientras sus variables estén vacías. Cuando se configuran, solo se cargan después de que el visitante elija **Permitir medición**.

## Lanzamiento orgánico

1. Descargar desde **Admin → Lanzamiento** la pieza correspondiente al día.
2. Copiar el texto y su enlace UTM desde la misma tarjeta.
3. Publicar una sola versión del enlace; no borrar sus parámetros.
4. Responder contactos y actualizar estado, ingreso y nota en **Admin → Ventas**.
5. En los días 7 y 14 comparar visitas, aperturas de WhatsApp, conversaciones, reservas y ventas.
6. No iniciar pauta pagada hasta completar el ciclo de atención y reconocer qué pieza genera conversaciones calificadas.

## Monitoreo

`.github/workflows/production-health.yml` consulta `https://enkarta.vercel.app/api/health` cada cinco minutos. Ante una falla crea una sola incidencia abierta en GitHub y añade actualizaciones mientras persiste. Cuando producción vuelve a responder, comenta y cierra la incidencia.

Revisar que las notificaciones de GitHub Actions e incidencias estén habilitadas para la cuenta operativa. El chequeo manual sigue disponible con `npm run monitor:production`.
