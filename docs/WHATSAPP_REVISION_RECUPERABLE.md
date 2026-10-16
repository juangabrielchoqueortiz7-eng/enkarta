# Revisión recuperable de WhatsApp

La cola del anfitrión conserva ahora la lista elegida, la posición y los contactos
cuya preparación ya se solicitó. Cerrar pausa la revisión y permite continuarla
desde el padrón, también después de recargar la misma pestaña. No abre WhatsApp
automáticamente al restaurar ni acredita envío, entrega o lectura.

## Comportamiento y límites

- Hasta 200 contactos por revisión, con su orden original. Cambiar los filtros
  del padrón no sustituye la revisión guardada. Para empezar otra se finaliza o
  descarta explícitamente la anterior.
- Se guardan solo UUID de evento, revisión y contactos, propósito, posición,
  identificadores con preparación solicitada, revisión de progreso y fecha.
  Nunca nombres, teléfonos, mensajes, enlaces personalizados ni tokens QR.
- El formato tiene versión, validación, límite de 20.000 caracteres y caducidad
  de 24 horas desde el último cambio. El aislamiento es por evento y pestaña;
  no sincroniza otros dispositivos ni otras pestañas.
- Nombres, contactos, respuestas y elegibilidad se toman del padrón actual. Un
  invitado que respondió no puede prepararse de nuevo; uno eliminado puede
  omitirse sin modificar registros del servidor.
- La intención de preparación se guarda antes de solicitar la apertura. Al
  continuar, ese contacto ofrece copiar el mensaje, marca manual o continuar,
  sin volver a abrir WhatsApp desde la misma revisión. Esto describe una solicitud
  de preparación, no una entrega comprobada.
- El progreso de revisión y los reintentos inciertos de seguimiento son distintos.
  Continúa la recuperación con UUID original de la operación: no genera otro
  recordatorio ni abre WhatsApp durante un reintento. Los movimientos inciertos
  bloquean avanzar hasta comprobar el seguimiento.
- Al finalizar se retira solo la revisión local. Descartar antes de terminar exige
  reconocer la pérdida del progreso; no revierte seguimientos del servidor ni
  elimina sus reintentos pendientes. El descarte se bloquea mientras hay un
  seguimiento pendiente en el padrón.
- Un registro guardado dañado o caducado no se restaura. Se informa y permite retirarlo
  de forma explícita. Revisiones y versiones evitan que un panel antiguo
  sobrescriba o elimine un progreso más reciente.
- Si el almacenamiento falla, el progreso continúa en memoria con advertencia.
  Cerrar la cola conserva la memoria del padrón, pero abandonar esa pantalla o
  recargar puede perderla o restaurar una copia anterior. No se promete recuperación
  en ese caso. Si no puede retirarse una copia guardada, se comunica expresamente.

## Implementación

- `src/lib/whatsapp-review.ts`: contrato mínimo, límites, caducidad, avance,
  preparación y comparación de identidad/revisión antes de guardar o retirar.
- `src/components/admin/host/WhatsAppReview.tsx`: controlador compartido por el
  padrón y el diálogo, restauración, aviso de continuidad y descarte reconocido.
- `HostRoster.tsx` y `WhatsAppQueue.tsx`: el progreso vive fuera del diálogo;
  conservarlo no conserva copias de contactos o mensajes en almacenamiento.
- Skills aplicadas: Impeccable para estados y recuperación, React Best Practices
  para formato mínimo/versionado, Composition Patterns para estado compartido y
  Web Design Guidelines para controles, foco y avisos accesibles.

Se conservan permisos, paquete contratado y validaciones de servidor. No se
modifican diseños, recursos, CSS global ni plantillas públicas. BCP continúa
desactivado. No requiere migración SQL ni variables nuevas.

## Validación local

230 pruebas aprobadas: 114 de lógica/constructor, 87 de servicios y 29 de
integridad. Las siete regresiones nuevas cubren privacidad del formato, orden y
preparación restaurados, aislamiento y caducidad, 200 contactos, sobrescrituras
obsoletas, retirada selectiva y fallos explícitos de almacenamiento.

Pruebas de navegador con datos ficticios: cierre y recarga real, aislamiento de
dos eventos, nombre/teléfono/respuesta actualizados, contacto eliminado, apertura
ya solicitada tras recarga, seguimiento recuperado sin abrir WhatsApp, finalización,
descarte reconocido y continuidad en memoria con almacenamiento lleno. Se usaron
viewports emulados móvil y escritorio. La cámara y audio en teléfonos físicos
siguen pendientes, como en la actualización anterior de recepción.

Las evidencias están en `tmp/queue-review/` y los registros en `tmp/queue-*.log`.
El registro inicial conserva un error de Fast Refresh al cambiar los props del
componente durante la edición; la aceptación final se hace en una pestaña nueva
con todos los consumidores adaptados. El entorno `/dev/services` no está disponible
en producción y sus pruebas no envían mensajes ni consultan invitados reales.

## Producción y limpieza

Publicado en <https://enkarta.vercel.app>, deployment final
`dpl_7Dt3NuyXwh91xd6NVYuVKQhr5pFy`, estado `READY`, destino `production`.
La inspección de Vercel confirma el alias principal. URL inmutable:
<https://enkarta-8rbhwqsd2-juangabrielchoqueortiz7-engs-projects.vercel.app>.

- 20 comprobaciones HTTP aprobadas. La recuperación del recordatorio también
  restaura el registro mínimo de revisión con su preparación solicitada, conserva
  el ámbito del evento y mantiene un solo recordatorio en el servidor.
- Publicación, permisos, contactos, importación, RSVP, búsqueda de recepción,
  check-in parcial/concurrente, recuperación tras salida posterior y pagos manuales
  siguen aprobando. El intento de acreditar BCP no verificado se rechaza.
- Limpieza `verified-no-fixtures-remain`: no quedan eventos, invitados, pases,
  movimientos ni pagos ficticios de esta ejecución. Cero llamadas bancarias y
  cero mensajes enviados.
- 129 recursos originales publicados, 46.481.464 bytes, coinciden con sus SHA-256.
  Los 597 archivos locales protegidos conservan sus hashes.
- Inicio y catálogo devuelven 200. Las páginas y APIs de pruebas comprobadas
  devuelven 404. Compilación local y remota correctas; detector sin hallazgos.
- Servidores locales y pestañas de prueba cerrados; viewport restaurado y
  revisiones ficticias retiradas. No se creó commit ni se hizo push. BCP continúa
  desactivado; no se cambiaron variables de entorno ni se ejecutó SQL.

Evidencia consolidada: `tmp/queue-review/verification.json`. Detalle en
`production-http.json`, `production-originals.json`, `production-smoke.json`,
`deployment.json`, `deployment-inspect.log` y `browser.json`, dentro de la misma
carpeta. La protección adicional de descarte con almacenamiento lleno está
cubierta por la regresión de identidad y versión antes de retirar el progreso.

![Revisión recuperada con datos ficticios en móvil](../tmp/queue-review/resumed-mobile.jpg)
