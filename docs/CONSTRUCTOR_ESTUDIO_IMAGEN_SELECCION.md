# Constructor: elegir una foto de la biblioteca durante una subida

## Fallo reproducido

`ImageStudio` llamaba directamente a `onImageChange` al pulsar «Usar foto de la biblioteca». El cargador individual sólo podía observar el nuevo valor después del siguiente render. Si la compresión, el transporte o su JSON terminaban antes, una respuesta anterior podía reemplazar la fotografía que el usuario acababa de elegir.

La reproducción inicial utilizó `ImageStudio` e `ImageUploader` reales con un JPEG ficticio y transporte en memoria: inició una subida, eligió una URL de la biblioteca y resolvió la respuesta sin renderizar de nuevo. El resultado pasó de la foto elegida a la URL de la subida anterior.

## Corrección

El estudio mantiene una revisión de la imagen únicamente en memoria. Elegir una fotografía de la biblioteca incrementa esa revisión antes de llamar al constructor. El mismo objeto se entrega a `ImageUploader` mediante su prop existente `fieldRevision`; la comprobación del cargador descarta la respuesta anterior incluso antes del siguiente render. No se cambian la API de subida ni sus permisos.

El estudio también identifica su invitación y campo. El panel por bloques le pasa `mediaDestination(selected, 'url')`, que ya incluye invitación, plantilla, variante, generación y bloque. Cambiar de propietario o destino incrementa la revisión antes de renderizar el cargador, aunque ambos campos estén vacíos o contengan la misma URL. Un manejador antiguo de biblioteca se descarta al cambiar de contexto, incluida una ida y vuelta; no puede invalidar una subida nueva del destino actual.

Los cambios de encuadre, filtros, máscara, marco y capa conservan la revisión de imagen. La subida puede continuar y el constructor mantiene esos ajustes actuales. El desmontaje bloquea los manejadores del estudio y el cargador cancela su propia espera. La limpieza del efecto no incrementa la revisión: así el replay de efectos de React 18 StrictMode no cancela la primera subida válida del montaje.

No se añaden IDs ni revisiones al JSON, las versiones, el documento público o el almacenamiento del navegador. Se aplica `vercel-react-best-practices` para mantener referencias por instancia y evitar cierres asíncronos obsoletos, con React 18 y sin dependencias nuevas.

## Conservación y límites

Sólo cambia la lógica de `ImageStudio.tsx` y la prop de destino que entrega `BlockEditorPanel.tsx`. `ImageUploader.tsx` conserva su implementación. La comparación AST contra `6125746`, normalizando sólo los finales de línea de las fuentes, mantiene textos JSX, clases y estilos de los tres componentes. No cambian renderizadores públicos, presets, composición, fotografías, fuentes, música, animaciones ni originales archivados.

La selección utiliza exactamente la URL de la biblioteca; no descarga ni transforma el recurso original. Cancelar el resultado del cliente no demuestra que un archivo ya recibido se haya eliminado del servidor. Esta corrección no añade borrados remotos, guardado automático ni publicación automática.

BCP permanece desactivado. No se modifican proveedor, credenciales, permisos del servidor, dependencias o CSP y no se requiere SQL. La aceptación manual de Android, Safari y Google permanece aplazada. Las regresiones locales y la atestación remota de fuentes y permisos no equivalen a ejecutar una subida autenticada en un navegador de producción.

## Hallazgos independientes para siguientes entregas

La revisión de pendientes detectó los siguientes casos fuera de esta corrección. Se registran para continuar con pruebas y soluciones propias:

- `IconPicker`: restaurar un SVG/Lottie mientras se sube un PNG puede mantener `ImageUploader.value = ''`; la respuesta pendiente vuelve a imponer el PNG. Necesita invalidar síncronamente la selección manual.
- `SectionIconsEditor` y `ContentPanel`: los setters conservan configuración o itinerario anteriores; una subida de icono puede recuperar colores o textos antiguos y restaurar filas eliminadas. Se reprodujeron los cuatro casos de iconos, colores, texto y filas en memoria, sin red.
- «Mi cuenta» en `PartnerDashboard`: el guardado directo no tiene plazo, bloqueo síncrono ni protección contra respuestas de una pestaña anterior. Requiere una corrección específica de incertidumbre y recuperación del perfil.
- `PartnerDesignPicker`: la creación queda esperando indefinidamente si `fetch` o el JSON no terminan; el estado «Sin confirmar» existente necesita un presupuesto completo de espera y recuperación sin repetir la escritura.

Estos hallazgos no se presentan como resueltos ni se modifican sus flujos en esta entrega.

## Regresiones automáticas

`scripts/test-builder-image-studio-upload-ui.cjs` incorpora **13 pruebas** con `ImageStudio`, `ImageUploader` e `image-effects` reales y, en un caso, el panel por bloques real. La compresión y el transporte se sustituyen por promesas controladas y JPEG ficticios en memoria. No se monta el DOM ni se realizan red, autenticación o subidas reales.

- Selección de biblioteca durante compresión, transporte o lectura de JSON, resolviendo la respuesta anterior sin el siguiente render.
- Cambios de encuadre y filtros que conservan el lote, los ajustes vigentes y los originales seleccionados.
- Subida nueva después de una elección manual, respuesta o fallo de una operación anterior y múltiples elecciones de biblioteca en el mismo turno.
- Cambio de propietario o destino de ida y vuelta, manejo de acciones antiguas y desmontaje en distintas fases.
- Replay de limpieza y montaje de efectos de React 18 sin render intermedio, seguido de una subida nueva válida.
- Dos bloques reales con la misma foto, invitación y carpeta que reutilizan la misma instancia del estudio y del cargador. La identidad de destino cambia la revisión; un manejador anterior no invalida la nueva subida ni modifica el bloque vecino.
- Conservación de la forma del documento y ausencia de revisiones o identidades del editor en las propiedades guardadas.

La suite final pasa **13/13**, también en una ejecución independiente. La reproducción optativa carga únicamente `ImageStudio` anterior del commit `6125746be38e0888ee484f950709e204ee44e986` en memoria: **nueve pruebas fallan y cuatro pasan**. La suite habitual no usa Git y funciona con un checkout superficial de CI.

La evidencia privada se guarda en `tmp/builder-image-studio/`: `image-studio-upload-ui.log`, `reproduction-baseline.log`, `typecheck.log`, `visual-contract.json`, `protected.json`, `distribution.json` y `smoke-helper-tests.log`.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.169 pruebas correctas en 39 suites**, incluidas las **13 nuevas**, además de lint, TypeScript y build de producción; comando completo terminado con código 0.
- Revisión independiente del código y ejecución independiente de las 13 regresiones: sin bloqueantes finales. La comparación AST mantiene textos JSX, clases y estilos de las tres fuentes comprobadas.
- Las regresiones anteriores de medios, cargador múltiple, editor por bloques, listas, variantes, cambios de plantilla e historial siguen pasando dentro de la verificación completa.
- **597/597 archivos protegidos** conservan SHA-256 y los **129 recursos originales** de distribución están completos, incluidos los audios archivados fuera de Git.
- **28/28 pruebas offline** de los helpers privados de atestación, permisos y cierre de sesión correctas; no se suman a las 1.169 pruebas de la aplicación ni realizan red.

Permanecen los avisos anteriores de imágenes; no se requieren migraciones ni cambios de dependencias. Evidencia privada adicional: `verify.log`.

## Despliegue y comprobaciones de producción, 20 de octubre de 2026

Código integrado en `main`: `6b3adc9818c67acdce0815f91dda4b3a4f13f8e5`. El workflow [39468103900](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39468103900) terminó correctamente tanto `verify` como `audit` (`npm audit --omit=dev --audit-level=high`).

Vercel terminó el despliegue `dpl_76geGRbXVefS2frk4aoQ73shq2jN` en estado **READY**, destino **production**, con alias [enkarta.vercel.app](https://enkarta.vercel.app). URL inmutable: [enkarta-5f3atea7k](https://enkarta-5f3atea7k-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para incluir los originales archivados fuera de Git.

- El inventario remoto acredita por UID de contenido las tres fuentes exactas verificadas: `ImageStudio.tsx`, `ImageUploader.tsx` y `BlockEditorPanel.tsx`. Esto comprueba los archivos de entrada del despliegue Ready, sin afirmar que se haya reproducido la carrera dentro del navegador de producción.
- **11 grupos HTTP correctos**: **58 denegaciones exactas 401**, incluidas **46 solicitudes de escritura**, prueban que sesiones ausentes, inválidas o de administrador no suplantan una sesión de Socios. Los formularios ficticios con archivo sólo se enviaron sin sesión válida y fueron rechazados antes del almacenamiento. El administrador sólo envió un formulario sin archivo ni propietario, rechazado con el 400 esperado.
- La configuración administrativa y el historial del constructor conservan `no-store`; el historial también conserva `Vary: Cookie`. Un UUID ficticio y ausente se comprobó mediante conteo HEAD exacto antes y después, sin leer filas de clientes.
- **6/6 rutas públicas correctas** y **129/129 recursos originales distribuidos** conservan sus hashes. La comprobación final local mantiene **597/597 archivos protegidos** intactos.
- **Cero** invitaciones, usuarios Auth, archivos, pagos o fixtures persistentes creados; **cero** operaciones bancarias y mensajes. La cookie temporal de administrador se cerró y descartó al finalizar. No hubo registros de prueba que eliminar.

BCP conserva su bloqueo en el código desplegado y no se modificaron proveedor ni credenciales. La comprobación HTTP no inspeccionó variables remotas del proveedor ni llamó endpoints bancarios. Las pruebas de carrera usan componentes reales y transporte controlado localmente; no se realizó una subida autenticada de Socios en producción. La aceptación manual permanece aplazada.

Evidencia privada final en `tmp/builder-image-studio/`: `ci.json`, `deployment-final.json`, `deployment-files.json`, `production-http.json`, `production-public.json`, `protected.json` y `RESULTADO.json`. No se necesita SQL adicional.
