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
La aceptación humana posterior del acceso Google real y del recorrido visual móvil
se registra abajo. La prueba no habilita BCP, WhatsApp Business ni cobros automáticos.

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
el escape de las notas. La suite suma 325 pruebas. Estas pruebas no miden el viewport.
Después del despliegue, el usuario confirmó en su Android físico que el checkout
recuperó su escala correcta tras recargar. Esta aceptación procede de su confirmación;
el navegador de la sesión de trabajo continúa desactivado.

El usuario también confirmó el aviso por selección distinta y la recuperación de
Inicio, un mes y Bs 249 sin cambiar la referencia. Una nota expresamente ficticia,
sin archivo, dejó el comprobante en revisión, bloqueó la cotización y conservó el
estado al recargar sin activar la suscripción. El servidor corroboró esa nota, la
cotización bloqueada y la ausencia de transacción bancaria o aprobación.

El 17 de octubre de 2026 se retiró mediante la RPC de cancelación y se eliminó
exclusivamente esa solicitud ficticia, filtrando por UUID, propietario, referencia,
proveedor manual, estado cancelado y nota de prueba. Se verificaron cero registros
restantes de esa referencia, la conservación íntegra del borrador anterior, de la
suscripción y de la cuenta Google, y la ausencia de cambios en otros pagos. Los
identificadores y comprobaciones detalladas quedan en los informes privados de QA.

Las pruebas HTTP automatizadas utilizaron otra cuenta descartable, ya eliminada,
y solicitudes manuales sin aprobación ni operación bancaria. BCP permanece
desactivado; su integración espera documentación y credenciales oficiales del banco.

## Encargar al equipo: nombres, regreso e intentos de contacto

El mensaje comercial y su página de continuación resuelven las claves técnicas
del catálogo a sus nombres públicos: `azure` se presenta como Lunaria y los presets
conservan sus nombres propios. La muestra heredada `/muestra/carmesi` sigue correspondiendo
a Granate, sin modificar el diseño Rubí ni sus recursos. Los registros históricos
se presentan con su nombre público al leer el panel, sin migrar ni reescribir filas.
La resolución de nombres ocurre en el servidor para conservar el tamaño de los CTAs.

El enlace «Volver a la página» valida origen y normalización de URL, incluyendo
barras invertidas, controles y separadores codificados. Los destinos externos o
inválidos vuelven al inicio. La página anuncia un mensaje preparado y ofrece
reintentar; no asegura que WhatsApp se haya abierto ni que exista una conversación.

Ventas muestra «Intento de contacto» para el estado técnico `whatsapp_open` y explica
qué mide. Las conversaciones siguen siendo un registro manual del equipo. Los intentos
pueden incluir varios clics de una misma visita; por eso la razón se expresa por cada
100 visitas, sin presentarla como porcentaje de personas que abrieron WhatsApp.
Se mantienen los estados SQL, los precios, la reserva comercial y los permisos.

Cinco regresiones nuevas cubren todas las identidades del catálogo, los retornos
malformados, la página preparada, el mensaje real del handler, la inferencia de muestras
y la presentación de registros heredados sin cambios en base de datos. La suite suma
330 pruebas. `scripts/check-commercial-contact-http.cjs` comprueba el recorrido con
una sesión comercial y campaña ficticias, sigue únicamente URLs de Enkarta y elimina
sus eventos e intentos al terminar. Nunca sigue el salto a WhatsApp, envía mensajes,
registra reservas, crea cuentas ni ejecuta pagos. Permite reanudar solo la limpieza
con `--resume-cleanup` y su informe privado original.

```powershell
node scripts/check-commercial-contact-http.cjs --exercise --production --expect-project eodedockxqvynedwhpsp --report tmp/commercial-contact/production-http.json
```

El 18 de octubre de 2026 se publicó el commit `606640b` mediante el workspace
completo. Vercel confirmó `Ready` para `dpl_94nq6hSB7RuPx2QNJBEkG1FSYWtg` y el
alias `enkarta.vercel.app`. Las seis comprobaciones HTTP pasaron: los tres intentos
ficticios y sus eventos se eliminaron al terminar, sin mensajes, cuentas ni pagos.
Los 129 recursos originales publicados conservaron tamaño y SHA-256. CI del código
finalizó correctamente: https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39156962245.

La página preparada también se inspeccionó en el navegador de esta sesión, con
anchos de 320, 390 y 1440 píxeles. Conservó Lunaria, el paquete Premium y el regreso
a `/catalogo`, sin desbordamiento horizontal ni errores en consola. Los dos botones
de continuación midieron al menos 47 píxeles de alto. Se eliminó el único evento
de la campaña ficticia de inspección visual y se verificaron cero filas restantes.
Capturas, medidas e informes detallados quedan en `tmp/commercial-contact/`, excluido
de Git y del despliegue. Esta inspección adaptable no sustituye la aceptación en un
Android físico ni prueba la apertura de la aplicación WhatsApp.

Esta mejora no cambia las invitaciones originales, estilos globales, autenticación
Google ni el checkout de Socios. BCP continúa desactivado.

## Reintentos de contacto y aceptación Android

Al preparar la aceptación física se encontró que «Volver a abrir WhatsApp» calculaba
el regreso desde `/contacto/preparado`, perdiendo el catálogo original. La continuación
tampoco conservaba las etiquetas de campaña. El componente ahora recibe el regreso
validado por la página y conserva exclusivamente los cinco campos UTM admitidos,
limitados a 120 caracteres, tanto en el enlace de contacto como en la continuación.
La ubicación donde se solicita cada intento se registra por separado; no reemplaza
el destino original del botón «Volver a la página».

Tres regresiones nuevas comprueban cuatro reintentos seguidos con Lunaria, Premium,
el tipo de evento y la campaña; rechazan regresos externos y parámetros ajenos a la
atribución; y verifican que la página pase el regreso validado al componente real.
La suite suma 333 pruebas. No se cambian precios, estados comerciales, mensajes,
permisos, diseños, recursos originales ni el bloqueo del adaptador BCP.

La aceptación física se realiza mediante una campaña ficticia exclusiva, sin enviar
el mensaje de WhatsApp. Sus identificadores e instrucciones de limpieza se conservan
en el informe privado de QA, fuera de Git y de Vercel. La aceptación solo se acredita
con el resultado comunicado por el usuario; una inspección adaptable no la sustituye.
