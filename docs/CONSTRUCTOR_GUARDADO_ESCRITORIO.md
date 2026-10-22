# Guardado del constructor desde computadora

## Problema y resultado

El constructor compartido por el equipo y Socios no atendía Ctrl/Cmd+S. Desde un campo de texto, el navegador recibía su acción de guardar la página. Además, dos invocaciones de Guardar antes del siguiente render enviaban dos PUT iguales. El autoguardado también podía encolar una segunda escritura del mismo contenido durante un guardado manual lento.

Ahora Ctrl+S o Cmd+S solicita el guardado del borrador actual desde los campos del editor. Una referencia bloquea inmediatamente las acciones manuales repetidas. El autoguardado espera mientras esa acción está pendiente; si ya estaba guardando exactamente el mismo documento y secuencia de edición, ambos consumidores comparten esa petición. Las ediciones diferentes mantienen su lugar en la cola y la revisión condicional del servidor.

La confirmación vuelve a comprobar la secuencia de edición y la operación de publicación antes de anunciar Guardado. Editar mientras se guarda conserva los cambios nuevos como pendientes y permite que el autoguardado posterior los envíe. Un error conserva el borrador y libera el bloqueo para un intento explícito.

## Interacción y límites

- El botón conserva Guardar/Guardando…, foco visible, estado ocupado y tamaño táctil. Expone `aria-keyshortcuts="Control+s Meta+s"`, ayuda en el título y una indicación visible desde el breakpoint de escritorio existente.
- El atajo no publica. Durante la revisión del diálogo de publicación o una operación pública se consume sin escribir ni abrir el guardado de página del navegador. Las teclas repetidas no encolan solicitudes.
- Se conservan las combinaciones con Shift o Alt, los eventos de composición y los ya atendidos. Deshacer, copiar y pegar en campos mantienen sus comportamientos existentes.
- El texto editado directamente en el lienzo se confirma mediante su `onBlur` existente antes de capturar el guardado. Esto también conserva un texto nuevo si todavía está pendiente la petición anterior; los campos controlados del panel no pierden el foco por este ajuste.
- La deduplicación dura únicamente mientras la petición del mismo snapshot, secuencia y época esté pendiente. No es un bloqueo distribuido entre pestañas ni dispositivos. La revisión condicional del servidor conserva esa responsabilidad.
- La muestra local con `fixtureMode` no solicita guardados por teclado. No se cambian las rutas, permisos, contratos, datos de Socios o reglas de publicación.

## Pruebas y conservación

`scripts/test-builder-desktop-save-ui.cjs` ejecuta 18 casos con el componente InvitationBuilder, sus listeners, cola, validaciones y versiones reales; los hooks, el transporte y los paneles secundarios se aíslan en memoria. Dos casos integran también el `Editable` original, sus contextos y la edición de bloques del padre: texto pendiente, desvinculación del campo editado y texto nuevo durante una petición anterior. Se simula únicamente el puente DOM `closest/blur`; no es una prueba ReactDOM. Cubre además combinaciones nativas, repetición, doble acción, autoguardado, fallo/reintento, cola A/B/C, Deshacer/Rehacer y operaciones públicas. El control anterior `a242393` obtiene 6 aciertos y 12 fallos. La ejecución normal no necesita Git ni red.

La revisión visual local usa la muestra existente en `/dev/builder`, con persistencia desactivada: a 1280 px se ve la indicación y las acciones caben en la pantalla; a 320 px la indicación se oculta y no aparece desbordamiento horizontal del documento. Es una revisión de presentación; no equivale a pulsar el atajo en un editor autenticado de producción. La aceptación previa del constructor en computadora y su limpieza se conservan en su alcance original.

Se aplican Impeccable en modo Operate, las guías de React de Vercel y la revisión de controles de [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). El detector mecánico no señala hallazgos en el componente modificado. La evidencia privada queda en `tmp/builder-desktop-save/`.

No se modifican invitaciones, presets, estilos globales, fuentes, fotografías, música o animaciones. No se añaden dependencias ni SQL. La modificación preexistente de la migración 021 queda fuera del cambio. BCP conserva `BCP_CONTRACT_REQUIRED`; no se habilitan credenciales ni operaciones bancarias.

## Validación local

- `npm run verify`: salida 0, **1.837 pruebas correctas en 61 ejecuciones**, lint, TypeScript y build de **65 páginas**. Se mantienen las advertencias previas de imágenes heredadas, sin supresiones nuevas.
- Revisión independiente final sin bloqueantes, incluidos el `Editable` original y las dos regresiones de texto sin confirmar. No se modifica ese renderer ni sus estilos.
- **597/597 archivos protegidos** iguales por SHA-256 y modificación local de la migración 021 preservada. La ruta de muestra existente y los recursos originales no cambian.

La comprobación de producción se realiza después del despliegue Ready. Sus resultados y límites se registrarán al cerrar la entrega; la validación local no acredita por sí sola un despliegue ni una aceptación física del atajo.
