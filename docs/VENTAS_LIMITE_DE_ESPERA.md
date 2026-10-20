# Límite de espera del guardado de Ventas

## Problema reproducido

El editor programaba `abort()` a los 20 segundos y seguía esperando el resultado de `saveCommercialLead`. Si el transporte o la lectura JSON ignoraban esa señal, el formulario podía permanecer en «Guardando…» indefinidamente. Una respuesta válida recibida después de abortar también podía confirmarse tarde.

La reproducción local con transporte ficticio demostró las tres condiciones: transporte pendiente tras el aborto, JSON pendiente tras el aborto y confirmación válida tardía. No involucró clientes, mensajes, cobros ni red de producción.

## Comportamiento

- `saveCommercialLead` controla una única espera de **20.000 ms** para el intento completo, incluido transporte y lectura JSON. El límite reside en el servicio de cliente; el editor conserva únicamente el controlador de cancelación al desmontarse.
- Al vencer el plazo, el intento termina como **incierto**, con el mensaje **Tiempo de espera agotado** y la acción **Comprobar guardado**. El formulario abandona el estado de espera y mantiene sus campos bloqueados hasta confirmar la intención original o revisar un conflicto válido.
- El límite de espera no revierte ni demuestra el fracaso de una transacción del servidor. Una operación puede haberse guardado mientras se perdía su respuesta. Por eso se conservan exactamente el UUID, la revisión y el cuerpo canónico; la comprobación manual reutiliza la misma intención y sus recibos existentes.
- La señal externa se propaga a un controlador propio. Una señal ya abortada no inicia tráfico. Una cancelación posterior termina el intento aunque el transporte o el cuerpo ignoren la señal; no cancela operaciones ajenas que usen el controlador del llamador.
- Solo gana un resultado. Después de cancelar o agotar el plazo, una respuesta o rechazo tardíos no sustituyen el resultado incierto ni producen otra confirmación. Si el transporte llega tarde, su cuerpo no se empieza a leer.
- Temporizador y listener externo se retiran al terminar por éxito, error, cancelación o plazo agotado. Un transporte externo que ignore abortar podría continuar internamente; el editor ya no depende de que termine.
- No hay reintentos automáticos. Las negativas sin recibo válido mantienen la incertidumbre: una respuesta negativa posterior no acredita el resultado de un intento anterior.
- El límite usa los temporizadores del navegador. Una pestaña suspendida puede demorar su ejecución; las pruebas con reloj simulado no certifican tiempos de reloj reales en un Android físico.

## Alcance y privacidad

El editor conserva su diseño, controles y mensaje de guardado, con una explicación de la comprobación cuando se agota la espera. No hay nueva migración, dependencia, ruta, permiso ni persistencia. Los borradores y solicitudes de seguimiento continúan en memoria con la advertencia existente al abandonar; esta mejora no añade recuperación tras una recarga completa.

BCP permanece bloqueado. El registro de ingresos continúa siendo manual y no ejecuta un cobro. Invitaciones, presets, estilos globales y recursos originales quedan fuera del cambio.

## Regresiones y muestra

- **15 regresiones nuevas**, con reloj simulado: transporte detenido, JSON detenido, cancelación previa/posterior, respuesta y rechazo tardíos, resultado único, limpieza en las distintas salidas y recuperación con idéntico UUID y cuerpo. El grupo del editor pasa de 40 a **55 pruebas**.
- La muestra `/dev/services/commercial-update` añade respuesta retenida y lectura retenida después de guardar ficticiamente. Permite comprobar el mismo recibo y liberar después la respuesta antigua; «Limpiar QA» retira los datos y esperas retenidas. Usa solo memoria y continúa bloqueada fuera de desarrollo.
- La muestra queda preparada para una aceptación futura; no se ha ejecutado una prueba manual en este bloque. Las regresiones automáticas no acreditan foco, teclado, disposición ni temporización real de un celular.

Evidencia privada: `tmp/sales-save-deadline/`. La aceptación manual sigue aplazada.

## Verificación local

- `npm run verify`: **555 pruebas correctas** (200 constructor/contratos, 154 servicios, 19 PostgreSQL del guardado, 55 editor/contrato/render, 14 PostgreSQL del dashboard, 16 cliente del dashboard, 17 historial, 11 navegación, 8 recuperación/render, 15 dominio del cotizador, 10 render del cotizador, 31 integridad y 5 distribución), lint, TypeScript y build correctos. Continúan los avisos previos de imágenes de invitaciones originales.
- Revisión independiente sin bloqueantes. Los escenarios del plazo usan reloj simulado: la primera prueba exige 20.000 ms, comprueba que a 19.999 ms siga pendiente y que el límite sea común al transporte y al JSON. No se presenta esa simulación como una observación de 20 segundos en producción.
- **597/597 archivos protegidos** idénticos por SHA-256; **129 recursos originales** completos para distribución. No hay migración, dependencia ni cambio en BCP.
