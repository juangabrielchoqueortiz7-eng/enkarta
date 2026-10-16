# Recepción QR recuperable tras recargar

La recepción conserva ahora un movimiento incierto en la misma pestaña y sesión.
Al recargar consulta el grupo actual, muestra «Movimiento por comprobar» y exige
pulsar «Comprobar el mismo movimiento». Restaurar no envía un ingreso ni una salida.
No requiere SQL ni variables de entorno nuevas. BCP continúa desactivado.

## Contrato y comportamiento

- Antes del POST se conserva una operación mínima y versionada en `sessionStorage`:
  UUID de evento, grupo, asiento y persona; acción, revisión esperada e identificador
  original de solicitud. No se guardan nombres, etiquetas, teléfonos, códigos de
  acceso, tokens QR, mensajes ni cookies. El límite del registro es 1.024 caracteres.
- La clave separa evento, rol y huella opaca de la cookie firmada. La huella se
  calcula en el servidor después de autenticar. No es una credencial y no sustituye
  las comprobaciones de cookie, evento, servicio contratado o permisos.
- `/puerta` y `/panel/scan` entregan su contexto autenticado. El cliente lo envía en
  `X-Enkarta-Scanner-Session`; el servidor rechaza una huella distinta de la sesión
  efectiva, incluso si hay otra sesión de anfitrión o administrador abierta.
  Un cambio de contexto remonta el escáner, aislando respuestas tardías de la vista anterior.
- El POST también declara el evento y el servidor verifica al propietario real del
  pase. El GET identifica el evento y el cliente valida evento, grupo y asistentes.
  El administrador conserva su alcance autorizado entre eventos, pero cada operación
  pendiente pertenece a uno concreto y bloquea cambiar de grupo hasta resolverla.
- Una recarga lee el registro y consulta el estado vigente mediante GET. La operación
  original no cambia: misma persona, acción, revisión y UUID. La función SQL existente
  hace el reintento idempotente y devuelve el estado actual. Una salida posterior no
  se revierte al recuperar un ingreso anterior.
- Consultar el estado no elimina la incertidumbre. Un 403 posterior tampoco demuestra
  que la primera solicitud no se guardó. Se mantiene el reintento y se bloquean nuevos
  movimientos hasta recibir un recibo válido o retirarlo explícitamente.
- El recibo solo retira su propio registro. Una confirmación tardía no elimina otra
  operación. La retirada manual exige reconocimiento y nueva consulta del grupo;
  no revierte ni elimina movimientos del servidor.
- Si no se puede leer el almacenamiento o su contenido es inválido, se bloquean
  movimientos desconocidos y se ofrece volver a leer o retirar la copia ilegible.
  Si únicamente falla la escritura tras una lectura correcta, se permite continuar
  en memoria con aviso y advertencia al abandonar. No se promete recuperación en ese caso.
- La recuperación se limita a la misma pestaña y cookie de sesión. Cerrar la pestaña,
  borrar sus datos o volver a autenticar con una cookie diferente puede dejarla fuera
  de alcance. No hay recepción sin conexión ni sincronización de la cola entre dispositivos.
- Clientes anteriores sin la cabecera siguen sujetos a los permisos existentes;
  la cabecera adicional protege el contexto del nuevo cliente y no constituye un
  nuevo mecanismo de autenticación obligatorio para las integraciones existentes.

## Archivos y regresiones

`src/lib/scan-recovery.ts` define almacenamiento, validación y retirada selectiva.
`src/lib/scanner-session.ts` calcula la huella con separación de dominio y rol.
`host-session.ts`, las dos páginas privadas y `/api/checkin` vinculan el contexto.
`Scanner.tsx` restaura, consulta y resuelve sin un POST automático.

Las regresiones de `scripts/test-builder.cjs` cubren formato mínimo sin datos privados,
aislamiento, corrupción, límites, sobrescritura y retirada de otra operación,
fallos de lectura/escritura, identidad conservada y cambio de cookie o rol.
`scripts/test-services.cjs` comprueba con SQL real en PGlite la sesión, el evento,
el reintento único y una salida posterior. `check-integrity-http.cjs` añade las mismas
comprobaciones a las pruebas de producción con fixtures desechables y limpieza verificada.

Skills aplicadas: Impeccable para recuperación y estados operativos, React Best
Practices para formato mínimo/versionado y Web Design Guidelines para controles,
avisos y adaptación móvil. Se conserva la interfaz existente y el fondo del portal;
el detector señala este color heredado como advertencia consultiva, sin errores.

## Validación y límites

Las evidencias de esta actualización están en `tmp/scan-recovery/` y los registros
de las suites en `tmp/scan-recovery-*.log`. El entorno `/dev/operations` emplea un
servidor ficticio local que conserva recibos durante recargas y nunca importa
Supabase, banca o mensajería. Su API devuelve 404 fuera de desarrollo.

La prueba de recarga cuenta solicitudes en el registro del servidor: mismo número
de POST antes y después de restaurar. Las pruebas visuales utilizan viewports
emulados de 390 y 1.280 px. No certifican cámara, audio o comportamiento de navegadores
en teléfonos físicos. Los diseños, CSS global, plantillas y recursos originales
de las invitaciones no se modifican.

## Despliegue y resultado verificado — 15 de octubre de 2026

Publicado en <https://enkarta.vercel.app>, deployment
`dpl_AjaDbuMk8aezptazUBA2x9vVKAPf`, estado `READY`, destino `production`.
La inspección de Vercel confirma el alias principal. URL inmutable:
<https://enkarta-77q383zd4-juangabrielchoqueortiz7-engs-projects.vercel.app>.

- 241 pruebas locales aprobadas: 122 de lógica/constructor, 90 de servicios y 29
  de integridad. Tipos y compilaciones local/remota correctos. Lint conserva las
  diez advertencias previas de imágenes originales. Detector: una advertencia
  consultiva del fondo heredado del portal y ningún hallazgo bloqueante.
- 16 comprobaciones de navegador local aprobadas: recarga de ingreso y salida,
  aislamiento por evento/rol/sesión, 403 posterior, salida desde otro dispositivo,
  recibo ajeno, almacenamiento lleno o ilegible, descarte reconocido, grupo
  duplicado y retirada selectiva. Sin errores de consola.
- 23 comprobaciones HTTP/SQL de producción aprobadas: publicación, separación
  de borrador, permisos, contactos, importación, WhatsApp, RSVP, búsqueda,
  concurrencia, ingreso parcial, recuperación, sesión y pagos manuales.
  Las páginas privadas entregan la huella correspondiente sin exponer cookies.
- Navegador real contra producción, con viewport móvil emulado: sesión de puerta
  ficticia, grupo ficticio y recarga inmediata durante un ingreso. Reapareció el
  reintento, se consultó el grupo actualizado y «Comprobar el mismo movimiento»
  mostró «Ya estaba registrado; no se volvió a contar». La base de datos confirmó
  un solo movimiento adicional y un solo registro para su UUID. Se cerró la sesión.
- El escenario de llegada inicializó un asiento del evento ficticio como disponible
  después de la regresión de pases agotados. No se borró ni reescribió su historial
  de acceso durante esa preparación. `browser-fixture-preparation.json` documenta
  esta inicialización; el modo opcional `--browser-window` del script prepara
  futuras ejecuciones mediante una salida auditada anterior a su línea base.
- El proceso original se interrumpió después de aprobar todas las comprobaciones
  y antes de completar la limpieza. Se retomó exclusivamente por UUID, slug y correo
  ficticios de esa ejecución. `production-http.json` conserva el origen de los 23
  resultados en el registro original y detalla la limpieza recuperada. El script
  guarda ahora los UUID no secretos antes de mutar y actualiza el informe tras
  cada comprobación, facilitando recuperar una limpieza interrumpida futura.
- Limpieza final `verified-no-fixtures-remain`: cero eventos, invitados, pases,
  movimientos, importaciones, versiones, socios, suscripciones y pagos de prueba.
  Se retiraron también las credenciales temporales locales de esa sesión ficticia.
- 597 archivos locales protegidos y 129 recursos publicados (46.481.464 bytes)
  conservan sus SHA-256. Inicio y catálogo devuelven 200; nueve comprobaciones de
  disponibilidad/bloqueo aprobadas, incluida la API ficticia GET/POST/PATCH con 404.
- Cero llamadas bancarias y cero mensajes enviados. BCP permanece desactivado,
  sin cambios de variables ni SQL. Servidor y pestañas de prueba cerrados y viewport
  restaurado. No se creó commit ni se hizo push.

Resultados consolidados: `tmp/scan-recovery/verification.json`. Evidencias:
`production-http.json`, `production-browser.json`, `production-originals.json`,
`production-smoke.json`, `deployment.json`, `deployment-inspect.log`, `browser.json`,
`reload-http-proof.json` y `protected-originals.json` en esa carpeta.

![Recuperación comprobada en producción con datos ficticios](../tmp/scan-recovery/production-confirmed-mobile.jpg)
