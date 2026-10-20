# Recuperación de operaciones de Ventas

## Problema y alcance

El guardado seguro conservaba su UUID en memoria. Si el servidor procesaba el cambio y se perdía la respuesta, «Comprobar guardado» podía recuperar el recibo durante esa sesión de pantalla. Una recarga completa perdía la intención original y su identificador.

La mejora conserva **operaciones enviadas o a punto de enviarse**, con su UUID y payload canónico, en `sessionStorage` de la pestaña. Este journal no conserva borradores de seguimiento sin enviar, historial, atribución, snapshot completo del contacto ni credenciales. Los cambios sin enviar cuentan ahora con un journal separado, descrito en [Recuperación de borradores](VENTAS_RECUPERACION_DE_BORRADORES.md), y mantienen la advertencia al abandonar.

## Flujo de recuperación

1. La configuración autenticada existente comunica al dashboard su huella opaca de sesión. No se añade una API ni se comparte con el dashboard el contenido de las instrucciones de pago. La clave del journal es distinta de la del cotizador.
2. Antes del PATCH se conserva la intención exacta. Mientras queda pendiente, otra intención del mismo contacto no puede sustituirla silenciosamente.
3. Tras recargar, **Operaciones por comprobar** muestra únicamente referencia y fecha. Leer la copia no consulta contactos ni envía cambios.
4. **Recuperar operación** consulta la referencia exacta y comprueba UUID, referencia y revisión canónicos. Una ausencia, otra identidad, una revisión inferior o un error conserva la copia y no abre la operación. Si la ficha ya tiene cambios activos, se pide revisarla antes de recuperar.
5. Se abre el editor habitual como **incierto**, con campos bloqueados. Aunque el contacto ya coincida con el payload, no se anuncia éxito. **Comprobar guardado** envía explícitamente el mismo UUID, revisión y cuerpo; reutiliza el recibo de la migración 019.
6. Al recibir confirmación o conflicto válido se retira solo la copia exacta que corresponde al intento. Una respuesta antigua no elimina una intención diferente o posterior. Un fallo de limpieza se anuncia y mantiene la copia revisable.

No hay PATCH al montar, leer almacenamiento, recuperar una referencia ni cerrar el panel. Un historial y un recibo originales siguen correspondiendo a una misma operación repetida.

## Revisión de conflictos

Una solicitud recuperada incluye el estado, ingreso y nota completos que se enviaron. No permite conocer qué campos había editado manualmente el operador antes de la recarga. Por eso **Revisar valores recuperados** conserva esos tres valores y exige compararlos con la versión actual antes de otro guardado; no afirma haber identificado los campos editados originalmente.

El editor conserva cualquier revisión remota posterior mientras comprueba el recibo. Al confirmar una operación antigua, muestra la versión más reciente conocida. La revisión de un conflicto prepara una intención nueva solo después de la decisión y guardado explícitos del operador.

## Almacenamiento y errores

- Journal único con versión, scope y hasta **50 intenciones / 160.000 caracteres**. No trunca ni elimina otra entrada para aceptar una nueva. Un límite o error impide afirmar que la nueva operación quedó protegida.
- Cada entrada contiene referencia comercial, fecha local y petición canónica: UUID del contacto, UUID de solicitud, revisión esperada, estado, ingreso y nota. La nota es necesaria para repetir el cuerpo exacto. No se duplican los metadatos restantes ni se guardan tokens, cookies o instrucciones bancarias.
- La lectura valida estructura, campos permitidos, identidad, unicidad, fecha y canonicalidad del cuerpo. No corrige silenciosamente un registro corrupto ni lo sobrescribe con una lista vacía.
- Otra sesión no lee ni modifica la clave anterior. Las callbacks antiguas se invalidan al cambiar el scope o desmontarse. Las intenciones resueltas se retiran también del mapa auxiliar de memoria.
- Una operación de más de 24 horas se señala como antigua. No se elimina por tiempo: podría haberse procesado y seguir sin comprobar. Permanece hasta resolverla, retirar explícitamente su copia o hasta que el navegador descarte el almacenamiento de esa pestaña. No se promete continuidad al cerrar pestañas, entre dispositivos ni después de un cambio de sesión.
- Si no se puede conservar el intento, **no se envía ese intento automáticamente**. Se puede reintentar o elegir **Guardar sin recuperación local / Comprobar sin recuperación local**, manteniendo la petición preparada y advirtiendo que debe conservarse la pestaña abierta. Esa elección conserva la alternativa anterior de trabajar en memoria sin prometer recuperación tras recarga.
- **Retirar copia local…** pide confirmación. Solo elimina esa copia: no revierte una escritura, no modifica el contacto o historial y no confirma ni cancela pagos. No equivale a cancelar una operación del servidor.

## Muestra y validación

La muestra `/dev/services/commercial-dashboard` incorpora **Guardar y perder respuesta**. Guarda ficticiamente antes de simular el error y permite usar **Reiniciar carga** para recuperar contra el mismo servidor en memoria. Una recarga real del navegador reinicia ese servidor ficticio; no representa persistencia de Supabase. **Limpiar QA** retira las operaciones y el borrador del scope ficticio y restablece los datos de muestra. La ruta permanece bloqueada en producción.

Las regresiones ejercitan almacenamiento, reducer, hooks y editor reales con transporte y almacenamiento ficticios, además del servicio HTTP con PostgreSQL local. No certifican DOM, foco, disposición móvil o `sessionStorage` de un Android físico. Las pruebas manuales siguen aplazadas por petición del usuario.

No hay migración, dependencia, permiso nuevo ni operación bancaria. BCP conserva su bloqueo y configuración. Diseños, presets, estilos globales y recursos originales quedan fuera del cambio. Evidencia privada: `tmp/sales-pending-recovery/`.

## Regresiones automáticas

Se añaden **70 regresiones**: 22 del journal, 12 del reducer, 35 del hook/panel/editor/vinculación de sesión/limpieza y una integración HTTP con PostgreSQL local. Esta última guarda, pierde ficticiamente la respuesta, recrea el acceso al almacenamiento, recupera la operación y comprueba explícitamente el mismo UUID y cuerpo; termina con una entrada de historial, un recibo y el journal vacío.

La integración del editor comprueba el orden copia-antes-de-PATCH, el fallo de almacenamiento sin envío, la elección explícita de memoria, el mismo UUID preparado, la conservación de respuestas inciertas, la limpieza exacta tras confirmación/conflicto y el replay tras remontar con una revisión posterior. No se interpreta un test de estado/efectos como una ejecución real del reconciliador con DOM.

## Verificación local

- `npm run verify`: **677 pruebas correctas**, lint, TypeScript y build. Desglose: 200 constructor/contratos, 156 servicios, 19 PostgreSQL del guardado, 67 editor/contrato/render/reducer, 22 journal, 35 recuperación/hook/panel/editor/sesión/limpieza, 14 PostgreSQL del dashboard, 26 cliente del dashboard, 17 historial, 11 navegación, 25 recuperación de cargas/render/estado, 28 dominio del cotizador, 21 cotizador/render/estado/copia/limpieza, 31 integridad y 5 distribución.
- Revisión independiente sin bloqueantes tras corregir la retención del mapa auxiliar en memoria y la cancelación por callbacks de una sesión anterior. Sin nuevos avisos de lint en archivos afectados; permanecen los anteriores sobre imágenes de invitaciones originales.
- **597/597 archivos protegidos** idénticos por SHA-256 y **129 recursos originales** completos para distribución. Sin migración ni modificación de BCP.

## Producción, 19 de octubre de 2026

- Código **`739b21c`**, fusionado a `main`. Vercel **`dpl_FqkE42jQd8p3MxakT9ZnSshUA2Zq`**, Ready y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-9hhwga7qe](https://enkarta-9hhwga7qe-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI **completed / success** para ese SHA exacto, con `npm run verify` y auditoría de dependencias de producción correctos. [Verify application #39353764114](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39353764114). El conteo de 677 procede del informe local; no se descargaron los logs de CI. El ajuste final del nombre del panel en el mensaje de limpieza también pasó las 35 pruebas de interfaz/estado antes de guardar el commit.
- **9 comprobaciones de contrato y HTTP correctas**: bloqueo BCP local; configuración denegada sin caché a visitantes/cookies inválidas; muestras de desarrollo HTTP 404; acciones de recuperación y alternativa de memoria presentes en el código publicado; búsqueda, historial, listado y guardado anónimos HTTP 401; autenticación normal con cookie segura; configuración privada acotada y scope ligado a la sesión; entradas ficticias malformadas HTTP 400 antes de acceder a la base; petición anónima separada todavía denegada.
- **129/129 recursos originales publicados** conservan tamaño y SHA-256; **6/6 rutas** públicas/de acceso respondieron como se esperaba. Comprobación local final: **597/597 archivos protegidos** idénticos.
- No se consultaron fichas ni historiales de clientes ni se crearon, modificaron o eliminaron contactos, pagos, usuarios, movimientos o recibos. Cero mensajes y llamadas bancarias. La cookie temporal se mantuvo en memoria y se retiró al terminar; esta entrega no dejó nuevos datos ficticios en producción que limpiar.
- La recuperación, remonte, persistencia previa al envío y replay con un solo historial/recibo se comprobaron automáticamente en local con dependencias ficticias y PostgreSQL. La revisión remota verifica publicación y permisos, sin presentarla como una interacción real del navegador ni una comprobación del almacenamiento de Android. La aceptación manual sigue aplazada.
- BCP conserva su código y configuración. Se comprobó el bloqueo en código y entorno local; no se afirma haber leído la variable remota del proveedor. Diseños, presets y recursos originales permanecen intactos.

Evidencia privada adicional: `verify.log`, `pending-ui-final.log`, `deployment.log`, `deployment-inspect.log`, `production-readonly.json`, `production-public.json`, `protected-local-final.json`, `ci.json` y `RESULTADO.json`, sin contraseñas, claves, cookies ni fichas de clientes.
