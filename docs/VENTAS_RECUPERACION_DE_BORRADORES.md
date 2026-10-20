# Recuperación de cambios de Ventas sin enviar

## Comportamiento

El editor conserva los cambios de estado, ingreso y nota mientras el operador escribe, en `sessionStorage` de esa pestaña y sesión autenticada. Al recargar, **Cambios sin enviar** ofrece su recuperación explícita durante 24 horas. No se recuperan ni envían automáticamente.

**Recuperar cambios** consulta el contacto con la búsqueda privada existente. Comprueba identidad, referencia y revisión antes de abrir el editor habitual. Una ficha con cambios activos o una operación pendiente impide reemplazarla. Las operaciones enviadas o preparadas tienen prioridad sobre estos borradores.

Se conserva el texto exacto del importe, incluso `930,` o una entrada aún inválida. Guardar mantiene las validaciones existentes. El panel de recuperación muestra referencia y fecha; no repite las notas ni los ingresos. No guarda conversaciones, credenciales, instrucciones bancarias, atribución, historial ni una copia completa del contacto.

## Conflictos y seguridad del guardado

Cada borrador incluye la revisión y los tres valores operativos originales, además de los valores editados. Si el contacto avanzó, se abre un conflicto. **Revisar mis cambios** conserva solo los campos editados y adopta los demás de la versión actual; requiere revisión y un guardado explícito. Una misma revisión con valores operativos distintos se rechaza por inconsistente.

Al pulsar Guardar, primero se conserva la operación canónica con su UUID en el journal de operaciones. Solo después se retira el borrador exacto y se permite el PATCH. Si se recarga entre ambos pasos, la operación tiene prioridad; antes del reintento solo se retira un borrador cuyo cuerpo canónico coincide exactamente. No se elimina una copia ajena o posterior.

Si retirar el borrador falla después de conservar la operación, no se envía el intento. El editor mantiene esa misma solicitud y permite continuar explícitamente con **Comprobar guardado** cuando se recupere el almacenamiento. La interfaz dice que todavía no se envió. Una respuesta incierta conserva el UUID para comprobarlo sin duplicar el historial.

Un conflicto confirmado vuelve a conservar los cambios como borrador antes de retirar la copia de la operación. Si falla esa conservación, la operación queda como respaldo y se avisa. No se anuncia un guardado ni se pierde silenciosamente su intención.

Hay una excepción deliberada: una operación recuperada no conserva la base original de cada campo. Si termina en conflicto, mantiene su journal y advertencia de valores completos hasta que el operador pulse **Revisar valores recuperados**. Esa decisión conserva primero los valores revisados como borrador contra la versión actual y luego retira la operación por comparación exacta. No se inventa qué campos se habían editado ni se presenta su payload antiguo como un borrador normal sin revisión.

## Alcance del almacenamiento

- Clave independiente `enkarta.commercial-drafts.v1:<huella de sesión>`, con versión y validación estricta de campos, estados, revisiones, referencias, UUID, fechas y tamaños.
- Hasta 50 contactos y 240.000 caracteres por journal. No se trunca ni se expulsa otra copia para aceptar una nueva.
- La escritura y el descarte comparan la entrada completa esperada. Un editor antiguo no sobrescribe ni elimina una copia posterior. Se conservan los borradores de otros contactos y sesiones.
- La caducidad se calcula desde la última escritura del borrador. Leerlo no renueva el plazo. Los vencidos se separan para descarte explícito; no se aplican al contacto ni se borran silenciosamente.
- Los cambios permanecen en memoria si el almacenamiento falla o aún no está disponible. El aviso distingue ese estado del borrador conservado. Una copia existente debe recuperarse o descartarse antes de reemplazarla con otra edición.
- Descartar requiere confirmación. El descarte desde el panel retira únicamente esa copia local; no revierte el servidor. Si la ficha sigue abierta, sus valores permanecen en memoria y una nueva edición puede conservar un borrador nuevo.
- No se promete continuidad al cerrar la pestaña, cambiar de sesión o usar otro dispositivo. Se mantiene la advertencia de salida para cambios o guardados pendientes.

La recuperación usa la huella opaca que ya devuelve la configuración autenticada. No añade endpoints, permisos, migraciones, dependencias ni caché global de datos privados. Las callbacks de una sesión anterior y consultas canceladas no pueden abrir un borrador en la sesión nueva.

## Pruebas y muestra

Las suites de dominio, reducer y hook/editor usan almacenamiento y transporte ficticios. Verifican recuperación explícita sin PATCH, texto incompleto, conflictos selectivos, caducidad, límites, sesión, CAS, fallos de almacenamiento, prioridad y promoción entre journals. Las pruebas existentes de servicios y PostgreSQL siguen verificando publicación, permisos y operaciones idempotentes.

La muestra local `/dev/services/commercial-dashboard` permite editar sin guardar, **Reiniciar carga** y recuperar el borrador contra el mismo servidor ficticio en memoria. **Limpiar QA** retira borradores activos y vencidos, operaciones y cotización del scope ficticio, sin tocar otras sesiones. Una recarga real reinicia ese servidor ficticio; no representa persistencia de Supabase. La muestra sigue bloqueada en producción.

Las pruebas de hooks y estado no certifican el DOM, el foco, la presentación en Android ni el almacenamiento de un navegador físico. Las pruebas manuales permanecen aplazadas por petición del usuario.

BCP conserva su bloqueo. No se modifican invitaciones, presets, estilos globales ni recursos originales. La comprobación remota se limita a publicación, permisos, contratos y recursos públicos; no crea contactos ni pagos de producción. Evidencia privada en `tmp/sales-unsent-drafts/`.
