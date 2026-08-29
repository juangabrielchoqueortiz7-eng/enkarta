# Servicios · Fase 3: panel actualizado y personal de puerta

Estado: implementado localmente. **Esquema de 008 comprobado; pendientes commit, despliegue y aceptación con dos dispositivos reales.** Después de que el usuario confirmó la ejecución del SQL de fase 4, `node scripts/check-services-db.cjs --phase4` verificó las nueve funciones requeridas, las columnas de accesos y vigencia, la lectura privada del panel y el cálculo de 30/60/90 días. Las tablas personales y el historial de vigencia siguen denegados a anónimos. Esta comprobación no consultó registros personales ni modificó producción.

## Alcance entregado

- `/panel` actualiza respuestas, cupos, pendientes y ocupación automáticamente cada 8 segundos cuando está visible y conectado. Premium conserva su consulta de solo lectura; Exclusive y acuerdos anteriores conservan la operación autorizada.
- Una sola lectura SQL obtiene invitados, respuestas y ocupación desde el mismo snapshot. Los contadores y la lista usan esa misma respuesta, no lecturas independientes ni recargas de página.
- La última sincronización es visible. Ante fallos se conservan los datos anteriores con una advertencia, sin convertir un error en “0 invitados”. Reintentos con espera creciente de 16 a 60 segundos, timeout de lectura de 12 segundos, pausa al ocultar la pestaña y reanudación al volver o recuperar conexión. Al perder autorización se retiran los datos y controles.
- Móvil usa tarjetas y escritorio una tabla. Búsqueda sin distinción de acentos; filtros combinados por respuesta, mesa e ingreso; orden por nombre, mesa o respuesta reciente. CSV exporta solo el resultado filtrado, neutraliza fórmulas y no contiene tokens QR ni credenciales.
- Edición explícita de nombre, mesa, pases, niños y marca manual de envío. La actualización automática no sustituye un formulario abierto. Una revisión SQL impide sobrescribir cambios o eliminar un invitado que cambió en otra sesión; el usuario debe cargar los datos actuales. Se conservan las restricciones de capacidad y pases ya utilizados de 006.
- Alta e importación de nombres/pases/mesa/niños, con vista previa de CSV y lotes de hasta 200. Los teléfonos y grupos configurados en el editor se consultan; no se ofrecen falsos cambios locales que no se guarden. Copiar enlace y preparar WhatsApp siguen disponibles; abrir WhatsApp no acredita envío ni entrega.
- `/puerta` usa correo y contraseña independientes, vinculados a un solo evento. Configuración → Accesos privados separados → Personal de puerta permite habilitar, cambiar contraseña o revocar el acceso. No se envían correos automáticamente.
- Puerta solo obtiene el grupo identificado por QR/código y registra entradas o salidas. No puede listar/exportar invitados, cambiar mesas o pases, ver respuestas ni editar/revisar el diseño. El escáner también actualiza el grupo cada 8 segundos sin interferir con una operación pendiente.
- La bitácora distingue `admin`, `host:<evento>` y `door:<evento>`. Se mantienen idempotencia y control de revisión en entradas/salidas; no se duplican movimientos al reintentar.

## Qué significan los números

- **Grupos confirmados / por responder:** registros de invitación personalizada, no número de personas.
- **Cupos confirmados:** pases aceptados de esos grupos. Los pases asignados se muestran como referencia, sin llamarlos aforo del recinto.
- **Dentro ahora:** asientos con estado `in`; una salida reduce este contador. No es la cantidad histórica de escaneos.
- **Formularios abiertos:** respuestas aparte. No se suman automáticamente a los grupos personales porque no hay identidad verificada para deduplicarlos.
- **Mesas:** número de personas confirmadas asignadas, no capacidad física ni un plano de mesas.

## Activación

1. Conservar respaldo y comprobar que estén aplicadas 001–004, 006 y 007.
2. Ejecutar completo `migrations/008_live_host_and_door_access.sql`. Es reaplicable; añade dos columnas, un índice, una lectura privada y el incremento de revisión para envío/niños. No borra invitados, respuestas, accesos ni credenciales anteriores.
3. Comprobar sin consultar registros privados:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invitations'
  AND column_name IN ('door_email', 'door_password_hash');

SELECT to_regprocedure('public.enkarta_host_snapshot(uuid)') AS lectura_panel;

SELECT has_function_privilege('anon', 'public.enkarta_host_snapshot(uuid)', 'EXECUTE') AS acceso_publico;
-- Debe devolver false, no true.
```

4. Desde el proyecto, `node scripts/check-services-db.cjs --phase3` verifica columnas, RPC y permisos sin escribir registros. `--phase2` conserva la comprobación de 007.
5. Ejecutar `npm run verify`; preparar preview y configurar un evento ficticio con credenciales distintas para anfitrión, revisión y puerta. La fase 2 local debe desplegarse junto a esta fase.
6. Confirmar desde un dispositivo; en otro dejar `/panel` abierto y comprobar que cambia en el siguiente sondeo. Registrar entrada y salida desde `/puerta`; validar la ocupación y el registro `door:<evento>`. Repetir el mismo pase en dos dispositivos.
7. Probar edición simultánea de mesa, pérdida de conexión y recuperación; cambiar contraseña de puerta y verificar que la sesión anterior deja de operar. Confirmar que un acceso Premium no obtiene operaciones y que un usuario de otro evento no obtiene datos.
8. Después de aprobar, hacer commit/despliegue. No se han creado credenciales ni efectuado movimientos con datos reales desde las herramientas de QA.

## Pruebas y límites

- Verificación final: `npm run verify` completó lint, TypeScript, las 84 pruebas y el build optimizado. Prueba local con `next start`: `/dev/services` y `/api/dev/host-dashboard` devolvieron 404; `/api/host/dashboard` sin sesión devolvió 403; `/puerta` mostró su login (200). Ambos servidores temporales se detuvieron al finalizar.
- `npm run test:builder`: 38 pruebas, incluidos filtros, métricas, CSV seguro, zona horaria de render, sondeo fuera de orden, backoff, cancelación y sesión denegada.
- `npm run test:services`: 46 pruebas SQL/API con PGlite aislado. Incluye 008 reaplicada, snapshot privado, separación de roles, downgrade, revocación, caducidad de sesión, caída de autenticación, edición por revisión y bitácora idempotente.
- Revisión visual con la habilidad de navegador a 320, 390 y 1280 px: sin desbordamiento horizontal en las mediciones móviles. Confirmación e ingreso simulados actualizaron las métricas sin recargar; búsqueda y filtro de mesa correctos; pérdida/recuperación de conexión y conflicto de mesa preservan datos/borrador y exigen una nueva lectura antes de guardar. La pantalla de puerta muestra su acceso separado. No se usaron cámaras ni credenciales reales.
- `/dev/services` → Panel en vivo permite simular confirmación, ingreso, mesa modificada en otra sesión y fallo/recuperación de red. Usa memoria local, no Supabase. Tanto esa página como `/api/dev/host-dashboard` devuelven 404 fuera de desarrollo.
- La sincronización es sondeo autenticado, **no WebSocket ni funcionamiento offline**. El tiempo normal es hasta el siguiente ciclo más la latencia del servidor; durante fallos se amplía hasta 60 segundos.
- Un acceso de puerta por evento/equipo, no cuentas nominativas para cada empleado. La sesión dura 12 horas y su vencimiento se verifica también en el servidor, aunque se intente reutilizar la cookie. Rotar o revocar las credenciales la invalida antes. No compartir el acceso del anfitrión con puerta.
- No hay plano ni aforo de mesas, envío automático de WhatsApp o cobros. Vigencias y renovación corresponden a la fase 4.
- La prueba automatizada en memoria no equivale a dos sesiones PostgreSQL independientes. La aceptación con dos teléfonos reales y sus cámaras continúa pendiente antes de producción.
