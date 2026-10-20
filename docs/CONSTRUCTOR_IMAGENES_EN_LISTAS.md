# Constructor y Socios: imágenes de las listas de itinerario

## Fallo reproducido

`ListEditor` reconstruía una lista y sus elementos desde el render que creó el callback. Una imagen que terminaba después de editar o mover una fila podía perder textos recientes, recuperar elementos eliminados o acabar en el índice de otra fila. Las filas también usaban el índice como clave React, por lo que el control de subida podía quedar asociado al vecino después de reordenar.

El esquema actual permite imágenes en `timeline.items.image` e iconos personalizados en `itinerary.items.icon`. El mismo editor se usa para captions de galería, frases, datos editoriales y grupos de padres. La corrección conserva todos esos consumidores y sus controles actuales.

La reproducción carga `BlockEditorPanel` del commit `e841446` en memoria mediante Git, sin reemplazar fuentes actuales. De las 27 regresiones nuevas, 22 fallan con esa fuente y cinco pasan. No se demuestra el problema escribiendo en una invitación real ni realizando una subida remota.

## Identidad de filas y corrección

- `BuilderListState` mantiene claves de fila únicamente en la memoria de cada instancia del panel. No se añaden IDs ni otros campos al JSON guardado, no hay almacenamiento global ni persistencia en navegador y no se requiere SQL.
- La identidad ordinaria se conserva por referencia única del objeto. Mover, quitar, añadir o editar desde el panel actualiza la lista y sus claves antes de notificar al constructor. Una fila eliminada pierde su clave y una fila nueva recibe otra, aunque tenga los mismos textos o esté vacía.
- Las claves React siguen a la fila al reordenar. El control de imagen y su callback permanecen asociados al elemento original; editar otro campo del mismo elemento conserva esa identidad.
- Cada acción vuelve a buscar el bloque, su hijo si corresponde, y la lista actuales. Sólo combina el campo modificado con la fila vigente. Si la fila, bloque o grupo desapareció, no emite cambios ni recupera contenido anterior.
- Los cambios de texto, imagen e icono realizados antes del siguiente render se combinan con los datos actuales. Se mantienen los vecinos añadidos o editados, su orden, la configuración y los campos desconocidos del documento.
- Una copia externa profunda o un reemplazo desconocido no se identifica por textos iguales ni por índice: invalida conservadoramente los callbacks anteriores. Las referencias ambiguas tampoco heredan una intención de subida. Reordenar externamente los objetos únicos que siguen vigentes conserva su identidad.
- La reconciliación comprueba longitud y referencias por posición incluso cuando se reutiliza el mismo array. Un `splice`, `reverse` o reemplazo externo en ese array no hace que se escriba la lista anterior.
- El estado de listas se limpia al desmontar, cambiar de invitación, plantilla base o variante y al reemplazar el layout. Se conservan las comprobaciones de generación y contexto del panel, también en una ida y vuelta al destino anterior.

## Vistas derivadas y compatibilidad

Los captions se normalizan mediante `captionsForImages`, que crea objetos nuevos. Se conserva esa normalización mientras su fuente y el orden de las imágenes siguen vigentes y se adopta el resultado de cada edición propia antes de notificar. Esto permite seguir editando fotografías con URL repetida sin invalidar sus controles en cada lectura.

La asociación por imagen única permite que un caption siga a su fotografía al reordenarla y que desaparezca si se retira la foto. Se mantiene intacto `gallery.ts`, incluido su comportamiento público de asociación por URL; este cambio no promete captions públicos independientes por ocurrencia de una URL repetida.

El binding `content.editorialDetails` también genera objetos nuevos al resolver los datos globales. Sólo para esa vista derivada conocida, sin medios asíncronos en su esquema, se permite una coincidencia única de contenido. No se usa esa regla para inferir identidad en las listas editables de imágenes o itinerario. El binding `event.itinerary` conserva sus objetos originales y usa la regla ordinaria de identidad.

Las modificaciones válidas mantienen el comportamiento de desvincular únicamente el campo de lista editado; los datos globales originales y los demás bindings permanecen. Un callback descartado no desvincula la lista ni emite una configuración nueva.

## Alcance y conservación

Se aplica `vercel-react-best-practices` para evitar cierres obsoletos, usar claves estables y mantener estado por instancia en React 18. No se añaden dependencias ni APIs de React 19.

Sólo cambia la lógica del editor de listas y su estado auxiliar. Se conservan textos, controles, clases y composición de la interfaz; los cambios de clave React no se guardan en el documento. No se modifican renderizadores públicos, presets, fotografías, fuentes, música, animaciones ni recursos originales. La corrección posterior de los setters generales de variantes heredadas se documenta en [Subidas en variantes heredadas](CONSTRUCTOR_VARIANTES_HEREDADAS.md).

No se publica ni se guarda automáticamente una invitación. El constructor exterior conserva sus estados de borrador, guardado y publicación. Descartar una respuesta del cliente no acredita que el servidor haya borrado un archivo ya recibido: no hay borrados remotos ni reintentos automáticos nuevos.

BCP permanece desactivado. No se cambian permisos del servidor, pagos, credenciales ni CSP. Las pruebas manuales de Android/Safari y el acceso con Google quedan aplazados.

## Regresiones automáticas

`scripts/test-builder-list-media-ui.cjs` incorpora **27 pruebas** del panel y los controles internos reales, con registry, bindings y galería reales. Los controles de imagen, icono y almacenamiento son fronteras inertes; sus callbacks retenidos simulan respuestas. No se monta el DOM ni se realizan subidas o autenticaciones reales.

- Imagen pendiente frente a cambios de año, título y texto; reordenar o eliminar su fila, retirar un vecino y añadir otro elemento.
- Cambios simultáneos, respuestas de dos imágenes en orden inverso, filas vacías idénticas y eliminación seguida de reinserción de una fila igual.
- Referencias ambiguas, clones externos idénticos, reordenación externa con objetos vigentes y cinco variantes de mutación del array sin render previo.
- Iconos de itinerario con colores y velocidad exactos, datos globales enlazados y reemplazo de su lista por otra desconocida.
- Listas en hijos reordenados y eliminación de hijo o grupo, cambio de selección, propietario de ida y vuelta y desmontaje.
- Caption que sigue a su imagen, eliminación de foto, título/pie/alt en el mismo turno y edición de URLs repetidas antes y después del render.
- Datos editoriales generados que siguen editables y conservan otros campos globales recientes.
- Claves React que acompañan a la fila y ausencia de metadatos de identidad en el documento serializado.

Las 18 regresiones previas del editor por bloques también pasan sin modificar su arnés. La suite nueva forma parte de `npm run verify`. Evidencia privada en `tmp/builder-list-media/`: `reproduction-baseline.log`, `list-media-ui.log`, `block-media-existing.log`, `verify.log`, `protected.json` y `distribution.json`. La comprobación remota de fuentes y permisos complementa estas pruebas; no se presenta como aceptación de un upload autenticado en un navegador de producción.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.105 pruebas correctas en 35 suites**, incluidas las **27 nuevas**, además de lint, TypeScript y build de producción; comando completo terminado con código 0.
- Revisión independiente y ejecución independiente de las 27 regresiones nuevas y las 18 anteriores: sin bloqueantes finales. Las regresiones de arrays mutados y captions repetidos cubren los dos problemas detectados durante esa revisión.
- **597/597 archivos protegidos** conservan SHA-256 y el guard de distribución encuentra completos los **129 originales públicos**, incluidos los audios archivados fuera de Git.
- **28/28 pruebas offline** de los helpers privados de atestación de fuente, denegaciones y cierre de sesión correctas; no se suman a las 1.105 pruebas de la aplicación ni se conectan a producción.

Permanecen los avisos anteriores de imágenes; no aparecen nuevos avisos de lint en los archivos afectados. No se requieren migraciones ni actualizaciones de dependencias.

## Producción verificada, 20 de octubre de 2026

- Código **`457a6d4a11e312de3bbad549cd9a86a4b621b00e`**, integrado en `main`. [CI del commit exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39456865582): `completed/success`, con `npm run verify` y auditoría de dependencias aprobados. Se consultaron únicamente metadatos públicos de workflow y pasos.
- Vercel **`dpl_4K5EGFUiKVeUAHdAAUHrxuzaczpM`**, `READY`, destino producción y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-qw0zm9yyt](https://enkarta-qw0zm9yyt-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para incluir los originales ignorados por Git.
- Los identificadores de contenido de `panels/BlockEditorPanel.tsx` y `lib/builder-list-state.ts` coinciden con sus dos archivos de entrada del despliegue Ready y sus SHA-256 locales. Esto acredita las fuentes publicadas; no afirma ejecutar los callbacks desde un navegador autenticado de producción.
- **11 grupos HTTP correctos**, con **58 denegaciones exactas**, incluidas **46 solicitudes de escritura**. Se mantienen los permisos de cuenta, pagos, publicación y eliminación de Socios. Las solicitudes ficticias de medios sin sesión o con cookies inválidas se rechazan; una cookie administrativa válida no sustituye una sesión de Socios.
- Los archivos ficticios sólo se enviaron en contextos sin autenticación válida. Con administrador se envió únicamente un formulario sin archivo ni propietario: devolvió el rechazo exacto 400 antes de almacenar nada. No se ejecutaron subidas autenticadas ni se deduce la aceptación de imágenes de listas a partir de estas denegaciones.
- La configuración administrativa conserva `no-store` y vinculación a su sesión. El historial privado del constructor conserva `no-store` y `Vary: Cookie`, con respuesta vacía para un UUID ficticio cuya ausencia se comprobó mediante conteos exactos antes y después. No se leyeron filas de clientes.
- **129/129 recursos originales públicos** conservan tamaño y SHA-256; las **6/6 rutas** comprobadas responden como corresponde. Los **597/597 archivos protegidos** siguen idénticos después del despliegue.
- **Cero registros de negocio, archivos almacenados, usuarios Auth, fixtures, pagos, operaciones bancarias o mensajes creados**. La cookie administrativa temporal, mantenida sólo en memoria, quedó cerrada. No hay datos ficticios persistentes que retirar de Supabase.

BCP permanece bloqueado: no se cambiaron proveedor ni credenciales y no se consultaron variables remotas de pago o endpoints bancarios. No se requiere SQL. Las regresiones locales cubren las imágenes e iconos del componente real sobre sus listas actuales; las comprobaciones remotas complementan esa evidencia con fuentes, permisos y conservación. Las pruebas manuales permanecen aplazadas.

Evidencia privada adicional en `tmp/builder-list-media/`: `smoke-helper-tests.log`, `deployment.log`, `deployment-final.json`, `deployment-files.json`, `ci.json`, `production-http.json`, `production-public.json`, `protected.json` y `RESULTADO.json`. La aceptación y limpieza anteriores de Ventas y los borradores del navegador permanecen intactos.
