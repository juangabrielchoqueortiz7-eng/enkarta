# Contactos de invitados — migración 016

Actualización del 15 de octubre de 2026. **SQL 016 aplicada por el usuario,
verificada funcionalmente y código desplegado en producción.**

## Qué cambia

Teléfono, grupo y preferencia dejan de depender del guardado del constructor.
Se insertan en `guests.guest_metadata` junto al invitado y se actualizan con su
revisión. Dos cambios concurrentes no pueden sobrescribirse: solo uno se acepta.
El constructor conserva los valores escritos si el servidor rechaza el cambio.
El panel del anfitrión permite editar e importar estos campos mediante CSV.

La migración copia los datos heredados una sola vez desde `builder_config.guestMeta`.
Conserva ese origen como respaldo y no cambia snapshots ni recursos. Reaplicarla
respeta los datos actuales y los campos vaciados. También admite JSON heredado
guardado como cadena y evita importar valores de tipos incorrectos; los valores
originales siguen en el respaldo.

Restaurar un diseño no restaura contactos. Teléfono y grupo se excluyen de los
datos de la invitación pública, RSVP y recepción. La preferencia de ceremonia o
recepción sigue siendo informativa: no modifica las reglas de acceso del QR.
El CSV operativo del anfitrión conserva su exclusión de teléfonos y tokens.

## Evidencia

- 184 pruebas automatizadas: 83 de constructor/lógica, 72 de servicios y 29 de
  integridad. Las ocho añadidas cubren migración reaplicable, tipos heredados,
  importación atómica, revisiones, concurrencia y privacidad de los contactos.
- Regresiones con PostgreSQL en memoria, cargando el SQL real de 016 dos veces.
- Inspección móvil a 390 px: diálogo centrado, margen de 16 px y desplazamiento
  interno para alcanzar todos los controles. La demo bloquea el guardado real y
  conserva los valores escritos tras mostrar el rechazo esperado.
- Compilación y pruebas: `tmp/metadata-verify.log`.
- Preflight de Supabase de solo lectura:
  `tmp/audit-2026-10/metadata-schema-preflight.json`; tras la aplicación manual:
  `GUEST_METADATA_COLUMN_AVAILABLE`. Este preflight no leyó invitados.
- 16 comprobaciones HTTP desde la compilación de producción local contra Supabase:
  `tmp/audit-2026-10/metadata-local-http.json`, todas aprobadas y con
  `cleanup: verified-no-fixtures-remain`. La actualización exclusiva de grupo
  incrementó su revisión, verificando el trigger de 016 en la base real.

![Formulario móvil con datos ficticios](../tmp/audit-2026-10/guest-contact-mobile.jpg)

## Aplicación

1. Ejecutar completo `migrations/016_guest_metadata.sql` en Supabase SQL Editor.
2. Comprobar `guest_metadata_ready = true` y `pending_rows = 0` en su resultado.
3. Verificar desde el repositorio con
   `node scripts/check-guest-metadata.cjs --expect-project eodedockxqvynedwhpsp`.
4. Desplegar el código y recargar los paneles abiertos. Evitar editar contactos
   con el código anterior durante el intervalo SQL–despliegue.
5. Ejecutar `check-integrity-http.cjs` sobre el despliegue nuevo con el alcance
   ficticio autorizado. Incluye una comprobación adicional de contactos y
   privacidad, además de las quince de publicación, permisos, pagos y QR.

## Resultado de producción

- URL: <https://enkarta.vercel.app>.
- Deployment `dpl_8qwkYh8pFw4tFVpmQ2Y3PeafUSEz`, estado `READY`.
- URL inmutable:
  <https://enkarta-l9cpm2zs0-juangabrielchoqueortiz7-engs-projects.vercel.app>.
- Las **16 comprobaciones HTTP en producción pasaron**:
  `tmp/audit-2026-10/metadata-production-http.json`.
- Verificadas alta conjunta de contacto/invitado, revisión de cambios de grupo,
  vaciado de teléfono, rechazo de cambios obsoletos y publicación de un snapshot
  con contactos heredados sin restaurarlos ni exponerlos en la página pública.
- Limpieza: `verified-no-fixtures-remain`; llamadas bancarias: **0**.
- **129 recursos originales (46.481.464 bytes)** coinciden con sus SHA-256:
  `tmp/audit-2026-10/metadata-production-originals.json`.
- Inicio y catálogo responden 200; la página y API de pruebas responden 404:
  `tmp/audit-2026-10/metadata-production-smoke.json`.
- Los cambios permanecen en el repositorio local; no se creó commit ni se envió
  código a GitHub. El despliegue se realizó mediante Vercel CLI.

No se enviaron WhatsApp, correos ni operaciones bancarias. BCP sigue desactivado.
Las credenciales y permisos existentes no se amplían. Los recursos originales no
se editaron. No se debe eliminar la columna nueva como forma de rollback; después
de empezar a editar contactos con el código nuevo, una versión anterior mostraría
el respaldo antiguo. La aceptación con cámara/audio en teléfonos físicos sigue
pendiente y no se atribuye a esta revisión de escritorio.
