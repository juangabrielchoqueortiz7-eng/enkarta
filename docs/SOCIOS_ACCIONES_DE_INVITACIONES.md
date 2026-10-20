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

## Producción verificada, 20 de octubre de 2026

- Código **`aa455ca8c0e3235022c317ae590ea0bc17b08e94`**, integrado en `main`. [CI del commit exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39427442874): `completed/success`, con `npm run verify` y auditoría de dependencias aprobados.
- Vercel **`dpl_8z2BzfkkpFBuRfHrHbSTnmnoDmdW`**, `READY`, destino producción y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-ois946okz](https://enkarta-ois946okz-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para conservar los originales ignorados por Git.
- Los identificadores de contenido de `PartnerDashboard.tsx` y `partner-checkout.ts` coinciden con los dos archivos de entrada del despliegue Ready. Esto comprueba la fuente subida, sin afirmar que se ejecutaron sus temporizadores desde un navegador real.
- **9 grupos HTTP correctos**, con **48 denegaciones exactas**, incluidas **36 solicitudes de escritura**. Se comprobaron cuenta, pagos y GET/PATCH/DELETE de invitaciones, incluidos publicar y despublicar, en seis contextos: sin sesión, cookies inválidas de admin/anfitrión/revisión/recepción y cookie administrativa válida sin sesión de Socios. Ninguno puede hacerse pasar por un socio. El panel conserva su entrada normal de autenticación.
- La configuración administrativa conserva `no-store` y su vinculación a la sesión. El historial privado del constructor conserva `no-store` y `Vary: Cookie`, con respuesta vacía para un UUID ficticio cuya ausencia se comprobó mediante conteos exactos antes y después. No se leyeron filas de clientes.
- **129/129 recursos originales públicos** conservan tamaño y SHA-256 y las **6/6 rutas** públicas, de acceso y de desarrollo comprobadas responden como corresponde. Los **597/597 archivos protegidos** de la verificación local siguen idénticos.
- La cookie administrativa temporal, conservada sólo en memoria, quedó cerrada. **Cero registros de negocio, usuarios Auth, pagos, fixtures, llamadas bancarias o mensajes creados**. No hay datos ficticios que retirar de Supabase.

BCP sigue bloqueado por el contrato existente: no se cambiaron proveedor ni credenciales, no se consultaron variables remotas de pago ni endpoints bancarios. No se necesita otra migración SQL. La aceptación manual permanece aplazada; dobles acciones, tiempos de espera y carreras se verificaron con pruebas automáticas locales. Las comprobaciones HTTP no se presentan como una aceptación autenticada de publicación con Google ni como una revisión visual de Android/Safari.

Evidencia privada adicional en `tmp/partner-invitation-actions/`: `deployment.log`, `deployment-final.json`, `deployment-files.json`, `ci.json`, `production-http.json`, `production-public.json` y `RESULTADO.json`. La aceptación y limpieza anteriores de Ventas y el borrador del cotizador del navegador permanecen intactos.

## Hallazgo independiente pendiente

Durante el descubrimiento se reprodujo otra pérdida de cambios en medios del constructor: iniciar una subida de audio, editar el título de una foto y resolver el upload puede restaurar el título anterior. El callback de subida conserva una configuración antigua. Este hallazgo necesita una corrección y pruebas propias de `MediaPanel` e `ImageUploader`; no se presenta como resuelto por este bloque de acciones del listado.
