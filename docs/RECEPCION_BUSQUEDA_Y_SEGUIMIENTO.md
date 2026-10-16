# Recepción sin QR y seguimiento individual — 15 de octubre de 2026

## Cambios

Recepción permite localizar un grupo confirmado por parte del nombre o por mesa
exacta cuando no encuentra su QR. La búsqueda se limita al evento de la sesión
de anfitrión o puerta y devuelve como máximo 20 grupos, con nombre, cupos
confirmados y mesa cuando el paquete la incluye. No entrega teléfonos, mensajes,
grupos privados, enlaces personales ni tokens QR.

El operador abre la ficha, verifica la identidad de quien llega y registra a las
personas mediante los botones existentes. **Buscar y abrir no registran ingresos**.
El acceso parcial, revisiones, reintentos y alertas continúan en la misma API/RPC.
Cambiar la búsqueda retira sus resultados; empezar una consulta limpia el grupo
anterior y detiene la cámara. No se permite otra lectura mientras está buscando.

Las acciones individuales de WhatsApp del constructor y del anfitrión ahora usan
el mismo cliente de seguimiento que la cola. Una respuesta perdida conserva el
UUID, revisión y acción y ofrece «Reintentar solo el seguimiento». Ese botón no
abre WhatsApp ni envía un mensaje. No permite otra operación de seguimiento
mientras el resultado sea incierto. En el anfitrión, cerrar el editor del invitado
no pierde el reintento: queda visible en el padrón.

Las respuestas incompletas, nulas o con revisión incoherente son recuperables;
no se consideran confirmaciones ni se pierde la operación. Un conflicto o una
denegación de permisos muestra el error y requiere revisar el estado actual.

## Archivos principales

- `src/app/api/checkin/search/route.ts`: búsqueda privada por evento y servicio.
- `src/app/api/checkin/route.ts`: selección por UUID con los mismos controles de acceso.
- `src/lib/reception-search.ts`: límites, escape de comodines y cliente de lectura.
- `src/components/admin/scanner/ReceptionSearch.tsx`: búsqueda y selección móviles.
- `src/components/admin/scanner/Scanner.tsx`: coordinación de consulta/cámara/accesos.
- `src/components/admin/host/DeliveryRecovery.tsx`: recuperación del seguimiento individual.
- `src/components/admin/host/HostRoster.tsx` y `builder/panels/GuestsPanel.tsx`: integración.
- `src/lib/whatsapp-queue.ts`: validación estricta del recibo de seguimiento.

## Pruebas locales

- **211 pruebas aprobadas**: 95 de lógica/constructor, 87 de servicios/API con
  PostgreSQL aislado y 29 de integridad. Lint y tipos correctos.
  Log final: `tmp/reception-final-checks.log`.
- Casos nuevos: anónimo/revisor/otro evento/otro alcance rechazados; DTO mínimo,
  solo confirmados, cero entradas al buscar, mesa exacta, límite 20, comodines
  literales, campos inválidos, evento cerrado y servicios retirados. Seleccionar
  un grupo que dejó de confirmar o enviar identificadores ambiguos falla cerrado.
- El cliente rechaza recibos nulos, incompletos o de revisión inválida de WhatsApp
  y conserva el reintento de la misma identidad.
- UI local a 390 × 844 con datos ficticios en memoria: nombre, mesa exacta, estado
  sin resultados, selección sin entrada, acción bloqueada tras respuesta perdida
  y recuperación con un único recordatorio. Viewport y contenido: 390 px.
- Pruebas de UI sin Supabase ni apertura de WhatsApp. Servidor y pestaña cerrados;
  se restableció el tamaño de navegador.

![Búsqueda de grupo confirmado](../tmp/audit-2026-10/reception-search-mobile.jpg)

![Seguimiento individual recuperado](../tmp/audit-2026-10/individual-tracking-completed-mobile.jpg)

## Producción

**Desplegado y verificado** en <https://enkarta.vercel.app>.
Deployment `dpl_ED5jS4PC4NbCSMu4HEq1v1biEnH5`, estado `READY`, destino `production`.
URL inmutable:
<https://enkarta-yudb9od8j-juangabrielchoqueortiz7-engs-projects.vercel.app>.

- Compilación, lint y tipos de Vercel correctos; permanecen los avisos anteriores
  de `<img>` en la plantilla original. No se alteraron esas imágenes.
- **19 comprobaciones HTTP de producción aprobadas**. El caso nuevo verifica
  que anfitrión y puerta renderizan la búsqueda, rechaza anónimo/revisor/otro
  alcance/evento, comprueba nombre/mesa exacta/comodines literales y abre el grupo
  sin que se registre ninguna entrada. Se repitieron publicación, permisos,
  importaciones, seguimiento, RSVP, check-in parcial/concurrente y pagos manuales.
- Exclusivamente eventos, invitados y pagos ficticios. Limpieza final:
  `verified-no-fixtures-remain`, incluidos invitados, asientos, bitácoras,
  publicaciones, pagos y registro de importaciones de los UUIDs de prueba.
- **129 recursos originales publicados**, 46.481.464 bytes, conservan exactamente
  sus SHA-256. Inicio y catálogo responden 200; rutas de desarrollo y API de
  pruebas, 404. Diseños y recursos originales conservados.
- Este bloque **no añade migraciones** ni cambia variables de entorno; utiliza
  los controles existentes de 006, 016 y 017. La configuración exportada de
  Vercel confirma proveedor `manual` y BCP desactivado. No se imprimieron claves
  y se eliminó el archivo temporal. Sin llamadas bancarias ni mensajes enviados.

Evidencias en `tmp/audit-2026-10/`:

- `reception-followup-release.json`: resultado consolidado.
- `reception-followup-deployment-inspect.json`: dominio y despliegue activo.
- `reception-followup-production-http.json`: 19 comprobaciones y limpieza.
- `reception-followup-production-originals.json`: SHA-256 de los recursos.
- `reception-followup-production-config.json`: estado de pagos sin secretos.
- `reception-followup-production-smoke.json`: disponibilidad y rutas de pruebas.

## Límites

La búsqueda por nombre ignora mayúsculas y respeta acentos; el formulario lo
indica. La mesa se busca por su valor completo. No es una lista completa ni una
exportación del evento. La búsqueda por texto exige una sesión de evento; el
escáner global de administrador mantiene su consulta por QR/código.

El seguimiento pendiente se conserva en la misma pestaña por evento y se puede
recuperar después de recargar. El borrador solo contiene UUID, acción y revisión;
no guarda nombres, teléfonos, mensajes ni tokens QR. Si el almacenamiento no está
disponible, el aviso pide mantener el panel abierto y se conserva en memoria.
El servidor conserva revisiones y evita contar dos veces una misma versión.
No se añadió automatización de WhatsApp,
acuse de entrega, Wallet ni recepción offline. Las pruebas con cámara y audio en
iOS/Android físicos y la restricción por ceremonia/recepción siguen pendientes.

BCP permanece desactivado. No se modificaron diseños, animaciones, música,
fotografías ni recursos originales de invitaciones.

## Seguimiento recuperable después de recargar

El panel del anfitrión, la cola de WhatsApp y el constructor utilizan la misma
recuperación. Se guarda la identidad de la operación antes de abrir WhatsApp;
al recuperar, se reenvía esa misma identidad al servidor sin abrir otra ventana.
Cerrar la cola deja el aviso en el padrón. El orden de revisión de la cola no se
conserva al cerrar.

El almacenamiento es `sessionStorage`, con versión de formato y ámbito del
evento. No se comparte con otros dispositivos. El contenido se valida al cargar
y se limita a 1.024 caracteres. Una respuesta tardía no elimina otro reintento
más reciente. Mientras hay un resultado incierto, se bloquea un nuevo seguimiento.

Un rechazo explícito del primer intento permite liberarlo. Si ya hubo una
respuesta perdida, un rechazo posterior por permisos o revisión conserva el
reintento: no demuestra si la solicitud anterior se guardó. El usuario puede
retirar solo el reintento local mediante una confirmación que explica que no
deshace registros del servidor y que debe revisar el estado actual. Un borrador
dañado se muestra como ilegible y no se envía.

La idempotencia utiliza la operación existente de la migración 010. Si otra
operación reemplazó el último seguimiento de ese invitado, el servidor puede
responder con conflicto de revisión; se conserva el aviso para revisar el estado.
No se añaden migraciones ni se crean funciones bancarias o envíos automáticos.

Pruebas de esta actualización: **218 aprobadas** (102 de lógica/constructor,
87 de servicios y 29 de integridad), tipos y lint correctos; permanecen avisos
previos de imágenes originales. El detector de los componentes de recuperación
y cola termina sin hallazgos y sin silenciar reglas.

Prueba de navegador local con datos ficticios: recarga real, aislamiento entre
dos eventos, rechazo 403 posterior sin perder la operación, recuperación de un
solo recordatorio, cierre de cola y recuperación de marca manual, y almacenamiento
lleno con reintento retenido en memoria. La prueba usa un servidor ficticio de
desarrollo que responde 404 en producción; no consulta Supabase ni abre WhatsApp.
Los viewports emulados de móvil y escritorio no sustituyen pruebas con dispositivos
físicos. Evidencias en `tmp/delivery-recovery/verification.json` y capturas en esa
misma carpeta. Los 597 archivos locales protegidos mantienen sus SHA-256.

La actualización recuperable está publicada en <https://enkarta.vercel.app>:
deployment `dpl_Dpe71V1WFTNAnF7NUFYy53upxVRf`, estado `READY`, destino
`production`. La inspección de Vercel confirma el alias principal. URL inmutable:
<https://enkarta-1g8d0iptx-juangabrielchoqueortiz7-engs-projects.vercel.app>.

- **19 comprobaciones HTTP de producción aprobadas**, incluida la restauración
  del borrador mínimo del recordatorio: puerta recibe 403 y el anfitrión recupera
  la misma operación con `replayed = true` y un solo recordatorio. También pasan
  publicación, permisos, importaciones, RSVP, check-in y pagos manuales.
- Limpieza final: `verified-no-fixtures-remain`. No quedan eventos, invitados,
  pases, movimientos ni pagos ficticios de esta ejecución. Sin mensajes enviados
  ni llamadas bancarias.
- **129 originales publicados**, 46.481.464 bytes, coinciden con sus SHA-256.
- Inicio y catálogo: 200. Rutas de desarrollo, incluido POST de
  `/api/dev/delivery-recovery`: 404. Compilación local y Vercel correctas.
- BCP desactivado; no se cambiaron variables de entorno ni se ejecutó SQL.
  Servidores locales y pestañas cerrados; viewport restaurado. No se creó commit
  ni se hizo push.

Evidencia final en `tmp/delivery-recovery/`: `production-http.json`,
`production-originals.json`, `production-smoke.json`, `deployment.json`,
`deployment-inspect.log` y `verification.json`.

![Aviso completo de recuperación en prueba móvil ficticia](../tmp/delivery-recovery/recovery-full-mobile.jpg)

La actualización posterior de recepción ya está publicada: validación de grupos
y recibos, recuperación explícita de movimientos inciertos y protección frente a
respuestas ajenas. Véase [Confirmación segura de movimientos](RECEPCION_CONFIRMACION_SEGURA.md),
con 223 pruebas locales, 20 comprobaciones HTTP y limpieza verificada.

La siguiente actualización añade la [revisión recuperable de WhatsApp](WHATSAPP_REVISION_RECUPERABLE.md):
lista y posición guardadas por evento, preparación solicitada antes de abrir y
datos actuales al continuar. Publicada y verificada con 230 pruebas locales,
20 comprobaciones HTTP y limpieza final.
