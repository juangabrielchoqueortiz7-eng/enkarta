# Constructor: restauración y selección de iconos durante una subida

## Fallo y alcance

`IconPicker` entrega una URL HTTP a `ImageUploader` cuando el icono es una imagen subida. Para un nombre SVG, un Lottie o el icono predeterminado entrega `''`. Restaurar el icono durante una subida no cambiaba necesariamente ese valor, y tampoco invalidaba síncronamente la operación. Una respuesta anterior podía imponer el PNG sobre la elección más reciente, incluso antes del siguiente render.

La reproducción independiente contra `fa81701` confirmó los tres momentos: compresión, transporte y lectura de JSON. En los tres, restaurar produjo primero `''` y después la URL obsoleta. Los archivos y el transporte fueron ficticios y sólo existieron en memoria.

## Corrección

El selector mantiene una revisión por instancia, entregada al `fieldRevision` existente de `ImageUploader`. «Restaurar» y elegir un icono de la biblioteca incrementan la revisión antes de notificar al constructor. Esto descarta una subida pendiente aunque el cargador todavía no haya recibido otro render o ambas opciones se representen con `''`.

El contexto incluye invitación, destino, icono predeterminado, tipo de evento e icono efectivo. Cambiar de contexto invalida la operación; un control retenido de un contexto anterior se comprueba antes de modificar la revisión. El panel por bloques transmite sus `destinationKey` e `isDestinationCurrent` existentes, incluidos los campos de filas e hijos. Una ida y vuelta al mismo campo no vuelve válida la operación anterior.

Los cambios de color o velocidad conservan el lote. El contexto usa el icono efectivo (`value || defaultIcon`), de modo que ajustar un icono predeterminado no cancela la subida al convertir un valor implícito en explícito. Un resultado válido usa el callback más reciente del mismo contexto. El cargador conserva su implementación y su contrato de destino.

El desmontaje bloquea los manejadores que sustituyen o ajustan el icono. La limpieza del efecto no incrementa la revisión, para permitir el replay de efectos de React 18 StrictMode y una subida posterior válida. No se serializan revisiones, identidades ni callbacks en el documento o el almacenamiento del navegador.

Se aplica `vercel-react-best-practices` para manejar referencias por instancia y respuestas asíncronas, sin React 19 ni dependencias nuevas. No cambian los textos, clases o estilos de los controles, la galería de iconos, sus recursos ni los renderizadores de invitaciones. Las variaciones de color y velocidad siguen siendo configuración de la instancia; no se reescribe ningún original.

## Límites y pendientes separados

- Esta entrega protege la elección y restauración del icono. Los merges completos de `SectionIconsEditor` y los índices de itinerario de `ContentPanel` siguen necesitando su corrección específica para cambios realizados antes del siguiente render y filas eliminadas o reordenadas.
- Al elegir una imagen nueva se conserva el comportamiento anterior de limpiar los ajustes del icono sustituido. Permitir cambios de color durante la espera no significa aplicar colores Lottie a un PNG nuevo.
- Descartar una respuesta no demuestra que se haya borrado un archivo ya recibido por el servidor. No se añaden borrados remotos, guardado automático ni publicación automática.
- «Mi cuenta» y el plazo de espera de `PartnerDesignPicker` continúan como pendientes independientes documentados en la entrega anterior.
- BCP permanece bloqueado. No cambian proveedor, credenciales, permisos de servidor ni CSP. No se requiere SQL. Las pruebas manuales permanecen aplazadas.

La evidencia de esta entrega se conserva en `tmp/builder-icon-upload/`; la reproducción independiente inicial está en `tmp/builder-icon-audit/`. Las pruebas automáticas de componentes locales y la verificación HTTP de producción no equivalen a una subida autenticada en un navegador de producción.

## Regresiones automáticas

`scripts/test-builder-icon-upload-ui.cjs` añade **21 pruebas** con `IconPicker`, `IconLibrary`, `ImageUploader` y, en dos casos, `BlockEditorPanel` reales. El planificador de hooks controla render, montaje, limpieza y replay de efectos; la compresión, el transporte, el registro y los JSON de animaciones son sintéticos en memoria. Sólo `EventIcon` y `LottieIcon` se sustituyen como fronteras visuales. No se monta el DOM, no se autentica ni se suben archivos reales.

- Restaurar durante compresión, transporte o JSON, antes del siguiente render, incluidos valores SVG que coinciden con el predeterminado.
- Elecciones manuales sucesivas, biblioteca y subida nueva después de restaurar; las respuestas y los fallos obsoletos no sustituyen la elección actual.
- Cambios de propietario, destino, icono predeterminado, tipo de evento e icono efectivo, incluida una ida y vuelta. Los manejadores antiguos no cambian la revisión ni interrumpen el lote nuevo.
- Ajustes de color, velocidad y presentación que mantienen la subida. Convertir el default implícito en explícito conserva el contexto; el callback actualizado recibe el resultado válido. «1x» sigue enviando velocidad `undefined`.
- Desmontaje, remontaje y replay de efectos de React 18, sin escrituras tardías ni cancelación de una subida posterior válida.
- Dos bloques reales con el mismo propietario e icono que reutilizan el selector y cargador. Cambiar A→B→A conserva el bloque vecino y no serializa metadatos de control. Una revisión de historial antes del render impide aplicar el resultado pendiente.

La selección de biblioteca utiliza un botón real retenido antes de abrir «Subir el mío», como prueba defensiva de un callback anterior; la interfaz no muestra ambas pestañas a la vez. No se inventa un selector SVG: ese caso se comprueba restaurando el nombre predeterminado.

La suite final pasa **21/21**, también en ejecución independiente. La reproducción opcional `--baseline` sustituye únicamente `IconPicker` por la fuente del commit completo `fa817011726d99a3a4752c4738063c7a6fbabfaf`: **15 pruebas fallan y 6 pasan**. La ejecución habitual no utiliza Git y funciona con el checkout superficial de CI. Logs: `icon-upload-ui.log`, `reproduction-baseline.log` y `../builder-icon-audit/official-final.log`.

La comparación AST frente a ese commit mantiene todos los textos JSX, clases y estilos de `IconPicker` y `BlockEditorPanel`. La implementación de `ImageUploader` no cambió. Evidencia: `visual-contract.json`. La revisión independiente no encontró bloqueantes finales.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.190 pruebas correctas en 40 suites**, incluidas las **21 nuevas**, lint, TypeScript y build de producción; comando completo terminado con código 0. Evidencia: `verify.log`.
- **597/597 archivos protegidos** conservan sus hashes y los **129 originales de distribución** están completos, incluidos los recursos archivados fuera de Git. Evidencia: `protected.json` y `distribution.json`.
- **28/28 pruebas offline** de los helpers privados de permisos, atestación y cierre de sesión pasan. No se suman a las pruebas de la aplicación ni realizan red. Evidencia: `smoke-helper-tests.log`.

Permanecen los avisos anteriores de imágenes. No se modificaron dependencias, diseños, recursos ni migraciones.

## Producción, 20 de octubre de 2026

Código integrado en `main`: `2e4759f0e6ce20a86cbacff79864b2917cf23f61`. Vercel terminó el despliegue `dpl_FmZ47XfjiAyF4TgjgbdeVorAhzzu` en estado **READY**, destino **production**, con alias [enkarta.vercel.app](https://enkarta.vercel.app). URL inmutable: [enkarta-5ezjrm8k0](https://enkarta-5ezjrm8k0-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para incluir los originales archivados fuera de Git.

El workflow [39475724525](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39475724525) del mismo SHA completó correctamente `verify` y `audit` (`npm audit --omit=dev --audit-level=high`). La comprobación final conjunta validó CI, fuentes, HTTP, recursos, cierre de sesión y **597/597 archivos protegidos** intactos. Evidencia: `ci.json`, `protected.json` y `RESULTADO.json`.

- El inventario remoto acredita por UID de contenido las tres fuentes exactas comprobadas: `IconPicker.tsx`, `ImageUploader.tsx` y `BlockEditorPanel.tsx`. Esto verifica las entradas del despliegue Ready; no afirma ejecutar la carrera dentro del navegador de producción.
- **11 grupos HTTP correctos**, con **58 denegaciones exactas 401**, incluidas **46 solicitudes de escritura**. Sesiones ausentes o inválidas y una sesión de administrador no pueden suplantar una sesión de Socios. Los archivos ficticios sólo se enviaron sin sesión válida y fueron rechazados antes de almacenamiento. El administrador sólo envió un formulario sin archivo ni propietario, con el 400 esperado.
- La configuración administrativa y el historial conservan `no-store`; el historial también conserva `Vary: Cookie`. Se verificó por conteo HEAD exacto que un UUID ficticio no existía antes ni después, sin leer filas de clientes.
- **6/6 rutas públicas correctas** y **129/129 originales distribuidos** conservan sus hashes. No se sustituyeron fotografías, música, fuentes o animaciones.
- **Cero** invitaciones, usuarios Auth, archivos, pagos o fixtures persistentes creados; **cero** operaciones bancarias y mensajes. Se cerró y descartó la cookie temporal de administrador. No quedaron registros de prueba que eliminar.

BCP conserva su bloqueo en el código desplegado y no se modificaron proveedor ni credenciales. El smoke HTTP no inspeccionó variables remotas del proveedor ni llamó endpoints bancarios. Las pruebas de carrera son locales con componentes reales y transporte controlado; no se realizó una subida autenticada de Socios en producción. La aceptación manual permanece aplazada.

Evidencia privada de producción en `tmp/builder-icon-upload/`: `deployment-final.json`, `deployment-files.json`, `production-http.json` y `production-public.json`. No se necesita SQL adicional.
