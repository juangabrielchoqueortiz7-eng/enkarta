# Constructor por bloques: cambio de plantilla con subidas pendientes

## Problema reproducido

El editor invalidaba sus callbacks al aplicar una plantilla, pero los campos múltiples sólo identificaban el bloque, el hijo y el campo. `MultiImageUploader` usa deliberadamente el callback más reciente para combinar fotos con la lista actual. Si una plantilla reutilizaba los mismos IDs, una respuesta del lote anterior podía alcanzar ese callback nuevo y añadir fotos al destino de la nueva plantilla.

Había dos ventanas adicionales. Antes del siguiente render, el cargador aún conservaba sus props anteriores y podía continuar procesando archivos aunque el padre ya rechazara su edición. Deshacer, Rehacer y restaurar una versión desde el constructor exterior tampoco cambiaban la generación del panel si el documento recuperado conservaba los mismos IDs, plantilla y variante.

## Corrección

- Los destinos directos, anidados y de listas comparten una identidad que incluye invitación, plantilla, variante, generación de edición, bloque, tipo de bloque, hijo y tipo si corresponde, y campo. Las filas conservan además sus claves temporales. Cambiar de contexto produce un destino distinto aunque se reutilicen IDs.
- Aplicar una plantilla, quitar los bloques o convertir una invitación conserva la invalidación síncrona de generación del panel. Cuando el cargador recibe el nuevo destino, cancela el controlador anterior.
- `isDestinationCurrent` es una comprobación opcional del cargador múltiple. Cada lote captura la comprobación de su contexto al iniciarse y la consulta antes de arrancar y después de cada espera. Una respuesta anterior no lee el JSON, no inicia el siguiente archivo ni modifica el padre si su contexto ya fue invalidado, incluso antes del siguiente render. Una espera de JSON ya iniciada tampoco permite aplicar el resultado antiguo.
- `InvitationBuilder` mantiene una revisión de medios únicamente en memoria. Deshacer y Rehacer la incrementan antes de aplicar el documento; las acciones sin historial no la cambian. Restaurar una versión la incrementa sólo después de superar las validaciones del contrato y antes de aplicar el documento. El panel comprueba esa referencia también antes del render.
- Un rollback publicado incrementa la revisión sólo cuando su instantánea reemplaza el borrador actual. Si hubo ediciones posteriores y se conserva el borrador, se mantiene su contexto. Guardar, publicar o pausar el documento actual sin reemplazar su contenido no invalidan los lotes por esta señal.
- Editar títulos, pies, descripciones accesibles, estilos o el orden de las fotos dentro del mismo contexto conserva su destino. Un fallo de un lote obsoleto no borra el estado ni el controlador de un lote nuevo.

La señal de revisión, la identidad de destino y las claves de fila no se incluyen en el JSON guardado, en las versiones ni en el documento público. No se añade almacenamiento global ni persistencia en el navegador. Se aplica `vercel-react-best-practices` para usar el estado vigente y referencias de contexto con React 18; no se añaden dependencias ni APIs de React 19.

## Conservación y límites

Los tres archivos de aplicación afectados son `InvitationBuilder.tsx`, `MultiImageUploader.tsx` y `panels/BlockEditorPanel.tsx`. No se modifican textos de producto, clases, estilos, renderizadores públicos, presets, fotografías, fuentes, música, animaciones ni archivos originales. La comparación AST contra `ce39b9b`, normalizando sólo finales de línea de los archivos fuente, conserva todos los textos JSX y atributos de clase y estilo de los tres componentes.

No se guarda ni publica una invitación automáticamente por cancelar un lote. Cancelar el procesamiento del cliente no acredita que el servidor haya borrado un archivo ya recibido. No se añaden borrados remotos ni se prometen cargas atómicas de varios archivos. Las fotos ya confirmadas antes de cambiar de plantilla siguen el comportamiento de reemplazo de esa plantilla; sólo se descartan los resultados posteriores del contexto anterior.

BCP permanece desactivado. No se cambian proveedor, credenciales, permisos del servidor, dependencias o CSP y no se requiere SQL. La aceptación manual de Android, Safari y Google permanece aplazada. Las comprobaciones remotas de fuentes, permisos y recursos no sustituyen ejecutar la carrera de subida en un navegador autenticado de producción.

## Regresiones automáticas

`scripts/test-builder-template-upload-ui.cjs` incorpora **17 pruebas** con `BlockEditorPanel` y `MultiImageUploader` reales, registry y bindings reales, y compresión y transporte sustituidos por promesas controladas y archivos ficticios en memoria. No se monta el DOM ni se realizan subidas o red reales.

Para comprobar IDs reutilizados sin conseguir una cancelación incidental por desmontaje, el arnés conserva una acción real «Aplicar» obtenida desde la biblioteca antes de abrir la galería. Ejecuta esa acción con el lote pendiente y comprueba que se conserve la misma instancia real del cargador. Es una prueba de componentes y callbacks; no se presenta como aceptación física de ese recorrido en un dispositivo.

- Galerías directas y anidadas, lotes parcialmente confirmados, compresión, transporte y JSON pendientes.
- Cambio de invitación, plantilla o variante de ida y vuelta y desmontaje durante cada fase.
- Respuesta que ignora la cancelación, fallo antiguo frente a un lote nuevo y nueva selección válida después del reemplazo.
- Títulos, pies, alt, retirada y orden de fotos actuales conservados sin cambiar el destino.
- Invalidación antes de renderizar, con señal de transporte todavía sin cancelar: no se lee el JSON anterior ni se inicia el siguiente archivo.
- Revisión externa de historial con IDs reutilizados y selección mediante un handler antiguo sin ningún lote activo que pudiera bloquearlo por otro motivo.

La reproducción optativa carga sólo el panel anterior del commit `ce39b9bbf6046216c0c86786a06122e0ded6a8f5` en memoria; utiliza el cargador actual sin comprobación de contexto porque aquella fuente no le pasa la nueva prop. **13 pruebas fallan y cuatro pasan**. La ejecución habitual no usa Git y funciona en un checkout superficial de CI.

`scripts/test-builder-upload-history-ui.cjs` incorpora **seis pruebas** con `InvitationBuilder` real y paneles y persistencia inertes. Observa la revisión entregada al panel y ejecuta las acciones reales de Deshacer, Rehacer, guardar, publicar, restaurar y rollback. Comprueba la invalidación síncrona, los rechazos de contrato sin invalidación, las acciones sin historial y la conservación de identidad del evento al restaurar. La reproducción optativa del constructor anterior falla las seis pruebas porque no entrega esta señal.

Las dos suites forman parte de `npm run verify`. La evidencia privada se guarda en `tmp/builder-template-upload/`: `template-upload-ui.log`, `upload-history-ui.log`, `reproduction-baseline.log`, `history-reproduction-baseline.log`, `typecheck.log`, `visual-contract.json`, `protected.json` y `distribution.json`.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.156 pruebas correctas en 38 suites**, incluidas **23 nuevas**, además de lint, TypeScript y build de producción; comando completo terminado con código 0.
- Las dos suites nuevas pasan **17/17** y **6/6**. Cada suite y su código de aplicación correspondiente fueron revisados independientemente por un segundo agente. El caso final de rollback comprueba tanto la sustitución de contenido como la conservación de ediciones posteriores y de su revisión vigente; se repitió la suite de seis pruebas después de ampliar esa aserción.
- Las 19 regresiones anteriores del cargador múltiple, las 18 del editor por bloques, las 27 de listas y las 28 de variantes heredadas siguen pasando dentro de la verificación completa.
- La comparación AST de los tres componentes conserva textos JSX, clases y estilos. **597/597 archivos protegidos** conservan SHA-256 y los **129 recursos originales** de distribución están completos, incluidos los audios archivados fuera de Git.
- **28/28 pruebas offline** de los helpers privados de atestación, permisos y cierre de sesión correctas; no se suman a las 1.156 pruebas de la aplicación ni realizan red.

Permanecen los avisos anteriores de imágenes. No se requieren migraciones ni cambios de dependencias. Evidencia privada adicional: `verify.log` y `smoke-helper-tests.log`.

## Producción verificada, 20 de octubre de 2026

- Código **`6c18ac205f59140d5017be85cbe443d30d476769`**, integrado en `main`. [CI del commit exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39463250247): `completed/success`, con `npm run verify` y auditoría de dependencias aprobados. Sólo se consultaron metadatos públicos del workflow y sus pasos.
- Vercel **`dpl_J8BzDgD8PUJR7nt87nnMExgNauRp`**, `READY`, destino producción y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-6vzjfq503](https://enkarta-6vzjfq503-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para incluir los originales archivados fuera de Git.
- Los identificadores de contenido y SHA-256 de las **tres fuentes** coinciden con los archivos de entrada del despliegue Ready: `InvitationBuilder`, `BlockEditorPanel` y `MultiImageUploader`. Esto acredita las fuentes publicadas; no afirma ejecutar una carrera de callbacks desde un navegador autenticado de producción.
- **11 grupos HTTP correctos**, con **58 denegaciones exactas**, incluidas **46 solicitudes de escritura**. Se conservan los permisos de cuenta, pagos, publicación, eliminación y medios de Socios; una cookie administrativa válida tampoco permite suplantar una sesión de Socios.
- Los archivos ficticios se enviaron únicamente sin autenticación válida. El formulario administrativo autenticado no contenía archivo ni propietario y devolvió el rechazo exacto 400 antes del almacenamiento. No se realizaron subidas autenticadas ni se deduce de estas denegaciones la aceptación visual del constructor.
- La configuración administrativa conserva `no-store` y vinculación a su sesión. El historial del constructor conserva `no-store`, `Vary: Cookie` y respuesta vacía para un UUID ficticio cuya ausencia se comprobó mediante conteos exactos antes y después. No se leyeron filas de clientes.
- **129/129 recursos públicos** conservan tamaño y SHA-256, **6/6 rutas** responden como corresponde y los **597/597 archivos protegidos** siguen idénticos después del despliegue.
- **Cero registros de negocio, archivos almacenados, usuarios Auth, fixtures, pagos, operaciones bancarias o mensajes creados**. La cookie administrativa temporal quedó cerrada. No hay datos ficticios persistentes que retirar de Supabase.

BCP permanece bloqueado: no se cambiaron proveedor ni credenciales ni se consultaron variables remotas de pago o endpoints bancarios. Las regresiones locales cubren el cambio de plantilla y la señal de historial con componentes reales y transporte controlado; la verificación remota acredita fuentes, permisos y conservación. La aceptación manual permanece aplazada. No se requiere SQL.

Evidencia privada adicional en `tmp/builder-template-upload/`: `deployment.log`, `deployment-final.json`, `deployment-files.json`, `ci.json`, `production-http.json`, `production-public.json` y `RESULTADO.json`.
