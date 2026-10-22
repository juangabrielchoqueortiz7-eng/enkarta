# Confirmación verificable del guardado

Un HTTP 200 con JSON incompleto o una revisión anterior/incorrecta podía limpiar la marca de cambios del constructor y permitir continuar hacia publicación. El código adoptaba draft_revision sin validar y aceptaba incluso su ausencia.

La cola captura la revisión condicional enviada y verifica la respuesta antes de adoptar la nueva revisión, sincronizar vigencia o anunciar Guardado. Acepta un entero seguro exactamente siguiente; si la respuesta incluye ID debe coincidir con la invitación solicitada. Las respuestas nulas, arrays, revisiones ausentes, cadenas, fraccionarias, anteriores o con saltos se rechazan.

La migración 014 no incrementa revisión cuando el contenido no cambia. Ese caso se acepta únicamente con ID correcto y eco completo y coincidente de todos los campos enviados, excluyendo status, que el servidor controla aparte. La comparación no depende del orden de claves JSONB y reconoce las columnas de listas serializadas. Una misma revisión aislada no demuestra un guardado.

Si no puede verificarse, se conservan datos, historial y marca de cambios, no se adopta vigencia de esa respuesta ni se guarda una versión como confirmada. La vista privada permanece bloqueada y una publicación o programación detenida en su guardado previo no envía la versión pública. La interfaz permite descargar un respaldo antes de recargar y comprobar el estado. No se afirma que el servidor haya revertido una escritura; si la aceptó, un siguiente intento con la revisión antigua debe recibir el conflicto condicional existente. No hay un reintento nuevo añadido por esta mejora; se mantienen los mecanismos de guardado y reconexión ya existentes.

El contenido de las invitaciones y sus recursos no cambian. No hay SQL ni dependencias nuevas; BCP conserva su bloqueo y la modificación preexistente de la migración 021 queda excluida. Se aplican las guías de React de Vercel para mantener la cola y evitar adoptar datos de una respuesta inválida.

Siete regresiones usan el constructor real, transporte y eventos aislados en memoria. Cubren guardado manual y automático, casos inválidos, contenido posterior, no adopción de vigencia ajena, revisión intacta para otro intento, aceptación de un incremento correcto, eco completo sin incremento y bloqueo de publicación/programación. La versión anterior f4e3c5e obtiene 1 acierto y 6 fallos. No constituyen una aceptación física ni una prueba ReactDOM; las manuales siguen pendientes.

La primera suite completa encontró un contador inconsistente en el servidor simulado de una prueba de publicación: una respuesta diferida ya había confirmado revisión 1, pero el siguiente PUT simulado devolvía otra vez 1. Se ajustó el contador a la revisión condicional de esa siguiente petición, sin cambiar las aserciones; las 13 pruebas de publicación pasan.

El verify final terminó con salida 0: **1.906 pruebas correctas en 66 ejecuciones**, lint, TypeScript y build de **65 páginas**, conservando las advertencias previas de imágenes heredadas. Los **597 archivos protegidos** y el hash de la migración 021 siguen iguales.

## Producción y limpieza

El commit `7b1f1276dc1a1ec53ff519ea681aebc284135b68` quedó integrado en main y desplegado como `dpl_Ho1K7xNMXSum3arWcXuegfSUpGsm`, Ready con alias [enkarta.vercel.app](https://enkarta.vercel.app). El [CI del mismo commit](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39842142792) terminó correctamente, incluidos verify y la auditoría de dependencias de producción.

- El release procede del commit y conserva los 129 originales; excluye archivos de entorno, material maestro y la modificación local de la migración 021. Los identificadores de entrada de Vercel coinciden con los bytes revisados del constructor, el validador y el bloqueo BCP. Los dos mensajes de error están en los scripts compilados servidos por producción.
- Se creó un único borrador ficticio y se envió un único PUT de mensaje y texto de entrada, con revisión condicional y journal previo. La revisión aumentó exactamente en uno; la fila, el editor y la vista privada reflejaron los textos nuevos. El resto del contenido, incluidas galería, música y configuración, coincidió con el plan. Sin sesión, la URL pública y preview=1 ocultaron sus datos. No se publicó ninguna invitación.
- Una segunda verificación solo leyó la fila ya guardada, sin repetir el PUT. El validador real aceptó esa fila frente a la revisión anterior; también aceptó su eco completo frente a la revisión actual y rechazó una respuesta con esa revisión aislada. Esto verifica la comparación con datos reales; no se atribuye a un segundo PUT sin cambios ni a interacción del navegador.
- Se eliminó exclusivamente la fila ficticia mediante su UUID/slug fijados y validación de nombre, propietario, estado, etiqueta QA y contenido. Las ocho tablas asociadas quedaron sin filas y los tres prefijos de almacenamiento estaban vacíos. Tras cerrar la sesión técnica, ambas URL devolvieron 404.
- Pasaron seis rutas públicas y **129/129 originales** por longitud y SHA-256; dos audios grandes se verificaron íntegramente por 34 rangos HTTP con Content-Range y ETag consistentes. No es una prueba de reproducción. Los **597 archivos protegidos** y el hash de la migración 021 siguen iguales.
- Cero pagos, mensajes, archivos subidos o llamadas bancarias. BCP conserva su bloqueo; no se consultaron ni modificaron variables remotas del proveedor.

Las respuestas corruptas y la concurrencia se ejercitan en memoria. La comprobación de producción acredita API, fila guardada, validador, HTTP, fuentes y limpieza; no se presenta como aceptación visual de un guardado manual en navegador. Las manuales siguen pendientes.

Evidencia privada: `tmp/builder-save-ack/RESULTADO.json`.
