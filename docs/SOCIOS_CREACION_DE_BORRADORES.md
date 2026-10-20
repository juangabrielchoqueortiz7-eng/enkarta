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

## Producción y limpieza verificadas, 20 de octubre de 2026

- Código `9a0ad39c2e71302f325d84b3d751cc96e3f2197b`, integrado en `main`. [CI del commit exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39375957157): `completed/success`, verificación y auditoría de dependencias aprobadas.
- Vercel `dpl_2KqB9iGXW9mYe95Nuj8N4VLEryjz`, **Ready**, destino producción y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-ru53x730b](https://enkarta-ru53x730b-juangabrielchoqueortiz7-engs-projects.vercel.app). Se utilizó el workspace completo para incluir los originales ignorados por Git.
- **10 grupos HTTP/de permisos correctos**: ambas rutas rechazan creación anónima o con cookies inválidas de admin/anfitrión/revisión/recepción; el acceso al selector exige la entrada normal de Socios y conserva la ruta de retorno. La cookie administrativa válida no permite hacerse pasar por un socio. Se preservan acceso administrativo, configuración privada y el historial `no-store` del constructor. Fueron rechazados 11 intentos de escritura en estas comprobaciones; no crearon invitaciones. La cookie temporal quedó cerrada.
- Los identificadores de contenido de los **cuatro archivos fuente de esta corrección** coinciden con los subidos al despliegue Ready. Esto verifica la entrada de código en Vercel, sin afirmar una aceptación de navegador o haber ejecutado el selector desde Google.
- **129/129 recursos originales públicos** coinciden en tamaño y SHA-256, las seis rutas públicas/de acceso/desarrollo comprobadas responden correctamente y **597/597 archivos protegidos** permanecen idénticos.

La prueba adicional del trigger se ejecutó mediante peticiones reales a Supabase/PostgREST con un único perfil ficticio `@example.invalid`, sin crear un usuario Auth o entrar por Google. Antes de escribir se guardaron UUID, slugs y marcadores del alcance en un manifiesto privado y se comprobaron ausencias mediante conteos exactos. No se usaron presets originales para los fixtures ni se publicó ninguna invitación.

1. Se crearon once borradores sintéticos del plan Inicio, con suscripción `none`. Dos INSERT concurrentes al último cupo produjeron un éxito y `DRAFT_QUOTA_REACHED`; el conteo y los UUID exactos quedaron en **12**.
2. Se cambió exclusivamente esa suscripción ficticia a Estudio, conservando `none`: el paquete Plus antiguo fue rechazado con `DRAFT_PLAN_CHANGED` y Premium permitió el borrador **13**, dentro del cupo de 30.
3. Se suspendió el perfil ficticio y otro intento fue rechazado con `DRAFT_CREATE_FORBIDDEN`, sin crear su fila.
4. La limpieza confirmó la suspensión como barrera contra escrituras tardías; verificó que no había pagos de ese perfil antes de borrar. Eliminó únicamente los 13 borradores de UUID/slugs/propietario verificados, después la suscripción inactiva y el perfil. Los conteos finales de perfil, suscripción, UUID/slugs y todas las invitaciones del propietario son **cero**.

La herramienta privada tiene recuperación `--cleanup-only`, conserva alcances pendientes y no reintenta automáticamente escrituras inciertas. Pasaron diez pruebas offline de la herramienta antes de usarla, incluidos respuesta perdida tras insertar, identidades inesperadas, pagos imprevistos y limpieza recuperable. Estos casos privados no se suman a las 954 pruebas de la aplicación. El reporte de producción acredita cinco grupos de comprobaciones y limpieza completa a las 05:45:42 UTC.

**Límites:** la concurrencia con bloqueo causal se observó en las dos sesiones locales PostgreSQL; las peticiones reales de producción corroboran sus resultados e integridad sin instrumentar el pool remoto. El test de PostgREST comprueba el trigger de la base de datos; los handlers de la aplicación se validan con regresiones locales y sus denegaciones HTTP. No se afirma una prueba autenticada de creación con Google ni una aceptación visual en Android/Safari. Las pruebas manuales del nuevo flujo siguen pendientes.

**BCP sigue bloqueado:** cero pagos creados, cero activaciones de suscripción, publicaciones, usuarios Auth, llamadas bancarias o mensajes. No se leyeron registros de clientes ni variables remotas de pago. La aceptación y limpieza de Ventas anteriores y el borrador de cotización del navegador permanecen intactos.

Evidencia privada adicional en `tmp/partner-draft-creation/`: `deployment-final.json`, `deployment.log`, `deployment-files.json`, `ci.json`, `production-http.json`, `production-public.json`, `scope.json`, `production-trigger.json` y `RESULTADO.json`. La limpieza se verifica por conteos, no eliminando el manifiesto de evidencia.
