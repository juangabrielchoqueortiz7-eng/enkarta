# Constructor: galería durante una subida de audio

## Fallo reproducido

`ImageUploader` retenía el callback `onChange` del inicio de la subida a través de compresión, validación, transporte y lectura del JSON. El callback de música de `MediaPanel` reconstruía `config` desde ese render antiguo. Si mientras esperaba se editaba el título, el pie, la descripción accesible o el orden de las fotografías, confirmar la subida podía restaurar la galería anterior.

La reproducción utiliza `MediaPanel` e `ImageUploader` reales con cuentas, archivos y transporte ficticios. Se inicia una subida de audio, se cambian los textos de una fotografía y se invierte el orden de la galería. Al llegar el ACK, la versión anterior vuelve a colocar `/qa-first.jpg` delante de `/qa-second.jpg`, perdiendo las ediciones intermedias. La evidencia roja anterior al ajuste queda en `tmp/builder-media-upload/reproduction-baseline.log`.

## Alcance y conservación

La corrección se limita al estado de edición de los controles de medios. Mantiene la separación entre borrador, guardado y publicación; adjuntar una URL en el editor no significa que se haya publicado o guardado en el servidor. No cambia los contratos de subida o de pago, permisos, presets, CSS global ni renderizadores públicos de invitaciones.

No se reemplazan fuentes, fotografías, música o animaciones originales y no se descarga ningún recurso nuevo. El audio conserva sus bytes y no pasa por la compresión de imágenes. Las opciones y límites actuales de imagen y video mantienen sus validaciones. BCP continúa bloqueado y no se requiere migración SQL.

Las skills aplicadas son `vercel-react-best-practices`, para callbacks actuales, refs y secuencias asíncronas compatibles con React 18, y `web-design-guidelines`, para revisar la recuperación y los estados de los controles afectados sin rediseñar las invitaciones.

## Contrato de edición

- `MediaPanel` conserva una referencia al documento y a la configuración vigentes. Cada patch actualiza esa referencia de forma síncrona antes de notificar al constructor. El callback de música conserva su destino y combina únicamente su cambio con esa configuración reciente; no reconstruye la galería desde el inicio de la subida.
- Los callbacks de títulos, pies y descripciones se asocian a la imagen y combinan los cambios sobre los textos actuales. Reordenar conserva los metadatos de cada fotografía. Los cambios de varios campos en un mismo turno no se pisan entre sí por esperar al siguiente render.
- La música lleva una revisión síncrona del campo. Elegir una pista de la biblioteca invalida el resultado pendiente aunque la elección y el ACK ocurran antes del siguiente render. Editar una descripción de galería no invalida una subida musical que todavía corresponde aplicar.
- Un intento verifica su identidad de invitación, carpeta, tipo de medio, valor controlado, límites y secuencia después de cada espera. Cambiar esos datos, quitar un medio, pegar una URL o elegir otro archivo impide que una respuesta anterior sustituya la decisión nueva. Salir del panel descarta las respuestas y actualizaciones locales tardías.
- El callback de destino de un upload se conserva desde su inicio. El componente compartido no redirige un archivo al callback de otro campo sólo porque el padre lo haya reutilizado durante la espera. La actualización de estado reciente de esta corrección pertenece al adaptador de `MediaPanel`, que sí conoce su documento y el campo musical.
- Se conserva el tratamiento actual de audio y el procesamiento de imágenes. Una respuesta exitosa sin una URL HTTP/HTTPS válida no reemplaza el valor del editor. Un error de un intento anterior tampoco oculta la actividad o los errores del intento nuevo.

Abortar o descartar la espera del cliente no demuestra que el servidor haya borrado un archivo ya recibido. No se añaden reintentos automáticos ni borrados remotos de recursos. Este bloque no incorpora un plazo nuevo para el transporte del upload; la lectura de duración de video mantiene su límite previo y limpia su recurso temporal al cancelar.

## Regresiones incorporadas

`scripts/test-builder-media-upload-ui.cjs` incorpora **19 pruebas** de los componentes reales, con compresión y DOM de metadatos como fronteras simuladas. La suite se registra en `npm run verify`.

- La reproducción original ahora conserva título, pie, alt y orden tras recibir la respuesta musical. Se comprueban también los callbacks retenidos y varios cambios realizados en un mismo turno.
- Elegir una pista de la biblioteca y recibir el ACK sin un render intermedio no restaura el audio anterior; tampoco lo hace el recorrido de valor A→B→A. La pista original elegida mantiene su ruta exacta.
- Dos archivos resueltos en orden inverso conservan el segundo intento. Quitar, pegar una URL o cambiar invitación, carpeta, tipo, valor o límites descarta el resultado anterior. Los errores obsoletos no sustituyen el feedback de una nueva subida.
- Un callback de un campo nuevo con el mismo conjunto de props no recibe el archivo destinado al campo inicial. En `MediaPanel`, conservar ese destino sigue combinando el resultado con la configuración actual del documento correspondiente.
- La prueba del audio comprueba bytes y ausencia de compresión. Los errores HTTP, JSON truncado y respuestas exitosas con URL ausente, mal tipada, sin host o de un protocolo no admitido conservan la música actual.
- Desmontar durante compresión, transporte o JSON impide posteriores callbacks y escrituras de estado. La lectura real de metadatos de video, con elemento DOM simulado, verifica éxito, sustitución, desmontaje, timeout, duración inválida/excesiva y error de decodificación: se liberan URL temporal, timer y listener y no se suben los archivos rechazados.

La revisión independiente comprobó la fuente y la suite sin bloqueantes. Se revisaron los consumidores compartidos para conservar su destino anterior; esta corrección no equivale a aceptar visualmente los 19 archivos que usan el control ni a resolver todas las carreras de otros paneles o del uploader de lotes `MultiImageUploader`.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.025 pruebas correctas en 31 suites**, incluidas las **19 nuevas** de este bloque, además de lint, TypeScript y build de producción. Permanecen los avisos anteriores de imágenes de las invitaciones; no hay nuevos avisos de lint en los archivos afectados.
- **597/597 archivos protegidos** conservan su SHA-256. El guard de distribución encuentra completos los **129 originales públicos**, incluidos los audios conservados fuera de Git.
- Revisión independiente final: sin bloqueantes. Los helpers privados de permisos, atestación de fuentes y restricciones de las comprobaciones HTTP tienen **27/27 regresiones offline** correctas. Esos casos no se suman a las 1.025 pruebas de la aplicación.

Evidencia privada en `tmp/builder-media-upload/`: `reproduction-baseline.log`, `ui-tests.log`, `verify.log`, `protected.json` y `smoke-helper-tests.log`. Las comprobaciones de producción requieren el despliegue Ready, su SHA exacto y metadatos de los archivos de entrada; no se afirma un resultado remoto a partir del arnés local.

## Producción verificada, 20 de octubre de 2026

- Código **`ffb001b8e2298621a8ef6e4d78c5f5d57a77528e`**, integrado en `main`. [CI del commit exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39432822421): `completed/success`, con `npm run verify` y auditoría de dependencias aprobados.
- Vercel **`dpl_4BqcxRvk1kpDVqTF3num6UvXwvr8`**, `READY`, destino producción y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-gt0obdo91](https://enkarta-gt0obdo91-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para incluir los originales ignorados por Git.
- Los identificadores de contenido de `ImageUploader.tsx` y `panels/MediaPanel.tsx` coinciden con los dos archivos de entrada del despliegue Ready. Esto acredita la fuente subida; no afirma haber ejecutado el editor ni la carrera de callbacks desde un navegador real de producción.
- **11 grupos HTTP correctos**, con **58 denegaciones exactas**, incluidas **46 solicitudes de escritura**. Se conservan los permisos de cuenta, pagos y listado/publicación/eliminación de Socios, y se rechazan las subidas y borrados de medios sin sesión o con cookies inválidas de otros roles. La cookie administrativa válida no sustituye una sesión de Socios.
- Los archivos ficticios de las comprobaciones de subida sólo se enviaron en cinco contextos sin autenticación válida. Con administrador se envió únicamente un formulario sin archivo ni propietario, que devolvió el rechazo exacto 400 antes de almacenar nada. No se realizaron subidas autenticadas, borrados autenticados ni comprobaciones de aislamiento entre propietarios con acceso de Socios; no se deducen esos resultados de estas denegaciones.
- La configuración administrativa conserva `no-store` y su vinculación a la sesión; el historial privado del constructor conserva `no-store` y `Vary: Cookie`, con respuesta vacía para un UUID ficticio cuya ausencia se comprobó mediante conteos exactos antes y después. No se leyeron filas de clientes.
- **129/129 originales públicos** conservan tamaño y SHA-256 y las **6/6 rutas** públicas, de acceso y de desarrollo comprobadas responden como corresponde. Los **597/597 archivos protegidos** permanecen idénticos después del despliegue.
- La cookie administrativa temporal, mantenida sólo en memoria, quedó cerrada. **Cero archivos almacenados, registros de negocio, usuarios Auth, pagos, fixtures, llamadas bancarias o mensajes creados**. No hay datos ficticios ni archivos de prueba que retirar de Supabase.

BCP permanece bloqueado: no se modificaron proveedor ni credenciales y no se consultaron variables remotas de pago o endpoints bancarios. No se necesita SQL. Las carreras de audio/galería y la limpieza del DOM de metadatos se verificaron con regresiones locales; las comprobaciones HTTP y de fuente complementan esas pruebas sin presentarse como aceptación visual de Android/Safari o acceso autenticado con Google. Las pruebas manuales siguen aplazadas.

Evidencia privada adicional en `tmp/builder-media-upload/`: `deployment.log`, `deployment-final.json`, `deployment-files.json`, `ci.json`, `production-http.json`, `production-public.json` y `RESULTADO.json`. La aceptación y limpieza anteriores de Ventas y el borrador del cotizador del navegador permanecen intactos.

Las pruebas con hooks y transporte ficticios verifican las carreras del cliente; no sustituyen una aceptación de Android/Safari, un acceso con Google ni un upload autenticado en producción. Las pruebas manuales permanecen aplazadas por decisión del usuario.
