# Edición segura de invitados y preparación de WhatsApp

Esta mejora continúa la recepción recuperable y la revisión de WhatsApp. Se limita
al padrón operativo: conserva el diseño de las invitaciones y los recursos originales,
no cambia permisos ni el contrato de publicación y mantiene BCP desactivado.
No necesita SQL, dependencias ni variables de entorno nuevas.

## Problemas corregidos

La ficha permitía cambiar un teléfono y abrir WhatsApp usando todavía el contacto
guardado, sin distinguirlo de la edición. Cerrar o pulsar «Cargar datos actuales»
descartaba cambios sin confirmación. La eliminación utilizaba un diálogo nativo
del navegador y el cliente aceptaba un HTTP 200 sin verificar el registro devuelto.

## Comportamiento implementado

- Estado explícito de cambios sin guardar. Guardar exige nombre, teléfono opcional
  válido, longitudes de grupo/mesa y pases enteros de 1 a 20. El mínimo respeta los
  pases ya confirmados. No recorta ni corrige silenciosamente los valores del usuario.
- Errores próximos al campo, nombres accesibles estables, `aria-describedby` y foco
  en el primer error. Los errores al salir del campo no desplazan botones mientras
  se completa un clic. Controles táctiles de al menos 44 px y campos de 16 px.
- WhatsApp identifica el nombre y teléfono guardados. Una edición sin guardar,
  conflicto, pérdida de conexión, guardado en curso o seguimiento pendiente bloquea
  aperturas, recordatorios y marcas manuales desde esa ficha. Guardar y volver a
  abrir usa los datos actualizados. Copiar el enlace no acredita un envío.
- Un snapshot nuevo no sobrescribe el borrador. Si cambió su revisión, se bloquea
  guardar hasta revisar los datos actuales. Cargarlos exige descartar expresamente
  los cambios cuando el formulario está modificado. Un invitado retirado conserva
  el texto escrito y bloquea nuevas operaciones.
- Cerrar y Escape ofrecen conservar la edición o descartarla. Escape repetido
  conserva la ficha visible. Se sincroniza el cierre nativo del navegador para
  evitar un diálogo oculto que no pueda abrirse de nuevo.
- Se solicita advertencia del navegador al recargar o abandonar con cambios o un
  guardado en curso. Su presentación depende del navegador; el borrador vive en
  memoria y no se guarda en `sessionStorage`, `localStorage` ni archivos del usuario.
  No se promete recuperación del texto tras una recarga o cierre de pestaña.
- La respuesta debe corresponder al mismo invitado, revisión y campos enviados.
  Un recibo ajeno, parcial o incoherente conserva la edición. Una respuesta perdida
  conserva la ficha para comparar con el snapshot actualizado; no se presenta como
  un cambio comprobado ni reintenta automáticamente.
- La eliminación exige un reconocimiento explícito y una segunda acción. Los grupos
  con personas dentro no ofrecen eliminar; el servidor conserva la protección para
  cualquier pase utilizado, incluso si la persona ya salió. Los conflictos y permisos
  se siguen resolviendo en el servidor. No se borró información de clientes reales.
- El reintento de seguimiento continúa en el padrón fuera del diálogo mediante su
  controlador existente. Cerrar la ficha no elimina ese seguimiento ni la revisión
  recuperable de WhatsApp. La recepción QR conserva su comportamiento anterior.

## Implementación y skills

- `src/lib/guest-edit-form.ts`: borrador limitado a campos editables, detección de
  cambios y conflictos, validación del comando y comprobación estricta del recibo.
- `src/components/admin/host/GuestEditor.tsx`: ficha extraída del padrón, guardado,
  confirmaciones, foco, avisos y preparación con el contacto guardado. El seguimiento
  se compone como contenido del controlador del padrón; no se duplica su estado.
- `HostRoster.tsx`: conserva filtros, paginación, importación y revisión recuperable;
  anuncia éxito solo después de comprobar el recibo.
- Impeccable orienta los estados y recuperación; React Best Practices evita estado
  derivado duplicado; Composition Patterns separa ficha y controlador; Web Design
  Guidelines revisa campos, teclado, confirmaciones y adaptación móvil. Se omiten
  las recetas exclusivas de React 19 y no se aplican paletas nuevas del catálogo.

## Verificación local

249 pruebas aprobadas: 129 de lógica/constructor, 91 de servicios y 29 de integridad.
Ocho regresiones nuevas cubren campos editables, normalización, validaciones,
cupos confirmados, conflictos, recibos válidos/ajenos y el comando completo contra
SQL. Siguen pasando las regresiones de permisos, WhatsApp, publicación, QR y pagos.

17 comprobaciones de navegador local aprobadas con datos ficticios: contacto sin
guardar, teléfono actualizado, cierre, conflicto, carga reconocida, cupos confirmados,
403, recibo ajeno, respuesta perdida, guardado en curso, borrado reconocido y rechazo
por pases usados, invitado retirado, falta de conexión, foco de error al primer clic,
Escape repetido e integración con el padrón. Sin errores de consola ni desbordamiento
a 390 y 1.280 px. La emulación no certifica cámara, audio ni teclado virtual de
teléfonos físicos. La página de prueba solo funciona en desarrollo.

Evidencias locales en `tmp/guest-editor/`, con registros en `tmp/guest-editor-*.log`.
El detector de los archivos afectados no encontró problemas. Los 597 archivos
protegidos conservan sus SHA-256 frente a la captura anterior a las mejoras con skills.

## Producción y limpieza — 15 de octubre de 2026

Publicado en <https://enkarta.vercel.app>, deployment
`dpl_J4cHBcQYQhocT3mFR3CGUpDFQCRm`, estado `READY`, destino `production`.
La inspección de Vercel confirma el alias principal. URL inmutable:
<https://enkarta-7hrlf8nlk-juangabrielchoqueortiz7-engs-projects.vercel.app>.

- 24 comprobaciones HTTP/SQL aprobadas: publicación, permisos, contactos, importación,
  WhatsApp, RSVP, búsqueda, recuperación y concurrencia QR, pagos manuales y rechazo
  de BCP no verificado. El nuevo comando de edición valida su recibo y rechaza una
  revisión antigua sin crear movimientos de acceso.
- Navegador contra producción con sesión y grupo ficticios: cambiar nombre/teléfono
  bloqueó WhatsApp; cerrar pidió confirmación; conservar y guardar actualizó el contacto.
  Al reabrir se mostró el teléfono nuevo. El grupo con personas dentro no ofreció
  eliminar. Sin errores de consola ni desbordamiento horizontal a 390 px.
- SQL confirmó exactamente una revisión adicional del invitado y el mismo conjunto
  de movimientos QR anterior a la edición. No se pulsó abrir WhatsApp en producción,
  no se enviaron mensajes y no se ejecutaron operaciones bancarias.
- El turno se interrumpió durante la limpieza. Los UUID y los resultados ya estaban
  guardados en el informe; se reanudó únicamente la limpieza de esa ejecución mediante
  `--resume-cleanup`, sin crear fixtures nuevos ni reconstruir los resultados.
  Este modo verifica origen, proyecto, entorno, UUID, slug exacto y propietario.
- Limpieza final `verified-no-fixtures-remain`: eventos, invitados, pases, movimientos,
  versiones, importaciones, socios, suscripciones y pagos ficticios eliminados y
  ausencia comprobada. Los archivos locales de credenciales ficticias también se retiraron.
- 129 recursos originales publicados, 46.481.464 bytes, coinciden con sus SHA-256.
  Nueve comprobaciones de disponibilidad/bloqueo aprobadas: inicio y catálogo 200;
  páginas y APIs de desarrollo 404. Los 597 archivos protegidos locales siguen intactos.
- Compilaciones local y remota correctas, detector sin hallazgos y tipos correctos.
  Lint conserva diez advertencias previas de imágenes originales. No se cambiaron
  SQL, dependencias, variables de entorno, CSS global ni diseños públicos. BCP continúa
  desactivado. Servidor y pestañas de prueba cerrados; viewport restaurado.
  No se creó commit ni se hizo push.

Evidencias consolidadas: `tmp/guest-editor/verification.json`. Informes detallados:
`production-http.json`, `production-browser.json`, `production-originals.json`,
`production-smoke.json`, `deployment.json`, `deployment-inspect.log`, `browser.json`
y `protected-originals.json`. La reanudación figura en `cleanupRecovery` del informe
HTTP y en `tmp/guest-editor-cleanup.log`.

Para retomar exclusivamente una limpieza interrumpida de producción, conservando
el informe original y sin crear otros datos:

```powershell
node scripts/check-integrity-http.cjs --exercise --production --app-url https://enkarta.vercel.app --expect-project eodedockxqvynedwhpsp --resume-cleanup --report tmp/guest-editor/production-http.json
```

![Cierre con cambios sin guardar, datos ficticios en producción](../tmp/guest-editor/production-unsaved-mobile.jpg)
