# Guardado del constructor con espera acotada

El PUT de borrador esperaba indefinidamente tanto las cabeceras HTTP como el JSON. Una conexión detenida podía dejar «Guardando…» activo y bloquear la cola, el regreso al panel y la revisión de publicación.

`requestBuilderSave` limita el intento completo a 25 segundos y cancela la espera mediante AbortController. Comprueba también el tiempo transcurrido al recibir cabeceras y JSON. Un transporte que ignore la cancelación puede terminar después, pero su respuesta ya no modifica revisión, vigencia, contenido ni confirmación de guardado.

Cancelar la espera no demuestra que el servidor haya cancelado el PUT. Por eso el vencimiento deja una barrera en esta sesión del editor: se conservan el contenido actual, las ediciones posteriores y el historial; no se envían otros PUT, publicaciones, programaciones, pausas, rollback, duplicaciones ni eliminaciones desde ese editor. Tampoco se abre la vista privada como si el guardado hubiera terminado. La cola descarta incluso un guardado posterior que ya estaba esperando.

El aviso indica: «El guardado no respondió en 25 segundos. Conservamos tus cambios en esta pestaña. El servidor puede haberlos recibido. Descarga un respaldo y recarga para comprobar el borrador antes de continuar». La descarga contiene el estado actual en memoria, no el snapshot antiguo enviado. El usuario debe conservar ese respaldo antes de recargar; no se restaura automáticamente ni se afirma que lo no confirmado esté guardado. La nueva carga consulta el borrador del servidor. El aviso nativo de salida sigue protegiendo la pestaña, incluso si se pulsó Guardar sin editar previamente.

El indicador deja de ofrecer reintento cuando existe incertidumbre y la etiqueta de validación cambia a «Guardado sin confirmar». Sigue siendo posible editar para preparar un respaldo, pero esos cambios no se envían hasta resolver el estado recargando. La reconexión y los atajos no saltan la barrera. Un rechazo HTTP completo mantiene el manejo y el reintento explícito anteriores. Esta mejora acota únicamente los PUT del borrador; no presenta como acotadas otras peticiones del historial o publicación.

Se aplican `vercel-react-best-practices` al transporte y las referencias actuales de la cola, e `impeccable` a los estados y textos operativos. Sin dependencias nuevas ni SQL; no se modifican renderers, presets, fotografías, música, animaciones o recursos originales. BCP permanece bloqueado y la modificación local preexistente de la migración 021 queda excluida.

Nueve pruebas usan el constructor real con hooks, transporte y eventos simulados en memoria. Cubren cabeceras y JSON detenidos, guardado manual y automático, contenido posterior, respuesta tardía, cola pendiente, reconexión, atajo, acciones públicas, duplicación y eliminación, respaldo del contenido actual, salida de una sesión inicialmente limpia y respuesta válida o rechazo antes del plazo. La versión anterior 709b4ac obtiene dos aciertos y siete fallos. No son pruebas ReactDOM ni aceptación visual de un navegador.

La aceptación manual en computadora queda pendiente. La verificación de producción y su limpieza se registrarán tras el despliegue en este documento y en `tmp/builder-save-timeout/RESULTADO.json`.
