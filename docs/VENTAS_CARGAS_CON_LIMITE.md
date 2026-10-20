# Cargas recuperables del historial y la configuración de Ventas

## Fallo y comportamiento

El historial y el cotizador programaban `abort()` desde sus componentes, pero seguían esperando sus servicios. Si el transporte o `response.json()` ignoraban la señal, la interfaz podía continuar en carga indefinidamente. La configuración también podía aceptar una respuesta válida que llegara después de aquel plazo y volver a publicar su huella de sesión.

Ambos servicios controlan ahora el intento completo con `runSalesRead`: **20.000 ms para el historial** y **12.000 ms para la configuración**. El presupuesto incluye transporte, lectura JSON y validación; no se reinicia al recibir las cabeceras. Al vencer se rechaza la espera propia antes de abortar el controlador hijo, de modo que el error del transporte no sustituya el motivo de salida.

No hay reintentos automáticos. Un error vuelve a habilitar las acciones existentes **Reintentar consulta** o **Reintentar configuración**. Las respuestas y los rechazos tardíos se consumen sin actualizar la interfaz ni reactivar la configuración.

## Historial

- Sigue cerrado inicialmente y solo consulta al abrirlo. Encontrar un contacto no descarga su historial.
- Si una consulta de página falla o vence, conserva la página anterior con el aviso de que corresponde a la consulta previa. El reintento utiliza exactamente el cursor y corte que fallaron.
- Cerrar, desmontar, cambiar contacto, referencia, revisión o transporte cancela el intento anterior. La página, los errores y el estado de carga se vinculan al contexto actual.
- Las callbacks antiguas no pueden abrir, cerrar ni paginar otra ficha. Volver al mismo contacto después de pasar por otro tampoco reactiva aquellas callbacks.
- Los estados de ausencia, sesión terminada, migración requerida o respuesta inválida siguen siendo errores; no se anuncian como historial vacío.

## Configuración y borrador del cotizador

- Una configuración que agotó su plazo no publica la huella de sesión, no recupera el almacenamiento y no activa copias ni edición. Una configuración anterior tampoco se presenta como vigente durante una nueva comprobación.
- Mientras la configuración no está verificada, las instrucciones de pago se retiran de la propuesta generada y las acciones quedan bloqueadas. El contenido editado del borrador permanece en memoria y su copia local no se modifica por el error.
- El reintento es explícito. Si se valida el mismo scope, se conservan los ajustes de la cotización; si se valida otra sesión, se aplica su recuperación habitual.
- Las respuestas antiguas no sustituyen una configuración más reciente ni reactivan una huella retirada. Desmontar aborta la consulta y retira la huella comunicada al resto de Ventas.
- Los manejadores antiguos de edición, descarte, importación y reintento se invalidan al cambiar el contexto de configuración. Un botón de copia antiguo tampoco escribe un texto anterior después de quedar desactivado, cambiar su valor o desmontarse.
- La configuración mantiene su whitelist de salida y valida que la huella tenga exactamente 64 caracteres hexadecimales. No persiste instrucciones de pago ni procesa cobros.

## Cancelación y límites

Una señal ya abortada no inicia tráfico. El helper usa su propio `AbortController`: agotar el plazo de una consulta no aborta el controlador externo ni otras consultas que lo compartan. Se retiran su temporizador y listener externo al resolver, rechazar, cancelar o agotar el plazo.

Después de recibir el transporte y el JSON, los servicios vuelven a comprobar la cancelación. Si un transporte llega cuando ya fue abortado, no se empieza a leer su cuerpo. Un transporte externo que ignore la cancelación puede seguir pendiente internamente; la interfaz ya no depende de que termine y su resultado no se acepta después del cierre.

El tiempo depende del reloj y temporizadores del navegador. Las pruebas con reloj simulado no certifican segundos de reloj físico en una pestaña suspendida o un Android real.

## Pruebas y muestras

Las nuevas regresiones ejercitan el helper, los servicios y los componentes reales con transportes, almacenamiento, portapapeles y relojes ficticios. Cubren límites compartidos entre fases, transportes y cuerpos que ignoran aborto, respuestas/rechazos tardíos, aislamiento del controlador externo, limpieza de recursos, conservación del cursor y del borrador, y callbacks de contextos anteriores.

Las muestras locales `/dev/services/commercial-history` y `/dev/services/sales-quote` incorporan **Transporte sin respuesta** y **Cuerpo sin respuesta**. Permiten esperar el aviso y después reintentar con el modo correcto. No consultan Supabase, no envían mensajes y no realizan pagos; sus rutas siguen bloqueadas en producción. Los datos del historial están en memoria y la limpieza del cotizador conserva el alcance de sus sesiones ficticias.

No se realizó aceptación visual, interacción de navegador o comprobación física en Android. **Las pruebas manuales siguen aplazadas por petición del usuario.** La verificación remota se limita a contratos publicados, autenticación, permisos, validación de entradas inválidas y recursos públicos, sin consultar ni modificar fichas de clientes.

No hay migración, dependencia, endpoint, permiso ni operación bancaria nuevos. BCP conserva su bloqueo y configuración. Invitaciones, presets, estilos globales y recursos originales permanecen intactos. Evidencia privada en `tmp/sales-read-deadline/`.
