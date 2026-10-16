# Recorrido comercial: encargo al equipo y constructor de Socios

Revisión del 16 de octubre de 2026. Son dos servicios distintos: contratar una
invitación al equipo por evento, o usar el constructor con una suscripción de Socios.
Se conservan los precios, contratos, colecciones y recursos originales.

## Catálogo y elección

Cada ficha del catálogo mantiene su muestra original y el precio por evento. La
acción comercial se llama **Encargar al equipo** y conserva diseño, paquete y
atribución en el flujo de contacto existente. **Usar en el constructor de Socios**
abre el acceso de Socios con ese diseño seleccionado. La explicación distingue
el paquete por evento de la suscripción mensual antes de que el visitante elija.

El acceso con Google, su cancelación, el middleware y los guards de página conservan
una continuación validada. Solo se permiten panel, nueva invitación y constructor
con UUID; se descartan destinos externos, controles, barras invertidas y parámetros
ajenos al recorrido. El diseño elegido aparece primero y requiere **Crear borrador**:
entrar o recargar nunca crea una invitación automáticamente. Elegir un plan en la
landing abre **Suscripción y pagos** con ese plan, sin generar una solicitud ni cobrar.

El constructor de Socios mantiene su permiso de propietario y separa borrador,
vista previa y publicación. Su error de publicación ofrece abrir suscripción/pagos
en otra pestaña, conservando el editor. Las cuotas de creación incluyen borradores;
se muestran los límites reales en lugar de prometer diseño «sin límite».

## Pago manual

- **Referencia preparada** indica una solicitud pendiente sin evidencia adjunta.
  No equivale a pagar, activar ni estar en revisión.
- **Comprobante en revisión** aparece al adjuntar archivo o número de transacción.
  `quote_locked_at` permite reconocer evidencia solo de texto sin exponer su contenido
  en el listado de cuenta. La activación depende de aprobación manual del equipo.
- La referencia muestra su plan, periodo, forma e importe guardados. Si la selección
  cambia, se bloquea adjuntar evidencia hasta actualizar la referencia o recuperar
  sus datos. Una solicitud en revisión mantiene la cotización bloqueada en servidor
  y también en la interfaz; adjuntar evidencia no altera el periodo ya pagado.
- Preparar, adjuntar, retirar y actualizar estado comparten un bloqueo de operación.
  Ante un resultado incierto se exige **Actualizar estado** antes de repetir escrituras.
  No hay reintentos automáticos de cobro ni operaciones bancarias desde estos botones.
- El error de red no se presenta como éxito, una lista vacía o una cuenta sin pagos.
  Se mantiene la última información y el borrador de evidencia al fallar su envío.
  El panel solo anuncia enlace copiado después de que el portapapeles responda.
- Retirar una solicitud pide confirmación y aclara que no reembolsa dinero ni cancela
  una transferencia. El historial distingue preparación, revisión, aprobación,
  rechazo y cancelación. Los estados son hechos de Enkarta, no acuses del banco.

## Regresiones

Diez pruebas adicionales cubren continuidad de todos los diseños, plan y cancelación,
destinos inválidos, cotizaciones distintas, referencia/comprobante/aprobación, respuestas
incompletas, transporte sin reintentos, render de evidencia solo de texto, privacidad
de la nota y fallo de consulta sin historial vacío falso. La suite suma 324 pruebas.
Se ejecutan lint, TypeScript, regresiones y build, conservando los avisos previos de
imágenes originales. Las pruebas de render no acreditan interacción visual en móvil.

`scripts/check-commercial-journey-http.cjs` ejercita catálogo, continuidad sin sesión,
cancelación OAuth, alta e inicio de sesión de una cuenta Auth descartable, borrador,
bloqueo sin suscripción, importe fijado por el servidor, evidencia ficticia de texto,
cotización bloqueada, aprobación manual ficticia idempotente y publicación explícita.
La prueba usa contraseña aleatoria en memoria para el usuario sintético; no certifica
el consentimiento real de Google. No envía correos, WhatsApp ni transfiere dinero.
Su limpieza verifica el UUID y marcador del usuario, propietario de la invitación,
registros de versiones y pagos, y elimina también el usuario Auth. Permite reanudar
solo la limpieza con `--resume-cleanup` y el informe original.

```powershell
node scripts/check-commercial-journey-http.cjs --exercise --production --app-url https://enkarta.vercel.app --expect-project eodedockxqvynedwhpsp --report tmp/commercial-journey/production-http.json
```

## Límites de esta entrega

El navegador de Work estaba desactivado durante la revisión. Se usa la captura previa
del catálogo y el marcado actual como referencia para conservar su identidad, pero
no se afirma una nueva aceptación visual de catálogo o checkout. La revisión manual
en Android de WhatsApp de la entrega anterior permanece válida en su ámbito.

No se altera la oferta comercial, los importes, los plazos ni las políticas legales.
La comprobación HTTP de contratación al equipo se limita a la elección y continuidad:
no envía consultas reales, no paga la reserva y no simula una venta como ingresada.
Quedan para aceptación humana el acceso Google real y el recorrido visual móvil de
estos controles. La prueba no habilita BCP, WhatsApp Business ni cobros automáticos.

No hay migración SQL, dependencia, cambio de CSP, originales nuevos ni cambios a
invitaciones públicas, presets, fotografías, música o animaciones.

## Aceptación Android y contención del historial

El usuario confirmó en Chrome de Android que la muestra Lunaria carga sin recortes,
que la elección se conserva al entrar con Google y que la sesión persiste al recargar.
El proveedor Google estaba desactivado en Supabase; tras configurarlo, la consulta
pública de Auth confirmó el proveedor activo y la redirección a Google. El ingreso
completo se acredita con el reporte del usuario, no con una captura automatizada.

Al preparar la primera referencia ficticia, el usuario reportó una reducción aparente
del tamaño de toda la página. La revisión encontró que el historial introduce una tabla
de ancho mínimo 540 px dentro de una cuadrícula móvil con columna implícita y mínimo
automático. La corrección define una columna encogible en móvil, mínimos cero en ambos
paneles y columnas de escritorio con `minmax(0, ...)`. El formulario de archivo también
limita su ancho. El historial conserva sus datos, tamaños de texto y desplazamiento
horizontal propio; su región tiene nombre accesible, foco de teclado y contorno visible.
No se oculta el desbordamiento del documento ni se restringe el zoom del navegador.

Una regresión adicional de render verifica el historial al crear la primera referencia,
su acceso por teclado, todas las filas y estados, los enlaces privados de evidencia y
el escape de las notas. La suite suma 325 pruebas. Estas pruebas no miden el viewport:
la confirmación de ancho y escala tras recargar sigue pendiente en el Android físico,
porque el navegador de la sesión de trabajo continúa desactivado.

La prueba humana conserva su cuenta Google, su suscripción y el borrador que ya existía.
La referencia ficticia queda identificada de forma privada para retirarla y limpiar
solo ese registro cuando concluya la aceptación. Las pruebas HTTP automatizadas usan
otra cuenta descartable y solicitudes manuales sin aprobación ni operación bancaria;
su limpieza no alcanza la cuenta ni el borrador del usuario. BCP permanece desactivado.
