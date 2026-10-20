# Constructor y Socios: fotos durante una subida múltiple

## Problema reproducido

`MultiImageUploader` conservaba `values` y `onChange` del momento de seleccionar los archivos. Tanto al terminar el lote como al fallar una foto posterior, reconstruía la galería con esa lista antigua. Quitar una foto o moverla mientras esperaba la respuesta podía perderse. Además, un resultado tardío podía llegar después de salir del panel o cambiar de invitación.

La reproducción aislada carga el componente anterior del commit `092513e` en memoria mediante Git, sin reemplazar archivos actuales ni usar red. Con la nueva suite produce 18 fallos y una prueba correcta. La frontera de compresión y el transporte usan archivos y respuestas ficticios; el componente y el panel de medios son los reales.

## Comportamiento corregido

- Cada foto con respuesta HTTP correcta y URL HTTP/HTTPS válida se añade una sola vez al final de la lista vigente. Las nuevas fotos conservan el orden de selección; las que ya aparecen conservan el orden elegido por el usuario. No se vuelve a escribir el lote al terminar ni en la rama de error.
- Las fotos confirmadas aparecen mientras continúa la subida. Quitar una de ellas no hace que reaparezca después. Una respuesta fallida posterior conserva lo ya incorporado y las ediciones actuales, sin inventar la URL de la foto fallida.
- Las acciones de quitar y mover actualizan una referencia síncrona de la lista. Los controles retenidos localizan la foto en la lista actual; dos acciones antes del siguiente render no reconstruyen una lista antigua. Las URL repetidas se distinguen por su ocurrencia en esa lista.
- Se usa el callback vigente del mismo campo para conservar la configuración reciente del padre. Cambiar propietario, carpeta, identidad del campo o límite invalida el lote anterior, aunque después se vuelva al destino inicial. Los cambios normales de lista no cancelan el lote: se combinan con las nuevas fotos.
- El inspector de bloques aporta una identidad de destino que incluye bloque y campo, y también el identificador del hijo cuando corresponde. Cambiar entre dos galerías vacías no puede redirigir la respuesta al campo nuevo.
- Un bloqueo síncrono impide iniciar dos lotes antes del render que deshabilita el selector. Se conserva la subida secuencial y la compresión existente de 1.920 px/calidad 0,82, sin cambiar dependencias.
- Se comprueba la vigencia después de compresión, transporte y lectura del JSON. Salir del panel cancela la solicitud y descarta respuestas tardías, incluso si el transporte ignora la cancelación. No se inician las fotos restantes de ese lote.
- Se respeta el límite al seleccionar y antes de añadir. Si otra edición ocupa el último lugar mientras la foto ya está en tránsito, se informa que se subió pero no se incorporó; no se excede el cupo ni se borra automáticamente un objeto remoto.
- El ahorro de compresión sólo aumenta por fotos confirmadas e incorporadas. Los errores y el progreso pertenecen al destino actual: un error viejo no oculta una subida nueva.

Se mantienen todos los controles y la composición de la galería. Se añaden nombres accesibles a los botones y al selector, foco de grupo visible, aviso de progreso y error anunciado. El texto de ayuda indica usar las flechas existentes, sin prometer arrastrar para reordenar.

## Alcance y conservación

Se aplica `vercel-react-best-practices` para evitar cierres obsoletos y gestionar referencias y ciclo de vida en React 18. La revisión de los controles afectados sigue las [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), especialmente nombres accesibles y anuncios asíncronos.

No se modifican renderizadores públicos, presets, fuentes, paletas, música, fotografías o animaciones originales. La revisión de consumidores identifica diez sitios JSX: el panel de medios, el control de bloques y ocho variantes con campos fijos. La corrección no reescribe los setters generales de esas variantes ni certifica todas sus posibles ediciones concurrentes. El caso de imágenes de listas anidadas no está presente en el esquema actual.

La cancelación del cliente no prueba que el servidor haya retirado un archivo que ya recibió. No se realizan borrados automáticos ni reintentos de upload, y quitar una miniatura sigue editando la lista sin borrar el recurso de Storage. Una foto confirmada sólo entra en el borrador local: siguen vigentes el guardado y la publicación separados, los permisos del servidor y el modelo de pagos existente.

BCP sigue bloqueado; no se requiere SQL ni cambio de credenciales. Las pruebas manuales de Android/Safari y el acceso con Google permanecen aplazados.

## Regresiones automáticas

`scripts/test-builder-multi-upload-ui.cjs` incorpora 19 pruebas del componente real, con hooks controlados y `MediaPanel` real en el caso de integración. No se monta el DOM ni se afirma aceptación de dispositivo. La compresión y `fetch` son fronteras simuladas; sólo se admiten solicitudes aisladas a `/api/admin/upload`.

- Borrado y nuevo orden durante la espera; éxito parcial seguido de error sin reescribir la lista.
- Títulos, pies, descripción accesible, música y configuración de diseño conservados en el panel real.
- Controles retenidos y acciones en el mismo turno; bloqueo de selecciones simultáneas.
- Límite inicial y ocupado durante el transporte; valores y callback actuales del mismo destino.
- Foto confirmada editable antes de terminar; eliminación que sobrevive al siguiente ACK o error.
- JSON inválido, URL ausente/mal formada y error HTTP, incluido el segundo archivo de un lote.
- Desmontaje en compresión, transporte y JSON; cambio de propietario/carpeta/campo/límite, incluida la ida y vuelta al destino anterior.
- Error tardío frente a un lote nuevo, reintento exclusivamente explícito y bytes ficticios enviados a su espacio correcto; ahorro de compresión de éxitos confirmados.

La suite forma parte de `npm run verify`. Evidencia privada en `tmp/builder-multi-upload/`: `reproduction-baseline.log`, `ui-tests.log`, `verify.log` y `protected.json`. Los helpers de comprobación remota tienen pruebas offline adicionales que no se suman a las de la aplicación. La comprobación HTTP y de fuentes del despliegue complementa las carreras verificadas localmente; no equivale a ejecutar una galería autenticada en un navegador de producción.

## Verificación local, 20 de octubre de 2026

- Lint, TypeScript y **1.060 pruebas en 33 suites** correctas, incluidas las 19 nuevas. La revisión independiente no identificó bloqueantes en este alcance.
- La ejecución local de `npm run verify` llegó al build, que se detuvo por `EPERM` al crear una carpeta en `.next`. Se conservó ese log y se repitió exclusivamente `npm run build` con el permiso necesario: terminó con código 0. Evidencia separada en `build.log`; no se oculta el primer resultado.
- **597/597 archivos protegidos** conservan SHA-256. El guard de distribución encuentra completos los **129 originales públicos**, incluidos los audios conservados fuera de Git.
- **28/28 pruebas offline** del helper privado de comprobación de fuentes, permisos y cierre de sesión; no se suman a las 1.060 pruebas de la aplicación. Esos casos no se conectan a producción.

Se mantienen los avisos anteriores de imágenes; no aparecen nuevos avisos de lint en los componentes afectados. No se requieren migraciones ni actualizaciones de dependencias.

## Producción verificada, 20 de octubre de 2026

- Código **`4fefb57b0c870d2d31fabe65d95cc132da238917`**, integrado en `main`. [CI del commit exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39440988677): `completed/success`, con `npm run verify` y auditoría de dependencias aprobados. Esta ejecución de CI sí completó el comando íntegro, incluido el build.
- Vercel **`dpl_5qpTM4amL3M8M2jg9mxEEC1Qa12k`**, `READY`, destino producción y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-nwly7ms77](https://enkarta-nwly7ms77-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para incluir los originales ignorados por Git.
- Los identificadores de contenido de `MultiImageUploader.tsx`, `panels/BlockEditorPanel.tsx` y el consumidor existente `panels/MediaPanel.tsx` coinciden con sus tres archivos de entrada del despliegue Ready. Esto acredita la fuente publicada; no afirma haber ejecutado la carrera desde un navegador autenticado de producción.
- **11 grupos HTTP correctos**, con **58 denegaciones exactas**, incluidas **46 solicitudes de escritura**. Se conservan las comprobaciones de cuenta, pagos, publicación y eliminación de Socios. Los intentos ficticios de subir o borrar archivos sin sesión o con cookies inválidas se rechazan; una cookie administrativa válida tampoco sustituye una sesión de Socios.
- Los archivos ficticios sólo se enviaron en contextos sin autenticación válida. Con administrador se envió únicamente un formulario sin archivo ni propietario: devolvió el rechazo exacto 400 antes de almacenar nada. No se ejecutaron subidas autenticadas ni se deduce una aceptación de lotes de estos rechazos.
- La configuración administrativa conserva `no-store` y vinculación a su sesión. El historial privado del constructor conserva `no-store` y `Vary: Cookie`, con respuesta vacía para un UUID ficticio cuya ausencia se comprobó mediante conteos exactos antes y después. No se leyeron filas de clientes.
- **129/129 recursos originales públicos** conservan tamaño y SHA-256; las **6/6 rutas** comprobadas responden como corresponde. Los **597/597 archivos protegidos** siguen idénticos después del despliegue.
- **Cero registros de negocio, archivos almacenados, usuarios Auth, fixtures, pagos, operaciones bancarias o mensajes creados**. La cookie administrativa temporal, mantenida sólo en memoria, quedó cerrada. No hay datos ficticios persistentes que retirar de Supabase.

BCP permanece bloqueado: no se cambiaron proveedor ni credenciales y no se consultaron variables remotas de pago o endpoints bancarios. No se requiere SQL. Las carreras del lote están verificadas por las regresiones locales del componente real; las comprobaciones de producción validan fuentes, acceso y conservación, sin presentarse como aceptación visual de Android/Safari o acceso con Google. Las pruebas manuales permanecen aplazadas.

Evidencia privada adicional en `tmp/builder-multi-upload/`: `build.log`, `distribution.json`, `smoke-helper-tests.log`, `deployment.log`, `deployment-final.json`, `deployment-files.json`, `ci.json`, `production-http.json`, `production-public.json`, `protected.json` y `RESULTADO.json`. La aceptación y limpieza anteriores de Ventas y los borradores del navegador permanecen intactos.
