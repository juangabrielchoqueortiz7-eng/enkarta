# Cotización desde un contacto comercial

## Problema y resultado

El buscador y el cotizador eran herramientas independientes: encontrar una referencia obligaba a volver a escribir evento, diseño y paquete. El resumen copiado no incluía `EK-XXXXXXXX`, dificultando relacionarlo con el seguimiento y aumentando el riesgo de usar el borrador de otro cliente.

El resultado de búsqueda incorpora **Preparar cotización**. La acción abre el cotizador con una revisión de los datos que se usarán; no cambia todavía su borrador. **Usar datos del contacto** o **Reemplazar borrador y usar contacto** confirma el reemplazo. **Cancelar y conservar borrador** mantiene exactamente los campos y el almacenamiento anteriores.

## Comportamiento

- Solo se llevan la referencia comercial, categoría del evento, diseño público y paquete conocido. No se extraen nombres, fechas, ingresos ni información de notas, atribución o conversaciones.
- Al confirmar otra referencia se crea un borrador nuevo: nombre y fecha pendientes, adicionales en cero y sin su detalle anterior. Categoría y diseño vacíos continúan pendientes; no se presupone una boda.
- Cuando el contacto tiene `package_key = general`, la selección inicia vacía y exige escoger un paquete. Los paquetes conocidos se muestran como sugerencia revisable. No se modifica el paquete guardado en el contacto ni se cambian los precios del catálogo.
- Solicitar nuevamente la misma referencia que ya está en el cotizador conserva los datos y ajustes existentes, sin reemplazarlos por el snapshot del contacto ni escribir otra vez el borrador.
- Mientras la revisión está pendiente se bloquean edición, copia de propuesta y respuestas rápidas. Para conservar una copia del borrador anterior, se cancela primero y se utiliza su copia habitual.
- Si la configuración aún no terminó de cargarse, el pedido abre las herramientas y espera. No sustituye el borrador recuperado antes de que concluya la lectura de la sesión.
- Después de confirmar, el resultado sigue marcado como borrador hasta completar los campos existentes y el medio de pago. Preparar no anuncia una propuesta definitiva ni un pago.
- La referencia comercial aparece en el cotizador y en el texto de la propuesta. No es una referencia de pago `ENK-…` ni acredita una reserva.
- Se solicita foco en la revisión; al confirmar o cancelar, vuelve al control del cotizador. Volver a solicitar la misma referencia también solicita foco, sin animación de desplazamiento. El comportamiento físico de foco y disposición queda pendiente de aceptación manual.

## Persistencia y límites

La referencia opcional se valida como texto canónico `EK-` y ocho caracteres hexadecimales mayúsculos. Se conserva junto con los campos permitidos del borrador de esta pestaña, con su ámbito de sesión y caducidad existente de 24 horas. Los borradores v1/v2 anteriores siguen siendo compatibles; leerlos no los reescribe.

No se almacenan el snapshot completo, identificador del contacto, estado, notas, ingresos, instrucciones bancarias ni credenciales. Una referencia inválida no sobrescribe un borrador recuperable. Si falla el almacenamiento al confirmar, los datos nuevos permanecen en memoria y se muestra el error existente; no se anuncia un guardado local exitoso. El almacenamiento anterior puede seguir presente hasta una escritura posterior correcta: se debe conservar la pestaña abierta.

No se crea ni enlaza una cotización en Supabase. La relación con el contacto se expresa en la referencia del borrador y del texto copiado; los cambios de estado e ingreso continúan como acciones separadas del seguimiento. Las respuestas rápidas conservan sus textos actuales.

No hay nueva migración, API, permiso o dependencia. No se envía WhatsApp ni se llama al banco. BCP conserva su bloqueo y configuración. Invitaciones, presets, CSS global y recursos originales quedan fuera del cambio.

## Regresiones y muestra

Las regresiones usan datos ficticios, transporte y almacenamiento aislados, render de servidor y un runner de estado/efectos. Cubren confirmación, cancelación sin escrituras, contacto general, limpieza de datos del cliente anterior, continuidad de la misma referencia, configuración pendiente, copia bloqueada y fallo de almacenamiento. No equivalen a una prueba del reconciliador con DOM, foco, portapapeles real o Chrome de Android.

Se añaden **28 regresiones**: trece del dominio y persistencia, once del cotizador/render/estado/copia/limpieza y cuatro de integración de callbacks del dashboard. La limpieza de la muestra verifica que solo se retira el borrador de su ámbito ficticio y conserva otras sesiones; un fallo de borrado no reinicia ni anuncia una limpieza correcta.

La muestra de desarrollo `/dev/services/commercial-dashboard` ofrece `EK-ABCDEF99` con paquete y `EK-ABCDEF98` sin paquete, categoría ni diseño, sin incorporarlos al período de métricas. Sirve para una futura aceptación manual; continúa bloqueada en producción.

Evidencia privada: `tmp/sales-contact-quote/`. Las pruebas manuales permanecen aplazadas por petición del usuario.

## Verificación local

- `npm run verify`: **607 pruebas correctas**, lint, TypeScript y build. Desglose: 200 constructor/contratos, 155 servicios, 19 PostgreSQL del guardado, 55 editor/contrato/render, 14 PostgreSQL del dashboard, 26 cliente del dashboard, 17 historial, 11 navegación, 25 recuperación/render/estado, 28 dominio del cotizador, 21 cotizador/render/estado/copia/limpieza, 31 integridad y 5 distribución.
- Revisión independiente del código sin bloqueantes en el flujo de la aplicación. Se corrigió el hallazgo de limpieza del borrador de la muestra y se añadieron dos regresiones específicas. Sin nuevos avisos de lint en los archivos afectados; permanecen los avisos anteriores sobre imágenes de invitaciones originales.
- **597/597 archivos protegidos** idénticos por SHA-256 y **129 recursos originales** completos para distribución. Sin migración ni modificación de BCP.

## Producción, 19 de octubre de 2026

- Código **`a87de21`**, fusionado a `main`. Vercel **`dpl_AfaT6iAXm1wKGiJ6B77iVR3ShxYT`**, Ready y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-8a9einraz](https://enkarta-8a9einraz-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI **completed / success** para ese SHA exacto, con `npm run verify` y auditoría de dependencias de producción correctos. [Verify application #39351347896](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39351347896). El conteo de 607 procede del informe local; no se descargaron los logs de CI.
- **9 comprobaciones de contrato y HTTP correctas**: bloqueo BCP local; configuración denegada sin caché a visitantes/cookies inválidas; muestras de desarrollo HTTP 404; acciones nuevas presentes en el código publicado; búsqueda, historial, listado y guardado anónimos HTTP 401; autenticación normal con cookie segura; configuración privada acotada y borrador ligado a la sesión; entradas ficticias malformadas HTTP 400 antes de acceder a la base; petición anónima separada todavía denegada.
- **129/129 recursos originales publicados** conservan tamaño y SHA-256; **6/6 rutas** públicas/de acceso respondieron como se esperaba. Comprobación local final: **597/597 archivos protegidos** idénticos.
- No se consultaron fichas ni historiales de clientes ni se crearon, modificaron o eliminaron contactos, pagos, usuarios, movimientos o recibos. Cero mensajes y llamadas bancarias. La cookie temporal se mantuvo en memoria y se retiró al terminar; esta entrega no dejó nuevos datos ficticios en producción que limpiar.
- La conexión del cotizador, su confirmación, cancelación, recuperación y copia se comprobaron automáticamente en el entorno local, con dependencias ficticias. La comprobación remota verifica publicación y permisos; no representa una interacción real de navegador ni una lectura del portapapeles de Android. La aceptación manual sigue aplazada.
- BCP conserva su código y configuración. Se comprobó el bloqueo en código y entorno local; no se afirma haber leído la variable remota del proveedor. Diseños, presets y recursos originales permanecen intactos.

Evidencia privada adicional: `verify.log`, `deployment.log`, `deployment-inspect.log`, `production-readonly.json`, `production-public.json`, `protected-local-final.json`, `ci.json` y `RESULTADO.json`, sin contraseñas, claves, cookies ni fichas de clientes.
