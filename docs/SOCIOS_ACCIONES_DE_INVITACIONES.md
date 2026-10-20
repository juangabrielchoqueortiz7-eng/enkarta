# Socios: publicación, eliminación y consulta del listado

## Fallos reproducidos

En «Mis invitaciones» dos invocaciones del mismo manejador antes del siguiente render enviaban dos PATCH. La variable `busy` era sólo estado visual y un identificador: no impedía otra acción sobre una segunda tarjeta ni acotaba la espera de `fetch` o de su JSON. En una reproducción con reloj ficticio seguía bloqueada después de 120 segundos.

También se reprodujo una respuesta GET antigua que hacía reaparecer una invitación cuya eliminación acababa de confirmarse: lista con una invitación, DELETE confirmado, lista vacía y GET tardío que restauraba la fila. El listado no identificaba la consulta vigente ni invalidaba las lecturas al empezar o confirmar una escritura.

Las reproducciones usan el componente real y transporte ficticio, sin leer o modificar invitaciones de clientes. La eliminación confirmada del servidor y su representación local son hechos distintos: una lectura antigua no debe deshacer en la interfaz la confirmación más reciente.

## Contrato de recuperación

- Las acciones de todas las tarjetas comparten un bloqueo síncrono. Un doble toque, un manejador retenido antes de renderizar o una acción en otra tarjeta no inicia una segunda escritura. Eliminar conserva su confirmación previa y no la abre de nuevo mientras otra acción está en curso.
- Cada petición tiene un presupuesto completo de **25 segundos**, incluido su JSON. No se reinicia al llegar cabeceras. La espera del cliente termina incluso si el transporte ignora la cancelación; eso no demuestra que el servidor haya cancelado la operación.
- Publicar exige una respuesta completa de la misma invitación, con el mismo slug y estado `ready`. Despublicar mantiene el body existente `status: 'draft'` y comprueba el estado canónico `disabled` que devuelve `enkarta_set_publication`. Eliminar exige `success: true`; un HTTP 200 con cuerpo incompleto o falso no retira la tarjeta.
- Un error de escritura mantiene el estado por comprobar, incluso con HTTP 500: el RPC puede haberse aplicado antes de fallar una lectura posterior. No se repite automáticamente la operación ni se anuncia un rollback. Los errores canónicos de suscripción o cupo conservan la derivación a «Suscripción y pagos» sin retirar la necesidad de comprobar el listado.
- «Actualizar invitaciones» está disponible también en listas vacías y tras errores. Consulta lista y cuenta, valida ambas respuestas y comprueba que el total y las publicaciones coincidan antes de liberar nuevas escrituras. Una consulta incompleta, duplicada o con conteos incompatibles conserva las últimas tarjetas verificadas.
- Un ACK válido conserva inmediatamente el hecho confirmado en su tarjeta. Si después falla la consulta del cupo, se conserva el último cupo verificado y se explica qué falta comprobar; no se invita a repetir la publicación o eliminación. La consulta posterior valida los conteos antes de aplicar la cuenta a la interfaz.
- Cada lectura lleva identidad y cancelación. Se invalida al iniciar y confirmar una escritura, al reemplazar una consulta o al desmontar el panel. Una respuesta tardía no restaura publicaciones o tarjetas antiguas ni genera avisos de éxito.
- Cambiar de pestaña dentro del panel conserva el bloqueo de recuperación. Un manejador antiguo comprueba la versión actual del listado y el registro antes de actuar. «Copiar enlace» queda bloqueado mientras el estado es incierto; completar tarde el clipboard no anuncia un estado obsoleto.

La recuperación se limita al panel montado: no se persisten datos privados en almacenamiento global ni se promete conservar la incertidumbre al cerrar o recargar toda la página. Al entrar de nuevo se consulta el estado del servidor. Las validaciones de propiedad, suscripción, publicación y eliminación siguen siendo responsabilidad de las APIs y transacciones existentes.

## Alcance

Esta corrección cubre el listado operativo de Socios y sus controles de publicación, despublicación, eliminación y actualización explícita. Conserva el diseño de sus tarjetas, los contratos del servidor y la separación entre publicar una versión desde el constructor y habilitar su enlace desde el panel.

No modifica presets, fuentes, fotografías, música, animaciones, CSS global ni recursos originales. No requiere SQL ni dependencias nuevas. BCP continúa bloqueado y el formulario de perfil queda fuera de este bloque.

Las skills aplicadas son `vercel-react-best-practices`, para refs síncronas, actualizaciones sobre estado actual y descarte de respuestas obsoletas, y `web-design-guidelines`, para controles semánticos, estados accesibles y una acción de recuperación explícita. Una regresión de hooks no acredita renderizado o aceptación de un dispositivo.

## Regresiones incorporadas

- `scripts/test-partner-invitation-actions-ui.cjs`: **18 casos** con `PartnerDashboard`, `InvitationsTab` y el helper reales, cuentas y respuestas ficticias y reloj controlado. Cubren acciones rápidas en una y varias tarjetas, confirmación destructiva, transporte y JSON bloqueados, ACK de identidad/estado incorrectos, DELETE sin `success: true`, errores HTTP incluido 500, subscripción/cupo, consulta coherente, cambios de pestaña, copy y desmontaje.
- El GET antiguo se resuelve después de un PATCH y después de un DELETE confirmados: en el segundo recorrido no reaparece la tarjeta eliminada. Se comprueba también la ruta feliz completa de publicar, despublicar y eliminar, con acciones habilitadas sólo después de confirmar el cupo correspondiente.
- Los casos posteriores al ACK simulan cuenta bloqueada, error 500 y una cuenta completa con cifras incompatibles. El hecho confirmado no se pierde, la cuenta incompatible no se aplica, no se anuncia que ya se puede compartir y una consulta explícita coherente resuelve el bloqueo sin reenviar la escritura.
- `scripts/test-partner-checkout.cjs`: **3 casos adicionales** comprueban el error HTTP tipado que conserva código de dominio y derivación a suscripción. Sólo una respuesta HTTP recibida y leída lleva esos metadatos; timeout, cancelación, fallos de transporte o JSON incompleto mantienen incertidumbre. La respuesta privada completa no se adjunta al error. Pasan los **17 casos** del helper y los **17 existentes** de checkout UI.

Antes de la corrección se reprodujeron duplicación de PATCH, espera sin límite y resurrección de la tarjeta eliminada con el componente real. La revisión independiente detectó además que la cuenta se aplicaba antes de validar los conteos posteriores al ACK; esa aplicación ahora se valida antes de actualizar el estado y tiene una regresión específica.

La suite nueva se incorpora a `npm run verify`. Las pruebas de hooks y reloj ficticio no acreditan una aceptación móvil, una entrada con Google ni el flujo autenticado completo de publicación en producción. Las comprobaciones manuales continúan aplazadas por decisión del usuario.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.006 pruebas correctas en 30 suites**, incluidas **21 nuevas** de este bloque, además de lint, TypeScript y build de producción. Permanecen los avisos anteriores de imágenes de las invitaciones; no hay nuevos avisos de lint en los archivos afectados.
- **597/597 archivos protegidos** conservan su SHA-256. El guard de distribución encuentra completos los **129 originales públicos**, incluidos los audios preservados fuera de Git.
- Revisión independiente de helper, listado y regresiones: sin bloqueantes tras corregir la aplicación prematura de la cuenta. Los helpers privados de permisos y atestación de fuente tienen **23/23 regresiones offline** correctas; esas pruebas no se suman a las 1.006 de la aplicación.

Evidencia privada en `tmp/partner-invitation-actions/`: `verify.log`, `helper-tests.log`, `checkout-compatibility.log`, `ui-tests.log` y `protected.json`. Los comandos de producción requieren un despliegue Ready explícito, un SHA exacto y sus metadatos de fuente; no se deduce un resultado de producción a partir de estas pruebas locales.

## Hallazgo independiente pendiente

Durante el descubrimiento se reprodujo otra pérdida de cambios en medios del constructor: iniciar una subida de audio, editar el título de una foto y resolver el upload puede restaurar el título anterior. El callback de subida conserva una configuración antigua. Este hallazgo necesita una corrección y pruebas propias de `MediaPanel` e `ImageUploader`; no se presenta como resuelto por este bloque de acciones del listado.
