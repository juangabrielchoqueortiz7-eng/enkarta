# Vista privada del borrador guardado

## Problema y resultado

El enlace del constructor abría la vista privada inmediatamente, incluso si había cambios pendientes o un PUT en curso. Esa página lee la fila del servidor: podía enseñar contenido anterior al que acababa de editarse. También se reprodujo el caso de texto inline aún sin confirmar mediante blur.

El control de escritorio ahora muestra «Vista privada» y explica que presenta el último guardado, sin publicar. Si el borrador está estable conserva un enlace nativo a otra pestaña, con noopener/noreferrer. Si hay trabajo pendiente se presenta como botón sin href, operable para explicar el motivo; no ofrece un enlace obsoleto al menú contextual.

Al activarlo se confirma primero el Editable activo por su blur existente y se consultan las referencias actuales de cambios, petición, guardado manual, fallo y publicación. No basta con el estado del último render. Un enlace retenido tampoco puede abrir un slug anterior al actual. Se revisan clic normal, modificado, central y menú contextual; un evento ya atendido se respeta.

## Mensajes y recuperación

- Cambios pendientes: «Guarda los cambios y espera “Guardado” antes de abrir la vista privada».
- Guardado en curso: «Espera a que termine el guardado antes de abrir la vista privada».
- Sin conexión: «Vuelve a conectarte y comprueba el guardado antes de abrir la vista privada».
- Revisión/operación de publicación: indica que debe finalizarse primero.
- Tras confirmar el guardado actual, el aviso permite pulsar de nuevo «Vista privada»; la apertura no guarda ni publica automáticamente.

El aviso de conexión detectado al activar actualiza el estado offline existente, sin escribir el borrador. El primer render no consulta navigator para elegir entre enlace y botón: conserva el mismo HTML de servidor y cliente; el efecto de conexión existente y las activaciones posteriores actualizan el estado. Un reconocimiento de una petición anterior no habilita la vista de cambios más recientes.

La página privada continúa protegida por los permisos del servidor. Esta mejora no sincroniza en vivo una pestaña ya abierta ni garantiza que otro colaborador no edite la fila después del guardado. No se alteran el render público, los presets, las fuentes, fotografías, música, adornos ni animaciones.

## Verificación y alcance

Se aplican Impeccable en modo Operate y las guías de React de Vercel. Se mantienen React 18, la navegación nativa y los controles existentes. El navegador automatizado de Work continúa deshabilitado; la comprobación de eventos y concurrencia se ejecuta en memoria con InvitationBuilder y Editable reales, sin montar ReactDOM ni simular una aceptación visual física.

La suite añade **17 regresiones**, todas correctas: texto inline, enlaces retenidos, clic modificado/central/contextual, cambios en cola A/B/C, errores, desconexión antes del render, slug antiguo, fuente distinta, modo muestra y operaciones públicas. Incluye una comparación lógica del primer render conectado/desconectado antes de los efectos; no se presenta como prueba de hidratación DOM. La versión previa `b6fe0257` falla los 17 casos, sin cancelaciones; la ejecución habitual no requiere Git ni red. La revisión independiente no dejó bloqueantes.

El detector no señaló hallazgos en el componente modificado. Los **597 archivos protegidos** y el hash de la migración 021 coinciden con el estado anterior. La acción de vista privada no solicita un guardado; el autoguardado habitual del editor sigue funcionando después de las ediciones confirmadas por blur.

No hay dependencias nuevas ni SQL. La modificación preexistente de la migración 021 queda excluida; BCP mantiene `BCP_CONTRACT_REQUIRED`. Las pruebas manuales de este control quedan pendientes.

`npm run verify` terminó con salida 0: **1.874 pruebas correctas en 63 ejecuciones**, lint, TypeScript y build de **65 páginas**. Se conservan las advertencias previas de imágenes heredadas, sin supresiones nuevas. La revisión independiente y el detector no dejaron bloqueantes en el cambio.

## Producción y limpieza

El commit `21698ca13e14249007aa5ab7bb84ce02e36675f6` quedó integrado en main y desplegado como `dpl_8GAtCQWt1w5nBcA211W1dAifK7Lr`, **Ready**, con alias [enkarta.vercel.app](https://enkarta.vercel.app). El [CI del mismo commit](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39823636551) terminó correctamente, incluidos verify y la auditoría de dependencias de producción.

- La distribución procede del commit, conserva los 129 originales y excluye archivos de entorno, material maestro y la modificación local de la migración 021. Los identificadores de entrada de Vercel coinciden con los bytes revisados del constructor y el bloqueo BCP; los tres mensajes nuevos aparecen en los scripts compilados servidos por producción.
- Se creó un único borrador ficticio. Su vista privada autenticada mostró el contenido inicial. Se envió un único PUT de mensaje y texto de entrada, con revisión condicional y journal previo; la revisión aumentó exactamente en uno. Después, tanto la fila como el editor y la vista privada devolvieron los textos nuevos. El resto del contenido, incluidas galería, música y configuración del preset, coincidió con el payload planificado.
- La misma URL con preview=1, sin sesión, mostró preparación sin nombre ni textos privados. La URL pública normal también los ocultó. No se publicó la invitación ni se modificó ninguna invitación de clientes.
- Pasaron seis rutas públicas. Se verificaron **129/129 originales publicados** por longitud y SHA-256: 127 en descarga completa y los dos audios grandes restantes mediante todos sus rangos HTTP, recompuestos íntegramente y contrastados con el hash original. Las dos lecturas completas de esos audios habían recibido 200 y agotado los límites de 45/55 segundos; los 34 fragmentos devolvieron 206 con Content-Range exacto y ETag consistente. También coincidieron sus archivos de entrada en Vercel. Se conserva la evidencia de esos timeouts: la comprobación por fragmentos acredita integridad, no un tiempo de descarga completa ni una prueba de reproducción.
- Tras verificar la vista, se eliminó únicamente el borrador ficticio, usando su UUID/slug revisados y comparando propietario, nombre, estado, etiqueta QA y contenido. Las ocho tablas asociadas quedaron sin filas para ese UUID y sus tres prefijos de almacenamiento estaban vacíos. Después del cierre de la sesión técnica, tanto la URL normal como preview=1 devolvieron 404.
- Los **597 archivos protegidos locales** y el hash de la migración 021 permanecen iguales. Cero archivos subidos, pagos, llamadas bancarias o mensajes. BCP conserva su bloqueo; no se consultaron ni modificaron variables remotas del proveedor.

Esta comprobación acredita API, HTTP, fuentes y textos compilados, privacidad y limpieza. Las carreras de eventos y texto inline se ejecutan en memoria; no se atribuyen esos gestos a un navegador autenticado de producción. La aceptación visual manual de «Vista privada» continúa pendiente.

Evidencia privada final: `tmp/builder-private-preview/RESULTADO.json`.
