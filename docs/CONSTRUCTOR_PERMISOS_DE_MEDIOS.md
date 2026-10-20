# Constructor y Socios: propietario de los medios subidos

## Fallo reproducido

El POST de `/api/admin/upload` comprobaba el acceso al constructor, pero no que el identificador usado en la ruta de almacenamiento perteneciera al socio que hacía la petición. La autenticación de un socio no basta para autorizar una operación sobre cualquier invitación.

La reproducción aislada usa el handler real, un actor ficticio de Socios, un UUID de otra invitación y almacenamiento simulado. Antes del ajuste devuelve 200 y alcanza la subida de un audio ficticio sin consultar la propiedad. Después devuelve 403 y no realiza llamadas al almacenamiento. No se usa una invitación real ni se demuestra el fallo escribiendo en producción.

## Contrato corregido

- El actor se obtiene una sola vez. Sin actor válido se mantiene el rechazo 401 anterior.
- Un socio debe enviar como `id` un UUID canónico exacto en minúsculas de una invitación propia. No se aplica trim, limpieza o sustitución antes de comprobar el identificador: una variante del valor no se convierte en un alias autorizado.
- Identificador ausente, `shared`, mal formado, de tipo archivo o perteneciente a otra invitación devuelve 403 con el mismo mensaje genérico. No se distingue públicamente entre una invitación ajena y una inexistente.
- La consulta de propiedad ocurre después de leer el formulario multipart y antes de crear o consultar el bucket, convertir el archivo en el Buffer de almacenamiento o subirlo. Un error al verificar el permiso impide la operación y devuelve 503 con un mensaje genérico, sin detalles SQL ni credenciales.
- El equipo administrador conserva su flujo anterior, incluido `shared` y la normalización de nombres y carpetas. Los límites, formatos, saneamiento de SVG y bytes de audio no cambian. DELETE conserva su comprobación existente de propiedad para Socios.

La protección se aplica en el servidor a una petición directa; no depende del control de subida de la interfaz. No se cambian permisos de publicación, planes, pagos o sesiones. Se aplica la pauta `server-auth-actions` de `vercel-react-best-practices` como revisión del permiso explícito dentro de la operación de servidor. No se requiere una migración ni dependencia nueva.

## Conservación y límites

No se modifican componentes visuales, presets, renderizadores de invitaciones, estilos globales, fotografías, música ni animaciones originales. BCP continúa bloqueado. Las pruebas manuales de Android/Safari permanecen aplazadas.

La regresión del handler aísla actor, consulta de propiedad y almacenamiento; no acredita por sí sola una entrada real con Google o una política RLS del bucket. La comprobación del actor existente sigue rechazando cuentas suspendidas antes de llegar a este handler. No se presenta esta corrección como una resolución del orden de fotografías durante una subida por lotes, que es un pendiente independiente de `MultiImageUploader`.

## Regresiones incorporadas

`scripts/test-builder-upload-access.cjs` incorpora **16 pruebas** con los handlers POST/DELETE reales y formularios `NextRequest`/`FormData`. Las fronteras de actor, propiedad y Supabase Storage son simuladas; se impide cualquier llamada de red. La suite se incorpora a `npm run verify`.

- Dueño propio frente a ajeno o inexistente, identificador ausente/`shared`/mal formado/en mayúsculas/archivo y variantes que una limpieza podría convertir en otro valor. Se verifica el rechazo antes de bucket, URL pública y subida.
- Error de consulta con respuesta genérica sin detalle privado, permiso comprobado de nuevo en cada solicitud y actores rechazados sin parsear siquiera el formulario. Las pruebas de actor controlado ejercitan el contrato de rechazo de sesión inválida o suspendida; no simulan Google.
- Compatibilidad de administrador y rutas `shared`, MIME admitidos/rechazados, límites exactos de imagen/audio/video/SVG, saneamiento de SVG y conservación de bytes y opciones de almacenamiento. Ningún archivo procede de los recursos originales.
- DELETE propio, ajeno, sin ruta, error de propiedad y eliminación administrativa compartida, para conservar el comportamiento previo sin ampliar el alcance del cambio.

La reproducción previa se ejecutó sobre el contenido del commit anterior mediante lectura de Git, sin reemplazar la fuente actual. Su reporte acredita 200 para un propietario ajeno, ninguna consulta de propiedad y acceso simulado a bucket/subida. Después de corregirlo se recibe 403 con cero llamadas de almacenamiento.

La auditoría estática de consumidores recorre 54 instancias o rutas de uploaders y wrappers. No se identifican llamadas legítimas del constructor de Socios que omitan `ownerId`: `IconPicker`, `ElementPicker`, `ImageStudio` y los editores de bloques reenvían `data.id`, obtenido de la invitación que la página de Socios ya verificó. Esta inspección del código no sustituye una aceptación manual del editor.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.041 pruebas correctas en 32 suites**, incluidas las **16 nuevas** de este bloque, además de lint, TypeScript y build de producción. Permanecen los avisos anteriores de imágenes de las invitaciones; no hay nuevos avisos de lint en los archivos afectados.
- **597/597 archivos protegidos** conservan su SHA-256. El guard de distribución encuentra completos los **129 originales públicos**, incluidos los audios conservados fuera de Git.
- Los helpers privados de denegaciones HTTP y atestación de la fuente tienen **27/27 regresiones offline** correctas. Esos casos no se suman a las 1.041 pruebas de la aplicación y no crean usuarios o archivos remotos.
- El arnés privado de cuentas y limpieza pasa **15/15 regresiones offline**, incluido el listado de Storage que devuelve una ruta en minúsculas al consultar un prefijo en mayúsculas. Estos casos tampoco se suman a las pruebas de la aplicación.

Evidencia privada en `tmp/builder-upload-access/`: `reproduction-baseline.json`, `api-tests.log`, `verify.log`, `protected.json` y `smoke-helper-tests.log`. La aplicación no requiere SQL ni dependencias nuevas. La verificación autenticada de producción usa un alcance ficticio independiente y debe conservar su manifiesto y resultado de limpieza; no se da por realizada en esta comprobación local.

## Producción verificada, 20 de octubre de 2026

- Código **`506661c5b5c5e188028d8d43169a54aaf09ada14`**, integrado en `main`. [CI del commit exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39436894616): `completed/success`, con `npm run verify` y auditoría de dependencias aprobados.
- Vercel **`dpl_D8TgwfxqYa9TZYWSTyePGtJ97MsS`**, `READY`, destino producción y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-29nzhvbly](https://enkarta-29nzhvbly-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para conservar los originales ignorados por Git.
- El identificador de contenido de la ruta `src/app/api/admin/upload/route.ts` coincide con el archivo de entrada del despliegue Ready. **11 grupos HTTP correctos** conservan los permisos de cuenta, pagos, invitaciones y medios: **58 denegaciones**, incluidas **46 solicitudes de escritura**. La cookie administrativa temporal quedó cerrada. La petición administrativa sin archivo devuelve el 400 anterior y no almacena nada.
- **129/129 originales públicos** conservan tamaño y SHA-256, las **6/6 rutas** públicas, de acceso y de desarrollo comprobadas responden correctamente y los **597/597 archivos protegidos** permanecen idénticos después de las pruebas.

La verificación adicional usó una sesión real de contraseña de Supabase Auth con un usuario confirmado `@example.invalid`, dos perfiles ficticios y dos borradores independientes. Antes de escribir se guardaron UUID, correos ficticios, slugs, propietarios y una carpeta QA única en un manifiesto. Contraseña y cookies se mantuvieron sólo en memoria. Los planes permanecieron inactivos y ningún borrador se publicó.

1. Con la sesión del socio A se intentaron ocho subidas del mismo PNG sintético a un UUID ajeno, inexistente, `shared`, alterado, con espacio, en mayúsculas, ausente y de tipo archivo. **Las ocho respondieron 403** con el rechazo genérico y la carpeta de prueba permaneció vacía.
2. La subida a la invitación propia respondió **200** una sola vez. Se verificaron la ruta bajo su propietario, los **68 bytes** y el SHA-256 del PNG sintético mediante una lectura separada. No se reutilizaron recursos originales y no se repitió la subida.
3. La limpieza validó marcadores exactos de Auth, perfiles, suscripciones inactivas, borradores y dependencias; comprobó ausencia de pagos, invitados y publicaciones. Suspendió los perfiles ficticios y retiró el archivo verificado, los dos borradores, las suscripciones inactivas, los perfiles y el usuario Auth.
4. Las comprobaciones finales acreditan **cero usuarios Auth, perfiles, suscripciones, pagos, invitaciones de los propietarios ficticios, filas dependientes y archivos de prueba restantes**. Los UUID y slugs exactos también quedaron ausentes. La sesión temporal fue descartada y no quedó ninguna mutación con resultado desconocido.

### Incidencia de la herramienta y recuperación

La primera ejecución del arnés se detuvo después de confirmar los ocho rechazos y la subida propia. Su inspección recorría también variantes de prefijo permitidas en mayúsculas; Supabase devolvía el archivo de la ruta en minúsculas en ese listado, mientras que descargar el objeto con la clave en mayúsculas fallaba. La herramienta conservó el alcance y bloqueó la limpieza antes de borrar nada.

Se corrigió únicamente el inspector privado para recorrer los nombres reales de directorio devueltos por la carpeta QA. Una lectura independiente confirmó la identidad de los borradores y el hash del único PNG; después `--cleanup-only` completó y verificó la limpieza. No se cambiaron los resultados HTTP, no se repitieron Auth ni upload y no se marcó artificialmente como exitosa la ejecución inicial: `auth-scope.json` conserva su fase `failed`, motivo y journal; `production-authenticated-readback.json` acredita la comprobación posterior y `production-authenticated.json` registra `cleanup: complete`.

BCP sigue bloqueado: **cero pagos, activaciones, operaciones bancarias, correos o mensajes**. No se modificaron proveedor ni credenciales y no se necesita SQL. La sesión sintética verifica permisos por HTTP; no equivale a un consentimiento de Google ni a una aceptación visual de Android/Safari. Las pruebas manuales continúan aplazadas.

Evidencia privada adicional en `tmp/builder-upload-access/`: `deployment.log`, `deployment-final.json`, `deployment-files.json`, `ci.json`, `production-http.json`, `production-public.json`, `auth-scope.json`, `production-authenticated.json`, `production-authenticated-readback.json`, `auth-helper-tests.log` y `RESULTADO.json`. La aceptación y limpieza anteriores de Ventas y el borrador del cotizador del navegador permanecen intactos.
