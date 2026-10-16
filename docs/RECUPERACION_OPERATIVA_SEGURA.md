# Recuperación segura de invitados, WhatsApp y recepción QR

Una lectura fallida del almacenamiento del navegador no permite saber si hay una
operación pendiente. Antes se permitía continuar en memoria también en ese caso;
la importación podía sobrescribir el lote anterior y el seguimiento podía perder
su aviso al fallar la retirada local. Una cadena vacía tampoco se distinguía de
la ausencia de copia en recepción QR.

## Comportamiento

- **Lectura bloqueada o copia inválida:** se bloquean operaciones nuevas del flujo
  afectado. «Volver a leer» consulta la recuperación local sin enviar un POST.
  Los demás datos del padrón siguen consultables según sus permisos.
- **Escritura fallida después de leer correctamente:** la operación conserva su
  identidad en memoria, con un aviso que pide mantener abierta la pantalla. No se
  promete recuperación después de recargar si no pudo guardarse la copia.
- **Copia desaparecida con operación incierta en memoria:** se conserva el
  reintento. La ausencia de copia no demuestra que el servidor terminó ni cancela
  una importación, un seguimiento o un movimiento.
- **Retirada fallida tras una respuesta válida:** el reintento sigue bloqueando
  acciones nuevas. Recuperar utiliza exactamente el mismo lote o acción y UUID;
  los contratos idempotentes existentes evitan duplicados.
- **Recuperación cambiada:** guardar y retirar comparan la operación completa,
  incluido el contenido del lote o la acción, no solo su UUID. Una respuesta
  tardía no retira una copia distinta.
- **Copia dañada:** la retirada requiere reconocimiento explícito y compara los
  mismos bytes que se leyeron. Si cambió, se exige volver a leerla. No se borra
  ningún registro del servidor. La interfaz pide revisar el padrón antes de
  repetir una importación o un recordatorio.
- **QR vacío:** una cadena vacía es una copia inválida; bloquea lecturas y
  movimientos hasta resolverla. Se conserva el check-in parcial y la recuperación
  existente por evento, rol y sesión.

La importación mantiene el formato de recuperación existente por evento y
pestaña, con su lote de entrada privado, máximo 200 registros y 131.072 caracteres.
WhatsApp conserva únicamente la identidad mínima de la operación; no guarda
nombres, teléfonos, mensajes ni tokens QR. No se añaden cachés globales ni se
cambian las comprobaciones de permisos o cupos del servidor. Abrir WhatsApp no
acredita envío, entrega ni lectura; los reintentos no abren la aplicación.

## Implementación

- `delivery-recovery.ts` y `guest-import-operation.ts` distinguen errores de
  lectura y de escritura, evitan sobrescrituras y verifican la retirada selectiva.
- `DeliveryRecovery.tsx` y `GuestImportRecovery.tsx` mantienen el bloqueo,
  ofrecen relectura y conservan resultados inciertos. La importación aísla las
  confirmaciones tardías mediante la generación de su montaje/contexto.
- El padrón y el panel de invitados del constructor respetan `importer.blocked`.
  El aspecto de las invitaciones y su publicación no cambia.
- `scan-recovery.ts` y `Scanner.tsx` distinguen `null` de una copia vacía.

Skills aplicadas: Impeccable para los estados y textos de recuperación, React Best
Practices para almacenamiento y ciclo de vida, Web Design Guidelines para
controles, reconocimiento y avisos accesibles. El detector de los archivos de
interfaz afectados no encontró hallazgos. No se actualizan dependencias.

## Regresiones y evidencia

Ocho regresiones nuevas en `scripts/test-builder.cjs`: lectura frente a escritura
fallida; lote o acción cambiados con el mismo UUID; copia vacía o dañada en los
tres flujos; comparación de bytes al retirar; error de retirada y conservación
del cuerpo exacto de una importación después de perder la respuesta.

`/dev/services/recovery-safety` utiliza los componentes reales con transporte y
almacenamiento ficticios en memoria. No importa Supabase ni abre WhatsApp. Solo
está disponible con `NODE_ENV=development`. Permite repetir fallos de lectura,
escritura y retirada, pérdida de respuesta, copia dañada y restauración por
montaje. Sus contadores distinguen solicitudes de operaciones guardadas.

La aceptación local contiene 21 comprobaciones de navegador: 17 solicitudes
ficticias para siete operaciones distintas, cero errores de consola y controles
sin desbordamiento a 390 px. Incluye un ingreso parcial QR recuperado una vez,
con tres pases restantes. Los resultados y capturas se guardan en
`tmp/recovery-safety/`, excluido de Git. Esta simulación no certifica cámara,
audio ni almacenamiento en teléfonos físicos, ni sustituye las pruebas SQL.

La suite conserva las regresiones SQL/API de permisos, publicación, pagos,
RSVP, importación, WhatsApp, QR y paginación. El despliegue y la aceptación remota
se registran por separado; una prueba local no acredita producción.

BCP permanece desactivado. Esta mejora no requiere SQL, variables nuevas,
operaciones bancarias ni cambios de diseños o recursos originales.
