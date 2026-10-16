# Enkarta

Plataforma de invitaciones digitales, gestión de invitados y recepción QR.
Next.js 15, React 18, Tailwind CSS 3 y Supabase; versiones en `package.json`.

Ejecutar `npm ci` y `npm run dev`. Configuración privada en `.env.local` según
`.env.example`. `npm run verify` comprueba lint, tipos, regresiones y build.

La versión actual requiere las migraciones 001–018 en orden. La aplicación no
las ejecuta automáticamente. Consultar [padrón paginado y verificación](docs/PADRON_PAGINADO_018.md)
y [skills y alcance visual](docs/SKILLS_ENKARTA.md).

Los recursos originales se conservan en su biblioteca maestra; los archivos
excluidos del repositorio no se reemplazan ni se descargan durante CI. Para
publicar desde otro equipo hace falta la distribución original verificada.
BCP permanece desactivado hasta recibir y validar documentación y credenciales.

## Publicación, permisos y pagos — Fase 1

La aplicación requiere las migraciones existentes hasta `013`, seguidas de
`migrations/014_publication_integrity.sql` y `migrations/015_payment_integrity.sql`,
en ese orden, antes de desplegar esta versión. El código no las aplica de forma
automática. Ambas son transaccionales y admiten reaplicación; deben validarse en
staging antes de ejecutarlas sobre datos reales.

La migración 014 conserva las publicaciones mediante referencias explícitas,
separa el borrador del contenido público y limita a 30 únicamente las versiones
de trabajo. Si el error anterior ya eliminó una publicación, la migración impide
exponer su borrador: el organizador debe revisar y publicar una nueva versión.
La migración 015 conserva el historial de pagos, archiva intentos pendientes
duplicados y reúne aprobación y activación en una sola transacción.

Para verificar el proyecto con Node.js 22:

```bash
npm ci
npm run verify
npm audit --omit=dev
```

`test:integrity` ejecuta los handlers y las migraciones en PostgreSQL aislado
(PGlite), con identidades ficticias y sin solicitudes a bancos. Incluye fallos
inyectados para comprobar rollback, conflictos entre lectura y escritura,
permisos SQL y conservación de publicaciones. La concurrencia con dos conexiones
PostgreSQL independientes debe verificarse también en staging. La ruta
`/dev/builder` permite revisar la interfaz con datos de muestra únicamente en
desarrollo; en producción responde 404.

### QR BCP con API key

`PAYMENT_PROVIDER=manual` conserva el flujo actual de instrucciones y revisión
de comprobantes. El contrato interno del adaptador BCP está en
`src/lib/payments/bcp.ts`. Todavía no existe un adaptador bancario activo:
`PAYMENT_PROVIDER=bcp` bloquea la creación de pagos con un mensaje explícito,
incluso si se configura una clave.

Cuando BCP entregue la documentación oficial y las credenciales de sandbox, se
implementarán la emisión del QR, su vencimiento, la consulta de transacciones y
el mecanismo de autenticación de confirmaciones especificado por el banco.
La clave se configura como `BCP_API_KEY`, exclusivamente en el servidor; nunca
con prefijo `NEXT_PUBLIC_` ni dentro del repositorio. La activación debe utilizar
la confirmación verificada por el servidor y la transacción idempotente de la
migración 015, comprobando referencia, importe, moneda e identificador bancario.
Un estado de pago enviado por el navegador no activa servicios.

### Comprobación de las migraciones aplicadas

`node scripts/check-integrity-db.cjs` verifica las nueve funciones de integridad,
las columnas de publicación y pagos y la denegación de acceso anónimo, sin crear
registros. No imprime credenciales ni datos personales.

El modo `--exercise --expect-project REFERENCIA_DEL_PROYECTO` crea socios,
invitaciones y asientos contables ficticios para comprobar publicación, retención
de versiones, permisos, cupos concurrentes, comprobantes y aprobación idempotente.
Elimina exclusivamente los UUID de esa ejecución y comprueba la limpieza final.
No ejecuta pagos bancarios ni crea cuentas de Auth, envía mensajes o correos.
Las pruebas que escriben datos se realizan en staging o con autorización expresa
para el proyecto de producción. El parámetro `--report RUTA.json` guarda evidencia
sin secretos.

`scripts/check-integrity-http.cjs` añade pruebas de los endpoints de la aplicación
nueva contra esa misma base. Requiere `--exercise --expect-project REFERENCIA` y
una instancia local por defecto (`--app-url http://127.0.0.1:3000`). Comprueba el acceso de revisión, la publicación desde
HTTP, conflictos de guardado, contenido público y aprobación de pagos ficticios.
Con autorización expresa también admite `--production --app-url https://enkarta.vercel.app`;
no permite enviar credenciales a otros dominios. La limpieza comprueba también las
suscripciones, observaciones, historial de vigencia y analítica de los eventos ficticios.
`node scripts/check-originals-deployment.cjs https://enkarta.vercel.app` compara los
bytes publicados con los SHA-256 de los manifiestos originales, sin modificar recursos.
La aplicación publicada en Vercel se valida por separado: aplicar SQL no despliega
automáticamente los cambios del repositorio.

Los originales de `Iconos INVITALI/` y sus copias de distribución en `public/`
no se modifican. Las pruebas existentes comprueban sus bytes y SHA-256.

### Invitados, WhatsApp y recepción QR

Los cambios y eliminaciones de invitados requieren `expectedRevision`. Un
registro desactualizado devuelve 409 y conserva la edición local para que el
organizador pueda revisarla. La importación valida el lote completo antes de
insertarlo: hasta 200 invitados por solicitud, nombres de hasta 80 caracteres y
pases enteros de 1 a 20. El lector CSV acepta campos entre comillas con saltos de
línea, coma, punto y coma y tabulaciones; detecta filas mal formadas y duplicados.
La exportación neutraliza fórmulas de hojas de cálculo.

WhatsApp abre el enlace directamente desde el gesto del usuario. La apertura,
marca manual, recordatorio preparado y respuesta tienen estados distintos. No
hay envío masivo automatizado, ni confirmación de entrega o lectura. Los mensajes
aceptan `{nombre}`, `{nombre_invitado}`, `{pases}`, `{cantidad_pases}`, `{link}`,
`{link_unico}`, `{mesa}` y `{codigo}` sin sustituir variables dentro de los datos.
Desde la migración **016**, teléfono, grupo y preferencia se guardan en
`guests.guest_metadata` junto al invitado, con la misma revisión y sentencia SQL.
El constructor y el panel del anfitrión permiten editarlos; ambos importadores
CSV guardan esos campos. El diseño deja de ser la fuente de los contactos. La
preferencia de ceremonia/recepción es informativa y no restringe el QR por ubicación.

El pase confirmado se descarga como PNG generado localmente, con nombre, mesa,
cantidad confirmada y QR; no usa servicios externos ni incluye el token en el
nombre del archivo. No es una integración con Apple/Google Wallet. Recepción
mantiene el ingreso individual, muestra cupos restantes o agotados y permite
activar sonidos. Requiere conexión al servidor para validar movimientos; guardar
el PNG sin conexión no habilita un modo de recepción offline.

`/dev/operations` permite revisar el componente real del pase, descargar su PNG y
decodificarlo con un lector independiente usando exclusivamente un token ficticio.
La ruta responde 404 en producción. La cámara y el sonido deben comprobarse además
en iOS/Android físicos; la prueba de escritorio no acredita esos permisos.

El ejercicio HTTP anterior también comprueba importación atómica, permisos de
recepción, edición obsoleta, seguimiento idempotente, límite de RSVP, dos escaneos
concurrentes, ingreso parcial, agotamiento y salida/reingreso. Elimina y verifica
también invitados, asientos y bitácoras pertenecientes a sus UUID ficticios.
El pase y recepción reutilizan las migraciones existentes; el guardado unificado
de contactos requiere 016. BCP se mantiene desactivado.

### Aplicación de 016 y actualización del código

1. Ejecutar **completo** `migrations/016_guest_metadata.sql` en Supabase SQL Editor.
   El resultado final debe mostrar `guest_metadata_ready = true` y `pending_rows = 0`.
2. Ejecutar `node scripts/check-guest-metadata.cjs --expect-project REFERENCIA`
   para comprobar la columna sin leer invitados. No acredita por sí solo el trigger;
   la comprobación de revisiones requiere el ejercicio HTTP posterior.
3. Desplegar el código y recargar el constructor/panel que estuviera abierto.
   Evitar editar contactos con la versión anterior entre la migración y el despliegue.
4. Repetir el ejercicio HTTP autorizado con registros ficticios y limpieza final.

016 copia los datos heredados una sola vez y conserva `builder_config.guestMeta`
como respaldo. Reaplicarla no sobrescribe contactos actuales ni recupera valores
vaciados intencionalmente. No modifica publicaciones, recursos, QR, credenciales ni
pagos. El modelo de permisos de 006 se conserva. Los contactos se entregan solo a
las vistas operativas autorizadas, no a RSVP ni a la invitación pública. El CSV
operativo del anfitrión mantiene su exclusión de teléfonos y tokens de acceso.

Un rollback del código a una versión anterior a 016 mostraría el respaldo antiguo
de contactos: conservar el código actualizado después de iniciar su uso. La nueva
columna puede permanecer en la base sin eliminar datos ni revertir la migración.

### Revisión de importaciones, cola de WhatsApp y QR por foto

El constructor y el panel del anfitrión comparten la revisión CSV: asignación
manual de columnas, vista previa, motivos por registro omitido, informe descargable
y plantilla de ejemplo. Bloquea asignaciones ambiguas y no recorta silenciosamente
grupos, mesas o preferencias inválidas. Continúa el límite de 200 altas por lote;
no reimporta ni actualiza automáticamente registros existentes.

El anfitrión puede filtrar por grupo y preparar una cola de hasta 200 contactos de
la lista visible. Las invitaciones iniciales excluyen contactos con seguimiento;
los recordatorios excluyen a quienes respondieron. Cada contacto requiere acción
humana para abrir WhatsApp y enviar allí; avanzar no marca envío. Un fallo de red
permite reintentar solo el seguimiento conservando su UUID y revisión. El progreso
local se pierde al cerrar; los estados guardados en el servidor permanecen.
No hay envío automático, conexión con WhatsApp Business API ni recibos de entrega.

Recepción puede leer PNG, JPG o WebP de hasta 10 MB en el dispositivo. No sube la
imagen ni navega a URLs decodificadas. El token se valida en el endpoint privado
existente antes de permitir un movimiento. Una lectura nueva retira el grupo
anterior; un error nunca deja sus botones activos. La cámara se detiene al ocultar
la página y debe iniciarse nuevamente mediante el botón. El modo por foto conserva
los mismos permisos y sigue requiriendo conexión para validar el acceso.

Este bloque no añade SQL ni modifica recursos originales. BCP sigue desactivado.

### Importación recuperable de invitados — 017

El siguiente bloque requiere ejecutar completa `migrations/017_guest_import_idempotency.sql`
**antes de desplegar** el código que usa `enkarta_import_guests`. El SELECT final debe
mostrar `guest_import_ready = true`. No modifica invitados existentes ni diseños.
Después se puede verificar el esquema sin leer registros con:

```powershell
node scripts/check-guest-import.cjs --expect-project eodedockxqvynedwhpsp
```

Cada alta/lote lleva un `requestId` UUID. La RPC registra su huella y los IDs
creados en la misma transacción. Repetir la operación recupera los invitados
actuales sin recrear eliminados ni sobrescribir confirmaciones. Cambiar el
contenido u orden conservando la misma identidad devuelve conflicto. Un error
en una fila revierte el lote entero y el registro de importación. La tabla tiene
RLS y acceso únicamente del servidor; no duplica contactos ni tokens QR.

El constructor y el anfitrión conservan el lote pendiente en `sessionStorage`
por evento y pestaña hasta recibir confirmación. Una respuesta perdida bloquea
otra importación y ofrece «Recuperar resultado del lote». El borrador incluye
los datos introducidos y se retira al confirmar; no incluye credenciales ni QR.
Cerrar la pestaña puede perder esta recuperación. Si el navegador impide el
almacenamiento, la interfaz indica que se mantenga el panel abierto.

Las importaciones con identidades distintas son operaciones independientes:
esto no fusiona familias por nombre ni deduplica archivos entre dispositivos.
Continúa la revisión CSV previa. Tras el despliegue, recargar los paneles
antiguos: el POST sin `requestId` devuelve 400 sin escribir.

El ejercicio HTTP incorpora solicitudes simultáneas del mismo lote, conflicto
por contenido distinto, permisos de puerta y recuperación tras eliminación;
su limpieza comprueba también `guest_import_requests`. No ejecutarlo antes de
017 y del despliegue. BCP sigue en modo manual/desactivado.

### Recepción sin QR y seguimiento individual

Anfitrión y puerta pueden buscar grupos confirmados dentro de su evento por parte
del nombre o mesa exacta, con máximo 20 coincidencias. La respuesta excluye
contactos, mensajes y tokens. Abrir una ficha no registra entrada; conserva la
validación y los movimientos individuales existentes. La opción de mesa se
oculta si el paquete no la incluye. La búsqueda por nombre respeta acentos.

El constructor y el editor del anfitrión ofrecen recuperación del seguimiento
individual de WhatsApp con la misma identidad/revisión. Ante una respuesta
incierta se bloquean nuevas acciones de seguimiento y el reintento no abre
WhatsApp. Mantener el panel abierto hasta resolverlo. Sin nuevas migraciones.
Ver `docs/RECEPCION_BUSQUEDA_Y_SEGUIMIENTO.md` para pruebas y límites.
