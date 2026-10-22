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

Los resultados de producción se registrarán aquí una vez finalizada la verificación y limpieza ficticia.
