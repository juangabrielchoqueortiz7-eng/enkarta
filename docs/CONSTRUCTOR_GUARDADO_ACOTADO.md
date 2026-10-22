# Guardado del constructor con espera acotada

El PUT de borrador esperaba indefinidamente tanto las cabeceras HTTP como el JSON. Una conexión detenida podía dejar «Guardando…» activo y bloquear la cola, el regreso al panel y la revisión de publicación.

`requestBuilderSave` limita el intento completo a 25 segundos y cancela la espera mediante AbortController. Comprueba también el tiempo transcurrido al recibir cabeceras y JSON. Un transporte que ignore la cancelación puede terminar después, pero su respuesta ya no modifica revisión, vigencia, contenido ni confirmación de guardado.

Cancelar la espera no demuestra que el servidor haya cancelado el PUT. Por eso el vencimiento deja una barrera en esta sesión del editor: se conservan el contenido actual, las ediciones posteriores y el historial; no se envían otros PUT, publicaciones, programaciones, pausas, rollback, duplicaciones ni eliminaciones desde ese editor. Tampoco se abre la vista privada como si el guardado hubiera terminado. La cola descarta incluso un guardado posterior que ya estaba esperando.

El aviso indica: «El guardado no respondió en 25 segundos. Conservamos tus cambios en esta pestaña. El servidor puede haberlos recibido. Descarga un respaldo y recarga para comprobar el borrador antes de continuar». La descarga contiene el estado actual en memoria, no el snapshot antiguo enviado. El usuario debe conservar ese respaldo antes de recargar; no se restaura automáticamente ni se afirma que lo no confirmado esté guardado. La nueva carga consulta el borrador del servidor. El aviso nativo de salida sigue protegiendo la pestaña, incluso si se pulsó Guardar sin editar previamente.

El indicador deja de ofrecer reintento cuando existe incertidumbre y la etiqueta de validación cambia a «Guardado sin confirmar». Sigue siendo posible editar para preparar un respaldo, pero esos cambios no se envían hasta resolver el estado recargando. La reconexión y los atajos no saltan la barrera. Un rechazo HTTP completo mantiene el manejo y el reintento explícito anteriores. Esta mejora acota únicamente los PUT del borrador; no presenta como acotadas otras peticiones del historial o publicación.

Se aplican `vercel-react-best-practices` al transporte y las referencias actuales de la cola, e `impeccable` a los estados y textos operativos. Sin dependencias nuevas ni SQL; no se modifican renderers, presets, fotografías, música, animaciones o recursos originales. BCP permanece bloqueado y la modificación local preexistente de la migración 021 queda excluida.

Nueve pruebas usan el constructor real con hooks, transporte y eventos simulados en memoria. Cubren cabeceras y JSON detenidos, guardado manual y automático, contenido posterior, respuesta tardía, cola pendiente, reconexión, atajo, acciones públicas, duplicación y eliminación, respaldo del contenido actual, salida de una sesión inicialmente limpia y respuesta válida o rechazo antes del plazo. La versión anterior 709b4ac obtiene dos aciertos y siete fallos. No son pruebas ReactDOM ni aceptación visual de un navegador.

La aceptación manual en computadora queda pendiente. La evidencia técnica se conserva en `tmp/builder-save-timeout/RESULTADO.json`.

## Verificación local y producción

Pasaron **1.915 pruebas en 67 ejecuciones**, lint y TypeScript. El primer build se detuvo por un EPERM del sandbox al crear una carpeta generada de .next. Repetido con acceso suficiente, terminó con salida 0 y **65 páginas**; conserva las advertencias previas sobre imágenes heredadas.

El commit `2f252503fe74af694cf0884adf5ff3b3cfa511c6` quedó integrado en main y desplegado como `dpl_FLCAyf8RUumjDK4Q34F2vU467jiN`, Ready con alias [enkarta.vercel.app](https://enkarta.vercel.app). El release procede del commit, excluye archivos de entorno y material maestro y conserva los 129 originales de distribución. Los identificadores de entrada de Vercel coinciden con los bytes revisados del constructor, el nuevo transporte y el bloqueo BCP. Los avisos nuevos están presentes en los scripts compilados servidos por producción.

Se creó un único borrador ficticio y se ejecutó un único PUT planificado mediante requestBuilderSave real, con transporte HTTP autenticado y su AbortSignal, sin simular una respuesta. El mensaje y texto de entrada cambiaron, la revisión aumentó exactamente una vez y la fila, el editor y la vista privada reflejaron los textos nuevos. Galería, música y el resto del contenido coincidieron con el plan. Sin sesión, ambas variantes del enlace ocultaron el borrador. No se publicó ninguna invitación.

Se eliminó exclusivamente esa copia, fijada por UUID y slug y validada por nombre, propietario nulo, estado draft, etiqueta QA y contenido. Las ocho tablas asociadas quedaron sin filas y los tres prefijos de almacenamiento estaban vacíos antes y después; no se borraron archivos. Tras cerrar la sesión técnica, URL normal y preview=1 devolvieron 404.

Pasaron seis rutas públicas y **129/129 originales** por longitud y SHA-256. Dos audios grandes se verificaron íntegramente por 34 rangos HTTP, con Content-Range y ETag consistentes; no es una prueba de reproducción. Los **597 archivos protegidos** y el hash de la modificación local de la migración 021 siguen iguales. Cero pagos, llamadas bancarias, mensajes o archivos subidos; BCP conserva su bloqueo y no se modificaron sus variables remotas.

Los plazos vencidos, la cola y las respuestas tardías se prueban en memoria. La comprobación de producción acredita el transporte real en el caso normal, los datos persistidos, permisos HTTP, código publicado y limpieza; no constituye aceptación visual ni una simulación de avería contra la base real. Las pruebas manuales en computadora siguen pendientes.

El [CI del mismo commit](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39846357405) terminó correctamente, incluidos npm run verify y la auditoría de dependencias de producción.
