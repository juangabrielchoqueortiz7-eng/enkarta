# Retomar la última referencia de Ventas

## Problema y resultado

Una búsqueda por referencia y su resultado vivían únicamente en memoria. Después de recargar era necesario volver a WhatsApp y copiar el código, incluso para un contacto histórico que no aparece en las páginas de los últimos 180 días.

El buscador conserva ahora **la identidad de la última consulta encontrada**: referencia comercial, UUID técnico del contacto y fecha local. Al recargar ofrece **Retomar consulta**, sin rellenar el campo, consultar contactos ni abrir editores automáticamente. La acción vuelve a buscar con los permisos habituales y verifica referencia e identidad antes de mostrar la ficha actual. Después se puede usar **Abrir seguimiento** o **Preparar cotización** como antes.

La selección del editor y la posición de las páginas no se restauran con este mecanismo. Sus métricas, límites del período y reglas de revisión permanecen iguales.

## Privacidad, vigencia y errores

- Copia de una sola referencia en `sessionStorage`, separada del cotizador, los borradores y las operaciones pendientes. Clave `enkarta.commercial-search.v1:<huella de sesión>`; estructura con versión, scope y entrada validada estrictamente, hasta 1.024 caracteres.
- No se guardan notas, importes, estados, historial, datos de atribución, instrucciones de pago, tokens, credenciales ni una ficha completa. La huella opaca procede de la configuración autenticada existente; no se añade una consulta para obtenerla.
- Recuperación durante **24 horas** desde la última búsqueda encontrada y aceptada. La lectura no renueva el plazo ni elimina datos. Una copia vencida no puede retomarse; puede retirarse con **Limpiar búsqueda** o reemplazarse mediante una búsqueda nueva exitosa y una comparación exacta.
- La recuperación comprueba que la entrada siga vigente y sea la misma antes y después de la consulta. Otra identidad, ausencia, error, vencimiento o reemplazo no provoca que se borre la copia ni que se muestre el contacto recuperado como válido.
- La búsqueda nueva guarda solo después de aceptar una respuesta válida y vigente. El valor esperado para comparar se captura al iniciar la petición: una respuesta tardía no reemplaza una elección local posterior.
- Escribir, recibir una actualización del editor o renderizar la página no persiste una referencia nueva. Una búsqueda inexistente o fallida mantiene la copia anterior.
- **Limpiar búsqueda** cancela la consulta en curso, retira únicamente la copia exacta y limpia la pantalla. No descarta borradores ni operaciones de seguimiento. Si falla la limpieza o cambió otra copia, se conserva la pantalla y se avisa; si no se puede leer el almacenamiento, limpiar solo la pantalla no se anuncia como eliminación de una copia desconocida.
- Un fallo al guardar la referencia mantiene el resultado canónico visible y explica que no quedó conservado para otra recarga. Las copias corruptas o de estructura desconocida no se sobrescriben silenciosamente.
- Los cambios de sesión o del almacenamiento de prueba ocultan inmediatamente el contexto anterior y cancelan sus consultas. Las callbacks antiguas tampoco se reactivan si se vuelve posteriormente al mismo scope.

El alcance es la misma pestaña y sesión. No se promete continuidad al cerrar la pestaña, cambiar de sesión o usar otro dispositivo.

## Espera y cancelación de la búsqueda

La búsqueda del componente tiene un plazo común de **20.000 ms**, incluido el transporte y la lectura del cuerpo. El plazo termina la espera de la interfaz aunque alguno ignore la señal de aborto. El error habilita un nuevo intento explícito; no se reintenta automáticamente.

Limpiar, editar el código, iniciar otra búsqueda, cambiar la sesión o desmontar la pantalla invalida el resultado anterior. Una respuesta o rechazo tardíos no muestran una ficha ni guardan otra referencia. La función de consulta comprueba también la cancelación antes de empezar y después del transporte y del JSON; no empieza a leer el cuerpo de una respuesta que llega cuando su consulta ya fue abortada.

El plazo depende de los temporizadores del navegador. Las pruebas con reloj simulado no certifican 20 segundos de tiempo físico en una pestaña suspendida o un Android real. El cambio no modifica el plazo del historial ni el de la configuración del cotizador.

## Integración y verificación

Se conserva la posición y el tipo del buscador dentro de Ventas durante cargas, errores y cambios de página. La recuperación reutiliza el mismo resumen, seguimiento y cotizador, sin crear otro editor por contacto ni cambiar permisos del servidor.

La muestra local `/dev/services/commercial-dashboard` permite buscar `EK-ABCDEF99`, **Reiniciar carga** y **Retomar consulta** contra el servidor ficticio en memoria. **Limpiar QA** retira la última referencia del scope de muestra, además de sus borradores, operaciones y cotización; conserva otras sesiones. La ruta continúa bloqueada en producción. Una recarga real reinicia el servidor ficticio y no representa persistencia de Supabase.

Las pruebas automáticas usan dominio, hooks, componentes y transporte ficticios. La aceptación visual, el foco y el almacenamiento real de Android permanecen pendientes por petición del usuario. Las comprobaciones HTTP de publicación se ejecutan sin consultar ni modificar fichas de clientes.

No hay migración, endpoint, dependencia, pago ni envío de mensajes nuevos. BCP permanece desactivado y conserva su bloqueo. Diseños, estilos globales, invitaciones y recursos originales quedan fuera del cambio. Evidencia privada en `tmp/sales-search-recovery/`.

## Verificación local, 19 de octubre de 2026

- `npm run verify`: **816 pruebas correctas**, lint, TypeScript y build completos sobre el código `d878b3d`. Desglose: 200 constructor, 156 servicios, 19 PostgreSQL de guardados, 79 editor/contrato/reducer, 22 journal de operaciones, 35 recuperación de operaciones, 21 journal de borradores, 46 recuperación de borradores, **33 dominio/hook de última referencia**, **27 interfaz/composición/limpieza de búsqueda**, 14 PostgreSQL del embudo, 26 cliente del embudo, 17 historial, 11 navegación, 25 recuperación de cargas, 28 cotización, 21 interfaz de cotización, 31 integridad y 5 distribución.
- **60 regresiones nuevas** cubren persistencia mínima, formato, límites, caducidad, CAS, sesión y almacenamiento, remonte sin consultas, recuperación canónica explícita, ausencias e identidad distinta, limpieza y respuestas tardías. Los casos con reloj simulado verifican transporte y JSON que ignoran aborto, vencimiento durante consulta y rechazo del cuerpo de una respuesta que llega después de cancelar.
- La composición real verifica un único buscador con scope, sin abrir un editor automáticamente. Las muestras limpian únicamente el scope ficticio; las otras sesiones y journals permanecen separados. Se actualizó la comprobación anterior del aviso de limpieza QA para incluir la última consulta.
- Revisión independiente sin bloqueantes. Se uniformó la longitud exacta del scope y se añadió una generación por cambio de sesión o almacenamiento: volver posteriormente al mismo scope no reactiva callbacks antiguos.
- Impeccable y las guías de React se aplicaron al flujo operativo existente. Revisión de los controles afectados con las [Web Interface Guidelines de Vercel](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): etiquetas, nombres de acción, foco visible, estados de carga/error, contenedores encogibles y cancelación. No se certificó presentación o foco en Android.
- Sin nuevos avisos de lint en los archivos afectados. Se conservan los avisos existentes de imágenes en las invitaciones originales.
- **597/597 archivos protegidos** idénticos por SHA-256. Guard de distribución: **129 originales completos**, sin faltantes ni cambios de bytes. Sin migración ni modificación de BCP.

## Producción, 19 de octubre de 2026

- Código **`d878b3dcb990b544b7935752a83b1beb7f04330d`**, fusionado a `main`. Despliegue desde el workspace completo para incluir los originales que no están en Git. Vercel **`dpl_D2XxKhQswvcmSfsvDAMVrRWoNcsq`**, Ready y alias [enkarta.vercel.app](https://enkarta.vercel.app). [Despliegue inmutable](https://enkarta-8mv8kh5up-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI **completed / success** para ese SHA exacto: job `verify`, `npm run verify` y auditoría de dependencias de producción correctos. [Verify application #39358152112](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39358152112). Los conteos detallados proceden del informe local; no se descargaron logs de CI.
- **9 comprobaciones HTTP y de contrato correctas**: bloqueo BCP local y del gateway; configuración privada denegada a visitantes y cookies inválidas; muestras de desarrollo HTTP 404; acción de última referencia y su contrato de almacenamiento presentes en el cliente publicado; consulta, historial, listado y guardado anónimos HTTP 401; autenticación normal con cookie segura; configuración privada acotada y huella vinculada a la sesión; entradas ficticias inválidas HTTP 400 antes del acceso a la base; petición anónima separada todavía denegada.
- **129/129 recursos originales publicados** idénticos en tamaño y SHA-256. **6/6 rutas** públicas/de acceso respondieron como se esperaba. Comprobación local final: **597/597 archivos protegidos** idénticos.
- No se consultaron fichas ni historiales de clientes ni se crearon, modificaron o eliminaron contactos, pagos, usuarios, movimientos o recibos. Cero mensajes y llamadas bancarias. La cookie temporal se mantuvo en memoria y se retiró al terminar. Esta entrega no dejó nuevos datos ficticios en producción que limpiar.
- La recuperación, persistencia, limpieza y cancelación se verificaron con pruebas automáticas locales. La comprobación remota verifica publicación y permisos por HTTP; no representa un recorrido de navegador ni el almacenamiento real de Chrome en Android. **Las pruebas manuales siguen aplazadas.**
- BCP conserva su código y configuración. Se comprobó el bloqueo en código y entorno local; no se afirma haber leído la variable remota del proveedor. Diseños y recursos originales permanecen intactos.

Evidencia privada: `verify-final.log`, `deployment.log`, `deployment-inspect.log`, `production-readonly.json`, `production-public.json`, `protected-local-final.json`, `ci.json` y `RESULTADO.json`, sin credenciales, cookies ni fichas de clientes.
