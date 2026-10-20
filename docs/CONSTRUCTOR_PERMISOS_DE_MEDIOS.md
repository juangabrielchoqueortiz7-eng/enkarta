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

Evidencia privada en `tmp/builder-upload-access/`: `reproduction-baseline.json`, `api-tests.log`, `verify.log`, `protected.json` y `smoke-helper-tests.log`. La aplicación no requiere SQL ni dependencias nuevas. La verificación autenticada de producción usa un alcance ficticio independiente y debe conservar su manifiesto y resultado de limpieza; no se da por realizada en esta comprobación local.
