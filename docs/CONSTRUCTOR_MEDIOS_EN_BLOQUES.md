# Constructor y Socios: respuestas de medios sobre el bloque actual

## Fallo reproducido

Después de corregir el lote de fotografías, seguía un problema en su consumidor: `BlockEditorPanel` reconstruía `config`, `layout`, bloques e hijos desde el render que había creado el callback. Una respuesta tardía de un medio podía recuperar bloques quitados, deshacer el orden de los hijos o perder títulos, pies, estilos y otras propiedades editadas durante la espera.

`ImageUploader` conserva deliberadamente el callback del campo que inició la subida para evitar dirigir su respuesta a otro campo vacío. Cambiarlo globalmente al callback más reciente no resuelve este caso: el destino anterior necesita combinar su cambio con el documento vigente.

La reproducción aislada carga la fuente de `BlockEditorPanel` del commit `21f03f2` mediante Git, en memoria y sin reemplazar archivos actuales. De las 18 regresiones nuevas, 17 fallan con esa fuente y una pasa. No se usa una invitación real, ni red, ni Storage para demostrar el fallo.

## Corrección

- El panel mantiene una referencia del documento y del callback actuales. Cada notificación sincroniza esa referencia antes de avisar al constructor; las mutaciones funcionales de medios la consultan sin esperar al siguiente render para ver el resultado anterior.
- Actualizar un bloque busca su ID en el layout vigente. Si el bloque o el layout ya no existe, no emite una nueva configuración ni recupera contenido eliminado. Una respuesta tampoco edita un bloque que ahora tiene otro tipo.
- Las mutaciones de contenido, ajustes de `ImageStudio`, iconos, estilos, animación y visibilidad combinan únicamente sus campos con el bloque actual. La configuración global, el orden, los hermanos y los metadatos del layout se conservan.
- Las imágenes y captions de la galería se resuelven contra el bloque y documento actuales, incluidos los enlaces `media.galleryImages` y `media.galleryCaptions`. Reordenar mantiene la asociación por imagen y conserva los títulos, pies y descripciones recientes. Editar una propiedad mantiene el comportamiento existente de desvincular ese campo de los datos globales.
- Los callbacks de hijos capturan su ID y lo buscan en los hijos actuales. Reordenar no cambia su destino; quitar el hijo o su grupo descarta la respuesta. Quitar, mover y añadir hijos también usan la lista vigente.
- Montaje y generación de contexto impiden escribir tras salir del panel, cambiar de invitación, plantilla base o variante, incluso si se vuelve al contexto anterior. El guard también comprueba los datos sincronizados antes del siguiente render.
- Aplicar una plantilla guardada, convertir a bloques o quitar los bloques invalida explícitamente los callbacks anteriores. Esto incluye una plantilla que reutilice los mismos IDs: no basta con comprobar que el ID siga existiendo.

Se aplica `vercel-react-best-practices` para evitar cierres obsoletos y mantener referencias y ciclo de vida compatibles con React 18. No se incorporan APIs de React 19, dependencias nuevas, cachés globales, cambios de CSP ni permisos del cliente que sustituyan la validación del servidor.

## Diseños y alcance

Sólo cambia la lógica de estado de `BlockEditorPanel`; se mantienen sus controles, textos, clases y composición. No se modifican renderizadores públicos, presets, fotografías, animaciones, fuentes, música ni recursos originales. El usuario conserva sus propias ediciones y el diseño elegido.

El cambio no publica ni guarda automáticamente una invitación. El constructor exterior sigue marcando los cambios de contenido como pendientes según su contrato. Los marcadores conservados en el arnés aislado no acreditan que una edición permanezca publicada sin guardar.

BCP sigue desactivado. No hay operaciones bancarias, nuevas credenciales ni migración SQL. Las pruebas manuales de Android/Safari y el acceso con Google permanecen aplazados.

Pendientes independientes que este bloque no resuelve:

- `ListEditor` todavía reconstruye sus elementos internos con un índice/lista capturados. Una imagen dentro de un elemento de itinerario o timeline requiere una corrección específica; la identidad de los hijos de bloque no es la identidad de esos elementos internos.
- Los setters generales de las ocho variantes heredadas continúan fuera de esta corrección del editor por bloques. No se afirma que todas las posibles ediciones concurrentes de esas variantes estén cubiertas.
- La cancelación del cliente no acredita que un archivo ya recibido por el servidor haya sido eliminado. No se añaden borrados remotos ni reintentos automáticos de upload.

## Regresiones automáticas

`scripts/test-builder-block-media-ui.cjs` incorpora **18 pruebas** que ejecutan `BlockEditorPanel`, sus controles internos y las funciones reales de registry, bindings y galería. Las fronteras de `ImageUploader`, `MultiImageUploader`, `ImageStudio`, `IconPicker`, plantillas y secciones usan dobles controlados. Se invocan los callbacks retenidos como respuestas de esas fronteras; no se monta el DOM ni se realiza una subida real.

- Configuración, metadatos del layout, bloques vecinos y orden actuales después del callback retenido.
- Títulos, pies, alt y bindings actuales de galería; no se recuperan IDs eliminados ni se redirige el cambio al bloque seleccionado después.
- Ajustes de `ImageStudio` y respuesta de imagen en el mismo turno; selección de icono conserva contenido, colores y velocidad actuales.
- Hijos reordenados, eliminados o cuyo grupo desapareció; callbacks de hijos identificados por ID.
- Desmontaje y cambios de propietario, plantilla o variante de ida y vuelta.
- Aplicar una plantilla guardada con IDs iguales o quitar bloques antes del render descarta la respuesta anterior.

La suite forma parte de `npm run verify`. Evidencia privada en `tmp/builder-block-media/`: `reproduction-baseline.log`, `block-media-ui.log`, `verify.log`, `protected.json` y `distribution.json`. Las regresiones offline del helper de despliegue no se suman a las de la aplicación. La comprobación remota de fuentes y permisos no se presenta como aceptación de una subida autenticada en un navegador de producción.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.078 pruebas correctas en 34 suites**, incluidas las **18 nuevas**, además de lint, TypeScript y build de producción; comando completo terminado con código 0.
- Revisión independiente del diff y ejecución independiente de las 18 regresiones: sin bloqueantes para el alcance declarado. Permanecen los avisos anteriores de imágenes; no aparecen nuevos avisos de lint en el componente afectado.
- **597/597 archivos protegidos** conservan SHA-256 y el guard de distribución encuentra completos los **129 originales públicos**, incluidos los audios archivados fuera de Git.
- **28/28 pruebas offline** de los helpers privados de atestación de fuente, denegaciones y cierre de sesión correctas; no se suman a las 1.078 pruebas de la aplicación ni se conectan a producción.

## Producción verificada, 20 de octubre de 2026

- Código **`26577b74339821cd4aeddc4b1503adfe4232e461`**, integrado en `main`. [CI del commit exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39452359390): `completed/success`, con `npm run verify` y auditoría de dependencias aprobados. Se consultaron únicamente metadatos públicos de workflow y pasos.
- Vercel **`dpl_HDkiCUeikJ3r2r5PjW5CFp9pyqCU`**, `READY`, destino producción y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-qdqic2vwo](https://enkarta-qdqic2vwo-juangabrielchoqueortiz7-engs-projects.vercel.app). El workspace completo incluye los originales ignorados por Git.
- El identificador de contenido de `panels/BlockEditorPanel.tsx` coincide con el archivo de entrada del despliegue Ready y su SHA-256 local. Esto acredita la fuente publicada; no afirma ejecutar el editor autenticado ni sus callbacks desde un navegador de producción.
- **11 grupos HTTP correctos**, con **58 denegaciones exactas**, incluidas **46 solicitudes de escritura**. Se mantienen los permisos de cuenta, pagos, publicación y eliminación de Socios. Las solicitudes ficticias de medios sin sesión o con cookies inválidas se rechazan; la cookie administrativa no sustituye una sesión de Socios.
- Los archivos ficticios sólo se enviaron en contextos sin autenticación válida. Con administrador se envió únicamente un formulario sin archivo ni propietario: devolvió el rechazo exacto 400 antes de almacenar nada. No se ejecutaron subidas autenticadas ni se deduce una aceptación de sus carreras a partir de estas denegaciones.
- La configuración administrativa conserva `no-store` y vinculación a su sesión. El historial privado del constructor conserva `no-store` y `Vary: Cookie`, con respuesta vacía para un UUID ficticio cuya ausencia se comprobó mediante conteos exactos antes y después. No se leyeron filas de clientes.
- **129/129 recursos originales públicos** conservan tamaño y SHA-256; las **6/6 rutas** comprobadas responden como corresponde. Los **597/597 archivos protegidos** siguen idénticos después del despliegue.
- **Cero registros de negocio, archivos almacenados, usuarios Auth, fixtures, pagos, operaciones bancarias o mensajes creados**. La cookie administrativa temporal, mantenida sólo en memoria, quedó cerrada. No hay datos ficticios persistentes que retirar de Supabase.

BCP permanece bloqueado: no se cambiaron proveedor ni credenciales y no se consultaron variables remotas de pago o endpoints bancarios. No se requiere SQL. Las regresiones locales cubren los callbacks del componente real sobre el borrador actual; las comprobaciones remotas complementan esa evidencia con fuentes, permisos y conservación. Las pruebas manuales permanecen aplazadas.

Evidencia privada adicional en `tmp/builder-block-media/`: `smoke-helper-tests.log`, `deployment.log`, `deployment-final.json`, `deployment-files.json`, `ci.json`, `production-http.json`, `production-public.json`, `protected.json` y `RESULTADO.json`. La aceptación y limpieza anteriores de Ventas y los borradores del navegador permanecen intactos.
