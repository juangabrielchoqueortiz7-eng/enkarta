# Duplicación del constructor en computadora

## Problema y comportamiento

Dos invocaciones de Duplicar antes del siguiente render enviaban dos POST. El handler capturaba los datos del render anterior y una respuesta podía navegar después de desmontar el editor. Se reprodujeron los tres casos con el componente real y transporte aislado en memoria.

La nueva operación adquiere un bloqueo antes de confirmar y captura el documento actual después de la confirmación. Confirma el texto editable del lienzo mediante su blur existente; serializa una instantánea antes de esperar la red. Cada intento tiene un slug con UUID. El diseño, configuración, referencias a fotografías, música y adornos mantienen la misma lista de campos del flujo anterior; no se copian identificadores de fila, credenciales ni anclas de publicación.

La respuesta debe identificar otra invitación con UUID, el slug solicitado y estado draft. Un ID aislado o una respuesta inconsistente no habilitan la navegación. Se conservan las validaciones de permisos, contrato, propietario y cupos en el servidor; la interfaz no autoriza publicaciones.

## Interacción y recuperación

- El botón de escritorio muestra Duplicar/Duplicando…, etiqueta accesible, foco y estado ocupado. Una franja describe la operación sin tapar el lienzo.
- La espera de transporte y JSON comparte un presupuesto de 25 segundos mediante el helper existente. No hay reintentos automáticos.
- Un rechazo HTTP 4xx recibido dentro del plazo es definitivo en este endpoint, que lo devuelve antes de insertar. Libera el bloqueo para un nuevo intento explícito, incluso si el cuerpo no puede leerse.
- Un error de red, 5xx, timeout o respuesta de éxito no verificable conserva una barrera. «Revisar mis invitaciones» abre el panel en otra pestaña, manteniendo el original disponible. Abortar la espera no significa revertir una inserción aceptada.
- Una copia confirmada ofrece «Abrir copia» en otra pestaña. Solo navega automáticamente si el original no tiene cambios pendientes, conserva la secuencia de edición y no empezó un guardado manual ni revisión/operación de publicación durante la espera. La duplicación no marca el original como guardado.
- Cancelar no crea nada. Desmontar o cambiar el contexto cancela la espera y descarta respuestas tardías. La repetición de efectos de React 18 mantiene la barrera si se interrumpió un POST.

El bloqueo es local a esta instancia del editor. No es idempotencia del servidor entre pestañas o recargas. Tras una respuesta incierta debe revisarse el panel antes de crear otra copia; no se promete una reversión ni se consulta un listado global de clientes para recuperar el resultado.

## Alcance y comprobaciones

Se aplican Impeccable en modo Operate y las guías de React de Vercel, compatibles con React 18. El detector no encontró hallazgos en los dos archivos afectados. El navegador local está deshabilitado en la configuración de Work de esta sesión: no se presenta la comprobación automática como una aceptación visual manual.

Las **20 pruebas** de regresión utilizan InvitationBuilder y el hook reales, con hooks, eventos y transporte en memoria; los paneles y el preview son límites inertes. No montan ReactDOM ni hacen solicitudes reales. Comprueban captura actual, doble acción, cancelación, respuestas inconsistentes, límite de espera, conservación de cambios, guardado/publicación simultáneos, navegación alternativa, desmontaje y repetición de efectos.

No se modifican renderers de invitaciones, presets, estilos globales ni recursos originales. No hay migración SQL ni nuevas dependencias. La modificación preexistente de la migración 021 permanece fuera del cambio. BCP mantiene su bloqueo `BCP_CONTRACT_REQUIRED`.

El código anterior `dbdd82c9` obtiene 2 aciertos y 18 fallos con esta suite, sin cancelaciones. La ejecución habitual no necesita Git ni red.

La comprobación completa ejecutó **1.857 pruebas en 62 procesos**, sin fallos, cancelaciones ni omisiones; lint y TypeScript también pasaron. El build inicial se detuvo por un permiso del entorno restringido al crear `.next/server/app/api` (EPERM), después de terminar las pruebas. Se repite únicamente `npm run build` con el permiso necesario; no se altera el código para evitar ese error ni se atribuye salida 0 a aquella primera ejecución de verify. Las advertencias de imágenes heredadas se conservan sin supresiones nuevas. Los **597 archivos protegidos** coinciden por SHA-256 con la línea base.

El build repetido terminó correctamente (salida 0), con **65 páginas** generadas. La revisión independiente no dejó bloqueos tras añadir el veto de navegación durante guardado/publicación y las regresiones con Editable real.

La verificación de producción y la limpieza se registrarán aquí tras el despliegue. Las pruebas manuales continúan pendientes.
