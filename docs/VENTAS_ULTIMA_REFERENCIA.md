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
