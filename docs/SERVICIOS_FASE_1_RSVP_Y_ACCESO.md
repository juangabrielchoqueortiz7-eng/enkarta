# Servicios · Fase 1: confirmación y acceso confiables

Fecha de revisión: 28 de agosto de 2026.

Estado: implementación y verificación local terminadas. El usuario confirmó la aplicación de las migraciones y autorizó commit y despliegue. La comprobación remota de solo lectura confirmó las seis funciones, las columnas de 006 y la restricción de acceso anónimo. Pendiente de aceptación operativa: un evento de prueba con dos dispositivos independientes. No se crearon respuestas ni ingresos reales durante estas comprobaciones.

## Qué cambia

- Un solo formulario de confirmación para bloques y plantillas anteriores. Conserva el estilo de la invitación y evita añadir otro formulario cuando ya existe uno visible para ese dispositivo.
- El invitado puede consultar y modificar su respuesta hasta la fecha límite. Los cambios desde otra sesión no se sobrescriben silenciosamente: se pide actualizar y revisar.
- Si tiene 5 pases asignados y confirma 2, el acceso habilita 2 personas. Se mantienen el QR y los identificadores de asientos al corregir una respuesta.
- Cancelar invalida el acceso y oculta el QR también en el bloque de pase personal. No se permite cancelar ni reducir cupos que ya se utilizaron, incluso después de registrar una salida.
- Cada movimiento de entrada/salida actualiza el asiento y registra su historial dentro de la misma transacción. Un fallo de registro revierte también el movimiento.
- Reintentar una operación con el mismo identificador no vuelve a contarla. Una operación basada en una versión antigua del asiento se rechaza.
- El escáner exige sesión de administrador o anfitrión del evento. La identidad del operador se deriva del servidor, no del formulario.
- Invitaciones no publicadas, pausadas o expiradas no aceptan nuevas respuestas ni movimientos. La fecha límite de RSVP no impide el acceso a un evento que sigue activo. Las fechas son inclusivas, con zona `America/La_Paz`.
- Las nuevas respuestas abiertas ya no se escriben en archivos JSON públicos. Las tablas personales y las nuevas funciones SQL solo se utilizan desde el servidor con `service_role`.

## Alcance y límites

- El enlace personalizado identifica al grupo y permite recuperar su confirmación desde otro dispositivo. Sigue siendo un enlace compartible: esta fase no introduce verificación de identidad por SMS o correo.
- El RSVP abierto utiliza un recibo privado en una cookie HttpOnly, independiente para cada invitación. Permite recuperar y corregir la respuesta en ese navegador. Borrar cookies o usar otro navegador crea otra identidad; no se deduplica por nombre. Para un padrón exacto y QR, usar enlaces personalizados.
- Las respuestas abiertas no crean automáticamente invitados ni pases QR.
- No hay control de acceso sin conexión: una operación sin respuesta del servidor no se presenta como un ingreso confirmado. Se ofrece reintentar o actualizar.
- El registro de operador distingue administrador y anfitrión del evento, no empleados individuales ni teléfonos. Las cuentas individuales de operadores quedan fuera de esta fase.
- Se conservan los registros históricos. Un confirmado antiguo sin `confirmed_passes` mantiene como cupo sus pases asignados hasta que se corrija explícitamente.

## Migración necesaria

Archivo: `migrations/006_reliable_rsvp_and_access.sql`.

Requiere las tablas de las migraciones 001–004. Es transaccional y se puede volver a ejecutar. Añade revisiones, recibos privados, identificadores de operación, funciones y controles de integridad. Completa asientos confirmados que falten, sin borrar ni reiniciar los existentes. También retira permisos públicos excesivos de las tablas personales.

Orden de activación:

1. Respaldar base de datos y archivos históricos de RSVP, y preparar un entorno de prueba separado.
2. Revisar los recuentos de abajo. Investigar inconsistencias sin borrar datos ni corregir cupos automáticamente.
3. Ejecutar el archivo SQL completo en el editor SQL del entorno de prueba, como propietario de la base. No ejecutarlo desde el navegador público ni con la clave anónima.
4. Desplegar el código en una vista previa conectada a ese entorno, y completar la prueba de aceptación.
5. Con aprobación para producción, hacer un respaldo actualizado y aplicar primero la migración 006; después desplegar este código. Coordinar una ventana sin RSVP ni escaneo en curso para evitar mezclar el protocolo anterior con el nuevo.
6. Verificar respuestas y acceso de prueba, y revisar los errores antes de abrir el servicio a invitados.

Si se despliega el código sin la migración, las APIs responden `503 / MIGRATION_REQUIRED` y el usuario ve un aviso de mantenimiento. No se devuelve un éxito falso ni se escriben respuestas alternativas en Storage.

No revertir reabriendo permisos anónimos ni borrando tablas o historial. Ante un problema de activación, suspender las operaciones, revisar los registros y preparar una corrección compatible; un rollback del código antiguo no conserva las nuevas garantías.

### Comprobaciones previas de solo lectura

Estas consultas devuelven recuentos, no nombres, tokens ni mensajes:

```sql
-- Confirmaciones antiguas sin cupo explícito.
SELECT count(*) AS confirmados_sin_cupo_explicito
FROM public.guests
WHERE status = 'confirmed' AND confirmed_passes IS NULL;

-- Cupos incoherentes: revisar antes de habilitar el servicio.
SELECT count(*) AS cupos_a_revisar
FROM public.guests
WHERE passes NOT BETWEEN 1 AND 20
   OR (status = 'confirmed' AND
       coalesce(confirmed_passes, passes) NOT BETWEEN 1 AND passes);

-- Historia usada fuera del cupo actual: no eliminar esos asientos.
SELECT count(*) AS asientos_usados_a_revisar
FROM public.attendees a
JOIN public.guests g ON g.id = a.guest_id
WHERE (a.checked_in_at IS NOT NULL OR a.state = 'in')
  AND (g.status <> 'confirmed'
       OR a.seat_no > least(g.passes, coalesce(g.confirmed_passes, g.passes)));

-- Códigos manuales repetidos: la API pedirá el QR completo.
SELECT count(*) AS codigos_repetidos
FROM (
  SELECT access_code FROM public.guests
  WHERE access_code IS NOT NULL
  GROUP BY access_code HAVING count(*) > 1
) duplicates;
```

Después de aplicar la migración, estas dos columnas deben ser `false`:

```sql
SELECT
  has_table_privilege('anon', 'public.guests', 'SELECT') AS lectura_publica,
  has_function_privilege('anon',
    'public.enkarta_checkin(uuid,uuid,text,integer,uuid,text)',
    'EXECUTE') AS ejecucion_publica;
```

Si existen integraciones externas que lean estas tablas con claves anónimas, deben trasladarse a un servidor autorizado antes de activar el cambio. Las rutas de Enkarta revisadas ya usan el servidor.

### Archivos antiguos

La migración no modifica Storage. Puede haber archivos `rsvps/<invitationId>.json` en el bucket `invitations`. El lector administrativo anterior conserva su importación a la tabla y eliminación posterior del archivo si la importación tuvo éxito. Antes de abrir el panel en producción, respaldar y revisar ese legado. La existencia de archivos públicos antiguos requiere una comprobación separada; no se afirma que hayan sido retirados de producción en esta fase.

## Verificación realizada

`npm run verify` completado:

- ESLint sin avisos ni errores.
- TypeScript sin errores.
- 24 pruebas del constructor, incluida la visibilidad del QR después de cancelar.
- 23 pruebas de servicios con PostgreSQL embebido (PGlite), incluyendo ejecución real de la migración, reaplicación, funciones SQL, permisos y rutas HTTP.
- Compilación optimizada de Next.js completada.
- `node scripts/check-services-db.cjs`: comprobación remota de solo lectura aprobada después de que el usuario aplicara el SQL; no altera registros ni muestra credenciales.
- Formulario de muestra revisado en navegador a 320 px: confirmación de 2 personas, modificación a no asistencia, sin desbordamiento horizontal ni errores de consola. La muestra no envía respuestas reales.

Las pruebas de servicios son aisladas, en memoria, sin credenciales ni conexión a producción. Sustituyen las fronteras de Supabase y sesión, no la lógica SQL. PGlite utiliza una sola conexión: las llamadas competidoras prueban revisiones y reintentos, pero no sustituyen una prueba con dos sesiones PostgreSQL ni con dos teléfonos reales.

## Aceptación pendiente en entorno de prueba

Usar datos ficticios y dos navegadores o dispositivos autenticados de forma independiente:

1. Crear un evento activo y un grupo con 5 pases; confirmar 2 desde su enlace. Verificar que aparecen exactamente 2 accesos y el formulario no se repite.
2. Recargar el enlace y modificar a 1 antes de utilizarlo. Confirmar que se conserva el QR y que el cupo habilitado pasa a 1.
3. Abrir el mismo grupo en dos escáneres; intentar ingresar el mismo asiento al mismo tiempo. Debe haber un ingreso y una sola fila nueva en la bitácora. El segundo dispositivo debe pedir actualizar.
4. Interrumpir la respuesta de una solicitud y reintentar la misma operación. No debe aparecer un segundo movimiento. Registrar salida y comprobar que una solicitud de entrada antigua no vuelve a admitir el asiento.
5. Intentar cancelar o reducir un grupo con un pase ya usado. Debe rechazarse sin borrar su historial. Comprobar también los mensajes del panel administrativo.
6. Cambiar la respuesta desde dos pestañas; la que conserva la versión antigua debe pedir actualización en lugar de sobrescribir la respuesta nueva.
7. Probar el RSVP abierto: recargar, modificar y reintentar conserva una sola fila para ese recibo. Otro navegador no puede consultar esa respuesta.
8. Probar fecha límite, publicación programada, pausa y expiración. Al cerrar RSVP debe seguir funcionando el acceso si el evento continúa activo.
9. Sin sesión, las APIs de acceso deben denegar la operación. Un anfitrión de otro evento tampoco debe consultar ni modificar el grupo.
10. Revisar móvil y escritorio en una plantilla antigua y una invitación por bloques, y comprobar una apertura real de cámara QR. No afirmar que esta prueba se completó solo por pasar la suite automatizada.

## Deuda técnica detectada

La auditoría inicial reportó **9 alertas altas y ninguna crítica**. Al repetir `npm audit --json` antes de publicar, el registro devolvió **0 alertas** sin haber actualizado Next.js ni las dependencias anteriores. Se conservan ambos resultados para no presentar ese cambio del informe como una corrección de código ni una auditoría de seguridad completa. No se aplicó `npm audit fix --force`. Las actualizaciones mayores y la revisión de los avisos de seguridad del framework requieren seguimiento propio.

Referencias de diseño: [bloqueos explícitos de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html) y [funciones de base de datos en Supabase](https://supabase.com/docs/guides/database/functions).
