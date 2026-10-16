# Importación recuperable de invitados — 15 de octubre de 2026

## Resultado y estado

**Migración 017 verificada y código desplegado en producción**, con aceptación HTTP
y limpieza terminadas. La comprobación de esquema en
`eodedockxqvynedwhpsp.supabase.co` devolvió `GUEST_IMPORT_READY`; tabla y RPC están
disponibles y el acceso anónimo está denegado.

Producción: <https://enkarta.vercel.app>. Deployment
`dpl_DQhX6QGrEXYarCA4MY2CqcjhfqbC`, estado `READY`, destino `production`.
URL inmutable:
<https://enkarta-r360t2ybb-juangabrielchoqueortiz7-engs-projects.vercel.app>.

## Fallo corregido

Antes, `POST /api/guests` insertaba directamente. Si Supabase confirmaba el lote
y se perdía la respuesta HTTP, repetir la acción podía duplicar familias y pases.
No había una identidad de operación que permitiera recuperar el resultado.

## Implementación

- `migrations/017_guest_import_idempotency.sql`: tabla privada por evento/UUID,
  huella SHA-256 del contenido y orden, IDs de invitados, fecha. No copia teléfonos,
  nombres, mensajes ni tokens a otra tabla. Su eliminación acompaña a la del evento.
- `enkarta_import_guests`: inserción del registro y todos los invitados en una
  transacción; bloqueo de la fila de operación para serializar reintentos. Un error
  en cualquier fila revierte todo. La identidad pública aleatoria no afecta la huella.
- Un reintento devuelve los mismos IDs en el orden original y sus versiones
  actuales. No restaura eliminados ni sobrescribe ediciones, RSVP, mesas o accesos.
  La respuesta distingue cantidad original y cantidad que ya no está disponible.
- Los permisos se verifican en cada petición, incluidos reintentos. Las mesas se
  guardan/entregan según el servicio vigente. Cambiar ese servicio no cambia la
  identidad del contenido del lote. Un cliente antiguo sin UUID recibe 400 sin alta.
- Constructor y anfitrión usan el mismo cliente con timeout de 15 segundos,
  validación del recibo y recuperación explícita. El lote se congela mientras el
  resultado sea incierto. CSV, lista pegada y alta individual usan este flujo.
- Borrador de recuperación por evento/pestaña en `sessionStorage`, solo con los
  datos de entrada. Se conserva al salir del panel y recargar; se retira tras una
  confirmación visible. Si el almacenamiento falla, se avisa que se mantenga abierto.
  Una confirmación tardía no borra una operación posterior.
- `scripts/check-guest-import.cjs`: comprobación de tabla, firma RPC y denegación
  al rol anónimo; consulta cero filas. La prueba de la RPC usa NULLs que se rechazan
  antes de escribir. `check-integrity-http.cjs` exige 017 antes de crear fixtures.

## Verificación

- `npm run verify`: **203 pruebas aprobadas**, 92 de constructor/lógica, 82 de
  servicios PostgreSQL/API y 29 de integridad. Lint, tipos y build completados.
  Permanecen las advertencias anteriores de `<img>` en plantillas originales.
  Log: `tmp/import-recovery-verify.log`.
- 017 se ejecuta dos veces en PostgreSQL PGlite para verificar reaplicación.
  Casos nuevos: tres reintentos, pérdida de respuesta después de commit real,
  contenido/orden distintos, cambios posteriores de contacto y RSVP, eliminación,
  colisión de ID público en la segunda fila con rollback completo, aislamiento
  por evento, permisos/RLS, cambios de mesas y ausencia de fallback sin migración.
- PGlite usa una conexión. Además de esas pruebas locales, el ejercicio de
  producción lanzó tres solicitudes HTTP simultáneas contra la API y Supabase:
  solo una creó el lote y las otras recuperaron los mismos IDs. El contenido
  distinto devolvió 409 y recuperar después de eliminar no recreó al invitado.
- UI a 390 × 844: estado incierto, bloqueo de nueva importación, recuperación,
  desmontaje/remontaje y recarga conservando el UUID. Contenido y viewport: 390 px.
  La prueba visual usa transporte en memoria con datos ficticios, sin Supabase.
- Los 129 recursos locales originales, **46.481.464 bytes**, conservan su SHA-256:
  `tmp/audit-2026-10/import-recovery-local-originals.json`. No se modificaron
  plantillas, diseños, animaciones, audio ni imágenes de invitaciones en este bloque.
- En producción se usaron exclusivamente fixtures con UUIDs nuevos, correos
  `example.invalid`, eventos, invitados y pagos ficticios. Limpieza final:
  `verified-no-fixtures-remain`, incluida `guest_import_requests`. No se enviaron
  mensajes ni se hicieron llamadas al banco. Servidor y pestaña de prueba cerrados.

![Lote pendiente en móvil](../tmp/audit-2026-10/import-recovery-pending-mobile.jpg)

![Resultado recuperado en móvil](../tmp/audit-2026-10/import-recovery-completed-mobile.jpg)

## Despliegue y aceptación de producción

- El usuario ejecutó 017 y comunicó `guest_import_ready = true`. La comprobación
  posterior verificó tabla, firma RPC y bloqueo anónimo sin leer invitados.
- Compilación de Vercel completada, dominio de producción asociado y confirmado
  mediante `vercel inspect`. No se cambiaron variables de entorno de producción.
- **18 comprobaciones HTTP aprobadas**: permisos anónimo/revisor/anfitrión/puerta,
  publicación explícita y snapshot, autoguardado y revisiones, pausa, importación
  transaccional y reintentos concurrentes, seguimiento de WhatsApp, contactos
  privados, límite de pases, check-in parcial/concurrente y pagos manuales.
- Aprobar dos veces el pago manual ficticio activa una sola vez. Una declaración
  falsa de pago BCP devuelve `BANK_CONFIRMATION_REQUIRED` y sigue pendiente.
  El registro ficticio también se eliminó en la limpieza.
- Configuración exportada directamente desde Vercel producción: proveedor
  `manual`, BCP desactivado, base esperada. El archivo temporal de configuración
  se eliminó sin imprimir claves. No se usó `.env.local` para acreditar ese estado.
- **129 recursos originales publicados**, 46.481.464 bytes, coinciden exactamente
  con los SHA-256 archivados. Inicio y catálogo responden 200; `/dev/services`,
  `/dev/operations`, `/dev/builder` y `/api/dev/host-dashboard` responden 404.
- Recargar los paneles que estuvieran abiertos antes del despliegue para usar
  la identidad de operación y la recuperación nuevas.

Evidencias en `tmp/audit-2026-10/`:

- `import-017-release.json`: resultado consolidado.
- `import-017-deployment-inspect.json`: identidad, dominio y estado de Vercel.
- `import-017-production-preflight.json`: verificación de 017.
- `import-017-production-config.json`: estado de BCP sin secretos.
- `import-017-production-http.json`: 18 comprobaciones y limpieza.
- `import-017-production-originals.json`: SHA-256 de los recursos publicados.
- `import-017-production-smoke.json`: disponibilidad y cierre de rutas de pruebas.

## Límites

Operaciones con UUID diferentes representan altas diferentes: no se deduplican
automáticamente dos archivos iguales importados desde dispositivos distintos.
La revisión CSV sigue omitiendo coincidencias de nombre/teléfono del padrón leído.
Cerrar una pestaña puede perder el borrador; el registro del servidor permanece.
Si los permisos se revocan después de un resultado incierto, se conserva la
recuperación hasta recuperar acceso. Un conflicto persistente requiere revisión
del equipo; no se reinicia automáticamente la operación con otra identidad.

WhatsApp y recepción mantienen los controles del bloque anterior. Siguen
pendientes la aceptación de cámara/sonido en móviles físicos, Wallet y restricción
por ceremonia/recepción. No se ha conectado BCP ni WhatsApp Business API.

La actualización posterior añade búsqueda de grupos confirmados en recepción y
recuperación del seguimiento individual sin otra migración. El despliegue vigente
y su aceptación se documentan en
[RECEPCION_BUSQUEDA_Y_SEGUIMIENTO.md](RECEPCION_BUSQUEDA_Y_SEGUIMIENTO.md).
