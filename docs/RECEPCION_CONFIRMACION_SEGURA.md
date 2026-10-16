# Confirmación segura de movimientos en recepción

Actualización posterior: [Recepción QR recuperable tras recargar](RECEPCION_QR_RECUPERABLE.md)
extiende la recuperación en memoria descrita aquí a la misma pestaña y sesión,
sin registrar movimientos automáticamente al restaurar.

Esta mejora se limita al escáner operativo. Mantiene los diseños y recursos de
las invitaciones, el seguimiento recuperable de WhatsApp y el proveedor manual
de pagos. BCP permanece desactivado. No requiere SQL ni variables nuevas.

## Problemas corregidos

El cliente aceptaba un grupo recibido con HTTP 200 sin verificar sus pases y
reemplazaba una persona con cualquier `attendee` de una respuesta exitosa.
Una respuesta perdida conservaba un identificador de reintento, pero leer otra
foto, buscar otro código o cerrar la ficha podía descartarlo sin advertencia.
Consultar el grupo también eliminaba ese identificador.

## Comportamiento implementado

- `src/lib/scanner-contract.ts` valida identificadores, pertenencia al grupo,
  asientos únicos, estados y revisiones. Rechaza pases duplicados, ajenos o
  malformados. Limita el grupo a los 20 pases admitidos por la aplicación.
- El recibo debe identificar a la misma persona, familia y asiento. Un movimiento
  nuevo exige la revisión siguiente y el estado solicitado; una recuperación
  admite una revisión posterior porque la función SQL devuelve el estado actual.
  Si otro operador registró después una salida, recuperar el ingreso muestra esa
  salida y explica que hubo un movimiento posterior.
- El aviso «Movimiento por comprobar» ofrece un botón explícito que conserva
  persona, acción, revisión original e identificador. Los demás movimientos,
  cambios de grupo, cámara y lectura de otra foto quedan bloqueados.
- Consultar el grupo no descarta el reintento. Los contadores se presentan como
  último estado consultado y la actualización automática queda pausada durante
  la recuperación, evitando mostrar una autorización de ingreso en verde.
- Un rechazo explícito del primer intento libera ese intento y exige consultar
  el grupo. Un rechazo posterior a una respuesta incierta conserva la operación:
  por sí solo no prueba que el primer movimiento no se guardó.
- La alternativa manual está dentro de un desplegable: exige reconocer que
  retirar el reintento no cancela ni revierte movimientos del servidor. Después
  se bloquean los movimientos hasta consultar el grupo. No borra registros.
- Se advierte al recargar o abandonar la página mientras existe una operación
  pendiente. El reintento de recepción vive en memoria: no se recupera tras cerrar
  o recargar la pestaña y no se presenta como funcionamiento sin conexión.
- Tras una consulta fallida se puede volver a leer otro QR. La validación privada
  de permisos, cupos y concurrencia continúa en el servidor sin cambios.

## Validación

- 223 pruebas locales aprobadas: 107 de lógica/constructor, 87 de servicios y
  29 de integridad. Tipos, lint y detector de los componentes afectados correctos;
  lint conserva advertencias previas de imágenes originales.
- Navegador local con transporte ficticio en memoria: pérdida de respuesta,
  consulta sin descarte, 403 posterior, recuperación única, confirmación ajena,
  salida posterior, retirada manual con reconocimiento, grupo duplicado,
  rechazo inicial, ingreso parcial y grupo agotado. Sin errores de consola.
- Viewport móvil emulado de 390 px: sin desbordamiento horizontal e input de
  código de 16 px. Revisión también en escritorio. No se probaron cámara y audio
  con dispositivos físicos; esta verificación no los certifica.
- La página `/dev/operations` utiliza exclusivamente datos ficticios y permanece
  inaccesible en producción.
- 597 archivos locales protegidos comparados por SHA-256: cero cambios.

Evidencias locales en `tmp/scanner-hardening/`, con registros de las suites en
`tmp/scanner-*.log`. Las pruebas HTTP añaden una regresión de recuperación de un
ingreso después de una salida posterior; verifican un solo registro con el
identificador original y una reentrada deliberada con identificador nuevo.

## Despliegue y verificación de producción

Publicado en <https://enkarta.vercel.app>. Deployment
`dpl_HMwkShzhoG5qokZ15ufxcK6mf9Vu`, estado `READY`, destino `production`;
la inspección de Vercel confirmó el alias principal. URL inmutable:
<https://enkarta-hhnjzsbzf-juangabrielchoqueortiz7-engs-projects.vercel.app>.

- 20 comprobaciones HTTP aprobadas. Incluyen publicación, permisos, importación,
  seguimiento recuperable de WhatsApp, RSVP, ingreso parcial, recuperación tras
  salida posterior, pases agotados, reentrada y pagos manuales idempotentes.
- El intento de acreditar un pago BCP no verificado se rechaza. Cero llamadas
  bancarias y cero mensajes enviados; no se cambiaron variables de entorno.
- Limpieza: `verified-no-fixtures-remain`. Se eliminaron los eventos, invitados,
  pases, movimientos y pagos ficticios creados por la ejecución.
- 129 recursos originales publicados: 46.481.464 bytes coinciden con sus SHA-256.
- Inicio y catálogo devuelven 200; las páginas y APIs de desarrollo comprobadas
  devuelven 404. Compilación local y remota correctas.
- Servidor local y pestañas de prueba cerrados; viewport restaurado. No se creó
  commit ni se hizo push. No hay migraciones nuevas.

Resultados consolidados: `tmp/scanner-hardening/verification.json`. Evidencia
detallada: `production-http.json`, `production-originals.json`,
`production-smoke.json`, `deployment.json`, `deployment-inspect.log` y `browser.json`
en esa misma carpeta.

![Ingreso parcial con datos ficticios en escritorio](../tmp/scanner-hardening/partial-desktop.jpg)
