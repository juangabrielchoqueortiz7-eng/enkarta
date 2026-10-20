# Constructor y Socios: subidas en variantes heredadas

## Problema y alcance

Los callbacks de imágenes de las variantes reconstruían `config` y su configuración particular desde el render que inició la subida. Al terminar podían sobrescribir textos, secciones, otras imágenes o configuración editados mientras esperaban. Los hospedajes también usaban índices para identificar filas: una foto pendiente podía recuperar un hotel retirado o modificar al vecino después de cambiar el orden.

La corrección cubre diez editores: Annie y Micky, Laura y Andrés, Manuel y Maya, María Angélica y Mario, Nicole y Francisco, Roly y Yeliana, Paula y Juan Felipe, los diseños limpios, Karla y Mauricio y Mariana y Jesús. Incluye sus subpaneles compartidos de itinerario, ruta y arte de seda.

## Corrección

`useLegacyDraft` mantiene un borrador de trabajo por instancia. Cada callback consulta los datos actuales y combina únicamente el campo modificado. Las ediciones anidadas de textos, secciones, colores y posiciones usan funciones sobre su configuración vigente. El borrador se actualiza antes de notificar al constructor, por lo que dos callbacks en el mismo turno no parten de la misma copia antigua.

Los subpaneles reciben explícitamente el borrador de su editor. Sus cambios se combinan también antes del siguiente render; no se crea una caché global ni se introduce un proveedor de estado nuevo. Un callback queda invalidado al desmontar, cambiar de invitación, plantilla base o variante, incluida una ida y vuelta al contexto anterior.

Los 29 campos de subida múltiple, distribuidos entre ocho de los diez editores, reciben además una identidad de destino con invitación, plantilla, variante, generación de edición y nombre del campo. El cargador múltiple usa deliberadamente su callback más reciente para combinar fotos sobre la lista vigente: esta identidad hace que un lote pendiente se invalide antes de alcanzar el callback de otra variante. Editar textos o reordenar fotos dentro del mismo campo conserva el destino. Karla y Mauricio y Mariana y Jesús sólo utilizan controles de imagen individual.

Hospedajes e itinerario reutilizan `BuilderListState`. Las claves de fila existen sólo en memoria y siguen a cada objeto vigente. El callback vuelve a buscar su fila en la lista actual; si fue eliminada o reemplazada por una copia externa desconocida, no emite cambios. No se infiere identidad por índice ni por textos iguales y no se guardan IDs nuevos en el JSON. Añadir un elemento conserva sus valores iniciales originales.

La portada de Manuel y Maya combina en una sola modificación las imágenes y `cover_image_url`, conservando el comportamiento anterior de limpiar la portada al vaciar la lista. Los enlaces y fotografías de sus espacios de regalos se combinan por campo sobre los arrays actuales.

## Conservación y límites

Se aplica `vercel-react-best-practices` para las actualizaciones funcionales y los cierres asíncronos, con React 18. No se actualizan dependencias ni se cambia CSP. No se modifican los renderizadores públicos, presets, composición, textos, clases, fotografías, fuentes, música, animaciones ni originales archivados. Las claves React de filas cambian únicamente para conservar su identidad durante la edición.

No se guarda ni publica una invitación automáticamente. Descartar un callback del cliente no significa que el servidor haya eliminado un archivo ya recibido; esta corrección no añade borrados remotos. No requiere SQL.

BCP permanece desactivado. Las pruebas manuales de Android, Safari y acceso con Google quedan aplazadas. Las comprobaciones remotas de permisos y fuentes complementan las regresiones locales; no equivalen a ejecutar la carrera de callbacks en un navegador autenticado de producción.

Hallazgo fuera del alcance de estas variantes: el editor genérico por bloques todavía debe incluir la generación de reemplazo de layout en la identidad de sus campos múltiples, para un reemplazo que reutilice IDs de bloque y campo. Los callbacks individuales del editor por bloques ya tienen protección de generación; no se presenta esta entrega de variantes heredadas como cierre de aquel caso específico del cargador múltiple.

## Evidencia automática

La suite `scripts/test-builder-legacy-media-ui.cjs` carga los trece componentes reales y el hook compartido. Las primeras regresiones utilizan controles de subida inertes. Una prueba adicional integra también `MultiImageUploader` real con `CleanDesignFields`, sustituyendo únicamente compresión y transporte por promesas controladas y archivos ficticios en memoria. No se monta el DOM ni se realiza red, autenticación o almacenamiento remoto. La reproducción anterior carga las fuentes del commit `d74040ad34b0ebbb9dc94cbc92e81ec5df6716d2` en memoria y conserva intactas las fuentes actuales.

La suite incorpora **28 regresiones**:

- Las diez variantes conservan dos textos, dos interruptores de secciones y configuración ajena reciente al completar una foto o carrusel. Montar un editor no emite guardados.
- Dos subidas independientes en orden inverso conservan sus dos resultados, también antes del siguiente render. Los callbacks antiguos no cruzan invitación, plantilla, variante, ida y vuelta ni desmontaje.
- Portada y carrusel de Manuel y Maya se actualizan juntos; sus dos imágenes de regalos y dos enlaces se combinan sin sobrescribirse.
- Los tres editores de hospedaje conservan nombres, enlaces, vecinos y orden actuales. Quitar una fila, añadir otra igual o reemplazarla por un clon desconocido no recupera la anterior. Las claves React siguen a la fila; el JSON mantiene su forma y no incluye metadatos del editor.
- Se cubren doce escenarios de arrays modificados en el mismo objeto: inversión, retirada de un vecino, retirada del destino y reemplazo del destino en cada uno de los tres editores de hospedaje.
- Padres y subpaneles de ruta, itinerario y seda combinan cambios en el mismo turno. Los controles de ciudades conservan nombres, coordenadas, duración, curvatura y colores; los encuadres conservan sus posiciones y el arte original seleccionado.
- Desmontar y volver a abrir seda, pasando por el editor de ruta, invalida la respuesta antigua y permite editar con la nueva instancia.
- Los 29 destinos múltiples son únicos por campo y estables durante la edición; cambian al pasar a otra invitación, plantilla o variante y en una ida y vuelta.
- La integración con el cargador múltiple real conserva la misma instancia al cambiar de variante. Aunque el transporte de prueba ignore la señal de cancelación, la respuesta antigua no lee el JSON ni modifica el padre; una nueva selección válida se incorpora exactamente una vez. Los dos archivos ficticios sólo existen en memoria.
- Los trece editores conservan sus controles y límites de medios, sin emitir modificaciones al abrirlos. La comparación opcional `--baseline-ui` verifica además las etiquetas, clases, valores iniciales y propiedades de medios frente al código anterior.

Con el código del commit anterior, **27 pruebas fallan y una pasa**. Con la corrección pasan **28/28**, también en una ejecución independiente. La opción de paridad de UI pasa en los trece editores. Git sólo se usa al solicitar explícitamente `--baseline` o `--baseline-ui`; la suite ordinaria funciona en un checkout superficial de CI.

La evidencia privada se guarda en `tmp/builder-legacy-media/`: `legacy-media-ui.log`, `legacy-ui-parity.log` y `reproduction-baseline.log`.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.133 pruebas correctas en 36 suites**, incluidas las **28 nuevas**, además de lint, TypeScript y build de producción. El comando completo terminó con código 0 después de incorporar la identidad de los 29 destinos y la integración con el cargador real.
- Revisión independiente del código, de los 29 destinos múltiples y ejecución independiente de las 28 regresiones: sin bloqueantes finales. La comparación AST de los trece paneles conserva textos JSX, clases y estilos.
- **597/597 archivos protegidos** conservan SHA-256. El guard de distribución encuentra completos los **129 originales**, incluidos los audios archivados fuera de Git.
- **28/28 pruebas offline** de los helpers privados de atestación, permisos y cierre de sesión correctas. No se suman a las pruebas de la aplicación ni se conectan a producción.

Permanecen los avisos anteriores de imágenes; no se añaden avisos de lint en los archivos afectados. No se requieren migraciones. Evidencia privada adicional: `verify.log`, `typecheck.log`, `smoke-helper-tests.log`, `protected.json` y `distribution.json`.

## Producción verificada, 20 de octubre de 2026

- Código final **`713475aabca07f3f55fdca8e3b60705b4f2177b4`**, integrado en `main`. [CI del commit exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39460703926): `completed/success`, con `npm run verify` y auditoría de dependencias aprobados. Sólo se consultaron metadatos públicos del workflow y sus pasos.
- Vercel **`dpl_BrRya63gWMvbcHm6S82o8HtKyPmh`**, `READY`, destino producción y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-gn8ql3cu4](https://enkarta-gn8ql3cu4-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para incluir los originales archivados fuera de Git.
- Los identificadores de contenido y SHA-256 de las **15 fuentes** coinciden con los archivos de entrada del despliegue Ready: diez variantes, tres subpaneles, `useLegacyDraft` y `builder-list-state`. Esto acredita las fuentes publicadas; no afirma ejecutar la carrera de subida desde un navegador autenticado de producción.
- **11 grupos HTTP correctos**, con **58 denegaciones exactas**, incluidas **46 solicitudes de escritura**. Se conservan los permisos de cuenta, pagos, publicación, eliminación y medios de Socios; una cookie administrativa válida tampoco permite suplantar una sesión de Socios.
- Los archivos ficticios se enviaron únicamente sin autenticación válida. El formulario administrativo autenticado no contenía archivo ni propietario y devolvió el rechazo exacto 400 antes del almacenamiento. No se realizaron subidas autenticadas ni se presenta la denegación como aceptación visual de una galería.
- La configuración administrativa conserva `no-store` y vinculación a su sesión. El historial del constructor conserva `no-store`, `Vary: Cookie` y respuesta vacía para un UUID ficticio cuya ausencia se comprobó mediante conteos exactos antes y después. No se leyeron filas de clientes.
- **129/129 recursos públicos** conservan tamaño y SHA-256, **6/6 rutas** responden como corresponde y los **597/597 archivos protegidos** siguen idénticos después del despliegue.
- **Cero registros de negocio, archivos almacenados, usuarios Auth, fixtures, pagos, operaciones bancarias o mensajes creados**. La cookie administrativa temporal quedó cerrada. No hay datos ficticios persistentes que retirar de Supabase.

BCP permanece bloqueado: no se cambiaron proveedor ni credenciales ni se consultaron variables remotas de pago o endpoints bancarios. Las regresiones locales cubren las carreras con componentes y cargador múltiple reales y transporte controlado; la verificación remota acredita fuentes, permisos y conservación. La aceptación manual permanece aplazada. No se requiere SQL.

Evidencia privada adicional en `tmp/builder-legacy-media/`: `deployment.log`, `deployment-final.json`, `deployment-files.json`, `ci.json`, `production-http.json`, `production-public.json` y `RESULTADO.json`. Las verificaciones y el despliegue intermedios del commit `4e6997d` se conservan aparte; la aceptación final de este documento corresponde exclusivamente a `713475a` y al despliegue indicado arriba.
