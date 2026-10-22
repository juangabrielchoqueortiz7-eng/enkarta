# Confirmación verificable del guardado

Un HTTP 200 con JSON incompleto o una revisión anterior/incorrecta podía limpiar la marca de cambios del constructor y permitir continuar hacia publicación. El código adoptaba draft_revision sin validar y aceptaba incluso su ausencia.

La cola captura la revisión condicional enviada y verifica la respuesta antes de adoptar la nueva revisión, sincronizar vigencia o anunciar Guardado. Acepta un entero seguro exactamente siguiente; si la respuesta incluye ID debe coincidir con la invitación solicitada. Las respuestas nulas, arrays, revisiones ausentes, cadenas, fraccionarias, anteriores o con saltos se rechazan.

La migración 014 no incrementa revisión cuando el contenido no cambia. Ese caso se acepta únicamente con ID correcto y eco completo y coincidente de todos los campos enviados, excluyendo status, que el servidor controla aparte. La comparación no depende del orden de claves JSONB y reconoce las columnas de listas serializadas. Una misma revisión aislada no demuestra un guardado.

Si no puede verificarse, se conservan datos, historial y marca de cambios, no se adopta vigencia de esa respuesta ni se guarda una versión como confirmada. La vista privada permanece bloqueada y una publicación o programación detenida en su guardado previo no envía la versión pública. La interfaz permite descargar un respaldo antes de recargar y comprobar el estado. No se afirma que el servidor haya revertido una escritura; si la aceptó, un siguiente intento con la revisión antigua debe recibir el conflicto condicional existente. No hay un reintento nuevo añadido por esta mejora; se mantienen los mecanismos de guardado y reconexión ya existentes.

El contenido de las invitaciones y sus recursos no cambian. No hay SQL ni dependencias nuevas; BCP conserva su bloqueo y la modificación preexistente de la migración 021 queda excluida. Se aplican las guías de React de Vercel para mantener la cola y evitar adoptar datos de una respuesta inválida.

Siete regresiones usan el constructor real, transporte y eventos aislados en memoria. Cubren guardado manual y automático, casos inválidos, contenido posterior, no adopción de vigencia ajena, revisión intacta para otro intento, aceptación de un incremento correcto, eco completo sin incremento y bloqueo de publicación/programación. La versión anterior f4e3c5e obtiene 1 acierto y 6 fallos. No constituyen una aceptación física ni una prueba ReactDOM; las manuales siguen pendientes.

La primera suite completa encontró un contador inconsistente en el servidor simulado de una prueba de publicación: una respuesta diferida ya había confirmado revisión 1, pero el siguiente PUT simulado devolvía otra vez 1. Se ajustó el contador a la revisión condicional de esa siguiente petición, sin cambiar las aserciones; las 13 pruebas de publicación pasan.

El verify final terminó con salida 0: **1.906 pruebas correctas en 66 ejecuciones**, lint, TypeScript y build de **65 páginas**, conservando las advertencias previas de imágenes heredadas. Los **597 archivos protegidos** y el hash de la migración 021 siguen iguales.

La evidencia de producción se registrará al terminar las comprobaciones y la limpieza ficticia.
