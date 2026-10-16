# Revisión de invitados, WhatsApp y recepción — 15 de octubre de 2026

## Alcance

Esta entrega continúa el guardado de contactos de 016. No añade migraciones, no
cambia contratos ni activa BCP. Los diseños, animaciones y recursos originales
permanecen intactos. La publicación y los pagos se vuelven a comprobar como
regresión junto a los flujos operativos.

### Importaciones revisables

- Constructor y anfitrión comparten `GuestImportPreview`: columnas corregibles,
  tabla de muestra, motivo por registro omitido e informe CSV descargable.
- Falta de Nombre o dos columnas asignadas al mismo campo bloquean la importación.
- Pases fraccionarios, teléfonos incorrectos, exceso de longitud de grupo/mesa,
  respuestas ambiguas sobre niños y preferencias desconocidas se señalan; no se
  recortan ni se convierten silenciosamente en valores predeterminados.
- Duplicados: mismo nombre normalizado y teléfono normalizado dentro del archivo
  o en el padrón leído. No es una identidad universal ni deduplicación concurrente
  de dos importaciones desde sesiones diferentes.
- El informe cuenta registros de datos, no líneas físicas, para respetar campos
  entre comillas con saltos de línea. Las celdas exportadas neutralizan fórmulas.
- Plantilla descargable con encabezados y ejemplo sin teléfono real. Hasta 200
  altas por lote; los archivos mayores deben dividirse antes de importar.

### Cola de WhatsApp con revisión humana

- El anfitrión puede filtrar por grupo y preparar contactos de la lista filtrada.
- Primera invitación: solo pendientes sin seguimiento, con teléfono válido.
  Recordatorios: solo pendientes con teléfono válido, aunque tengan marca manual.
- La lista de IDs se fija al iniciar, con máximo 200. Los datos y respuestas
  actuales se consultan del padrón actualizado; una persona que ya respondió no
  puede prepararse desde la cola. Un contacto eliminado se puede omitir.
- Mensaje personalizado visible antes de abrir WhatsApp. Cada apertura requiere
  un clic. El usuario completa el envío dentro de WhatsApp. Avanzar u omitir nunca
  marca envío; hay una acción separada «Ya lo envié: marcar manualmente».
- Si falla el seguimiento, el reintento conserva UUID, acción y revisión; no vuelve
  a abrir WhatsApp. Mientras su resultado es incierto no permite otra operación ni
  avanzar. Un conflicto o falta de permisos obliga a actualizar el padrón.
- La misma revisión no prepara dos veces el recordatorio del contacto. Cerrar
  pierde el progreso local y el reintento pendiente; los estados ya guardados en
  la base permanecen. El diálogo avisa que se actualice el padrón antes de repetir.
- Sin automatización masiva, proveedor de WhatsApp, acuse de entrega ni lectura.

### QR desde una imagen

- El escáner de anfitrión/puerta acepta PNG, JPG y WebP de hasta 10 MB. Usa el
  lector instalado para decodificar localmente; no sube el archivo a un servidor.
- El resultado se trata como token, nunca como una URL de navegación. La API
  privada existente valida sesión, paquete, evento y cupos antes de un movimiento.
- Elegir otra imagen retira el grupo anterior. Un error no deja activos los
  botones de otra familia. Lectura de archivo y movimientos no se ejecutan juntos.
- La cámara se detiene al ocultar la página y al iniciar lectura desde foto.
  Reiniciarla requiere el botón. Se conserva el ingreso individual e idempotente.
- La imagen puede guardarse sin conexión; autorizar una entrada sigue requiriendo
  conexión con el servidor. No se añadió recepción offline.

## Evidencias

- 190 pruebas automatizadas: 88 de lógica/constructor, 73 de servicios y 29 de
  integridad; log completo `tmp/operations-followup-verify.log`.
- Prueba SQL/API del cliente de cola: la primera solicitud guarda el recordatorio
  y pierde la respuesta; reintentar devuelve el mismo resultado y el contador es
  uno. La marca manual posterior es independiente y un invitado confirmado no
  admite otro recordatorio.
- Demo de invitados en memoria: revisión móvil a 390 px del mensaje personalizado,
  omisión y finalización sin marca de envío. La acción de abrir en demo mostró su
  bloqueo explícito; no se abrió WhatsApp ni se enviaron mensajes.
- CSV real de prueba: un válido, un duplicado y dos inválidos, con sus causas.
  No se pulsó importar contra registros reales.
- PNG ficticio de 93.011 bytes: el lector de recepción lo decodificó y consultó
  la API, que respondió «No autorizado» sin sesión. No se solicitó permiso de
  cámara. Medición móvil: viewport 390 px, contenido 384 px, sin desbordamiento.

![Cola móvil de WhatsApp, modo de prueba](../tmp/audit-2026-10/whatsapp-queue-mobile.jpg)

![Revisión CSV móvil](../tmp/audit-2026-10/guest-import-review-mobile.jpg)

![QR por foto y control de permisos](../tmp/audit-2026-10/qr-photo-mobile.jpg)

## Límites y pendientes

La aceptación de cámara y audio en iOS/Android físicos sigue pendiente. La prueba
de escritorio comprueba la lectura por archivo y el layout móvil, no esos permisos
físicos. Tampoco se incluyen Wallet, separación de acceso por ceremonia/recepción,
cuentas nominativas de recepcionistas ni importación idempotente entre sesiones.
BCP permanece desactivado y no se efectúan llamadas al banco.

## Despliegue y aceptación

- Producción: <https://enkarta.vercel.app>.
- Deployment `dpl_2NGji5ShNEQYGSxwYx9a3xzmBasH`, estado `READY`.
- URL inmutable:
  <https://enkarta-j9uwdcs9w-juangabrielchoqueortiz7-engs-projects.vercel.app>.
- Compilación local y Vercel completadas. 190 pruebas aprobadas; permanecen las
  advertencias previas del linter sobre imágenes de la plantilla original.
- **17 comprobaciones HTTP de producción aprobadas**, incluido reintento de
  recordatorio con la misma identidad, marca manual independiente, contactos,
  publicación, permisos, pagos y acceso parcial/concurrente.
- Informe: `tmp/audit-2026-10/operations-followup-production-http.json`.
- Limpieza: `verified-no-fixtures-remain`; llamadas bancarias: **0**. No se
  enviaron mensajes ni se usaron credenciales o eventos reales de clientes.
- **129 recursos originales**, 46.481.464 bytes, coinciden con sus SHA-256:
  `tmp/audit-2026-10/operations-followup-production-originals.json`.
- Inicio y catálogo: 200. Páginas y API de pruebas: 404.
  `tmp/audit-2026-10/operations-followup-production-smoke.json`.
- Sin SQL adicional ni cambios de entorno. Servidor y pestañas locales de esta
  prueba cerrados. Código local sin nuevo commit ni push; despliegue por Vercel CLI.

## Actualización posterior: importación recuperable 017

La importación recuperable por identidad de operación ya está desplegada y
verificada en producción. El estado vigente y las 18 comprobaciones HTTP con
limpieza se documentan en [IMPORTACION_RECUPERABLE_017.md](IMPORTACION_RECUPERABLE_017.md).
Las importaciones independientes con UUID diferentes siguen siendo operaciones
distintas. BCP permanece desactivado y los recursos originales están conservados.
