# Creación de borradores de Socios

## Fallos confirmados

`PartnerDesignPicker` usaba sólo estado de React para bloquear la creación. Dos invocaciones del manejador antes del siguiente render podían emitir dos POST. Una pérdida de red o de JSON también liberaba la acción sin distinguir si el servidor ya había creado la invitación.

Los POST de `/api/partner/invitations` y `/api/admin/invitations`, cuando actúa un socio, comprobaban `totalInvitations` y luego insertaban en otra operación. Dos contextos con 11 invitaciones y un límite de 12 podían pasar esa comprobación previa. El botón desactivado no resuelve este caso del servidor.

## Comportamiento implementado

### Selector

- Un bloqueo síncrono con `useRef` se adquiere antes de la petición; cubre el mismo diseño y los otros diseños, incluso con manejadores del render anterior.
- La creación sigue bloqueada mientras llega y se interpreta la respuesta y mientras abre el constructor. Sólo se navega con un UUID verificado.
- Un rechazo HTTP 4xx confirmado permite corregir y realizar una nueva acción explícita. No hay reintento automático.
- Red interrumpida, respuesta de éxito incompleta o inválida y errores 5xx muestran «Sin confirmar» y permiten ir a «Revisar mis invitaciones». No se repite una escritura cuyo resultado se desconoce.
- Si se confirmó el UUID pero falla la navegación, «Abrir el borrador» reutiliza ese identificador sin crear otra invitación.
- Una respuesta tardía después de salir no cambia el estado ni devuelve al usuario al constructor.
- Se conservan selección, orden del catálogo, muestras, fotografías, recursos, colores y composición. Los cambios visuales se limitan a estados, mensajes y foco de los controles afectados; React 18 sigue siendo la versión aplicable.

El bloqueo pertenece a esta instancia del selector. No se afirma idempotencia de creación entre pestañas o tras recargar: dos acciones distintas con cupo disponible pueden crear dos borradores. La recuperación explícita consiste en revisar la cartera existente antes de iniciar otra creación.

### Base de datos y APIs

`migrations/021_partner_draft_creation.sql` instala un trigger sobre INSERT y cambios de `partner_id` en `invitations`. Cuando hay un nuevo propietario socio:

1. Bloquea su fila activa en `partners`, compartiendo el orden de bloqueo de publicación y pagos.
2. Relee el plan desde `partner_subscriptions`; diseñar sigue permitido sin mensualidad activa y, sin fila de suscripción, se aplica Inicio.
3. Comprueba que sea un borrador y que su paquete de servicios corresponda al plan vigente. Si el plan cambió respecto de la configuración preparada por el servidor, rechaza la creación y pide actualizar el panel.
4. Cuenta todas las invitaciones del propietario bajo ese bloqueo: borradores, publicadas, pausadas y vencidas. Los topes son 12 para Inicio, 30 para Estudio y 200 para Agencia, de acuerdo con `draftCap`. El tope de borradores es distinto del cupo de publicaciones simultáneas.
5. Inserta sin modificar el contenido preparado por el preset o rechaza la operación completa. Una inserción múltiple que exceda el límite no conserva parcialmente las primeras filas.

La garantía de concurrencia de este bloqueo y de los SELECT posteriores corresponde a **READ COMMITTED**, el aislamiento del flujo HTTP previsto. No se afirma que el mismo razonamiento funcione en REPEATABLE READ. Las pruebas con PGlite comprueban contratos y revalidación; las pruebas de dos conexiones se ejecutan por separado con PostgreSQL nativo.

Una actualización del mismo propietario no vuelve a consumir cupo; una asignación nueva se valida contra el propietario de destino. Las invitaciones del equipo con `partner_id = NULL` conservan su independencia. La migración no borra ni recorta invitaciones existentes, aunque una cuenta ya exceda su tope; impide nuevas creaciones que lo aumenten.

Los dos POST traducen los errores del guard a respuestas estables: `DRAFT_QUOTA_REACHED` y `DRAFT_PLAN_CHANGED` devuelven 409; `DRAFT_CREATE_FORBIDDEN`, 403. Los errores inesperados de inserción devuelven 500 genérico, conservando la incertidumbre sin exponer mensajes internos de SQL. La suscripción, la publicación y los pagos mantienen sus flujos existentes; BCP permanece bloqueado.

## Instalación manual y verificación

La migración se ejecuta completa después de 020 en el SQL Editor de Supabase. Su última consulta debe mostrar:

```text
partner_draft_creation_ready = true
```

La función de comprobación sólo devuelve un booleano y consulta catálogos de PostgreSQL: trigger habilitado con sus eventos/columna, función invoker/volatile y permisos de ejecución. Está disponible para `service_role`; `anon` y `authenticated` no pueden invocarla. No contiene filas, datos de invitados o cuentas ni eleva privilegios.

**No desplegar este bloque antes de confirmar la aplicación de 021.** Un trigger ausente no produce por sí mismo un error de migración en los POST antiguos: la comprobación previa de la aplicación no sustituye la protección instalada en la base de datos. Después de la confirmación se debe verificar la RPC de readiness mediante una lectura privada antes del despliegue.

El 20 de octubre de 2026 el usuario confirmó `true` y la comprobación de producción mediante `service_role` devolvió `true` a las 05:36 UTC. Esa lectura sólo consultó la función de metadatos: cero filas de clientes, escrituras o fixtures. Evidencia privada: `tmp/partner-draft-creation/migration-production.json`.

## Pruebas y límites de aceptación

- `scripts/test-partner-design-picker-ui.cjs`: nueve casos del componente y catálogo reales, con transporte y navegación ficticios. Cubren bloqueo, JSON pendiente, navegación, topes de planes, rechazo corregible, resultados inciertos y desmontaje.
- `scripts/test-partner-draft-api.cjs`: 19 casos con handlers y migración reales en PostgreSQL aislado/PGlite. Cubren dueños, permisos, presets, planes/cupos vigentes frente a contexto antiguo, ausencia de pago, suspensión, errores sin SQL privado, instalación reaplicable y privilegios.
- `scripts/test-partner-draft-concurrency.cjs`: ejecución explícita mediante `npm run test:partner-draft-concurrency -- --local-postgres`. Crea un cluster temporal propio en `tmp/`, escucha sólo en loopback, utiliza sesiones independientes y detiene/elimina únicamente ese cluster. No descarga software ni usa Supabase o servicios PostgreSQL existentes. No forma parte de `verify`, para no exigir un servidor nativo instalado en cada entorno.

La suite principal incorpora las dos primeras pruebas. Ninguna prueba de hooks sustituye una aceptación física de Android o de Safari. Las pruebas manuales permanecen pendientes; no se han enviado mensajes ni realizado operaciones bancarias.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **954 pruebas correctas** en 27 suites, incluidas **28 nuevas** de este bloque (nueve UI y 19 API), además de lint, TypeScript y build. Permanecen los avisos de imágenes anteriores de las invitaciones originales; no hay nuevos avisos de lint en los archivos afectados.
- Prueba nativa adicional: **8/8 casos correctos en PostgreSQL 18.1**. Se observan dos PID distintos y `pg_blocking_pids` del segundo contiene el primero antes del COMMIT; el conteo termina en 12 y la segunda creación se rechaza. Otra espera real rechaza el paquete obsoleto tras cambiar el plan y admite después el paquete vigente.
- El arnés verifica `SHOW data_directory` contra la ruta real del cluster que creó antes de cualquier SQL mutante. Usa sólo loopback, proceso hijo propio y límites de espera; la parada y el borrado verifican PID, manifiesto y ruta. El reporte final acredita `own-cluster-stopped-and-removed`, sin llamadas de producción, descargas ni cambios a servicios PostgreSQL existentes.
- **597/597 archivos protegidos** permanecen idénticos por SHA-256. No cambiaron plantillas, música, fotografías, animaciones ni bytes originales.
- Revisión independiente del componente y del arnés: sin bloqueantes. Las pautas de React de Vercel se aplican al bloqueo síncrono y a la separación de estado visible; la revisión con Web Interface Guidelines se limita a los controles afectados (botón semántico, foco visible, avisos y enlaces nativos). No acredita un renderizado de dispositivo.

Evidencia privada: `tmp/partner-draft-creation/verify.log`, `protected.json` y `tmp/partner-draft-concurrency/result.json`. La prueba nativa final se ejecutó de nuevo después de endurecer la identidad del cluster y su limpieza; no se reutilizó como éxito el intento inicial que encontró un problema del lanzador de Windows.
